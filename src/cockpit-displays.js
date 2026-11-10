// Instrument painting stays separate from the airframe, lighting and simulation.
const RAD = Math.PI / 180, FT = 3.280839895, KT = 1.943844492, NM = 1852;
const PALETTE = {
  black: '#060d18', panel: '#101d2a', line: '#466170', muted: '#a2bdc9', ink: '#edf8f7',
  cyan: '#7ee8f0', green: '#8bf1b4', magenta: '#f5a0eb', amber: '#ffce80', red: '#ff7774',
};
const SIZE = { pfd: [720,620], nd: [760,620], engines: [680,620], systems: [590,620], ap: [1200,160] };
const finite = Number.isFinite;
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const number = (value, fallback = 0) => finite(value) ? value : fallback;
const modulo = (value, max) => ((value % max) + max) % max;
const signedDegrees = value => modulo(value + 180,360) - 180;
const heading = radians => modulo(radians / RAD,360);
const integer = value => finite(value) ? String(Math.round(value)) : '—';
const fixed = (value, places = 1) => finite(value) ? value.toFixed(places) : '—';
const compass = value => finite(value) ? String(modulo(Math.round(value),360)).padStart(3,'0') : '—';
const signed = value => finite(value) ? `${value > 0 ? '+' : ''}${Math.round(value)}` : '—';
const point = value => value && finite(value.x) && finite(value.z);

export function projectHeadingUp(origin, angle, target) {
  const dx = target.x - origin.x, dz = target.z - origin.z;
  const c = Math.cos(angle), s = Math.sin(angle);
  return { right: dx*c + dz*s, ahead: dx*s - dz*c };
}

export function getCockpitTelemetry(state = {}, ap = {}, world = {}) {
  const position = point(state.position) ? state.position : null;
  const angle = finite(state.heading) ? state.heading : null;
  const track = point(state.velocity) && Math.hypot(state.velocity.x,state.velocity.z) > .5
    ? heading(Math.atan2(state.velocity.x,-state.velocity.z)) : null;
  const windKnots = point(state.wind) ? Math.hypot(state.wind.x,state.wind.z) * KT : null;
  const windFrom = windKnots > .5 ? heading(Math.atan2(-state.wind.x,state.wind.z)) : null;
  const waypoints = Array.isArray(world.waypoints) ? world.waypoints : [];
  const waypointIndex = Number.isInteger(world.waypointIndex) ? world.waypointIndex : 0;
  const waypoint = waypoints[waypointIndex];
  const distanceNm = position && point(waypoint) ? Math.hypot(waypoint.x-position.x,waypoint.z-position.z)/NM : null;
  const next = distanceNm === null ? null : {
    name: String(waypoint.name || 'WAYPOINT'), distanceNm,
    eteSeconds: finite(state.groundSpeed)&&state.groundSpeed >= 15 ? distanceNm/state.groundSpeed*3600 : null,
  };
  const apActive = ap.enabled && !state.onGround;
  return {
    position, angle, track, heading: angle === null ? null : heading(angle), windFrom, windKnots, next, waypointIndex, waypoints,
    fuelTonnes: finite(state.fuel) ? state.fuel/1000 : null,
    fuelFlowTonnesPerHour: finite(state.fuelFlow) ? state.fuelFlow*3.6 : null,
    modes: {
      lateral: apActive ? ap.route && next ? 'ROUTE' : 'HDG SEL' : 'MANUAL',
      vertical: apActive ? ap.verticalMode === 'vs' ? 'V/S' : 'ALT HOLD' : 'PITCH',
      speed: apActive ? 'SPD HOLD' : 'THR MAN',
      autopilot: apActive ? 'AP ON' : ap.enabled ? 'AP ARMED' : 'AP OFF',
    },
  };
}

function text(ctx,value,x,y,{size=22,color=PALETTE.ink,align='left',weight=500,mono=false,max}={}) {
  ctx.font=`${weight} ${size}px ${mono ? '"Consolas", "Courier New", monospace' : '"Segoe UI", Arial, sans-serif'}`;
  ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;
  if (max === undefined) ctx.fillText(String(value),x,y);
  else ctx.fillText(String(value),x,y,max);
}
function rect(ctx,x,y,w,h,color) {ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function line(ctx,x,y,xx,yy,color=PALETTE.line,width=2) {
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function stroke(ctx,x,y,w,h,color=PALETTE.line,width=2) {ctx.strokeStyle=color;ctx.lineWidth=width;ctx.strokeRect(x,y,w,h);}
function poly(ctx,vertices,{fill,outline,width=2}={}) {
  ctx.beginPath();ctx.moveTo(...vertices[0]);for(let i=1;i<vertices.length;i++)ctx.lineTo(...vertices[i]);ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}if(outline){ctx.strokeStyle=outline;ctx.lineWidth=width;ctx.stroke();}
}
function arc(ctx,x,y,r,from,to,color,width=2) {
  ctx.beginPath();ctx.arc(x,y,r,from,to);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function gradient(ctx,x,y,xx,yy,stops) {
  const g=ctx.createLinearGradient(x,y,xx,yy);for(const [at,color] of stops)g.addColorStop(at,color);return g;
}
function clipRect(ctx,x,y,w,h) {ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();}
const label = (ctx,value,x,y,options={}) => text(ctx,value,x,y,{size:19,color:PALETTE.muted,weight:600,...options});

function background(ctx,w,h) {
  rect(ctx,0,0,w,h,gradient(ctx,0,0,w,h,[[0,'#162836'],[.47,'#0b1926'],[1,'#060c17']]));
  stroke(ctx,2,2,w-4,h-4,'#334e60',3);
  line(ctx,7,7,w-7,7,'#496c80',1);
}
function header(ctx,title,detail,w) {
  text(ctx,title,23,33,{size:29,weight:700});
  label(ctx,detail,w-23,33,{align:'right',max:w*.47});
  line(ctx,20,60,w-20,60);
}
function metric(ctx,name,value,x,y,w,{tone=PALETTE.ink,unit}={}) {
  label(ctx,name,x+13,y+15,{size:17,max:w-25});
  text(ctx,value,x+13,y+45,{size:31,weight:700,mono:true,color:tone,max:w-(unit?70:25)});
  if(unit)label(ctx,unit,x+w-11,y+47,{align:'right',size:14,max:55});
}
function pill(ctx,value,x,y,w,h,color=PALETTE.green) {
  rect(ctx,x,y,w,h,'#0a2028');stroke(ctx,x,y,w,h,color,1.5);
  text(ctx,value,x+w/2,y+h/2,{size:Math.min(20,h*.64),color,weight:700,align:'center',max:w-10});
}
function pointer(ctx,x,y,color,direction=1) {
  poly(ctx,[[x,y],[x+direction*12,y-7],[x+direction*12,y+7]],{fill:color});
}
function tape(ctx,{x,y,width,height,value,target,step,density,title,unit,low}) {
  const middle=y+height*.5;
  rect(ctx,x,y,width,height,gradient(ctx,x,0,x+width,0,[[0,'#203643'],[1,'#172735']]));
  stroke(ctx,x,y,width,height,'#648391',2);
  label(ctx,title,x+width/2,y-34,{align:'center',size:18});
  text(ctx,integer(target),x+width/2,y-12,{color:PALETTE.magenta,align:'center',size:23,mono:true,weight:700});
  if(finite(value)) {
    ctx.save();clipRect(ctx,x+1,y+1,width-2,height-2);
    if(finite(low)) {
      const top=clamp(middle-(low-value)*density,y,y+height);
      rect(ctx,x+width-8,top,7,Math.max(0,y+height-top),PALETTE.red);
    }
    const start=Math.floor((value-height*.5/density)/step)*step;
    for(let v=start;v<=value+height*.5/density+step;v+=step) {
      if(title==='IAS'&&v<0)continue;
      const yy=middle-(v-value)*density, major=Math.round(v/step)%2===0;
      line(ctx,x+width-(major?19:11),yy,x+width-3,yy,PALETTE.ink,major?2:1);
      if(major)text(ctx,integer(v),x+width-24,yy,{size:18,mono:true,align:'right'});
    }
    if(finite(target))pointer(ctx,x+width-18,clamp(middle-(target-value)*density,y+9,y+height-9),PALETTE.magenta);
    ctx.restore();
  }
  rect(ctx,x-3,middle-21,width+6,42,PALETTE.black);stroke(ctx,x-3,middle-21,width+6,42,PALETTE.ink,2);
  text(ctx,integer(value),x+width*.5,middle,{size:31,align:'center',mono:true,weight:700,max:width-6});
  label(ctx,unit,x+width*.5,y+height+15,{align:'center',size:15});
}

function attitude(ctx,state) {
  const x=133,y=121,w=433,h=362,cx=x+w*.5,cy=y+h*.5;
  ctx.save();clipRect(ctx,x,y,w,h);ctx.translate(cx,cy);ctx.rotate(-number(state.roll));ctx.translate(0,number(state.pitch)/RAD*5.8);
  rect(ctx,-1500,-1800,3000,1800,gradient(ctx,0,-390,0,0,[[0,'#102c67'],[1,'#367cba']]));
  rect(ctx,-1500,0,3000,1800,gradient(ctx,0,0,0,430,[[0,'#9d6741'],[1,'#3b272c']]));
  line(ctx,-1500,0,1500,0,'#f4e6cd',4);
  for(let angle=-40;angle<=40;angle+=5) {
    if(!angle)continue;
    const major=angle%10===0, width=major?57:31, yy=-angle*5.8;
    if(angle<0)ctx.setLineDash([9,6]);
    line(ctx,-width,yy,width,yy,PALETTE.ink,major?2.6:1.7);
    ctx.setLineDash([]);
    if(major){text(ctx,Math.abs(angle),-width-10,yy,{size:18,align:'right',mono:true});text(ctx,Math.abs(angle),width+10,yy,{size:18,mono:true});}
  }
  ctx.restore();stroke(ctx,x,y,w,h,'#7793a1',2);
  // Fixed aircraft reference and a moving bank index above the attitude horizon.
  for(const side of [-1,1]) {
    const vertices=[[cx+side*86,cy],[cx+side*32,cy],[cx+side*25,cy+11]];
    for(let i=1;i<vertices.length;i++)line(ctx,...vertices[i-1],...vertices[i],'#0e1218',9);
    for(let i=1;i<vertices.length;i++)line(ctx,...vertices[i-1],...vertices[i],'#ffdf91',4);
  }
  rect(ctx,cx-4,cy-4,8,8,'#ffdf91');
  const r=156, baseY=cy+9;
  for(let angle=-60;angle<=60;angle+=10) {
    const a=(angle-90)*RAD, start=r-(angle%30===0?15:8);
    line(ctx,cx+Math.cos(a)*start,baseY+Math.sin(a)*start,cx+Math.cos(a)*r,baseY+Math.sin(a)*r,PALETTE.ink,angle%30===0?3:2);
  }
  const bank=clamp(-number(state.roll)/RAD,-60,60)*RAD;
  ctx.save();ctx.translate(cx,baseY);ctx.rotate(bank);
  poly(ctx,[[0,-r+17],[-10,-r+35],[10,-r+35]],{fill:'#f9db8f',outline:'#26323a'});ctx.restore();
}

function headingTape(ctx,current,selected,track) {
  const x=134,w=433,y=525,h=71,cx=x+w/2;
  rect(ctx,x,y,w,h,'#101e2b');stroke(ctx,x,y,w,h);
  if(finite(current)){
    ctx.save();clipRect(ctx,x+1,y+1,w-2,h-2);
    for(let mark=Math.floor((current-55)/5)*5;mark<=current+55;mark+=5){
      const tx=cx+(mark-current)*4.7, major=mark%10===0;
      line(ctx,tx,y+8,tx,y+(major?23:16),PALETTE.ink,major?2:1.3);
      if(major)text(ctx,compass(mark).slice(0,2),tx,y+36,{size:16,align:'center',mono:true});
    }
    if(finite(track)){
      const tx=clamp(cx+signedDegrees(track-current)*4.7,x+8,x+w-8);
      poly(ctx,[[tx,y+10],[tx-5,y+18],[tx,y+26],[tx+5,y+18]],{outline:PALETTE.green});
    }
    if(finite(selected)){
      const tx=clamp(cx+signedDegrees(selected-current)*4.7,x+9,x+w-9);
      poly(ctx,[[tx-9,y+4],[tx+9,y+4],[tx+9,y+13],[tx,y+18],[tx-9,y+13]],{fill:PALETTE.magenta});
    }
    ctx.restore();
  }
  rect(ctx,cx-43,y+43,86,26,PALETTE.black);
  text(ctx,compass(current),cx,y+56,{size:26,mono:true,align:'center',weight:700});
}

function pfd(ctx,state,ap,world,data) {
  background(ctx,720,620);
  const {modes}=data;
  for(const [i,[title,mode]] of Object.entries([['SPEED',modes.speed],['LATERAL',modes.lateral],['VERTICAL',modes.vertical],['AUTOPILOT',modes.autopilot]])) {
    const x=18+Number(i)*171;
    rect(ctx,x,15,166,50,'#0a1722');stroke(ctx,x,15,166,50,'#355161',1.5);
    label(ctx,title,x+83,29,{size:13,align:'center'});
    text(ctx,mode,x+83,50,{size:21,align:'center',weight:700,color:modes.autopilot==='AP ON'?PALETTE.green:PALETTE.ink});
  }
  attitude(ctx,state);
  tape(ctx,{x:18,y:124,width:105,height:352,value:state.ias,target:ap.speed,step:10,density:3.45,title:'IAS',unit:'KNOTS',low:world.stallSpeed});
  tape(ctx,{x:576,y:124,width:126,height:352,value:state.altitude,target:ap.altitude,step:500,density:.11,title:'ALT',unit:'FEET'});
  const agl=finite(state.agl)?state.agl*FT:null;
  if(agl!==null&&agl<2500)text(ctx,`AGL ${integer(agl)}`,141,503,{size:18,mono:true,color:PALETTE.green});
  const approach=world.approach;
  if(finite(approach?.lateralMeters)&&finite(approach?.glideFeet)&&!approach.passedRunway){
    const x=350,y=505;
    line(ctx,x-70,y,x+70,y,'#71919f');
    for(let i=-2;i<=2;i++)rect(ctx,x+i*35-2,y-3,4,6,'#a9c6d0');
    const d=x-clamp(approach.lateralMeters/60,-1,1)*70;
    poly(ctx,[[d,y-8],[d+7,y],[d,y+8],[d-7,y]],{fill:PALETTE.magenta});
    const yy=307+clamp(approach.glideFeet/160,-1,1)*71;
    line(ctx,551,236,551,378,'#bed7d9');
    poly(ctx,[[551,yy-9],[559,yy],[551,yy+9],[543,yy]],{fill:PALETTE.magenta});
  }
  headingTape(ctx,data.heading,ap.heading,data.track);
  label(ctx,'MACH',18,553,{size:15});text(ctx,fixed(state.mach,2),18,578,{size:29,mono:true,weight:700});
  label(ctx,'V/S · FPM',703,553,{size:15,align:'right'});
  text(ctx,signed(state.verticalSpeed),703,578,{size:29,mono:true,weight:700,align:'right',color:PALETTE.green});
  if(state.stall)pill(ctx,'STALL',277,134,145,34,PALETTE.red);
}

function duration(seconds) {
  if(!finite(seconds))return '—';
  const total=Math.max(0,Math.round(seconds)), h=Math.floor(total/3600), m=Math.floor(total/60)%60;
  const padded=value=>String(value).padStart(2,'0');
  return h?`${h}h ${padded(m)}m`:`${padded(m)}:${padded(total%60)}`;
}

function coastline(island,coast,cache) {
  const existing=cache.get(island);
  if(existing&&existing.coast===coast)return existing.points;
  const rx=number(island.rx,number(island.radius,3500)),rz=number(island.rz,rx);
  const points=Array.from({length:48},(_,i)=>{
    const angle=i*Math.PI/24, radius=typeof coast==='function'?number(coast(island,angle),1):1;
    return {x:island.x+Math.cos(angle)*rx*radius,z:island.z+Math.sin(angle)*rz*radius};
  });
  cache.set(island,{coast,points});return points;
}

function drawRunway(ctx,airport,range,at) {
  if(!point(airport))return;
  const [x,y]=at(airport),code=String(airport.name||'AIRFIELD').split(' · ')[0];
  if(x<21||x>735||y<102||y>486)return;
  if(range<=20&&finite(airport.heading)&&finite(airport.length)&&finite(airport.width)){
    const a=airport.heading*RAD;
    const fromField=(along,lateral=0)=>at({x:airport.x+Math.sin(a)*along+Math.cos(a)*lateral,z:airport.z-Math.cos(a)*along+Math.sin(a)*lateral});
    const half=airport.length/2, edge=airport.width/2;
    ctx.setLineDash([10,8]);line(ctx,...fromField(-half-NM*4),...fromField(-half),'#c295b4',2);ctx.setLineDash([]);
    poly(ctx,[fromField(-half,-edge),fromField(-half,edge),fromField(half,edge),fromField(half,-edge)],{fill:'#baceda',outline:'#e6eff1',width:2});
    line(ctx,...fromField(-half),...fromField(half),'#1e2d3c',1);
  }else{
    stroke(ctx,x-8,y-8,16,16,'#c4dae4',2);line(ctx,x-4,y,x+4,y,'#c4dae4');line(ctx,x,y-4,x,y+4,'#c4dae4');
  }
  text(ctx,code,x+12,y+12,{size:17,color:'#e7e0c8',weight:650,max:110});
}

function navigation(ctx,state,ap,world,data,cache) {
  background(ctx,760,620);header(ctx,'NAVIGATION','HDG UP',760);
  const range=clamp(number(world.rangeNm,40),2,160),cx=380,cy=438,radius=329;
  rect(ctx,20,78,720,412,gradient(ctx,20,78,740,490,[[0,'#142e46'],[1,'#0b2135']]));
  const at=target=>{
    const meters=projectHeadingUp(data.position,number(data.angle),target),scale=radius/(range*NM);
    return [cx+meters.right*scale,cy-meters.ahead*scale];
  };
  ctx.save();clipRect(ctx,20,78,720,412);
  if(data.position) {
    const islands=Array.isArray(world.islands)?world.islands:[];
    for(const island of islands){
      if(!point(island))continue;
      const [x,y]=at(island),bound=Math.max(number(island.rx,number(island.radius,3500)),number(island.rz,number(island.radius,3500)))*radius/(range*NM)*1.4;
      if(x+bound<20||x-bound>740||y+bound<78||y-bound>490)continue;
      const points=coastline(island,world.coast,cache).map(at);
      poly(ctx,points,{fill:'#365a58',outline:'#9cb5a2',width:1.5});
      if(bound>32){
        poly(ctx,points.map(([xx,yy])=>[x+(xx-x)*.74,y+(yy-y)*.74]),{fill:'#48695d',outline:'#728b74',width:1});
        poly(ctx,points.map(([xx,yy])=>[x+(xx-x)*.46,y+(yy-y)*.46]),{fill:'#627d68'});
      }
      if(bound>53&&island.name&&island.name!=='Uncharted island')text(ctx,island.name,x,y,{size:16,color:'#d0dbc5',align:'center',max:135});
    }
    ctx.setLineDash([6,7]);
    arc(ctx,cx,cy,radius*.5,Math.PI,2*Math.PI,'#829aa8',1.8);
    arc(ctx,cx,cy,radius,Math.PI,2*Math.PI,'#8aa1b1',1.8);
    ctx.setLineDash([]);
    text(ctx,`${range/2}`,cx+radius*.48,cy-34,{size:17,color:'#aec8d4',mono:true});
    if(finite(data.track)&&finite(data.heading)){
      const delta=signedDegrees(data.track-data.heading)*RAD;
      ctx.setLineDash([8,8]);line(ctx,cx,cy,cx+Math.sin(delta)*radius*.83,cy-Math.cos(delta)*radius*.83,'#7ac6aa',1.7);ctx.setLineDash([]);
    }
    drawRunway(ctx,world.airport,range,at);
    const route=data.waypoints;
    for(let i=1;i<route.length;i++){
      if(!point(route[i-1])||!point(route[i]))continue;
      line(ctx,...at(route[i-1]),...at(route[i]),i>=data.waypointIndex?PALETTE.magenta:'#987198',i>=data.waypointIndex?3:1.7);
    }
    const active=route[data.waypointIndex];
    if(point(active)){
      ctx.setLineDash([10,7]);line(ctx,cx,cy,...at(active),PALETTE.magenta,2.5);ctx.setLineDash([]);
    }
    for(let i=0;i<route.length;i++){
      if(!point(route[i]))continue;
      const [x,y]=at(route[i]);if(x<25||x>731||y<91||y>480)continue;
      const color=i===data.waypointIndex?PALETTE.magenta:'#d6b0d0';
      poly(ctx,[[x,y-8],[x+8,y],[x,y+8],[x-8,y]],{fill:i===data.waypointIndex?'#67316e':null,outline:color});
      text(ctx,route[i].name||'WPT',x+13,y-10,{size:17,color,max:130,weight:600});
    }
  }
  if(finite(data.heading)){
    for(let deg=Math.floor((data.heading-80)/10)*10;deg<=data.heading+80;deg+=10){
      const a=(deg-data.heading)*RAD,x=Math.sin(a),y=-Math.cos(a), major=deg%30===0;
      line(ctx,cx+x*(radius-(major?21:12)),cy+y*(radius-(major?21:12)),cx+x*radius,cy+y*radius,PALETTE.ink,major?2:1.3);
      if(major){const cardinals={0:'N',90:'E',180:'S',270:'W'};text(ctx,cardinals[modulo(deg,360)]||compass(deg).slice(0,2),cx+x*(radius-34),cy+y*(radius-34),{size:18,align:'center',mono:true});}
    }
    if(finite(ap.heading)){
      const a=clamp(signedDegrees(ap.heading-data.heading),-82,82)*RAD;
      ctx.save();ctx.translate(cx,cy);ctx.rotate(a);
      poly(ctx,[[-9,-radius-3],[9,-radius-3],[9,-radius+6],[0,-radius+15],[-9,-radius+6]],{fill:PALETTE.magenta});ctx.restore();
    }
  }
  if(data.position)poly(ctx,[[cx,cy-22],[cx+5,cy-5],[cx+25,cy+6],[cx+25,cy+11],[cx+5,cy+5],[cx+5,cy+20],[cx+12,cy+24],[cx+12,cy+28],[cx,cy+25],[cx-12,cy+28],[cx-12,cy+24],[cx-5,cy+20],[cx-5,cy+5],[cx-25,cy+11],[cx-25,cy+6],[cx-5,cy-5]],{fill:PALETTE.ink,outline:'#15252f',width:1.7});
  ctx.restore();stroke(ctx,20,78,720,412,'#668499',2);
  rect(ctx,329,78,102,34,'#0d1825');stroke(ctx,329,78,102,34,'#a4beca',1.5);
  text(ctx,finite(data.heading)?`${compass(data.heading)}°`:'—',380,96,{size:24,align:'center',mono:true,weight:700});
  label(ctx,`${range} NM`,34,97,{size:17,color:PALETTE.ink});
  label(ctx,`GS ${integer(state.groundSpeed)}`,727,98,{size:17,align:'right',color:PALETTE.ink});
  line(ctx,20,505,740,505);
  metric(ctx,'NEXT WAYPOINT',data.next?.name||'FREE FLIGHT',19,513,265,{tone:PALETTE.magenta});
  metric(ctx,'DISTANCE',data.next?fixed(data.next.distanceNm):'—',291,513,140,{unit:'NM'});
  metric(ctx,'ETE NEXT',duration(data.next?.eteSeconds),444,513,129);
  metric(ctx,'WIND FROM',data.windFrom===null?'—':`${compass(data.windFrom)}°`,585,513,151,{unit:data.windKnots===null?undefined:`${integer(data.windKnots)} KT`});
  line(ctx,20,575,740,575);
  label(ctx,String(world.weather||'FLIGHT NAVIGATION').toUpperCase(),25,597,{size:17,max:340});
  label(ctx,finite(data.track)?`TRK ${compass(data.track)}°`:'TRK —',735,597,{size:17,align:'right'});
}

function engineDial(ctx,x,y,r,n1) {
  const from=Math.PI*.74,to=Math.PI*2.26, fraction=clamp(number(n1)/100,0,1);
  arc(ctx,x,y,r,from,to,'#365361',9);
  if(finite(n1))arc(ctx,x,y,r,from,from+(to-from)*fraction,n1>=94?PALETTE.amber:PALETTE.green,9);
  for(let i=0;i<=10;i++){
    const a=from+(to-from)*i/10,mark=i%5===0?17:8;
    line(ctx,x+Math.cos(a)*(r-mark),y+Math.sin(a)*(r-mark),x+Math.cos(a)*(r+1),y+Math.sin(a)*(r+1),'#e5eee9',i%5===0?2.2:1.2);
  }
  if(finite(n1)){
    const a=from+(to-from)*fraction;
    line(ctx,x+Math.cos(a)*(r-27),y+Math.sin(a)*(r-27),x+Math.cos(a)*(r-9),y+Math.sin(a)*(r-9),PALETTE.ink,4);
  }
  text(ctx,fixed(n1),x,y+9,{size:52,mono:true,weight:700,align:'center'});
  label(ctx,'N1 %',x,y+44,{size:18,align:'center'});
}

function engines(ctx,state,ap,world,data) {
  background(ctx,680,620);header(ctx,'POWERPLANT','TWIN ENGINE',680);
  for(const [i,cx] of [[1,176],[2,504]]){
    rect(ctx,cx-151,78,302,339,'#0d1b27');stroke(ctx,cx-151,78,302,339,'#426171',1.5);
    label(ctx,`ENG ${i}`,cx,105,{size:24,align:'center',color:PALETTE.cyan});
    engineDial(ctx,cx,221,81,state.n1);
    line(ctx,cx-127,316,cx+127,316);
    metric(ctx,'EGT',integer(state.egt),cx-128,327,119,{unit:'°C'});
    metric(ctx,'FUEL FLOW',fixed(data.fuelFlowTonnesPerHour,2),cx+1,327,132,{unit:'T/H'});
    if(finite(state.egt)){
      rect(ctx,cx-114,395,228,5,'#3e505a');
      rect(ctx,cx-114,395,228*clamp(state.egt/850,0,1),5,state.egt>=765?PALETTE.amber:PALETTE.green);
    }
  }
  const fuel=data.fuelTonnes,flow=data.fuelFlowTonnesPerHour;
  const endurance=fuel!==null&&flow>.01?duration(fuel/(flow*2)*3600):'—';
  metric(ctx,'FUEL REMAINING',fixed(fuel,2),21,438,229,{unit:'T',tone:fuel!==null&&fuel<1.8?PALETTE.amber:PALETTE.ink});
  metric(ctx,'EST. ENDURANCE',endurance,270,438,209,{tone:PALETTE.cyan});
  metric(ctx,'OUTSIDE AIR',integer(state.temperature),503,438,153,{unit:'°C'});
  line(ctx,24,515,656,515);
  label(ctx,'THROTTLE COMMAND',25,554,{size:17});
  rect(ctx,249,547,323,14,'#2d4755');
  if(finite(state.throttle))rect(ctx,249,547,323*clamp(state.throttle,0,1),14,PALETTE.cyan);
  text(ctx,finite(state.throttle)?`${integer(state.throttle*100)}%`:'—',654,554,{align:'right',mono:true,size:29});
  label(ctx,'SHARED SIM ENGINE DATA',340,597,{size:15,align:'center'});
}

const deg = value => finite(value) ? value/RAD : null;
const flightStatus = state => typeof state.status==='string' ? state.status.toUpperCase() : '—';
const flapLabel = state => finite(state.flaps) ? state.flaps>=3?'FULL':integer(state.flaps) : '—';

function gearIndicator(state) {
  const position=typeof state.gear==='boolean'?Number(state.gear):state.gear;
  if(!finite(position))return {label:'—',color:PALETTE.muted};
  if(position>.98&&!(finite(state.gearTarget)&&state.gearTarget<.1))return {label:'DOWN',color:PALETTE.green};
  if(position<.02&&!(finite(state.gearTarget)&&state.gearTarget>.9))return {label:'UP',color:PALETTE.cyan};
  return {label:'TRANSIT',color:PALETTE.amber};
}

function advisory(state,world,data) {
  if(state.stall)return ['STALL · LOWER NOSE',PALETTE.red];
  if(/hard|recovered|collision|impact|damage/i.test(flightStatus(state)))return [flightStatus(state),PALETTE.amber];
  if(data.fuelTonnes!==null&&data.fuelTonnes<1.8)return ['FUEL RESERVE',PALETTE.amber];
  if(world.approach&&!world.approach.passedRunway&&finite(world.approach.distanceNm)&&world.approach.distanceNm<2&&number(state.gear)<.9)return ['LANDING GEAR NOT DOWN',PALETTE.amber];
  if(typeof state.status==='string')return [flightStatus(state),PALETTE.green];
  return ['FLIGHT DATA UNAVAILABLE',PALETTE.muted];
}

function aircraftDiagram(ctx,cx,cy,state,gear) {
  ctx.save();ctx.translate(cx,cy);
  poly(ctx,[[0,-123],[13,-111],[19,-70],[21,-40],[113,19],[121,39],[23,12],[19,78],[59,112],[57,126],[13,109],[0,119],[-13,109],[-57,126],[-59,112],[-19,78],[-23,12],[-121,39],[-113,19],[-21,-40],[-19,-70],[-13,-111]],{fill:'#152c3e',outline:'#9bbccb',width:2.7});
  line(ctx,0,-90,0,105,'#537387',1.5);
  for(const side of [-1,1]){
    rect(ctx,side*59-12,14,24,36,'#1a3540');stroke(ctx,side*59-12,14,24,36,'#7196a5',1.7);
    line(ctx,side*30,11,side*86,29,state.flaps>0?PALETTE.cyan:'#7597aa',state.flaps>0?4+state.flaps:2);
  }
  for(const [x,y] of [[0,-57],[-35,21],[35,21]]){
    stroke(ctx,x-9,y-9,18,18,gear.color,2.3);
    if(gear.label==='DOWN')rect(ctx,x-4,y-4,8,8,gear.color);
  }
  ctx.restore();
}

function systemsOverview(ctx,state,world,data) {
  const gear=gearIndicator(state);
  aircraftDiagram(ctx,295,253,state,gear);
  label(ctx,'GEAR',90,169,{align:'center'});
  pill(ctx,gear.label,24,188,132,37,gear.color);
  label(ctx,'FLAPS',498,169,{align:'center'});
  pill(ctx,flapLabel(state),430,188,136,37,PALETTE.cyan);
  line(ctx,23,397,567,397);
  metric(ctx,'AUTOPILOT',data.modes.autopilot,22,410,255,{tone:data.modes.autopilot==='AP ON'?PALETTE.green:PALETTE.ink});
  metric(ctx,'BRAKE',typeof world.brake==='boolean'?(world.brake?'APPLIED':'RELEASED'):'—',312,410,254,{tone:world.brake?PALETTE.amber:PALETTE.ink});
  const [message,color]=advisory(state,world,data);
  pill(ctx,message,23,497,544,47,color);
}

function systemsFlight(ctx,state,world,data) {
  const grid=[
    ['TRUE AIRSPEED',finite(state.speed)?integer(state.speed*KT):'—','KT'],
    ['GROUND SPEED',integer(state.groundSpeed),'KT'],
    ['MACH',fixed(state.mach,2)],
    ['LOAD FACTOR',fixed(world.loadFactor,2),'G'],
    ['PITCH',signed(deg(state.pitch)),'°'],
    ['BANK',signed(deg(state.roll)),'°'],
    ['HEIGHT AGL',finite(state.agl)?integer(state.agl*FT):'—','FT'],
    ['VERTICAL SPEED',signed(state.verticalSpeed),'FPM'],
  ];
  for(let i=0;i<grid.length;i++){
    const x=22+i%2*280,y=105+Math.floor(i/2)*91,[name,value,unit]=grid[i];
    rect(ctx,x,y,265,76,'#0d1c28');stroke(ctx,x,y,265,76,'#345361',1.5);
    metric(ctx,name,value,x+2,y+6,262,{unit,tone:i===3&&Math.abs(world.loadFactor-1)>.55?PALETTE.amber:PALETTE.ink});
  }
  const [message,color]=advisory(state,world,data);
  pill(ctx,message,23,497,544,47,color);
}

function systemsApproach(ctx,state,world) {
  const approach=world.approach,airport=world.airport;
  const ready=finite(approach?.distanceNm)&&finite(approach?.lateralMeters)&&finite(approach?.glideFeet);
  if(!ready) {
    rect(ctx,24,111,542,416,'#0a1926');stroke(ctx,24,111,542,416,'#486474',2);
    for(const x of [275,315])line(ctx,x,172,x,317,'#6f91a1',3);
    for(let i=0;i<5;i++)line(ctx,295,178+i*31,295,192+i*31,'#b3cad2',2.7);
    line(ctx,276,315,314,315,'#a0c0ca',3);
    text(ctx,'GUIDANCE UNAVAILABLE',295,380,{size:29,weight:700,align:'center',color:PALETTE.amber});
    label(ctx,'A runway approach must be active',295,423,{align:'center',size:21});
    return;
  }
  const field=String(airport?.name||'RUNWAY').split(' · ')[0];
  const runway=finite(airport?.heading)?` RWY ${String(modulo(Math.round(airport.heading/10)-1,36)+1).padStart(2,'0')}`:'';
  label(ctx,`${field}${runway}`,295,107,{size:26,color:PALETTE.cyan,align:'center',max:500});
  const cx=295,cy=264;
  line(ctx,cx-182,cy,cx+182,cy,'#7899a8',2);
  line(ctx,cx,cy-109,cx,cy+109,'#7899a8',2);
  for(const i of [-2,-1,1,2]){
    arc(ctx,cx+i*84,cy,6,0,Math.PI*2,PALETTE.ink,2);
    arc(ctx,cx,cy+i*49,6,0,Math.PI*2,PALETTE.ink,2);
  }
  stroke(ctx,cx-11,cy-11,22,22,'#e9ddaa',2.5);
  const lateral=approach.lateralMeters,glide=approach.glideFeet;
  const dx=cx-clamp(lateral/60,-1,1)*168,dy=cy+clamp(glide/160,-1,1)*98;
  if(!approach.passedRunway)poly(ctx,[[dx,dy-11],[dx+12,dy],[dx,dy+11],[dx-12,dy]],{fill:PALETTE.magenta,outline:'#e4c6e5',width:1});
  label(ctx,'CENTERLINE',295,389,{align:'center',size:17});
  const error=(value,suffix,positive,negative)=>`${integer(Math.abs(value))} ${suffix}${Math.round(value)!==0?` ${value>0?positive:negative}`:''}`;
  metric(ctx,'LATERAL',error(lateral,'m','R','L'),22,414,190,{tone:Math.abs(lateral)>28?PALETTE.amber:PALETTE.ink});
  metric(ctx,'GLIDE PATH',error(glide,'ft','HIGH','LOW'),212,414,204,{tone:Math.abs(glide)>100?PALETTE.amber:PALETTE.ink});
  metric(ctx,'AIM POINT',`${fixed(approach.distanceNm,2)} NM`,419,414,148,{tone:PALETTE.cyan});
  const info=`HDG DEV ${signed(approach.headingError)}°   ·   IAS DEV ${signed(approach.speedDelta)} KT`;
  pill(ctx,approach.passedRunway?'RUNWAY PASSED':info,23,497,544,47,approach.passedRunway?PALETTE.amber:PALETTE.green);
}

function systems(ctx,state,ap,world,data) {
  background(ctx,590,620);
  const page=['flight','approach'].includes(world.systemPage)?world.systemPage:'overview';
  header(ctx,'SYSTEMS',page.toUpperCase(),590);
  if(page==='flight')systemsFlight(ctx,state,world,data);
  else if(page==='approach')systemsApproach(ctx,state,world);
  else systemsOverview(ctx,state,world,data);
  for(const [i,name] of ['overview','flight','approach'].entries()){
    const x=23+i*184,selected=page===name;
    rect(ctx,x,572,176,29,selected?'#19384b':'#0d1e2b');
    stroke(ctx,x,572,176,29,selected?PALETTE.cyan:'#42616d',1.4);
    label(ctx,name.toUpperCase(),x+88,586,{align:'center',size:16,color:selected?PALETTE.cyan:PALETTE.muted});
  }
}

function modeControl(ctx,state,ap,world,data) {
  background(ctx,1200,160);
  const fields=[['SPD',integer(ap.speed),'KT'],['HDG',compass(ap.heading),'DEG'],['ALT',integer(ap.altitude),'FT'],['V/S',signed(ap.vs),'FPM']];
  for(const [i,[labelText,value,unit]] of fields.entries()){
    const x=15+i*228;
    rect(ctx,x,16,218,127,gradient(ctx,x,16,x,144,[[0,'#0a151e'],[1,'#101d28']]));
    stroke(ctx,x,16,218,127,'#3d5965',1.8);
    label(ctx,labelText,x+17,42,{size:22});
    label(ctx,unit,x+202,42,{size:16,align:'right'});
    text(ctx,value,x+110,94,{size:52,mono:true,weight:700,align:'center',color:i===3&&ap.verticalMode!=='vs'?'#99b6c0':PALETTE.ink,max:197});
  }
  const active=data.modes.autopilot==='AP ON',tone=active?PALETTE.green:ap.enabled?PALETTE.amber:PALETTE.muted;
  pill(ctx,data.modes.autopilot,943,24,238,48,tone);
  text(ctx,active?`${data.modes.lateral} / ${data.modes.vertical}`:'MODE CONTROL',1062,111,{size:24,color:PALETTE.muted,align:'center',weight:700,max:225});
}

export function createCockpitDisplays() {
  const coastCache=new WeakMap(), previous=new WeakMap();
  function paint(screens,state={},ap={},world={}) {
    const data=getCockpitTelemetry(state,ap,world),brightness=clamp(number(world.brightness,1),0,1);
    // The map's coastline tessellation is cached; steady MCP/engine readouts
    // don't trigger a GPU upload on every visible-deck update.
    const paintOne=(key,render,signature)=>{
      const screen=screens[key],ctx=screen?.context,canvas=screen?.canvas;
      if(!ctx||!canvas||!screen.texture)return;
      const [w,h]=SIZE[key];
      const cacheKey=signature===undefined?undefined:`${canvas.width}:${canvas.height}:${brightness}:${signature}`;
      if(cacheKey!==undefined&&previous.get(screen)===cacheKey)return;
      ctx.save();ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);
      render(ctx,state,ap,world,data);
      if(brightness<1)rect(ctx,0,0,w,h,`rgba(2,7,13,${(1-brightness)*.82})`);
      ctx.restore();screen.texture.needsUpdate=true;
      if(cacheKey!==undefined)previous.set(screen,cacheKey);
    };
    paintOne('pfd',pfd);
    paintOne('nd',(ctx,s,a,w,d)=>navigation(ctx,s,a,w,d,coastCache));
    paintOne('engines',engines,JSON.stringify([fixed(state.n1),integer(state.egt),fixed(data.fuelFlowTonnesPerHour,2),fixed(data.fuelTonnes,2),integer(state.temperature),fixed(state.throttle,2)]));
    paintOne('systems',systems);
    paintOne('ap',modeControl,JSON.stringify([ap.speed,ap.heading,ap.altitude,ap.vs,ap.verticalMode,data.modes]));
  }
  return {paint};
}
