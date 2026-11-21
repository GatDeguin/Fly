import * as THREE from 'three';

export const weatherNoise = /* glsl */`
float hash(vec3 p) {
  p=fract(p*.3183099+vec3(.1,.2,.3))*17.;
  return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}
float noise3(vec3 p) {
  vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float cloudNoise(vec3 p) {
  return .56*noise3(p)+.27*noise3(p*2.07)+.12*noise3(p*4.13)+.05*noise3(p*8.22);
}`;

const atmosphere = /* glsl */`
uniform vec3 sun;
uniform float day,haze,cover,wet,flash,time,wind,detail;
vec3 horizonTint(vec3 d) {
  float facing=clamp(dot(d,sun)*.5+.5,0.,1.);
  float dusk=1.-smoothstep(.035,.44,sun.y);
  vec3 sunset=mix(vec3(.50,.41,.51),vec3(1.03,.55,.31),pow(facing,3.));
  vec3 edge=mix(vec3(.55,.72,.83),sunset,dusk);
  edge=mix(edge,vec3(.46,.53,.64),wet*.82);
  return mix(vec3(.071,.092,.167),edge,day)+flash*vec3(.11,.16,.24);
}
vec3 skyTint(vec3 d) {
  float height=1.-exp(-max(d.y,0.)*(3.2-haze));
  float dusk=1.-smoothstep(.05,.49,sun.y);
  vec3 zenith=mix(vec3(.14,.32,.60),vec3(.24,.25,.49),dusk);
  zenith=mix(zenith,vec3(.23,.30,.43),max(wet,cover*haze*.62));
  zenith=mix(vec3(.012,.022,.062),zenith,day)+flash*vec3(.13,.19,.29);
  return mix(horizonTint(d),zenith,height);
}`;

const vertex = /* glsl */`
varying vec3 localPoint, scenePoint;
void main() {
  localPoint=position;
  scenePoint=(modelMatrix*vec4(position,1.)).xyz;
  gl_Position=projectionMatrix*viewMatrix*vec4(scenePoint,1.);
}`;

const displayColor = /* glsl */`
  gl_FragColor=vec4(pow(max(color,vec3(0.)),vec3(2.2)),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

const skyFragment = /* glsl */`
varying vec3 localPoint;
uniform vec3 observer;
${weatherNoise}${atmosphere}
float skyStars(vec3 d) {
  vec2 p=vec2(atan(d.z,d.x)*.15915494+.5,asin(clamp(d.y,-1.,1.))*.31830989+.5)*vec2(860.,440.);
  vec2 cell=floor(p);
  float seed=hash(vec3(cell,11.1));
  vec2 center=.26+.48*vec2(hash(vec3(cell,2.2)),hash(vec3(cell,7.8)));
  float r=length(fract(p)-center), width=clamp(fwidth(r)*.7,.022,.12);
  return step(.983,seed)*(1.-smoothstep(.08-width,.119+width,r))*(.31+.74*hash(vec3(cell,3.)));
}
void main() {
  vec3 d=normalize(localPoint);
  float h=d.y, facing=max(dot(d,sun),0.);
  float dusk=1.-smoothstep(.06,.50,sun.y);
  vec3 color=skyTint(d);
  float solarDistance=length(d-sun);
  float stormVeil=1.-wet*.94;
  float disc=1.-smoothstep(.0044,.0058,solarDistance);
  vec3 glare=mix(vec3(1.,.89,.64),vec3(1.,.59,.29),dusk*.65);
  color+=glare*(disc*2.75+.43*exp(-solarDistance*solarDistance*49.)+.12*pow(facing,12.))*day*stormVeil;
  if(day<.98 && h>-.02) {
    float stars=skyStars(d)*smoothstep(-.02,.25,h)*(1.-day)*(1.-wet);
    color+=vec3(.71,.82,1.)*stars;
    vec3 moonDir=normalize(vec3(-.38,.49,.77));
    float moon=length(d-moonDir);
    float phase=smoothstep(.003,.005,dot(d-moonDir,normalize(cross(vec3(0,1,0),moonDir)))+.004);
    color+=vec3(.70,.81,1.)*(1.-day)*(1.-wet)*(phase*(1.-smoothstep(.008,.009,moon))+.16*exp(-moon*moon*470.));
  }
  if(h>.005 && cover>.08) {
    vec2 drift=vec2(time*(1.6+wind*.30),time*(.24-wind*.043));
    for(int layer=0;layer<2;layer++) {
      if(layer==1 && detail<.5) break;
      float k=float(layer);
      float altitude=mix(17300.,12400.,k);
      vec2 q=(observer.xz+d.xz*(max(3800.,altitude-observer.y)/(h+.055))+drift*(1.+k*.47));
      q=q*mix(.00043,.00078,k)*vec2(.78,1.22)+vec2(12.1+k*29.,18.7);
      vec3 p=vec3(q,1.8+k*10.7);
      float warp=noise3(p*.54);
      p.xy+=vec2(warp*1.75,-warp*.65);
      float body=cloudNoise(p);
      float weatherFront=noise3(p*.24+vec3(3.1,8.2,0.));
      float edge=mix(.71,.39,clamp(cover*.82+wet*.48,0.,1.))+(.055-k*.07)+(.60-weatherFront)*.21*(1.-wet*.65);
      float thickness=smoothstep(edge-.043,edge+.148,body);
      float shape=thickness*smoothstep(.007,.088,h)*mix(.70,.92,k);
      float sunlight=clamp(.62+(body-cloudNoise(p+vec3(sun.xz*.29,.19)))*2.8,0.,1.);
      vec3 shadow=mix(vec3(.39,.48,.65),vec3(.50,.36,.49),dusk);
      vec3 rim=mix(vec3(.84,.91,1.),vec3(1.06,.71,.52),dusk*(.48+facing*.42));
      vec3 cloud=mix(shadow,rim,sunlight);
      cloud=mix(cloud,mix(vec3(.19,.25,.35),vec3(.54,.61,.71),sunlight),wet);
      cloud=mix(vec3(.056,.070,.127),cloud,day)+flash*vec3(.29,.36,.48);
      color=mix(color,cloud,shape);
    }
  }
  color+=(hash(vec3(gl_FragCoord.xy,31.))-.5)*.0029;
  ${displayColor}
}`;

const COAST_LIMIT = 12;
const oceanFragment = /* glsl */`
varying vec3 scenePoint;
uniform vec3 worldOrigin;
uniform vec4 coastIsland[${COAST_LIMIT}];
uniform vec3 coastPhase[${COAST_LIMIT}];
uniform int coastCount;
${weatherNoise}${atmosphere}

float shoreline(vec2 position) {
  float nearest=5200.;
  for(int i=0;i<${COAST_LIMIT};i++) {
    if(i>=coastCount) break;
    vec4 island=coastIsland[i];
    vec2 p=(position-island.xy)/island.zw;
    float radial=length(p);
    if(radial>1.25+nearest/min(island.z,island.w)) continue;
    float theta=atan(p.y,p.x);
    vec3 phase=coastPhase[i];
    float edge=1.+.14*sin(theta*3.+phase.x)+.085*sin(theta*7.+phase.y)+.045*sin(theta*13.+phase.z);
    nearest=min(nearest,(radial-edge)*min(island.z,island.w));
  }
  return nearest;
}

void main() {
  vec2 q=(scenePoint+worldOrigin).xz;
  vec3 eye=cameraPosition-scenePoint;
  float distanceToEye=length(eye);
  vec3 v=eye/max(distanceToEye,1.);
  float wide=noise3(vec3(q*.00046,3.));
  float swell=noise3(vec3(q*.0014,12.));
  float phaseA=dot(q,vec2(.0037,.0028))+time*(.72+wind*.041)+wide*11.0+swell*3.4;
  float phaseB=dot(q,vec2(-.0053,.0081))-time*(.88+wind*.018)+wide*7.6-swell*5.;
  float phaseC=dot(q,vec2(.0087,-.0022))+time*.67+wide*14.0;
  vec2 slopes=vec2(cos(phaseA)*.72+.38*cos(phaseB)+.26*cos(phaseC),.56*cos(phaseA)-.55*cos(phaseB)+.32*cos(phaseC));
  if(detail>.5 && distanceToEye<60000.) {
    float ripple=noise3(vec3(q*.013+vec2(time*.24,-time*.12),7.));
    float ripples=cos(dot(q,vec2(.031,-.044))+ripple*5.2+time*1.9);
    slopes+=vec2(ripple-.5,ripples*.30)*(1.-smoothstep(18000.,60000.,distanceToEye));
  }
  float wave=mix(.034,.133,clamp(wind/31.,0.,1.));
  vec3 n=normalize(vec3(slopes.x*wave,1.,slopes.y*wave));
  float fresnel=.035+.965*pow(1.-clamp(dot(n,v),0.,1.),5.);
  vec3 reflected=reflect(-v,n);
  vec3 deep=mix(vec3(.025,.072,.136),vec3(.058,.245,.348),day);
  deep*=.84+wide*.26;
  float coast=distanceToEye<96000.?shoreline(q):5200.;
  float shallows=1.-smoothstep(35.,920.+wide*740.,coast);
  deep=mix(deep,mix(vec3(.050,.125,.169),vec3(.17,.54,.55),day),shallows*.78);
  vec3 color=mix(deep,skyTint(reflected),fresnel*.77);
  float reflection=clamp(dot(n,normalize(sun+v)),0.,1.);
  float dusk=1.-smoothstep(.06,.53,sun.y);
  vec3 sunlight=mix(vec3(1.,.92,.75),vec3(1.17,.68,.33),dusk);
  float spec=pow(reflection,mix(335.,95.,clamp(wind/31.,0.,1.)));
  float glow=pow(reflection,30.)*.23;
  color+=sunlight*(spec*(.34+swell*.53)+glow)*day*(1.-wet*.9)*smoothstep(-.045,.08,sun.y);
  if(coast<370. && coast>-150.) {
    float surf=(1.-smoothstep(90.,370.,max(coast,0.)))*smoothstep(-135.,9.,coast);
    float breakup=noise3(vec3(q*.007,5.));
    float breakLine=.5+.5*sin(coast*.055+wide*27.+swell*7.+breakup*1.6-time*(1.22+wind*.055));
    float foam=smoothstep(.71,.95,breakLine)*surf*smoothstep(.27,.71,breakup)*(.38+wide*.41);
    color=mix(color,mix(vec3(.15,.20,.27),vec3(.78,.89,.85),day),foam*(.30+clamp(wind/17.,0.,1.)*.50));
  }
  if(wind>12.) {
    float crest=smoothstep(.64,.96,cos(phaseA)*.68+cos(phaseB)*.32);
    color+=crest*smoothstep(.53,.73,wide)*(wind-12.)*.0025*day;
  }
  float farFog=1.-exp(-distanceToEye*(.000009+haze*.000019));
  float grazing=1.-smoothstep(.015,.095,v.y);
  float fog=max(farFog,grazing*.93);
  color=mix(color,horizonTint(normalize(-eye)),fog);
  ${displayColor}
}`;

export function createAtmosphere(sun) {
  const uniforms = {
    sun: {value:sun}, day:{value:1}, haze:{value:.22}, cover:{value:.65}, wet:{value:0}, flash:{value:0},
    time:{value:0}, wind:{value:3}, detail:{value:1}, observer:{value:new THREE.Vector3()}, worldOrigin:{value:new THREE.Vector3()},
    coastIsland:{value:Array.from({length:COAST_LIMIT},()=>new THREE.Vector4())},
    coastPhase:{value:Array.from({length:COAST_LIMIT},()=>new THREE.Vector3())}, coastCount:{value:0},
  };
  const sky = new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms,vertexShader:vertex,fragmentShader:skyFragment});
  const ocean = new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:oceanFragment});
  let coastKey = '';

  function setCoasts(islands, position) {
    const x=Math.floor(position.x/12000),z=Math.floor(position.z/12000);
    const key=`${x},${z},${islands[islands.length-1]?.seed}`;
    if (key===coastKey) return;
    coastKey=key;
    const centerX=(x+.5)*12000,centerZ=(z+.5)*12000;
    const distance=i=>Math.hypot(centerX-i.x,centerZ-i.z)-Math.max(i.rx,i.rz);
    const nearest=[...islands].sort((a,b)=>distance(a)-distance(b)).slice(0,COAST_LIMIT);
    uniforms.coastCount.value=nearest.length;
    for (const [index,i] of nearest.entries()) {
      uniforms.coastIsland.value[index].set(i.x,i.z,i.rx,i.rz);
      const period=Math.PI*2;
      uniforms.coastPhase.value[index].set(i.seed%period,-i.seed%period,(i.seed*3)%period);
    }
  }

  function update(env, day, elapsed, observer, origin, flash, detailed) {
    uniforms.day.value=day;
    uniforms.haze.value=env.haze;
    uniforms.cover.value=env.clouds;
    uniforms.wet.value=env.rain;
    uniforms.flash.value=flash;
    uniforms.time.value=elapsed;
    uniforms.wind.value=env.wind;
    uniforms.detail.value=Number(detailed);
    uniforms.observer.value.copy(observer).add(origin);
    uniforms.worldOrigin.value.copy(origin);
  }
  return {sky,ocean,setCoasts,update};
}

export function createTerrainFinish() {
  const rain={value:0};
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94});
  material.onBeforeCompile=shader=>{
    shader.uniforms.terrainRain=rain;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 islandPosition;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nislandPosition=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 islandPosition;\nuniform float terrainRain;\n${weatherNoise}`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec3 ground=islandPosition;
        float valley=noise3(ground*vec3(.00063,.0018,.00063));
        float stone=noise3(ground*vec3(.0041,.011,.0041));
        vec3 slopeNormal=normalize(cross(dFdx(ground),dFdy(ground))+vec3(0.,.000001,0.));
        float slope=1.-abs(slopeNormal.y);
        float rock=smoothstep(.09,.36,slope+smoothstep(760.,2400.,ground.y)*.29+valley*.18);
        float fracture=noise3(ground*vec3(.015,.021,.013));
        float band=.5+.5*sin((ground.y+ground.x*.19-ground.z*.13)*.048+valley*19.+stone*4.);
        float sand=1.-smoothstep(4.,24.+valley*27.,ground.y);
        vec3 green=mix(vec3(.027,.062,.040),vec3(.111,.169,.074),valley)*(.68+stone*.48+fracture*.21);
        vec3 mineral=mix(vec3(.061,.075,.096),vec3(.225,.184,.164),valley)*(.71+band*.11+stone*.28+fracture*.16);
        vec3 beach=mix(vec3(.185,.154,.116),vec3(.48,.37,.235),smoothstep(1.,26.,ground.y))*(.84+stone*.30);
        vec3 groundColor=mix(mix(green,mineral,rock),beach,sand);
        diffuseColor.rgb=mix(diffuseColor.rgb,groundColor,.9)*(1.-terrainRain*(.18+sand*.14));`);
  };
  return {material,rain};
}

export function stormGlow(elapsed, wet, reducedMotion) {
  if (wet<.65 || reducedMotion || !Number.isFinite(elapsed)) return 0;
  // A single broad, distant glow with a long interval. Reduced motion always disables it.
  const phase=(elapsed+3.8)%19.7;
  return Math.exp(-Math.pow((phase-7.5)/.23,2)) * THREE.MathUtils.smoothstep(wet,.65,1) * .70;
}
