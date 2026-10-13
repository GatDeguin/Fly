import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlightHaptics} from '../src/haptics.js';

const cruise={connected:true,paused:false,onGround:false,stall:false,touchdownRate:0,loadFactor:1,controlPitch:0,controlRoll:0,ias:180,turbulence:0,storm:0,verticalAcceleration:0};
const onTime=pattern=>Array.isArray(pattern)?pattern.reduce((sum,ms,index)=>sum+(index%2===0?ms:0),0):pattern;
function recorder(options={}){
 const calls=[];
 const engine=createFlightHaptics({vibrate:pattern=>{calls.push(pattern);return true;},...options});
 engine.configure({enabled:true,intensity:1});
 return {engine,calls};
}

test('calm straight flight and incomplete telemetry stay quiet',()=>{
 const {engine,calls}=recorder();
 for(let now=0;now<5000;now+=16)engine.update(cruise,now);
 engine.update({},6000);
 engine.update({controlPitch:NaN,controlRoll:Infinity,turbulence:'invalid'},7000);
 assert.deepEqual(calls,[]);
});

test('maneuver feedback reacts to both control directions and stronger aerodynamic load',()=>{
 const left=recorder(),right=recorder(),pitch=recorder(),heavy=recorder();
 assert.equal(left.engine.update({...cruise,controlRoll:-.55},0),true);
 assert.equal(right.engine.update({...cruise,controlRoll:.55},0),true);
 assert.equal(pitch.engine.update({...cruise,controlPitch:-.75},0),true);
 assert.equal(heavy.engine.update({...cruise,controlRoll:.95,loadFactor:2.5},0),true);
 assert.equal(onTime(left.calls[0]),onTime(right.calls[0]));
 assert.ok(onTime(heavy.calls[0])>onTime(left.calls[0]));
 const parked=recorder();
 parked.engine.update({...cruise,onGround:true,ias:0,controlRoll:1,controlPitch:1},0);
 assert.deepEqual(parked.calls,[]);
});

test('turbulence and storms produce bounded distinct pulses with greater severity',()=>{
 const mild=recorder(),storm=recorder();
 mild.engine.update({...cruise,turbulence:.25,verticalAcceleration:1},0);
 storm.engine.update({...cruise,turbulence:.9,storm:1,verticalAcceleration:5},0);
 assert.ok(mild.calls.length>0);
 assert.ok(storm.calls[0].length>mild.calls[0].length);
 assert.ok(onTime(storm.calls[0])>onTime(mild.calls[0]));
 assert.ok(storm.calls[0].every(ms=>ms<=300));
 assert.ok(onTime(storm.calls[0])<=180);
});

test('updates preserve active patterns instead of restarting vibration each frame',()=>{
 const {engine,calls}=recorder();
 const weather={...cruise,turbulence:.8,storm:.9};
 engine.update(weather,0);
 for(let now=16;now<400;now+=16)engine.update(weather,now);
 assert.equal(calls.length,1);
 engine.update(weather,1600);
 assert.equal(calls.length,2);
});

test('intensity reduces pulse duration and repetition without claiming amplitude control',()=>{
 const soft=recorder(),strong=recorder();
 soft.engine.configure({intensity:.25});
 for(let now=0;now<=3000;now+=50){
  soft.engine.update({...cruise,turbulence:.7,storm:.8},now);
  strong.engine.update({...cruise,turbulence:.7,storm:.8},now);
 }
 assert.ok(soft.calls.length>0);
 assert.ok(onTime(soft.calls[0])<onTime(strong.calls[0]));
 assert.ok(soft.calls.length<strong.calls.length);
});

test('stall warnings preempt a maneuver once and then obey warning cadence',()=>{
 const {engine,calls}=recorder();
 engine.update({...cruise,controlRoll:.5},0);
 assert.equal(engine.update({...cruise,stall:true},20),true);
 assert.ok(Array.isArray(calls[1])&&calls[1].length>=3);
 for(let now=40;now<800;now+=20)engine.update({...cruise,stall:true},now);
 assert.equal(calls.length,2);
 engine.update({...cruise,stall:true},1400);
 assert.equal(calls.length,3);
});

test('touchdown feedback occurs once on a real transition and scales with sink rate',()=>{
 const soft=recorder(),hard=recorder();
 soft.engine.update({...cruise,onGround:true,touchdownRate:400},0);
 assert.deepEqual(soft.calls,[]);
 soft.engine.update(cruise,1000);
 soft.engine.update({...cruise,onGround:true,touchdownRate:180},1100);
 soft.engine.update({...cruise,onGround:true,touchdownRate:180},2500);
 assert.equal(soft.calls.length,1);
 hard.engine.update(cruise,0);
 hard.engine.update({...cruise,onGround:true,touchdownRate:1000,stall:true},100);
 assert.ok(onTime(hard.calls[0])>onTime(soft.calls[0]));
});

test('pause and disconnect cancel only once and do not invent touchdown on resume',()=>{
 for(const inactive of [{paused:true},{connected:false}]){
  const {engine,calls}=recorder();
  engine.update({...cruise,storm:1},0);
  engine.update({...cruise,...inactive},20);
  engine.update({...cruise,...inactive},40);
  assert.equal(calls.filter(pattern=>pattern===0).length,1);
  assert.equal(engine.event([40],60),false);
  engine.update({...cruise,onGround:true,touchdownRate:1000},1000);
  assert.equal(calls.length,2);
  engine.update({...cruise,onGround:false,controlRoll:.8},2000);
  assert.equal(calls.length,3);
 }
});

test('hidden documents and explicit stop cancel immediately with no repeated zero calls',()=>{
 let visible=true;
 const {engine,calls}=recorder({isVisible:()=>visible});
 engine.update({...cruise,turbulence:1},0);
 visible=false;
 engine.update({...cruise,turbulence:1},20);
 engine.update({...cruise,turbulence:1},40);
 engine.stop();engine.stop();
 assert.equal(calls.filter(pattern=>pattern===0).length,1);
 assert.equal(engine.event([40],1000),false);
 visible=true;
 engine.update(cruise,1200);
 assert.equal(engine.event([40],1300),true);
 engine.stop();
 assert.equal(engine.event([40],2000),false);
});

test('disabled or zero intensity cancel vibration and identical configuration preserves cadence',()=>{
 for(const setting of [{enabled:false},{intensity:0}]){
  const {engine,calls}=recorder();
  engine.update({...cruise,storm:1},0);
  engine.configure(setting);engine.configure(setting);
  engine.update({...cruise,storm:1},1000);
  assert.equal(calls.filter(pattern=>pattern===0).length,1);
  assert.equal(engine.event([30],2000),false);
 }
 const {engine,calls}=recorder();
 engine.update({...cruise,storm:1},0);
 engine.configure({enabled:true,intensity:1});
 engine.update({...cruise,storm:1},50);
 assert.equal(calls.length,1);
});

test('event feedback validates and caps patterns while protecting warning patterns',()=>{
 const {engine,calls}=recorder();
 assert.equal(engine.event([100000,1,100000,1,100000],0),true);
 assert.ok(onTime(calls[0])<=180);
 assert.ok(calls[0].every(ms=>ms<=300));
 assert.equal(engine.event([30],10),false);
 assert.equal(engine.event([-10,NaN],1000),false);
 engine.update({...cruise,stall:true},1500);
 const count=calls.length;
 assert.equal(engine.event([40],1520),false);
 assert.equal(calls.length,count);
});

test('the sustained vibration duty cycle stays bounded even under event spam',()=>{
 const {engine,calls}=recorder();
 for(let now=0;now<2000;now+=10)engine.event([100,30,100,30,100],now);
 assert.ok(calls.length>0);
 assert.ok(calls.reduce((sum,pattern)=>sum+onTime(pattern),0)<=400);
});

test('unsupported or temporarily rejected vibration never throws and can recover after a gesture',()=>{
 const missing=createFlightHaptics({vibrate:null});
 assert.equal(missing.event([20],0),false);
 assert.doesNotThrow(()=>missing.stop());
 for(const failure of ['false','throw']){
  let accepted=false;
  const engine=createFlightHaptics({vibrate:()=>{if(accepted)return true;if(failure==='throw')throw new Error('blocked');return false;}});
  assert.equal(engine.event([20],0),false);
  accepted=true;
  assert.equal(engine.event([20],2000),true);
 }
});

test('an explicit manual preview preempts active flight feedback without bypassing stop or pulse limits',()=>{
 for(const flight of [{controlRoll:.8},{storm:1},{stall:true}]){
  const {engine,calls}=recorder();
  engine.update({...cruise,...flight},0);
  assert.equal(engine.event([35,60,55],20,{manual:true}),true);
  assert.equal(calls.length,2);
  for(let now=30;now<400;now+=10)assert.equal(engine.event([35,60,55],now,{manual:true}),false);
  assert.equal(calls.length,2);
  engine.stop();
  assert.equal(engine.event([35,60,55],2000,{manual:true}),false);
 }
 const {engine,calls}=recorder();
 for(let now=0;now<2000;now+=10)engine.event([100,30,100,30,100],now,{manual:true});
 assert.ok(calls.reduce((sum,pulse)=>sum+onTime(pulse),0)<=400);
});

test('startup disable and stop never touch vibration before any accepted pulse',()=>{
 const {engine,calls}=recorder();
 engine.configure({enabled:false});engine.stop();engine.stop();
 assert.deepEqual(calls,[],'an inactive startup must not call navigator.vibrate even with zero');
 engine.configure({enabled:true});engine.update(cruise,0);
 assert.equal(engine.event([35],10,{manual:true}),true);
 engine.configure({enabled:false});engine.configure({enabled:false});
 assert.equal(calls.length,2);
 assert.equal(calls[1],0,'a pulse that really started is still cancelled immediately');
});

test('rudder movement produces the same pressure feedback in either yaw direction while calm flight stays quiet',()=>{
 const left=recorder(),right=recorder(),roll=recorder(),calm=recorder();
 assert.equal(left.engine.update({...cruise,controlYaw:-.8},0),true);
 assert.equal(right.engine.update({...cruise,controlYaw:.8},0),true);
 assert.equal(roll.engine.update({...cruise,controlRoll:.8},0),true);
 assert.equal(onTime(left.calls[0]),onTime(right.calls[0]));
 assert.equal(onTime(right.calls[0]),onTime(roll.calls[0]));
 calm.engine.update({...cruise,controlYaw:0},0);
 assert.deepEqual(calm.calls,[]);
});
