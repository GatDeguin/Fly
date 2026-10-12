import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import {chromium} from 'playwright';
import sharp from 'sharp';
await fs.mkdir('artifacts',{recursive:true});
const html=await fs.readFile('index.html','utf8');
const browser=await chromium.launch({...(process.env.SKYJOURNEY_BROWSER_CHANNEL?{channel:process.env.SKYJOURNEY_BROWSER_CHANNEL}:{}),headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 // HTTPS fixture is fulfilled in-process: no certificate bypass or LAN connection.
 await page.route('**/*',route=>route.request().url().startsWith('https://skyjourney.test/')?route.fulfill({status:200,contentType:'text/html',body:html}):route.abort());
 await page.addInitScript(()=>{
  class TestSocket extends EventTarget{
   static CONNECTING=0;static OPEN=1;readyState=0;
   constructor(){super();window.qrTestSocket=this;setTimeout(()=>{this.readyState=1;this.dispatchEvent(new Event('open'));this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'paired',controllerURL:'https://192.168.1.20:8443/controller',pin:'123456',controllerConnected:false,hostConnected:true})}));},10);}
   send(){}close(){this.readyState=3;this.dispatchEvent(new Event('close'));}
  }window.WebSocket=TestSocket;
 });
 await page.goto('https://skyjourney.test/?hostPin=123456');
 const dialog=page.locator('#mobile-link-dialog');await dialog.waitFor({state:'visible'});
 await page.locator('#loader').waitFor({state:'detached'});
 const qr=await page.locator('#mobile-pairing-qr').screenshot();
 await fs.writeFile('artifacts/pairing-qr-test.png',qr);
 const decodedImage=await sharp(qr).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const decoded=jsQR(new Uint8ClampedArray(decodedImage.data),decodedImage.info.width,decodedImage.info.height);
 assert.equal(decoded?.data,'https://192.168.1.20:8443/controller#pin=123456','on-screen QR decodes to the exact session link');
 assert.ok(requests.every(url=>url.startsWith('https://skyjourney.test/')),'QR rendering requests no external service');
 assert.equal(await page.locator('#mobile-pairing-pin').textContent(),'123456');
 await dialog.locator('button').click();assert.equal(await dialog.isVisible(),false);
 await page.evaluate(()=>SkyJourney.action('mobileLink'));await dialog.waitFor({state:'visible'});
 await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);
 await page.evaluate(()=>SkyJourney.action('mobileLink'));await dialog.waitFor({state:'visible'});
 await page.evaluate(()=>window.qrTestSocket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'status',controllerConnected:true,hostConnected:true})})));
 assert.equal(await dialog.isVisible(),false,'pairing success closes the QR so flight is visible');
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('QR dialog: automatic display, real screenshot decoding, manual fallback, Escape and pairing-success dismissal pass.');
}finally{await browser.close();}
