import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';

const html=await fs.readFile('index.html','utf8');
const channel=process.env.SKYJOURNEY_BROWSER_CHANNEL;
const browser=await chromium.launch({headless:true,...channel&&{channel}});
const origin='https://scenery.skyjourney.test/';
const errors=[];
await fs.mkdir('artifacts',{recursive:true});

try {
  const page=await browser.newPage({viewport:{width:1600,height:900}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',event=>{if(event.type()==='error')errors.push(event.text());});
  await page.route('**/*',route=>route.request().url().startsWith(origin)
    ?route.fulfill({status:200,contentType:'text/html',body:html}):route.abort());
  await page.goto(origin);
  await page.locator('#loader').waitFor({state:'detached'});
  await page.waitForFunction(()=>window.SkyJourney?.state.flightTime>0);

  async function capture(name){
    const image=await page.evaluate(async()=>{
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      return SkyJourney.renderer.domElement.toDataURL('image/png');
    });
    const png=Buffer.from(image.split(',')[1],'base64');
    if(name)await fs.writeFile(`artifacts/${name}.png`,png);
    return png;
  }
  async function changes(a,b,region){
    const [first,second]=await Promise.all([a,b].map(png=>sharp(png).extract(region).removeAlpha().raw().toBuffer()));
    let count=0;
    for(let i=0;i<first.length;i+=3){
      if(Math.abs(first[i]-second[i])+Math.abs(first[i+1]-second[i+1])+Math.abs(first[i+2]-second[i+2])>20)count++;
    }
    return count/(first.length/3);
  }

  await page.evaluate(()=>{
    SkyJourney.action('quality','cinematic');
    SkyJourney.action('pause',true);
    document.querySelector('.pause-screen').hidden=true;
    SkyJourney.world.setWeather('Golden Sunset',{immediate:true,time:18.36});
  });
  await capture('scenery-sunset');
  await page.evaluate(()=>SkyJourney.action('camera','Pilot'));
  const deck=await capture('scenery-flight-deck');
  await page.evaluate(()=>{SkyJourney.world.setWeather('Thunderstorm',{immediate:true,time:16});SkyJourney.action('cockpitWipers',true);});
  const storm=await capture('scenery-flight-deck-storm');
  assert.ok(await changes(deck,storm,{left:280,top:100,width:1020,height:260})>.28,'storm visibly changes the sky behind the glass');
  assert.ok(await changes(deck,storm,{left:630,top:467,width:660,height:65})<.46,'the instruments remain readable during the storm');
  await page.evaluate(()=>SkyJourney.action('reducedMotion',true));
  await page.waitForFunction(()=>SkyJourney.world.clouds.find(cloud=>cloud.visible)?.material.uniforms.time.value===0);
  const visibility=await page.evaluate(()=>{
    const clouds=SkyJourney.world.clouds.filter(cloud=>cloud.visible);
    return {count:clouds.length,wet:clouds[0].material.uniforms.wet.value,time:clouds[0].material.uniforms.time.value};
  });
  assert.ok(visibility.count>=20&&visibility.wet>.95&&visibility.time===0,'weather still renders with reduced motion and a frozen cloud clock');

  await page.evaluate(()=>{
    const sim=SkyJourney.state;
    sim.position.x=-4900;sim.position.y=1740;sim.position.z=-11000;
    sim.altitude=5709;sim.heading=2.72;sim.pitch=-.035;sim.roll=0;
    SkyJourney.action('camera','External');
    SkyJourney.world.setWeather('Ocean Breeze',{immediate:true,time:15.9});
  });
  const coast=await capture('scenery-solana-coast');
  await page.evaluate(()=>SkyJourney.world.setWeather('Misty Morning',{immediate:true,time:6.5}));
  const mist=await capture('scenery-solana-mist');
  assert.ok(await changes(coast,mist,{left:125,top:440,width:1340,height:392})>.27,'the sea and island react visibly to morning haze');
  await page.evaluate(()=>SkyJourney.action('quality','performance'));
  await capture();
  const steps=await page.evaluate(()=>SkyJourney.world.clouds.find(cloud=>cloud.visible).material.uniforms.steps.value);
  assert.equal(steps,8);
  assert.deepEqual(errors,[]);
  console.log('Scenery: sunset, storm, cockpit readability, reduced motion, coastline and performance mode passed.');
} finally {
  await browser.close();
}
