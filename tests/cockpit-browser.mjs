import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const html=await fs.readFile('index.html','utf8');
const browser=await chromium.launch({...process.env.SKYJOURNEY_BROWSER_CHANNEL?{channel:process.env.SKYJOURNEY_BROWSER_CHANNEL}:{},headless:true});
const origin='https://deck.skyjourney.test/';
await fs.mkdir('artifacts',{recursive:true});

async function boot(page){
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/*',r=>r.request().url().startsWith(origin)?r.fulfill({status:200,contentType:'text/html',body:html}):r.abort());
 await page.goto(origin);
 await page.waitForFunction(()=>window.SkyJourney?.state?.flightTime>0);
 await page.locator('#loader').waitFor({state:'detached'});
 await page.evaluate(()=>SkyJourney.action('camera','Pilot'));
 return errors;
}

const digestScreen=(page,name)=>page.evaluate(name=>{
 const d=SkyJourney.aircraft.screens.find(s=>s.name===name);
 return d?.canvas.toDataURL();
},name);

try{
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 const errors=await boot(page);
 await page.evaluate(()=>{SkyJourney.action('pause',true);document.querySelector('.pause-screen').hidden=true;});
 await page.locator('[data-panel="camera"]').click();
 assert.equal(await page.locator('[data-input="cockpitRange"]').count(),1,'Camera offers accessible cockpit controls');
 await page.locator('#cockpit-options summary').click();
 const range=page.locator('[data-input="cockpitRange"]'),system=page.locator('[data-input="cockpitPage"]');
 const before=await digestScreen(page,'Navigation display');
 assert.ok(before?.startsWith('data:image/png'));
 await range.selectOption('10');
 await page.waitForFunction(before=>SkyJourney.aircraft.screens.find(s=>s.name==='Navigation display').canvas.toDataURL()!==before,before);
 await system.selectOption('approach');
 await page.locator('[data-input="cockpitBrightness"]').focus();
 await page.keyboard.press('Home');
 for(let step=0;step<4;step++)await page.keyboard.press('ArrowRight');
 assert.deepEqual(await page.evaluate(()=>{const s=SkyJourney.snapshot().settings;return [s.cockpitRange,s.cockpitPage,s.cockpitBrightness];}),[10,'approach',.4]);
 await page.locator('[data-panel="camera"]').click();
 await page.screenshot({path:'artifacts/cockpit-redesign-framing.png'});

 const clickKnob=async action=>{
  const target=await page.evaluate(action=>{
   const knob=SkyJourney.aircraft.interactables.find(k=>k.userData.action===action);
   if(!knob)return null;
   const point=knob.getWorldPosition(knob.position.clone()).project(SkyJourney.camera);
   return {x:(point.x+1)*innerWidth/2,y:(1-point.y)*innerHeight/2};
  },action);
  assert.ok(target&&target.x>0&&target.x<1600&&target.y>0&&target.y<900,`${action} is reachable from the pilot seat: ${JSON.stringify(target)}`);
  await page.mouse.click(target.x,target.y);
 };
 await clickKnob('ndRange');
 assert.equal(await page.evaluate(()=>SkyJourney.snapshot().settings.cockpitRange),20,'3D range control changes the actual ND scale');
 await clickKnob('systemPage');
 assert.equal(await page.evaluate(()=>SkyJourney.snapshot().settings.cockpitPage),'overview','3D systems control changes the actual page');
 await clickKnob('cockpitDim');
 assert.equal(await page.evaluate(()=>SkyJourney.snapshot().settings.cockpitBrightness),.6,'3D dimmer updates the saved panel brightness');
 await page.evaluate(()=>SkyJourney.action('cockpitBrightness',95));
 await clickKnob('cockpitDim');
 assert.equal(await page.evaluate(()=>SkyJourney.snapshot().settings.cockpitBrightness),1,'DIM reaches full brightness before wrapping');
 await page.keyboard.down('Shift');
 await clickKnob('cockpitDim');
 await page.keyboard.up('Shift');
 assert.equal(await page.evaluate(()=>SkyJourney.snapshot().settings.cockpitBrightness),.85,'Shift reverses the physical dimmer');
 const target=await page.evaluate(()=>SkyJourney.autopilot.speed);
 await clickKnob('speed');
 assert.equal(await page.evaluate(()=>SkyJourney.autopilot.speed),target+5,'the physical MCP speed knob still adjusts the target');

 await page.reload();
 await page.waitForFunction(()=>window.SkyJourney?.state?.flightTime>0);
 await page.locator('#loader').waitFor({state:'detached'});
 assert.deepEqual(await page.evaluate(()=>{const s=SkyJourney.snapshot().settings;return [s.cockpitRange,s.cockpitPage,s.cockpitBrightness];}),[20,'overview',.85]);
 await page.evaluate(()=>SkyJourney.action('camera','Pilot'));

 await page.evaluate(()=>{SkyJourney.world.setWeather('Golden Sunset',{immediate:true,time:18.35});SkyJourney.action('cockpitBrightness',85);});
 await page.waitForTimeout(350);
 await page.screenshot({path:'artifacts/cockpit-redesign-sunset.png'});
 const render=await page.evaluate(()=>SkyJourney.renderer.domElement.toDataURL('image/png'));
 await fs.writeFile('artifacts/cockpit-redesign-clean.png',Buffer.from(render.split(',')[1],'base64'));
 const instruments=await page.evaluate(()=>Object.fromEntries(SkyJourney.aircraft.screens.map(s=>[s.name,s.canvas.toDataURL()])));
 for(const [name,png] of Object.entries(instruments)){
  assert.ok(png.length>1000,`${name} draws an instrument`);
  await fs.writeFile(`artifacts/cockpit-${name.toLowerCase().replace(/[^a-z]+/g,'-')}.png`,Buffer.from(png.split(',')[1],'base64'));
 }
 const drawCalls=await page.evaluate(()=>SkyJourney.diagnostics.drawCalls);
 await page.evaluate(()=>{SkyJourney.action('academyStart','night-landing');SkyJourney.action('cockpitPage','approach');});
 await page.locator('#academy-hud').waitFor({state:'visible'});
 await page.waitForTimeout(300);
 await page.screenshot({path:'artifacts/cockpit-redesign-night.png'});
 assert.equal(await page.evaluate(()=>SkyJourney.diagnostics.weather),'Starry Night');
 await page.evaluate(()=>{SkyJourney.action('academyExit');SkyJourney.action('camera','Copilot');});
 assert.equal(await page.evaluate(()=>SkyJourney.aircraft.cabin.visible),true);
 await page.screenshot({path:'artifacts/cockpit-redesign-copilot.png'});
 assert.deepEqual(errors,[]);
 console.log('Cockpit: live textures, 3D controls, saved settings, approach, night and both seats. Draw calls:',drawCalls);

 const phone=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 const phoneErrors=await boot(phone);
 assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth),844);
 assert.ok(await phone.locator('.touch-joystick').isVisible());
 const rail=await phone.locator('.main-nav').boundingBox(),stick=await phone.locator('.touch-joystick').boundingBox();
 assert.ok(rail&&stick&&rail.y+rail.height<=stick.y,'landscape cockpit nav stays above the joystick');
 await phone.screenshot({path:'artifacts/cockpit-redesign-mobile.png'});
 await phone.setViewportSize({width:390,height:844});
 assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth),390);
 assert.ok(await phone.locator('.touch-joystick').isVisible());
 await phone.screenshot({path:'artifacts/cockpit-redesign-portrait.png'});
 assert.deepEqual(phoneErrors,[]);
}finally{await browser.close();}
