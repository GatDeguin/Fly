const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const number=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const clock=()=>globalThis.performance?.now?.()??Date.now();

// Browsers expose pulse timing, not motor amplitude or physical force feedback.
export function createFlightHaptics({vibrate=globalThis.navigator?.vibrate?.bind(globalThis.navigator),isVisible=()=>true}={}){
 let enabled=true,intensity=.65,busyUntil=-Infinity,nextAt=-Infinity,priority=0;
 let suspended=false,cancelled=true,wasGround=null,sequence=0,lastNow=-Infinity;
 const history=[];
 const available=()=>typeof vibrate==='function';
 const visible=()=>{try{return isVisible()!==false;}catch{return false;}};
 function stop(){
  if(!cancelled&&available()){try{vibrate(0);}catch{}}
  cancelled=true;suspended=true;wasGround=null;busyUntil=-Infinity;nextAt=-Infinity;priority=0;
 }
 function configure(options={}){
  if(typeof options.enabled==='boolean')enabled=options.enabled;
  if(Number.isFinite(options.intensity))intensity=clamp(options.intensity,0,1);
  if(!enabled||intensity===0)stop();
 }
 function timing(now){
  now=Number.isFinite(now)?now:clock();
  if(now<lastNow){busyUntil=-Infinity;nextAt=-Infinity;priority=0;history.length=0;wasGround=null;}
  lastNow=now;
  while(history.length&&history[0].at<=now-2000)history.shift();
  return now;
 }
 function pattern(raw){
  const values=typeof raw==='number'?[raw]:Array.isArray(raw)?raw.slice(0,9):[];
  if(!values.length||values.some(ms=>!Number.isFinite(ms)||ms<0))return null;
  while(values.length&&values.length%2===0)values.pop();
  const result=values.map((ms,index)=>index%2?Math.round(clamp(ms,20,300)):Math.round(clamp(ms,0,100)*intensity));
  const on=result.reduce((sum,ms,index)=>sum+(index%2===0?ms:0),0);
  if(!on)return null;
  if(on>180)for(let index=0;index<result.length;index+=2)result[index]=Math.floor(result[index]*180/on);
  return result;
 }
 function emit(raw,level,interval,now){
  if(!available())return false;
  if(now<busyUntil&&!(level>=4&&level>priority))return false;
  if(now<nextAt&&!(level>=4&&level>priority))return false;
  const pulses=pattern(raw);
  if(!pulses)return false;
  const on=pulses.reduce((sum,ms,index)=>sum+(index%2===0?ms:0),0);
  // At most 400 ms of requested motor time in any two-second scheduling window.
  if(history.reduce((sum,item)=>sum+item.on,0)+on>400)return false;
  let accepted=false;
  try{accepted=vibrate(pulses)!==false;}catch{}
  if(!accepted){nextAt=now+500;return false;}
  const duration=pulses.reduce((sum,ms)=>sum+ms,0);
  busyUntil=now+duration;nextAt=now+Math.max(duration+220,interval);priority=level;
  cancelled=false;history.push({at:now,on});sequence++;
  return true;
 }
 function event(raw,now=clock(),{manual=false}={}){
  if(!enabled||intensity===0||!visible()){stop();return false;}
  if(suspended)return false;
  return emit(raw,manual?6:3,650,timing(now));
 }
 function update(sample={},now=clock()){
  if(!enabled||intensity===0||sample.paused||sample.connected===false||!visible()){stop();return false;}
  suspended=false;now=timing(now);
  const ground=sample.onGround===true;
  const landed=wasGround===false&&ground;
  wasGround=ground;
  if(landed){
   const sink=clamp(number(sample.touchdownRate),0,6000);
   if(sink>80){const severity=clamp(sink/1000,0,1);return emit([25+65*severity,85,15+45*severity],5,1100,now);}
  }
  if(ground)return false;
  if(sample.stall)return emit([70,110,70],4,1000+350*(1-intensity),now);
  const turbulence=clamp(number(sample.turbulence),0,1);
  const storm=clamp(number(sample.storm),0,1);
  const acceleration=Math.abs(number(sample.verticalAcceleration));
  const roughness=Math.max(clamp((turbulence-.1)/.9,0,1),clamp((acceleration-.5)/12,0,1));
  if(storm>.15||roughness>.1){
   const severity=Math.max(storm,roughness);
   const pulses=storm>.15
    ?[18+severity*18,65+(sequence%3)*25,24+severity*20,115-(sequence%2)*20,10+severity*12]
    :[14+severity*32,105+(sequence%3)*35,9+severity*17];
   return emit(pulses,2,430+430*(1-severity)+500*(1-intensity),now);
  }
  const control=Math.max(Math.abs(number(sample.controlPitch)),Math.abs(number(sample.controlRoll)),Math.abs(number(sample.controlYaw)));
  const pressure=clamp(number(sample.ias)/180,0,1);
  const load=Math.abs(number(sample.loadFactor,1)-1);
  const maneuver=clamp(Math.max(control*pressure,load/1.5,acceleration/12),0,1);
  if(maneuver>.18)return emit([10+35*maneuver],1,650+650*(1-intensity)+300*(1-maneuver),now);
  return false;
 }
 return {configure,update,event,stop,get supported(){return available();}};
}



