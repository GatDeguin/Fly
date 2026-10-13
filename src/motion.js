const clamp=v=>Math.max(-1,Math.min(1,v));
export function tiltAxes(beta,gamma,angle=0){const a=angle*Math.PI/180;return {pitch:beta*Math.cos(a)-gamma*Math.sin(a),roll:gamma*Math.cos(a)+beta*Math.sin(a)};}
export function createMotion(onStatus=()=>{}){
 let enabled=false,latest=null,neutral=null,output={pitch:0,roll:0,yaw:0},last=0;
 const read=e=>{
  if(!Number.isFinite(e.beta)||!Number.isFinite(e.gamma))return;
  const alpha=Number.isFinite(e.alpha)?e.alpha:null;
  latest={...tiltAxes(e.beta,e.gamma,screen.orientation?.angle??window.orientation??0),alpha};last=performance.now();
  if(!neutral)neutral={...latest};
  else if(alpha===null){neutral.alpha=null;output.yaw=0;}
  else if(!Number.isFinite(neutral.alpha)){neutral.alpha=alpha;output.yaw=0;}
 };
 const rotate=()=>{neutral=null;latest=null;output={pitch:0,roll:0,yaw:0};};
 screen.orientation?.addEventListener('change',rotate);window.addEventListener('orientationchange',rotate);
 async function enable(){if(enabled){enabled=false;output={pitch:0,roll:0,yaw:0};onStatus('Tilt controls off');return false;}if(!window.isSecureContext){onStatus('Phone tilt requires HTTPS. Use the local Wi-Fi launcher or an HTTPS published copy.');return false;}if(typeof DeviceOrientationEvent==='undefined'){onStatus('Motion sensors unavailable; the touch joystick remains available.');return false;}try{if(typeof DeviceOrientationEvent.requestPermission==='function'){if(await DeviceOrientationEvent.requestPermission()!=='granted'){onStatus('Motion permission was declined.');return false;}}window.addEventListener('deviceorientation',read);enabled=true;neutral=null;onStatus('Hold your phone comfortably, then calibrate. Tilt controls on; autopilot off.');return true;}catch(e){onStatus('Motion could not start: '+e.message);return false;}}
 function calibrate(){if(latest){neutral={...latest};onStatus('Neutral position calibrated');}else onStatus('Waiting for a motion reading. Check your browser sensor permission.');}
 function update(dt,sensitivity=1,deadzone=.06,invertY=false,invertX=false,invertZ=false){
  if(!enabled||!latest||!neutral||performance.now()-last>1000)return {pitch:0,roll:0,yaw:0,active:false};
  const wrap=v=>((v+180)%360+360)%360-180;
  const axis=(v,range=24)=>{v=clamp(wrap(v)/range*sensitivity);return Math.abs(v)<deadzone?0:Math.sign(v)*(Math.abs(v)-deadzone)/(1-deadzone);};
  const p=-axis(latest.pitch-neutral.pitch),r=axis(latest.roll-neutral.roll),f=1-Math.exp(-dt*10);
  output.pitch+=(p-output.pitch)*f;output.roll+=(r-output.roll)*f;
  // Alpha increases counterclockwise; positive aircraft yaw turns right.
  if(Number.isFinite(latest.alpha)&&Number.isFinite(neutral.alpha)){const y=-axis(latest.alpha-neutral.alpha,30);output.yaw+=(y-output.yaw)*f;}else output.yaw=0;
  return {...output,pitch:invertY?-output.pitch:output.pitch,roll:invertX?-output.roll:output.roll,yaw:invertZ?-output.yaw:output.yaw,active:true};
 }
 return {enable,calibrate,update,get enabled(){return enabled;},dispose(){window.removeEventListener('deviceorientation',read);window.removeEventListener('orientationchange',rotate);screen.orientation?.removeEventListener('change',rotate);}};
}
