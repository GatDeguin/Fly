import assert from 'node:assert/strict';
import {test} from 'node:test';
import {tiltAxes,createMotion} from '../src/motion.js';
assert.deepEqual(tiltAxes(20,10,0),{pitch:20,roll:10});
const landscape=tiltAxes(20,10,90);assert.ok(Math.abs(landscape.pitch+10)<1e-8);assert.ok(Math.abs(landscape.roll-20)<1e-8);
console.log('Motion: portrait and landscape sensor axes pass.');


test('inverting phone Y reverses held sensor pitch while preserving roll and calibration',async()=>{
 const names=['window','screen','DeviceOrientationEvent'];
 const original=names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name));
 const phone=new EventTarget(),orientation=Object.assign(new EventTarget(),{angle:0});
 Object.assign(phone,{isSecureContext:true});
 for(const [name,value] of [['window',phone],['screen',{orientation}],['DeviceOrientationEvent',class{}]])Object.defineProperty(globalThis,name,{value,configurable:true});
 const motion=createMotion();
 const reading=(beta,gamma)=>phone.dispatchEvent(Object.assign(new Event('deviceorientation'),{beta,gamma}));
 try{
  assert.equal(await motion.enable(),true);
  for(const pose of [{angle:0,neutral:[20,10],tilt:[26,22]},{angle:90,neutral:[20,10],tilt:[32,4]}]){
   orientation.angle=pose.angle;orientation.dispatchEvent(new Event('change'));
   reading(...pose.neutral);reading(...pose.tilt);
   const normal=motion.update(1,1,0,false);
   assert.ok(Math.abs(normal.pitch+.25)<.0001,'normal forward tilt lowers the nose');
   assert.ok(Math.abs(normal.roll-.5)<.0001,'lateral tilt banks right');
   const inverted=motion.update(1,1,0,true);
   assert.ok(Math.abs(inverted.pitch-.25)<.0001,'invert reverses an already held pitch immediately');
   assert.ok(Math.abs(inverted.roll-.5)<.0001,'invert preserves lateral bank');
   motion.calibrate();const centered=motion.update(1,1,0,true);
   assert.ok(Math.abs(centered.pitch)<.0001&&Math.abs(centered.roll)<.0001,'calibration still centers both axes');
  }
 }finally{
  motion.dispose();names.forEach((name,i)=>original[i]?Object.defineProperty(globalThis,name,original[i]):delete globalThis[name]);
 }
});

async function withMotion(run){
 const names=['window','screen','DeviceOrientationEvent'];
 const original=names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name));
 const phone=Object.assign(new EventTarget(),{isSecureContext:true});
 const orientation=Object.assign(new EventTarget(),{angle:0});
 for(const [name,value] of [['window',phone],['screen',{orientation}],['DeviceOrientationEvent',class{}]])Object.defineProperty(globalThis,name,{value,configurable:true});
 const motion=createMotion();
 const reading=(beta,gamma,alpha=null)=>phone.dispatchEvent(Object.assign(new Event('deviceorientation'),{beta,gamma,alpha}));
 const rotate=angle=>{orientation.angle=angle;orientation.dispatchEvent(new Event('change'));};
 try{assert.equal(await motion.enable(),true);await run({motion,reading,rotate});}
 finally{motion.dispose();names.forEach((name,i)=>original[i]?Object.defineProperty(globalThis,name,original[i]):delete globalThis[name]);}
}

test('inverting X and Z flips held roll and yaw immediately without changing sensor calibration',async()=>{
 await withMotion(({motion,reading})=>{
  reading(20,10,180);reading(26,22,195);
  const normal=motion.update(1,1,0);
  assert.ok(Math.abs(normal.pitch+.25)<.0001);
  assert.ok(Math.abs(normal.roll-.5)<.0001);
  assert.ok(Math.abs(normal.yaw+.5)<.0001,'counterclockwise alpha gives left rudder');
  const inverted=motion.update(0,1,0,false,true,true);
  assert.equal(inverted.pitch,normal.pitch);
  assert.equal(inverted.roll,-normal.roll,'X flips held bank with no new sensor reading');
  assert.equal(inverted.yaw,-normal.yaw,'Z flips held rudder with no smoothing lag');
  const all=motion.update(0,1,0,true,true,true);
  assert.equal(all.pitch,-normal.pitch);
  assert.equal(all.roll,-normal.roll);
  assert.equal(all.yaw,-normal.yaw);
  motion.calibrate();const centered=motion.update(1,1,0,true,true,true);
  assert.ok(Math.abs(centered.pitch)<.0001&&Math.abs(centered.roll)<.0001&&Math.abs(centered.yaw)<.0001);
 });
});

test('yaw wraps across north and screen rotation requires a fresh neutral on every axis',async()=>{
 await withMotion(({motion,reading,rotate})=>{
  reading(20,10,359);reading(20,10,1);
  const wrapped=motion.update(1,1,0);
  assert.ok(Math.abs(wrapped.yaw+2/30)<.0001,'359 to 1 is a two-degree turn rather than a full circle');
  rotate(90);
  assert.deepEqual(motion.update(1,1,0,true,true,true),{pitch:0,roll:0,yaw:0,active:false});
  reading(20,10,120);
  assert.deepEqual(motion.update(1,1,0),{pitch:0,roll:0,yaw:0,active:true});
  reading(32,4,135);
  const landscape=motion.update(1,1,0);
  assert.ok(Math.abs(landscape.pitch+.25)<.0001&&Math.abs(landscape.roll-.5)<.0001);
  assert.ok(Math.abs(landscape.yaw+.5)<.0001,'screen rotation preserves yaw sign');
 });
});

test('missing alpha preserves pitch and roll while later heading readings adopt a safe neutral',async()=>{
 await withMotion(({motion,reading})=>{
  reading(20,10,null);reading(26,22,null);
  const tiltOnly=motion.update(1,1,0);
  assert.ok(Math.abs(tiltOnly.pitch+.25)<.0001&&Math.abs(tiltOnly.roll-.5)<.0001);
  assert.equal(tiltOnly.yaw,0);
  reading(26,22,90);assert.equal(motion.update(1,1,0).yaw,0,'first available compass reading does not turn the plane');
  reading(26,22,105);assert.ok(Math.abs(motion.update(1,1,0).yaw+.5)<.0001);
  reading(26,22,NaN);const unavailable=motion.update(.001,1,0);
  assert.equal(unavailable.yaw,0,'missing heading immediately releases rudder');
  assert.ok(Math.abs(unavailable.pitch+.25)<.0001&&Math.abs(unavailable.roll-.5)<.0001);
  reading(26,22,130);assert.equal(motion.update(1,1,0).yaw,0,'restored compass readings also start centered');
 });
});
