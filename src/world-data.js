export function random(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296;};}
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
export function noise(x,z,seed=42){const X=Math.floor(x),Z=Math.floor(z),u=smooth(x-X),v=smooth(z-Z);const h=(i,j)=>{let n=Math.imul(i,374761393)^Math.imul(j,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};return mix(mix(h(X,Z),h(X+1,Z),u),mix(h(X,Z+1),h(X+1,Z+1),u),v);}
export function createWorldData(seed=42){
 const airport={x:0,z:0,y:120,heading:178,length:2800,width:60,name:'SJN · Solana Island'};
 const curated=[{x:0,z:0,radius:6500,rx:6500,rz:9000,peak:1900,name:'Solana'}, {x:-9500,z:-15000,radius:4700,rx:4200,rz:5900,peak:2700,name:'Quiet Peaks'}, {x:14000,z:-7000,radius:6800,rx:8500,rz:4600,peak:2400,name:'Golden Island'}, {x:26000,z:17000,radius:9000,rx:11500,rz:6200,peak:3100,name:'Crescent Coast'}, {x:-15000,z:22000,radius:5200,rx:4900,rz:6500,peak:2200,name:'Maravilla'}, {x:-37000,z:8000,radius:7500,rx:8500,rz:6300,peak:3300,name:'Lavender Ridge'}, {x:48000,z:50000,radius:12500,rx:16000,rz:10000,peak:4100,name:'Blue Horizon'}, {x:-34000,z:57000,radius:13000,rx:16000,rz:9500,peak:3600,name:'Far Mountains'}].map((i,n)=>({...i,seed:seed+n*179}));
 const tiles=new Map();
 function tile(tx,tz){const key=tx+','+tz;if(tiles.has(key))return tiles.get(key);const rng=random(seed^Math.imul(tx,73856093)^Math.imul(tz,19349663));const a=[];if(Math.abs(tx)>0||Math.abs(tz)>1){for(let n=0;n<3;n++){const r=2600+rng()*7800;a.push({x:tx*80000+(rng()-.5)*55000,z:tz*80000+(rng()-.5)*55000,radius:r,rx:r*(.7+rng()*.7),rz:r*(.6+rng()),peak:900+rng()*3000,seed:(rng()*100000)|0,name:'Uncharted island'});}}tiles.set(key,a);return a;}
 function candidates(x,z){const tx=Math.round(x/80000),tz=Math.round(z/80000),a=[...curated];for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)a.push(...tile(tx+i,tz+j));return a;}
 function coast(i,a){return 1+.14*Math.sin(a*3+i.seed)+.085*Math.sin(a*7-i.seed)+.045*Math.sin(a*13+i.seed*3);}
 function islandHeight(i,x,z){const dx=(x-i.x)/i.rx,dz=(z-i.z)/i.rz,a=Math.atan2(dz,dx),d=Math.hypot(dx,dz)/coast(i,a);if(d>=1)return 0;const n=noise(dx*5+20,dz*5+40,i.seed)*.55+noise(dx*11,dz*11,i.seed)*.28+noise(dx*23,dz*23,i.seed)*.17;const ridge=Math.pow(Math.max(0,1-d),1.5);return 4+i.peak*ridge*(.22+n*1.3);}
 function runwayDistance(x,z){const h=airport.heading*Math.PI/180,dx=x-airport.x,dz=z-airport.z;return {side:dx*Math.cos(h)+dz*Math.sin(h),along:dx*Math.sin(h)-dz*Math.cos(h)};}
 function surfaceHeight(x,z){let y=0;for(const i of candidates(x,z)){if(Math.abs(x-i.x)<i.rx*1.35&&Math.abs(z-i.z)<i.rz*1.35)y=Math.max(y,islandHeight(i,x,z));}const d=runwayDistance(x,z);const weight=Math.max(Math.abs(d.side)/700,Math.abs(d.along)/2400);if(weight<1.5)y=mix(airport.y,y,smooth(Math.max(0,Math.min(1,(weight-1)*2))));return Math.max(0,y);}
 const surfaceGrids=new Map();
 function grid(island){const key=island.seed+','+island.x+','+island.z;if(surfaceGrids.has(key))return surfaceGrids.get(key);const vertices=[];for(let r=0;r<=26;r++)for(let a=0;a<=80;a++){const angle=a/80*Math.PI*2,rr=r/26*coast(island,angle),x=island.x+Math.cos(angle)*island.rx*rr,z=island.z+Math.sin(angle)*island.rz*rr;vertices.push({x,z,y:surfaceHeight(x,z)});}surfaceGrids.set(key,vertices);if(surfaceGrids.size>80)surfaceGrids.delete(surfaceGrids.keys().next().value);return vertices;}
 function triangleHeight(x,z,a,b,c){const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-8)return null;const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den,w=1-u-v;return u>=-1e-7&&v>=-1e-7&&w>=-1e-7?u*a.y+v*b.y+w*c.y:null;}
 function terrainHeight(x,z){let height=0;for(const island of candidates(x,z)){const dx=(x-island.x)/island.rx,dz=(z-island.z)/island.rz;if(Math.abs(dx)>1.35||Math.abs(dz)>1.35)continue;const angle=(Math.atan2(dz,dx)+Math.PI*2)%(Math.PI*2),distance=Math.hypot(dx,dz)/coast(island,angle);if(distance>1.04)continue;const a=Math.min(79,Math.floor(angle/(Math.PI*2)*80)),r=Math.min(25,Math.floor(distance*26)),g=grid(island);for(let ring=Math.max(0,r-2);ring<=Math.min(25,r+2);ring++){const q=ring*81+a;const first=triangleHeight(x,z,g[q],g[q+1],g[q+81]),second=triangleHeight(x,z,g[q+1],g[q+82],g[q+81]);if(first!==null||second!==null){height=Math.max(height,first??second);break;}}}return Math.max(0,height);}
 const routes={
  'Golden Islands':[{x:-22000,z:-33000,name:'Cloudgate'},{x:-11000,z:-10000,name:'Quiet Peaks'},{x:14000,z:-7000,name:'Golden Island'},{x:24000,z:18000,name:'Crescent Coast'}],
  'Above the Clouds':[{x:-22000,z:-33000,name:'Cloudgate'},{x:-38000,z:8000,name:'Lavender Ridge'},{x:-34000,z:57000,name:'Far Mountains'}],
  'Sunset Coast':[{x:-22000,z:-33000,name:'Cloudgate'},{x:0,z:0,name:'Solana'},{x:26000,z:17000,name:'Crescent Coast'}],
  'Quiet Mountains':[{x:-22000,z:-33000,name:'Cloudgate'},{x:-9500,z:-15000,name:'Quiet Peaks'},{x:-37000,z:8000,name:'Lavender Ridge'}],
  'Blue Horizon':[{x:-22000,z:-33000,name:'Cloudgate'},{x:14000,z:-7000,name:'Golden Island'},{x:48000,z:50000,name:'Blue Horizon'}],
  'Night Lights':[{x:-22000,z:-33000,name:'Cloudgate'},{x:0,z:0,name:'Solana'},{x:-15000,z:22000,name:'Maravilla'}]
 };
 const islands=candidates(-22000,-33000);
 return {seed,airport,islands,routes,terrainHeight,surfaceHeight,islandHeight,coast,runwayDistance,candidates};
}
