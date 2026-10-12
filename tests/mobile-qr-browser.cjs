const fs = require('node:fs/promises');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async()=>{
 const html = await fs.readFile(require('node:path').join(__dirname,'../src/mobile-controller.html'),'utf8');
 const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html)});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({...(process.env.SKYJOURNEY_BROWSER_CHANNEL?{channel:process.env.SKYJOURNEY_BROWSER_CHANNEL}:{}),headless:true});
 const results=[];
 try {
  async function pageFor(path,fail=false){
   const page=await browser.newPage({viewport:{width:390,height:844}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({fail})=>{
    window.__test={urls:[],permissions:0};
    class Socket extends EventTarget {
     static OPEN=1;readyState=1;
     constructor(url){super();window.__test.urls.push(url);setTimeout(()=>{if(fail&&window.__test.urls.length===1){this.readyState=3;this.dispatchEvent(new Event('error'));this.dispatchEvent(new Event('close'))}else this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'paired',hostConnected:true})}));},0)}
     send(){}close(){this.readyState=3;this.dispatchEvent(new Event('close'))}
    }
    window.WebSocket=Socket;
    window.DeviceOrientationEvent=class { static requestPermission(){window.__test.permissions++;return Promise.resolve('granted')} };
    Object.defineProperty(navigator,'wakeLock',{value:{request:async()=>({release:async()=>{}})},configurable:true});
   },{fail});
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
  console.log(JSON.stringify({passed:results,browser:await browser.version()},null,2));
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});


