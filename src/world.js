import * as THREE from 'three';
import {random,noise} from './world-data.js';
import {createAtmosphere,createTerrainFinish,stormGlow,weatherNoise} from './world-look.js';
export const WEATHER={
 'Golden Sunset':{clouds:.65,haze:.22,wind:3,rain:0,time:18.7,temp:18},
 'Clear Skies':{clouds:.16,haze:.13,wind:1,rain:0,time:15,temp:23},
 'Soft Clouds':{clouds:.8,haze:.26,wind:3,rain:0,time:17,temp:20},
 'Ocean Breeze':{clouds:.5,haze:.18,wind:14,rain:0,time:16.5,temp:20},
 'Misty Morning':{clouds:.64,haze:.72,wind:2,rain:0,time:6.3,temp:12},
 'Overcast':{clouds:1,haze:.65,wind:7,rain:0,time:13,temp:14},
 'Light Rain':{clouds:1,haze:.77,wind:9,rain:.5,time:16,temp:13},
 'Thunderstorm':{clouds:1,haze:.85,wind:30,rain:1,time:13,temp:10},
 'Starry Night':{clouds:.22,haze:.18,wind:2,rain:0,time:22,temp:10}
};

function addRunwayVisuals(group,{width,length}){
 const half=length/2,edge=width/2,threshold=half-14;
 const paint=[];
 const stripe=(x,z,w,l)=>paint.push([x,z,w,l]);
 for(const side of [-1,1])stripe(side*(edge-2),0,.85,length-65);
 const centerlineExtent=Math.floor((half-320)/90)*90;
 for(let z=-centerlineExtent;z<=centerlineExtent;z+=90)stripe(0,z,1.15,38);
 const digitStrokes=[[0,5.9,5.3,1.25],[2.15,3.1,1.25,5.1],[2.15,-3.1,1.25,5.1],[0,-5.9,5.3,1.25],[-2.15,-3.1,1.25,5.1],[-2.15,3.1,1.25,5.1],[0,0,5.3,1.25]];
 const digits={1:[1,2],3:[0,1,2,3,6],6:[0,2,3,4,5,6],8:[0,1,2,3,4,5,6]};
 for(const end of [-1,1]){
  for(const side of [-1,1]){
   for(let n=0;n<6;n++)stripe(side*(3.9+n*3.95),end*(half-56),1.65,38);
   stripe(side*11,end*(half-365),5.6,39);
   for(const distance of [188,484,611])for(const x of [8.5,11.5])stripe(side*x,end*(half-distance),1.35,19);
  }
  const designator=end===1?'18':'36';
  for(let digit=0;digit<2;digit++)for(const segment of digits[designator[digit]]){
   const [x,y,w,h]=digitStrokes[segment];stripe(end*(x+(digit-.5)*8),end*(half-124-y),w,h);
  }
 }
 const paintMaterial=new THREE.MeshStandardMaterial({color:0xece6d6,roughness:.89,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-3});
 const markings=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),paintMaterial,paint.length);
 markings.name='Solana runway paint · 18 / 36';
 const marker=new THREE.Object3D();marker.rotation.x=-Math.PI/2;
 paint.forEach(([x,z,w,l],index)=>{marker.position.set(x,.19,z);marker.scale.set(w,l,1);marker.updateMatrix();markings.setMatrixAt(index,marker.matrix);});
 group.add(markings);

 const positions=[],colors=[],properties=[];
 const white=new THREE.Color(0xfff3dc),coolWhite=new THREE.Color(0xf1f8ff),green=new THREE.Color(0x70ff9e);
 const light=(x,y,z,tint,brightness,kind=0,side=0)=>{
  positions.push(x,y,z);colors.push(tint.r,tint.g,tint.b);properties.push(brightness,kind,side);
 };
 for(let z=-half+32;z<=half-32;z+=48)for(const side of [-1,1])light(side*(edge+1.6),.55,z,white,.92);
 for(let z=-half+60;z<=half-60;z+=30)light(0,.25,z,coolWhite,.72);
 for(const end of [-1,1]){
  for(let n=-6;n<=6;n++)light(n*(edge-2)/6,.48,end*threshold,green,1.16,1,end);
  for(let distance=64;distance<=640;distance+=64){
   for(const x of distance===320?[-18,-12,-6,0,6,12,18]:[-2.8,0,2.8])light(x,1.0,end*(half+distance),white,1.2,2,end);
  }
 }
 const lightGeometry=new THREE.BufferGeometry();
 lightGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 lightGeometry.setAttribute('lightColor',new THREE.Float32BufferAttribute(colors,3));
 lightGeometry.setAttribute('lightStyle',new THREE.Float32BufferAttribute(properties,3));
 const lightMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,
  uniforms:{daylight:{value:1},haze:{value:.22},observerZ:{value:0},runwayHalf:{value:half},endTint:{value:new THREE.Color(0xff5846)}},
  vertexShader:`attribute vec3 lightColor,lightStyle;
uniform float daylight,haze,observerZ,runwayHalf;
uniform vec3 endTint;
varying vec3 lampTint;
varying float lampOpacity;
void main(){
 vec4 eye=modelViewMatrix*vec4(position,1.);
 float distanceToLamp=max(1.,length(eye.xyz));
 float brightness=lightStyle.x,kind=lightStyle.y,side=lightStyle.z;
 float dusk=1.-daylight;
 lampTint=lightColor;
 lampOpacity=mix(.53,1.,dusk)*brightness*exp(-distanceToLamp*(.000025+haze*.00011));
 if(kind>1.5)lampOpacity*=smoothstep(-35.,40.,side*observerZ-runwayHalf);
 else if(kind>.5)lampTint=mix(endTint,lightColor,smoothstep(-2.,2.,side*(observerZ-position.z)));
 gl_PointSize=clamp((mix(3.,5.,dusk)+1200./distanceToLamp)*sqrt(brightness),2.5,14.);
 gl_Position=projectionMatrix*eye;
}`,
  fragmentShader:`varying vec3 lampTint;
varying float lampOpacity;
void main(){
 float radius=length(gl_PointCoord-.5)*2.;
 float core=1.-smoothstep(.13,.4,radius);
 float halo=(1.-smoothstep(.15,1.,radius))*.3;
 float opacity=(core+halo)*lampOpacity;
 if(opacity<.005)discard;
 gl_FragColor=vec4(lampTint,clamp(opacity,0.,1.));
 #include <colorspace_fragment>
}`});
 const lights=new THREE.Points(lightGeometry,lightMaterial);
 lights.name='Solana runway and approach lights';group.add(lights);
 return {lightMaterial,paintMaterial};
}

export function createWorld(scene,data){
 const group=new THREE.Group();scene.add(group);
 const env={time:18.7,clouds:.65,haze:.22,wind:3,rain:0,temp:18};let target={...env},weather='Golden Sunset',quality='balanced';
 const sunDir=new THREE.Vector3(.24,.07,.97).normalize();
 const ambient=new THREE.HemisphereLight(0xa3bbeb,0x393440,2.1);scene.add(ambient);
 const sun=new THREE.DirectionalLight(0xffcf92,3.5);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-45;sun.shadow.camera.right=45;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;sun.shadow.camera.near=1;sun.shadow.camera.far=220;sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;
 scene.fog=new THREE.FogExp2(0xb3a0b8,.000008);
 const atmosphere=createAtmosphere(sunDir);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(210000,40,24),atmosphere.sky);
 sky.name='Atmosphere • sun, haze and high clouds';sky.frustumCulled=false;scene.add(sky);
 const ocean=new THREE.Mesh(new THREE.PlaneGeometry(420000,420000),atmosphere.ocean);
 ocean.name='Ocean • waves and coastal shallows';ocean.rotation.x=-Math.PI/2;ocean.position.y=-1;scene.add(ocean);
 const terrainFinish=createTerrainFinish(),terrainMaterial=terrainFinish.material;
 const terrainMeshes=new Map();
 function terrain(i,detail=72){const rings=26,verts=[],colors=[],indices=[];const dark=new THREE.Color(0x374450),green=new THREE.Color(0x53625b),sand=new THREE.Color(0xbfa28b);for(let r=0;r<=rings;r++)for(let a=0;a<=detail;a++){const ang=a/detail*Math.PI*2,rr=r/rings*data.coast(i,ang),x=i.x+Math.cos(ang)*i.rx*rr,z=i.z+Math.sin(ang)*i.rz*rr,y=data.surfaceHeight(x,z);verts.push(x,y,z);let c=dark.clone().lerp(green,noise(x*.0006,z*.0006,i.seed)*.5);if(y<45)c.lerp(sand,1-Math.min(y/45,1));if(y>1500)c.lerp(new THREE.Color(0x677080),Math.min((y-1500)/3000,.5));colors.push(c.r,c.g,c.b);}for(let r=0;r<rings;r++)for(let a=0;a<detail;a++){const q=r*(detail+1)+a;indices.push(q,q+1,q+detail+1,q+1,q+detail+2,q+detail+1);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,terrainMaterial);mesh.receiveShadow=true;return mesh;}
 function populate(i){const rng=random(i.seed+60),count=110,geo=new THREE.BoxGeometry(1,1,1);const m=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({color:0x878681,roughness:.9}),count);const dummy=new THREE.Object3D();const lights=[];for(let n=0;n<count;n++){const a=rng()*Math.PI*2,r=.72+rng()*.14,x=i.x+Math.cos(a)*i.rx*r,z=i.z+Math.sin(a)*i.rz*r,y=data.terrainHeight(x,z);const size=10+rng()*24;dummy.position.set(x,y+size*.5,z);dummy.scale.set(size,size*(.4+rng()),size);dummy.updateMatrix();m.setMatrixAt(n,dummy.matrix);lights.push(x,y+size+3,z);}const lightGeo=new THREE.BufferGeometry();lightGeo.setAttribute('position',new THREE.Float32BufferAttribute(lights,3));const points=new THREE.Points(lightGeo,new THREE.PointsMaterial({color:0xffc67b,size:24,sizeAttenuation:true,transparent:true,opacity:.6,depthWrite:false}));const g=new THREE.Group();g.add(m,points);g.userData.lights=points;return g;}
 function rebuild(x,z){data.islands=data.candidates(x,z);const keys=new Set(data.islands.map(i=>i.seed+','+i.x));for(const [key,obj]of terrainMeshes)if(!keys.has(key)){group.remove(obj);obj.traverse(o=>{if(o.geometry)o.geometry.dispose();});terrainMeshes.delete(key);}for(const i of data.islands){const key=i.seed+','+i.x;if(terrainMeshes.has(key))continue;const lod=new THREE.LOD();lod.addLevel(terrain(i,80),0);lod.addLevel(terrain(i,40),45000);lod.addLevel(terrain(i,20),90000);const g=new THREE.Group();g.add(lod,populate(i));group.add(g);terrainMeshes.set(key,g);}}
 rebuild(-22000,-33000);
 const runwayGroup=new THREE.Group();runwayGroup.position.set(data.airport.x,data.airport.y+.5,data.airport.z);runwayGroup.rotation.y=-data.airport.heading*Math.PI/180;group.add(runwayGroup);
 function box(w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.85}));m.position.set(x,y,z);runwayGroup.add(m);return m;}
 box(data.airport.width,.3,data.airport.length,0,0,0,0x4b4c51);box(450,.25,700,330,-.1,400,0x77756d);box(22,.25,2600,150,.05,0,0x6b6b68);box(170,16,40,390,8,650,0xbcb2a1);box(25,37,25,250,18,600,0x919590);
 const {lightMaterial:runwayLights,paintMaterial:runwayPaint}=addRunwayVisuals(runwayGroup,data.airport);
 const runwaySin=Math.sin(runwayGroup.rotation.y),runwayCos=Math.cos(runwayGroup.rotation.y);
 // Bounded ray-marched cloud volumes occupy real world coordinates.
 const cloudVertex=`varying vec3 vWorld;varying vec3 vCenter;void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;vCenter=(modelMatrix*vec4(0.,0.,0.,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
 const cloudFragment=`varying vec3 vWorld,vCenter;
uniform vec3 size,sun;
uniform float time,day,opacity,steps,wet,flash,seed;
${weatherNoise}
float envelope(vec3 p) {
 float d=2.;
 for(int i=0;i<5;i++) {
  float f=float(i)+seed;
  vec3 center=vec3(sin(f*2.4)*.53,cos(f*3.6)*.20,cos(f*1.7)*.45);
  d=min(d,length((p-center)*vec3(1.,1.18,1.))-(.40+.12*sin(f*1.3)));
 }
 return d;
}
float density(vec3 p) {
 float edge=1.-smoothstep(.76,1.,max(max(abs(p.x),abs(p.y)),abs(p.z)));
 float base=smoothstep(-.69,-.34,p.y);
 vec3 q=p*vec3(5.,5.9,5.)+vec3(seed*3.,time*.008,0.);
 float erosion=(noise3(q)-.49)*.19+(noise3(q*2.8)-.49)*.075;
 return (1.-smoothstep(-.04,.17,envelope(p)+erosion))*base*edge;
}
void main() {
 vec3 ro=(cameraPosition-vCenter)/size,rd=normalize(vWorld-cameraPosition);
 vec3 dr=rd/size;
 vec3 inv=mix(vec3(-1.),vec3(1.),step(0.,dr))/max(abs(dr),vec3(1e-8));
 vec3 lo=(-vec3(1.)-ro)*inv,hi=(vec3(1.)-ro)*inv;
 vec3 mn=min(lo,hi),mx=max(lo,hi);
 float a=max(max(mn.x,mn.y),mn.z),b=min(min(mx.x,mx.y),mx.z);
 if(b<max(a,0.))discard;
 a=max(a,0.);
 float stepSize=(b-a)/steps,alpha=0.;
 vec3 color=vec3(0.);
 float sunset=1.-smoothstep(.06,.50,sun.y);
 float facing=pow(max(dot(rd,sun),0.),6.);
 vec3 shade=mix(vec3(.28,.37,.52),vec3(.28,.23,.35),sunset);
 vec3 bright=mix(vec3(.75,.84,.94),vec3(1.04,.69,.48),sunset*(.56+facing*.41));
 shade=mix(shade,vec3(.115,.158,.24),wet);bright=mix(bright,vec3(.47,.54,.65),wet);
 for(int j=0;j<26;j++) {
  if(float(j)>=steps)break;
  vec3 p=ro+dr*(a+(float(j)+.5)*stepSize);
  float den=density(p);
  if(den<.012)continue;
  float blockage=density(p+sun*.22);
  if(steps>17.)blockage=blockage*.72+density(p+sun*.38)*.28;
  float op=1.-exp(-den*stepSize/size.y*(3.2+wet));
  float light=clamp(.79+p.y*.32-blockage*.52,0.,1.);
  vec3 cloud=mix(shade,bright,light)+bright*facing*(1.-blockage)*.15;
  cloud=mix(vec3(.056,.068,.120),cloud,day)+flash*vec3(.22,.30,.45);
  color+=(1.-alpha)*op*cloud;
  alpha+=(1.-alpha)*op;
  if(alpha>.98)break;
 }
 if(alpha<.005)discard;
 float distanceToEye=length(cameraPosition-vCenter);
 float fade=1.-exp(-distanceToEye*(.000008+wet*.000011));
 vec3 hazeColor=mix(vec3(.44,.59,.69),vec3(.74,.50,.40),sunset*.66);
 hazeColor=mix(hazeColor,vec3(.41,.48,.59),wet);
 color=mix(color/alpha,mix(vec3(.070,.081,.147),hazeColor,day),fade*.80);
 gl_FragColor=vec4(pow(max(color,vec3(0.)),vec3(2.2)),alpha*opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
 const clouds=[];const cloudGeo=new THREE.BoxGeometry(2,2,2);const rng=random(data.seed+888);
 for(let n=0;n<60;n++){const size=new THREE.Vector3(2600+rng()*2800,1100+rng()*1350,2400+rng()*2800);const mat=new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,uniforms:{size:{value:size},sun:{value:sunDir},time:{value:0},day:{value:1},opacity:{value:.8},steps:{value:12},wet:{value:0},flash:{value:0},seed:{value:rng()*19}},vertexShader:cloudVertex,fragmentShader:cloudFragment});const mesh=new THREE.Mesh(cloudGeo,mat);mesh.scale.copy(size);mesh.position.set(-22000+(rng()-.5)*(n<24?48000:130000),6500+rng()*2200,-33000+(rng()-.5)*(n<24?45000:130000));if(n<12)mesh.position.set(-39000+rng()*37000,5900+rng()*2600,-28000+rng()*24000);mesh.userData.base=mesh.position.clone();mesh.userData.size=size;group.add(mesh);clouds.push(mesh);}
 // Distant small cloud clusters use layered, shaded procedural textures.
 function cloudTexture(){const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');const r=random(614);for(let k=0;k<45;k++){const x=40+r()*178,y=55+r()*35,rad=20+r()*34;const g=ctx.createRadialGradient(x,y-rad*.35,2,x,y,rad);g.addColorStop(0,'rgba(255,224,207,.17)');g.addColorStop(.45,'rgba(233,200,194,.12)');g.addColorStop(.76,'rgba(121,125,155,.05)');g.addColorStop(1,'rgba(121,125,155,0)');ctx.fillStyle=g;ctx.fillRect(x-rad,y-rad,rad*2,rad*2);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
 const cloudTex=cloudTexture(),sprites=[];for(let n=0;n<145;n++){const m=new THREE.SpriteMaterial({map:cloudTex,transparent:true,depthWrite:false,color:0xffdacc,opacity:.65});const s=new THREE.Sprite(m);s.position.set(-22000+(rng()-.5)*160000,5000+rng()*2400,-10000+(rng()-.5)*160000);s.scale.set(4500+rng()*6500,2100+rng()*2800,1);s.userData.base=s.position.clone();group.add(s);sprites.push(s);}
 const rainGeometry=new THREE.BufferGeometry(),drops=[],ends=[];
 for(let i=0;i<350;i++){
  const drop=[rng(),rng(),rng()];
  drops.push(...drop,...drop);ends.push(0,1);
 }
 rainGeometry.setAttribute('position',new THREE.Float32BufferAttribute(drops,3));
 rainGeometry.setAttribute('streakEnd',new THREE.Float32BufferAttribute(ends,1));
 const rainMaterial=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,
  uniforms:{clock:{value:0},wet:{value:0},wind:{value:0},day:{value:1}},
  vertexShader:`attribute float streakEnd;
  uniform float clock,wind;varying float strength;
  void main(){
   vec3 drop=(fract(position+vec3(clock*wind*.007,-clock*.49,clock*wind*.003))-.5)*vec3(43.,25.,43.);
   drop+=streakEnd*vec3(-wind*.011,.37+position.x*.40,-wind*.005);
   vec4 eye=modelViewMatrix*vec4(drop,1.);
   float d=length(eye.xyz);
   strength=(1.-abs(streakEnd-.42))*(1.-smoothstep(12.,28.,d))*smoothstep(1.8,3.8,d);
   gl_Position=projectionMatrix*eye;
  }`,
  fragmentShader:`uniform float wet,day;varying float strength;
  void main(){
   gl_FragColor=vec4(vec3(.58,.69,.84),strength*wet*(.085+.20*day));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`
 });
 const rain=new THREE.LineSegments(rainGeometry,rainMaterial);
 rain.name='Weather • wind-driven rain';rain.frustumCulled=false;rain.visible=false;scene.add(rain);
 let tileKey='',lastFlightTime=0;
 const solarOrigin=new THREE.Vector3();
 const moonColor=new THREE.Color('#7888bb'),sunColor=new THREE.Color();
 const duskAir=new THREE.Color('#b28b8f'),dayAir=new THREE.Color('#9bbdcd');
 const stormAir=new THREE.Color('#8797ad'),nightAir=new THREE.Color('#26344f');
 const airColor=new THREE.Color();

 function update(dt,elapsed,state,camera,origin,{reducedMotion=false}={}){
  const clockDelta=state.flightTime-lastFlightTime;
  lastFlightTime=state.flightTime;
  if(clockDelta>0&&clockDelta<2)target.time=(target.time+clockDelta/3600)%24;
  const blend=Math.min(dt*.25,1);
  for(const key of Object.keys(env))if(key!=='time')env[key]+=(target[key]-env[key])*blend;
  env.time=(env.time+(((target.time-env.time+36)%24)-12)*blend+24)%24;
  const hour=env.time,elevation=Math.sin((hour-6)/12.95*Math.PI)*.75;
  const azimuth=.24+(18.7-hour)*.121;
  sunDir.set(Math.sin(azimuth),elevation,Math.cos(azimuth)).normalize();
  const day=THREE.MathUtils.smoothstep(elevation,-.13,.04);
  const dusk=1-THREE.MathUtils.smoothstep(elevation,.055,.47);
  const flash=stormGlow(elapsed,env.rain,reducedMotion);
  const motionClock=reducedMotion?0:elapsed;
  const low=quality==='performance';
  sky.position.copy(camera.position);
  ocean.position.set(camera.position.x,-1,camera.position.z);
  group.position.copy(origin).multiplyScalar(-1);
  const key=Math.round(state.position.x/80000)+','+Math.round(state.position.z/80000);
  if(key!==tileKey){tileKey=key;rebuild(state.position.x,state.position.z);}
  atmosphere.setCoasts(data.islands,state.position);
  atmosphere.update(env,day,motionClock,camera.position,origin,flash,!low);
  terrainFinish.rain.value=env.rain;

  const keyDirection=day>.02?sunDir:solarOrigin.set(-.38,.49,.77).normalize();
  sun.target.position.set(state.position.x-origin.x,state.position.y-origin.y,state.position.z-origin.z);
  sun.position.copy(sun.target.position).addScaledVector(keyDirection,95);
  sun.intensity=(.16+day*3.5)*(1-env.haze*.28)*(1-env.rain*.84)+flash*.75;
  sunColor.setRGB(1,.92-dusk*.24-env.rain*.05,.81-dusk*.32+env.rain*.12);
  sun.color.copy(moonColor).lerp(sunColor,day);
  ambient.color.setRGB(.47+day*.22,.53+day*.27,.73+day*.19);
  ambient.intensity=.48+day*(1.35-env.rain*.22)+flash*.75;
  airColor.copy(dayAir).lerp(duskAir,dusk).lerp(stormAir,env.rain*.85);
  scene.fog.color.copy(nightAir).lerp(airColor,day);
  scene.fog.density=.000004+env.haze*.000014;
  runwayLights.uniforms.daylight.value=day;runwayLights.uniforms.haze.value=env.haze;
  runwayLights.uniforms.observerZ.value=runwaySin*(camera.position.x+origin.x-data.airport.x)+runwayCos*(camera.position.z+origin.z-data.airport.z);

  const drift=motionClock*env.wind*.72;
  function positionCloud(cloud){
   const base=cloud.userData.base;
   cloud.position.x=base.x+drift-Math.round((base.x+drift-state.position.x)/180000)*180000;
   cloud.position.z=base.z+drift*.18-Math.round((base.z+drift*.18-state.position.z)/180000)*180000;
  }
  let inside=0;
  const cloudCount=Math.round(env.clouds*(low?8:quality==='cinematic'?34:17));
  for(let n=0;n<clouds.length;n++){
   const cloud=clouds[n];
   cloud.visible=n<cloudCount;
   if(!cloud.visible)continue;
   const uniforms=cloud.material.uniforms;
   uniforms.day.value=day;uniforms.time.value=motionClock;uniforms.opacity.value=.87+env.haze*.08;
   uniforms.wet.value=env.rain;uniforms.flash.value=flash;
   positionCloud(cloud);
   cloud.position.y=cloud.userData.base.y-(env.rain*1700+env.haze*550);
   const p=state.position,sz=cloud.userData.size;
   const distance=Math.hypot((p.x-cloud.position.x)/sz.x,(p.y-cloud.position.y)/sz.y,(p.z-cloud.position.z)/sz.z);
   inside=Math.max(inside,1-distance);
  }
  const spriteCount=env.clouds*sprites.length*(low?.46:1);
  for(let n=0;n<sprites.length;n++){
   const sprite=sprites[n];
   sprite.visible=n<spriteCount;
   if(!sprite.visible)continue;
   positionCloud(sprite);
   const distance=Math.hypot(state.position.x-sprite.position.x,state.position.z-sprite.position.z);
   sprite.material.opacity=(.12+env.clouds*.085)*THREE.MathUtils.smoothstep(distance,14000,32000);
   if(sprite.material.opacity<.015){sprite.visible=false;continue;}
   sprite.material.color.setRGB(.31+day*(.67-env.rain*.48)+flash*.12,.38+day*(.48-env.rain*.27)+flash*.14,.51+day*.27+flash*.18);
   sprite.position.y=sprite.userData.base.y-env.rain*1950;
  }
  for(const g of terrainMeshes.values())g.children[1].userData.lights.material.opacity=.10+(1-day)*.82;
  rain.visible=env.rain>.12&&!reducedMotion;
  if(rain.visible){
   rain.position.copy(camera.position);
   rainMaterial.uniforms.clock.value=motionClock;
   rainMaterial.uniforms.day.value=day;
   rainMaterial.uniforms.wet.value=env.rain;
   rainMaterial.uniforms.wind.value=env.wind;
  }
  scene.fog.density+=inside*.00025;
  return {day,cloudDensity:inside,wind:env.wind,rain:env.rain,time:env.time,weather,flash,skyLight:1-env.clouds*.25-env.rain*.28};
 }
 function setWeather(name,{immediate=false,time}={}){if(!Object.hasOwn(WEATHER,name))return;weather=name;target={...WEATHER[name]};if(Number.isFinite(time))target.time=((time%24)+24)%24;if(immediate)Object.assign(env,target);}
 function setTime(time){target.time=time;}
 function setQuality(name){quality=name;const low=name==='performance';for(const c of clouds)c.material.uniforms.steps.value=low?8:name==='cinematic'?24:14;for(let n=0;n<clouds.length;n++)clouds[n].material.uniforms.opacity.value=low?.65:.85;sun.castShadow=!low;}
 return {group,env,sun,clouds,update,setWeather,setTime,setQuality,get weather(){return weather;},dispose(){group.traverse(o=>{o.geometry?.dispose();});runwayLights.dispose();runwayPaint.dispose();terrainMaterial.dispose();sky.geometry.dispose();ocean.geometry.dispose();rainGeometry.dispose();atmosphere.sky.dispose();atmosphere.ocean.dispose();rainMaterial.dispose();cloudTex.dispose();scene.remove(group,sky,ocean,rain,ambient,sun,sun.target);}};
}







