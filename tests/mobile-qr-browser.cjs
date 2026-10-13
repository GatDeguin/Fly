const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async()=>{
 const html = await fs.readFile(require('node:path').join(__dirname,'../src/mobile-controller.html'),'utf8');
 // Fulfill a secure origin in-process: real motion checks, no certificate bypass.
 const origin='https://skyjourney-controller.test';
 const hapticModule=await fs.readFile(require('node:path').join(__dirname,'../src/haptics.js'),'utf8');
 const browser=await chromium.launch({...(process.env.SKYJOURNEY_BROWSER_CHANNEL?{channel:process.env.SKYJOURNEY_BROWSER_CHANNEL}:{}),headless:true});
 const results=[];
 try {
  async function pageFor(path,fail=false,options={}){
   const page=await browser.newPage({viewport:{width:390,height:844}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>route.request().url()===origin+'/haptics.js'?route.fulfill({status:200,contentType:'text/javascript',body:hapticModule}):route.request().url().startsWith(origin+'/')?route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}):route.abort());
   await page.addInitScript(({fail,options})=>{
    window.__test={urls:[],permissions:0,messages:[],angle:0,vibrations:[],rejectVibration:!!options.rejectVibration};
    Object.defineProperty(navigator,'vibrate',{value:options.unsupportedVibration?undefined:pattern=>{window.__test.vibrations.push({pattern,now:performance.now()});return !window.__test.rejectVibration},configurable:true});
    if(options.blockedStorage)Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage blocked','SecurityError')},configurable:true});
    Object.defineProperty(screen.orientation,'angle',{get:()=>window.__test.angle,configurable:true});
    class Socket extends EventTarget {
     static OPEN=1;readyState=1;
     constructor(url){super();window.__test.socket=this;window.__test.urls.push(url);setTimeout(()=>{if(fail&&window.__test.urls.length===1){this.readyState=3;this.dispatchEvent(new Event('error'));this.dispatchEvent(new Event('close'))}else this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'paired',hostConnected:true})}));},0)}
     send(message){window.__test.messages.push(JSON.parse(message))}close(){this.readyState=3;this.dispatchEvent(new Event('close'))}
    }
    window.WebSocket=Socket;
    window.DeviceOrientationEvent=class { static requestPermission(){window.__test.permissions++;return Promise.resolve('granted')} };
    Object.defineProperty(navigator,'wakeLock',{value:{request:async()=>({release:async()=>{}})},configurable:true});
   },{fail,options});
   await page.goto(origin+path);await page.waitForTimeout(30);
   return {page,errors};
  }
  var {page,errors}=await pageFor('/controller?view=phone#pin=012345&controls=yoke');
  assert.equal(await page.locator('#pin').inputValue(),'012345','URL should prefill the PIN');
  assert.equal(await page.locator('#flight').isVisible(),true,'valid link should open controller');
  assert.equal(await page.evaluate(()=>window.__test.urls.length),1,'link pairs once');
  assert.equal(await page.evaluate(()=>window.__test.permissions),0,'link does not grant motion permission');
  assert.equal(page.url(),origin+'/controller?view=phone#controls=yoke','PIN is removed and other URL data remains');
  assert.deepEqual(errors,[]);await page.locator('#sensors').click();
  assert.equal(await page.evaluate(()=>window.__test.permissions),1,'motion permission waits for activation button');
  results.push('valid deep link auto-pairs once, cleans URL, preserves query/hash and waits for sensor gesture');await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'skyjourney-qr-phone.png'),fullPage:true});await page.close();
  for (const parameter of ['', '?pin=12345', '?pin=1234567', '?pin=12345x', '?pin=%EF%BC%91%EF%BC%92%EF%BC%93%EF%BC%94%EF%BC%95%EF%BC%96', '#pin=12345', '#pin=1234567', '#pin=12345x', '#pin=%EF%BC%91%EF%BC%92%EF%BC%93%EF%BC%94%EF%BC%95%EF%BC%96']){
   ({page,errors}=await pageFor('/controller'+parameter));
   assert.equal(await page.evaluate(()=>window.__test.urls.length),0,'invalid/missing PIN must not connect '+parameter);
   assert.equal(await page.locator('#pin').inputValue(),'');assert.equal(await page.locator('#pairing').isVisible(),true);
   assert.equal(new URL(page.url()).searchParams.has('pin'),false);assert.deepEqual(errors,[]);await page.close();
  }
  results.push('missing, short, long, alphabetic and non-ASCII query/hash PINs keep the manual form');
  ({page,errors}=await pageFor('/controller?pin=112233&view=phone#controls'));
  assert.equal(await page.locator('#flight').isVisible(),true);assert.equal(await page.locator('#pin').inputValue(),'112233');assert.equal(page.url(),origin+'/controller?view=phone#controls');assert.equal(await page.evaluate(()=>window.__test.urls.length),1);assert.deepEqual(errors,[]);await page.close();
  ({page,errors}=await pageFor('/controller?pin=112233#pin=445566'));
  assert.equal(await page.locator('#pin').inputValue(),'445566');assert.equal(page.url(),origin+'/controller');assert.equal(await page.evaluate(()=>window.__test.urls.length),1);assert.deepEqual(errors,[]);await page.close();
  results.push('query compatibility works; hash PIN takes precedence and both URL PINs are removed');
  ({page,errors}=await pageFor('/controller'));
  await page.locator('#pin').fill('654321');await page.locator('#connect').click();
  await page.waitForTimeout(30);assert.equal(await page.locator('#flight').isVisible(),true);
  assert.equal(await page.evaluate(()=>window.__test.urls.length),1);assert.match(await page.evaluate(()=>window.__test.urls[0]),/pin=654321$/);assert.deepEqual(errors,[]);
  results.push('manual pairing remains usable');await page.close();
  ({page,errors}=await pageFor('/controller?pin=123456',true));
  assert.equal(await page.locator('#pairing').isVisible(),true);assert.equal(await page.locator('#connect').isEnabled(),true);
  assert.match(await page.locator('#error').textContent(),/No se pudo conectar/);
  await page.locator('#pin').fill('654321');await page.locator('#connect').click();await page.waitForTimeout(30);
  assert.equal(await page.locator('#flight').isVisible(),true);assert.equal(await page.evaluate(()=>window.__test.urls.length),2);assert.deepEqual(errors,[]);
  results.push('failed automatic pairing shows feedback and permits manual retry');await page.close();
  ({page,errors}=await pageFor('/controller#pin=123456'));
  await page.locator('#options summary').click();
  assert.equal(await page.locator('#invert-motion-x').count(),1,'controller exposes roll inversion');assert.equal(await page.locator('#invert-motion-z').count(),1,'controller exposes rudder inversion');
  assert.equal(await page.locator('#invert-motion-y').count(),1,'controller exposes an accelerometer Y-axis inversion option');
  assert.equal(await page.locator('#invert-motion-y').isChecked(),false,'Y-axis inversion defaults off');
  await page.locator('#sensors').click();
  async function orientation(beta,gamma,alpha=null){await page.evaluate(({beta,gamma,alpha})=>{const event=new Event('deviceorientation');Object.defineProperties(event,{beta:{value:beta},gamma:{value:gamma},alpha:{value:alpha}});window.dispatchEvent(event)},{beta,gamma,alpha})}
  async function inputWith(pitchSign,rollSign){
   await page.waitForFunction(({pitchSign,rollSign})=>{const input=window.__test.messages.findLast(m=>m.type==='input');return input&&input.pitch*pitchSign>.35&&input.roll*rollSign>.35},{pitchSign,rollSign},{timeout:750});
   return page.evaluate(()=>window.__test.messages.findLast(m=>m.type==='input'));
  }
  await orientation(10,4);await orientation(22,16);
  const normal=await inputWith(-1,1);
  await page.locator('#invert-motion-y').check();
  const inverted=await inputWith(1,1);
  assert.ok(Math.abs(normal.roll-inverted.roll)<.12,'inverting a held tilt leaves roll unchanged without another sensor event');
  assert.ok(Math.abs(normal.pitch+inverted.pitch)<.12,'inverting a held tilt promptly reverses pitch without another sensor event');
  await page.locator('#calibrate').click();await orientation(22,16);await page.waitForTimeout(250);
  let sample=await page.evaluate(()=>window.__test.messages.findLast(m=>m.type==='input'));
  assert.ok(Math.abs(sample.pitch)<.01&&Math.abs(sample.roll)<.01,'centering remains neutral with inversion enabled');
  await page.reload();await page.locator('#pin').fill('123456');await page.locator('#connect').click();await page.locator('#flight').waitFor({state:'visible'});await page.locator('#options summary').click();
  assert.equal(await page.locator('#invert-motion-y').isChecked(),true,'inversion persists after reload');
  await page.locator('#sensors').click();await orientation(10,4);await orientation(22,16);await inputWith(1,1);
  await page.evaluate(()=>{window.__test.angle=90;screen.orientation.dispatchEvent(new Event('change'))});await page.waitForTimeout(300);
  await orientation(10,28);await inputWith(-1,-1);
  results.push('sensor pitch inversion preserves roll, applies to held tilt, survives reload and works after landscape calibration');
  await page.locator('#sensors').click();
  const pad=await page.locator('#pad').boundingBox(),touchPoint={x:pad.x+pad.width*.7,y:pad.y+pad.height*.7};
  await page.mouse.move(touchPoint.x,touchPoint.y);await page.mouse.down();const touchInverted=await inputWith(1,1);
  await page.locator('#invert-motion-y').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#invert-motion-y').isChecked(),false);const touchNormal=await inputWith(1,1);
  assert.ok(touchNormal.pitch>0&&touchInverted.pitch>0,'inversion does not reverse touch pitch');
  await page.mouse.up();assert.deepEqual(errors,[]);results.push('touch joystick keeps its original direction with either inversion setting');await page.close();
  ({page,errors}=await pageFor('/controller#pin=123456'));await page.locator('#options summary').click();
  assert.equal(await page.locator('#invert-motion-x').isChecked(),false);assert.equal(await page.locator('#invert-motion-z').isChecked(),false);
  await page.locator('#sensors').click();await orientation(10,4,350);await orientation(22,16,2);
  async function yawWith(sign,threshold=.24){await page.waitForFunction(({sign,threshold})=>{const input=window.__test.messages.findLast(m=>m.type==='input');return input&&input.yaw*sign>threshold},{sign,threshold},{timeout:750});return page.evaluate(()=>window.__test.messages.findLast(m=>m.type==='input'))}
  const axesNormal=await yawWith(-1);assert.ok(axesNormal.pitch<-.24&&axesNormal.roll>.24,'normal pitch, roll and rudder follow the sampled axes');
  await page.locator('#invert-motion-x').check();await page.locator('#invert-motion-z').check();const axesInverted=await yawWith(1);assert.ok(axesInverted.pitch<-.24&&axesInverted.roll<-.24,'held X/Z inversion reverses only roll and rudder without another reading');
  await page.locator('#calibrate').click();await page.waitForTimeout(60);sample=await page.evaluate(()=>window.__test.messages.findLast(m=>m.type==='input'));assert.ok(Math.abs(sample.pitch)<.01&&Math.abs(sample.roll)<.01&&Math.abs(sample.yaw)<.01,'centering neutralizes all three axes');
  await orientation(22,16,null);await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>window.__test.messages.findLast(m=>m.type==='input').yaw),0,'missing heading has zero rudder');
  await orientation(22,16,180);await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>window.__test.messages.findLast(m=>m.type==='input').yaw),0,'first restored heading adopts a neutral without jump');await orientation(22,16,190);await yawWith(1,.2);
  await page.reload();await page.locator('#pin').fill('123456');await page.locator('#connect').click();await page.locator('#flight').waitFor({state:'visible'});await page.locator('#options summary').click();assert.equal(await page.locator('#invert-motion-x').isChecked(),true);assert.equal(await page.locator('#invert-motion-z').isChecked(),true);
  await page.locator('#deadzone').focus();await page.keyboard.press('Home');await page.locator('#sensors').click();await orientation(10,4,359);await orientation(10,4,1);const wrapped=await yawWith(1,.02);assert.ok(wrapped.yaw<.07,'heading wraps 359→1 as two degrees instead of a full turn');
  await page.locator('#invert-motion-z').uncheck();const reversedWrap=await yawWith(-1,.02);assert.ok(Math.abs(reversedWrap.pitch)<.01&&Math.abs(reversedWrap.roll)<.01,'reversing held rudder keeps pitch and roll neutral');
  await page.locator('#invert-motion-z').check();await page.evaluate(()=>{window.__test.angle=90;screen.orientation.dispatchEvent(new Event('change'))});await page.waitForTimeout(300);await orientation(10,4,11);await yawWith(1,.2);
  await orientation(10,4,NaN);await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>window.__test.messages.findLast(m=>m.type==='input').yaw),0,'nonfinite heading zeroes rudder safely');
  await page.locator('#sensors').click();await page.locator('#pad').scrollIntoViewIfNeeded();const axesPad=await page.locator('#pad').boundingBox();await page.mouse.move(axesPad.x+axesPad.width*.7,axesPad.y+axesPad.height*.7);await page.mouse.down();const axesTouch=await inputWith(1,1);assert.equal(axesTouch.yaw,0,'touch joystick has no sensor rudder');
  await page.locator('#invert-motion-x').focus();await page.keyboard.press('Space');await page.locator('#invert-motion-z').focus();await page.keyboard.press('Space');const axesTouchNormal=await inputWith(1,1);assert.equal(axesTouchNormal.yaw,0,'X/Z preferences do not change touch input');await page.mouse.up();assert.deepEqual(errors,[]);await page.close();results.push('X/Z sensor inversions persist, reverse held roll/rudder, wrap heading, calibrate all axes and preserve touch');
  ({page,errors}=await pageFor('/controller#pin=123456'));await page.locator('#options summary').click();
  assert.equal(await page.locator('#haptic-intensity').count(),1,'phone exposes adjustable haptic intensity');
  assert.equal(await page.locator('#haptic-test').count(),1,'phone exposes a haptic test button');
  assert.equal(await page.locator('#haptic-status').count(),1,'phone exposes vibration capability feedback');
  async function telemetry(values={}){await page.evaluate(values=>{window.__test.socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'telemetry',ias:250,altitude:10000,heading:180,vs:0,ap:false,gear:0,flaps:0,status:'En vuelo',roll:0,pitch:0,throttle:.62,paused:!!values.paused,haptics:{connected:true,paused:false,onGround:false,stall:false,loadFactor:1,controlPitch:0,controlRoll:0,ias:250,turbulence:0,storm:0,verticalAcceleration:0,...values}})}))},values)}
  async function clearVibrations(){await page.evaluate(()=>window.__test.vibrations=[])}
  async function positiveVibration(){await page.waitForFunction(()=>window.__test.vibrations.some(({pattern})=>Array.isArray(pattern)?pattern.some(n=>n>0):pattern>0),null,{timeout:900})}
  async function cancelled(){assert.equal(await page.evaluate(()=>window.__test.vibrations.at(-1)?.pattern),0,'active motor pulse is cancelled immediately')}
  await clearVibrations();await page.locator('#haptic-test').click();assert.match(await page.locator('#haptic-status').textContent(),/Esperando.*telemetría/,'manual vibration waits for flight telemetry');assert.equal(await page.evaluate(()=>window.__test.vibrations.some(({pattern})=>Array.isArray(pattern)?pattern.some(n=>n>0):pattern>0)),false);
  await clearVibrations();await telemetry();await page.evaluate(()=>new Promise(requestAnimationFrame));
  await page.locator('#haptic-test').click();await positiveVibration();assert.match(await page.locator('#haptic-status').textContent(),/Prueba enviada/);
  await page.waitForTimeout(250);await clearVibrations();await telemetry();
  await page.locator('#pad').focus();await page.keyboard.down('ArrowDown');await positiveVibration();
  await page.keyboard.up('ArrowDown');await page.waitForTimeout(350);await clearVibrations();await telemetry({turbulence:.8,storm:1,verticalAcceleration:3});await positiveVibration();
  results.push('phone motor responds to control movement and storm/turbulence telemetry');
  await page.locator('#vibration').uncheck();await cancelled();await clearVibrations();await telemetry({turbulence:1,storm:1});await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.__test.vibrations.filter(({pattern})=>Array.isArray(pattern)?pattern.some(n=>n>0):pattern>0).length),0,'disabled haptics stay silent');
  await page.locator('#vibration').check();await clearVibrations();await telemetry({turbulence:1,storm:1});await positiveVibration();
  await page.locator('#haptic-intensity').focus();await page.keyboard.press('Home');await cancelled();
  for(let step=0;step<7;step++)await page.keyboard.press('ArrowRight');await clearVibrations();await telemetry({turbulence:1,storm:1});await positiveVibration();
  await telemetry({paused:true,turbulence:1,storm:1});await cancelled();await clearVibrations();await page.locator('#haptic-test').click();await page.waitForTimeout(180);
  assert.equal(await page.evaluate(()=>window.__test.vibrations.some(({pattern})=>Array.isArray(pattern)?pattern.some(n=>n>0):pattern>0)),false,'pause also suppresses manual haptic test');
  await telemetry({turbulence:1,storm:1});await positiveVibration();await page.waitForTimeout(1150);await cancelled();
  results.push('off, zero intensity, pause and stale telemetry stop the phone motor');
  await page.reload();await page.locator('#pin').fill('123456');await page.locator('#connect').click();await page.locator('#flight').waitFor({state:'visible'});await page.locator('#options summary').click();
  assert.equal(await page.locator('#haptic-intensity').inputValue(),'0.35','haptic intensity survives reload');assert.equal(await page.locator('#vibration').isChecked(),true);
  await clearVibrations();await telemetry({turbulence:1,storm:1});await positiveVibration();await page.locator('#disconnect').click();await cancelled();assert.deepEqual(errors,[]);await page.close();
  results.push('haptic preferences survive reload and disconnect cancels the motor');
  ({page,errors}=await pageFor('/controller#pin=123456'));await page.locator('#options summary').click();await clearVibrations();await telemetry({turbulence:1,storm:1});await positiveVibration();
  await clearVibrations();await page.locator('#haptic-test').click();await page.waitForFunction(()=>window.__test.vibrations.some(({pattern})=>Array.isArray(pattern)&&JSON.stringify(pattern)==='[19,60,14]'),null,{timeout:250});assert.match(await page.locator('#haptic-status').textContent(),/Prueba enviada/);results.push('manual vibration immediately preempts active storm feedback');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))});await cancelled();await clearVibrations();await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.__test.vibrations.some(({pattern})=>Array.isArray(pattern)?pattern.some(n=>n>0):pattern>0)),false,'hidden controller stays silent');assert.deepEqual(errors,[]);await page.close();results.push('hiding the controller stops and silences the motor');
  ({page,errors}=await pageFor('/controller#pin=123456',false,{unsupportedVibration:true}));await page.locator('#options summary').click();assert.equal(await page.locator('#haptic-test').isDisabled(),true);assert.match(await page.locator('#haptic-status').textContent(),/no ofrece vibración/);assert.deepEqual(errors,[]);await page.close();
  ({page,errors}=await pageFor('/controller#pin=123456',false,{rejectVibration:true}));await page.locator('#options summary').click();await telemetry();await page.evaluate(()=>new Promise(requestAnimationFrame));await clearVibrations();await page.locator('#haptic-test').click();assert.equal(await page.evaluate(()=>window.__test.vibrations.some(({pattern})=>Array.isArray(pattern)?pattern.some(n=>n>0):pattern>0)),true,'rejected fixture actually invokes the vibration API');assert.match(await page.locator('#haptic-status').textContent(),/no habilitó la vibración/);assert.deepEqual(errors,[]);await page.close();
  results.push('unsupported and blocked vibration show clear feedback without controller errors');
  ({page,errors}=await pageFor('/controller#pin=123456'));await telemetry({turbulence:1,storm:1});await page.waitForTimeout(180);assert.deepEqual(await page.evaluate(()=>window.__test.vibrations),[],'no native vibration calls precede user interaction');await page.locator('#options summary').click();await page.locator('#haptic-test').click();await positiveVibration();assert.deepEqual(errors,[]);await page.close();results.push('vibration API waits for user activation and then responds to a native button gesture');
  ({page,errors}=await pageFor('/controller#pin=123456',false,{blockedStorage:true}));await page.locator('#options summary').click();await page.locator('#invert-motion-y').check();await page.locator('#vibration').uncheck();assert.equal(await page.locator('#invert-motion-y').isChecked(),true);assert.equal(await page.locator('#vibration').isChecked(),false);assert.deepEqual(errors,[]);await page.close();results.push('blocked local storage does not prevent sensor or haptic setting changes');
  console.log(JSON.stringify({passed:results,browser:await browser.version()},null,2));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});


