import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const html=await fs.readFile('index.html','utf8');
const browser=await chromium.launch({...process.env.SKYJOURNEY_BROWSER_CHANNEL?{channel:process.env.SKYJOURNEY_BROWSER_CHANNEL}:{},headless:true});
const origin='https://cabin-detail.skyjourney.test/';
await fs.mkdir('artifacts',{recursive:true});

try{
 const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/*',r=>r.request().url().startsWith(origin)?r.fulfill({status:200,contentType:'text/html',body:html}):r.abort());
 await page.goto(origin);
 await page.waitForFunction(()=>window.SkyJourney?.state?.flightTime>0);
 await page.locator('#loader').waitFor({state:'detached'});
 await page.evaluate(()=>{
  SkyJourney.action('quality','balanced');SkyJourney.action('camera','Pilot');SkyJourney.action('pause',true);
  document.querySelector('.pause-screen').hidden=true;
  SkyJourney.world.setWeather('Golden Sunset',{immediate:true,time:18.35});
 });
 await page.locator('[data-panel="camera"]').click();
 await page.locator('#cockpit-options summary').click();
 const rays=page.locator('[data-input="cockpitRays"]');
 assert.equal(await rays.count(),1,'Camera offers a control for local ray tracing');
 await page.waitForFunction(()=>SkyJourney.diagnostics.cockpitRayTracing===true);
 await rays.locator('xpath=ancestor::label').click();
 await page.waitForFunction(()=>SkyJourney.diagnostics.cockpitRayTracing===false);
 await page.locator('[data-panel="camera"]').click();

 async function frame(name){
  const image=await page.evaluate(async()=>{
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   return SkyJourney.renderer.domElement.toDataURL('image/png');
  });
  if(name)await fs.writeFile(`artifacts/${name}.png`,Buffer.from(image.split(',')[1],'base64'));
  return image;
 }
 const off=await frame('cockpit-detail-raster');
 await page.evaluate(()=>SkyJourney.action('cockpitRays',true));
 await page.waitForFunction(()=>SkyJourney.diagnostics.cockpitRayTracing===true);
 const on=await frame('cockpit-detail-raytraced');
 assert.notEqual(on,off,'analytic rays change a frozen flight deck frame');
 await page.evaluate(()=>SkyJourney.action('quality','performance'));
 await page.waitForFunction(()=>SkyJourney.diagnostics.cockpitRayTracing===false);
 await page.evaluate(()=>SkyJourney.action('quality','balanced'));

 async function target(action){
  const point=await page.evaluate(action=>{
   const object=SkyJourney.aircraft.interactables.find(o=>o.userData.action===action);
   if(!object)return null;
   const p=object.getWorldPosition(object.position.clone()).project(SkyJourney.camera);
   return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};
  },action);
  assert.ok(point&&point.x>0&&point.x<1600&&point.y>0&&point.y<900,`${action} in the pilot view: ${JSON.stringify(point)}`);
  return point;
 }
 const speed=await target('speed');
 const canvas=page.locator('#scene canvas'),hint=page.locator('#cockpit-control-hint');
 await page.mouse.move(speed.x,speed.y);
 await hint.waitFor({state:'visible'});
 assert.match(await hint.textContent(),/speed/i);
 const selected=await page.evaluate(()=>SkyJourney.autopilot.speed);
 await page.mouse.down();
 assert.equal(await canvas.getAttribute('data-cockpit-pressed'),'speed');
 assert.equal(await page.evaluate(()=>SkyJourney.autopilot.speed),selected);
 await page.mouse.up();
 assert.equal(await canvas.getAttribute('data-cockpit-pressed'),null);
 assert.equal(await page.evaluate(()=>SkyJourney.autopilot.speed),selected+5);
 await page.evaluate(()=>{SkyJourney.action('pause',false);SkyJourney.action('autopilot',true);});
 await page.mouse.move(speed.x,speed.y);
 await hint.waitFor({state:'visible'});
 const beforeReverse=await page.evaluate(()=>SkyJourney.autopilot.speed);
 await page.keyboard.down('Shift');
 await page.waitForTimeout(230);
 await page.mouse.click(speed.x,speed.y);
 await page.keyboard.up('Shift');
 assert.equal(await page.evaluate(()=>SkyJourney.autopilot.enabled),true,'Shift over a selector does not send a throttle command');
 assert.equal(await page.evaluate(()=>SkyJourney.autopilot.speed),beforeReverse-5);
 await page.evaluate(()=>{SkyJourney.action('pause',true);document.querySelector('.pause-screen').hidden=true;});
 const beforeDrag=await page.evaluate(()=>SkyJourney.autopilot.speed);
 await page.mouse.move(speed.x,speed.y);
 await page.mouse.down();await page.mouse.move(speed.x+35,speed.y+8,{steps:4});await page.mouse.up();
 assert.equal(await page.evaluate(()=>SkyJourney.autopilot.speed),beforeDrag,'a camera drag never turns a knob');
 await page.evaluate(()=>SkyJourney.action('camera','Pilot'));

 const dome=await target('cockpitDome');
 await page.mouse.click(dome.x,dome.y);
 assert.equal(await page.evaluate(()=>SkyJourney.snapshot().settings.cockpitDome),true);
 const checklist=await target('cockpitChecklist');
 await page.mouse.click(checklist.x,checklist.y);
 const panel=page.locator('#panel-checklist');await panel.waitFor({state:'visible'});
 assert.equal(await canvas.evaluate(el=>el===document.activeElement),true,'opening the physical checklist keeps flight controls focused');
 const gear=panel.locator('[data-checklist="gear"]');
 assert.equal(await gear.getAttribute('data-ready'),'false');
 await page.evaluate(()=>{SkyJourney.state.gear=1;SkyJourney.state.gearTarget=1;});
 await page.waitForFunction(()=>document.querySelector('[data-checklist="gear"]').dataset.ready==='true');
 await panel.locator('[data-checklist-manual="runway"]').check();
 await page.keyboard.press('g');
 assert.equal(await page.evaluate(()=>SkyJourney.state.gearTarget),0,'flight keys work with a checklist item focused');
 await panel.locator('[data-action="resetChecklist"]').click();
 assert.equal(await panel.locator('[data-checklist-manual="runway"]').isChecked(),false);
 await page.keyboard.press('Escape');
 await panel.waitFor({state:'hidden'});

 await page.evaluate(()=>SkyJourney.world.setWeather('Starry Night',{immediate:true,time:22}));
 await frame('cockpit-detail-reading');
 await page.evaluate(()=>{SkyJourney.world.setWeather('Thunderstorm',{immediate:true,time:17});SkyJourney.action('pause',false);});
 const wiper=await target('cockpitWipers');
 await page.mouse.click(wiper.x,wiper.y);
 assert.equal(await page.evaluate(()=>SkyJourney.snapshot().settings.cockpitWipers),true);
 const rotation=()=>page.evaluate(()=>SkyJourney.aircraft.cabin.getObjectByName('Pilot windshield wiper')?.getObjectByName('Hinged wiper arm')?.quaternion.toArray().join(','));
 const wet=await rotation();
 assert.ok(wet,'a physical pilot wiper is present');
 await page.waitForFunction(wet=>SkyJourney.aircraft.cabin.getObjectByName('Pilot windshield wiper')?.getObjectByName('Hinged wiper arm')?.quaternion.toArray().join(',')!==wet,wet);
 await frame('cockpit-detail-storm');
 await page.evaluate(()=>SkyJourney.action('reducedMotion',true));
 await frame();const parked=await rotation();await page.waitForTimeout(230);
 assert.equal(await rotation(),parked,'reduced motion keeps the blade parked');
 await page.evaluate(()=>SkyJourney.action('camera','External'));
 await page.waitForFunction(()=>SkyJourney.diagnostics.cockpitRayTracing===false);
 assert.equal(await hint.isVisible(),false,'leaving the deck clears interaction feedback');
 assert.deepEqual(errors,[]);
 console.log('Cabin detail: ray pixels, quality fallback, hover, press, drag, dome, checklist and wiper passed.');
}finally{await browser.close();}
