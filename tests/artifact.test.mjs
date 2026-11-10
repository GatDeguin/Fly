import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('deliverable is a valid classic single-file offline bundle',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);new vm.Script(scripts[0][1]);
 const icon=html.match(/<link rel="icon" type="image\/x-icon" href="data:image\/x-icon;base64,([A-Za-z0-9+/=]+)">/);
 assert.ok(icon,'the standalone HTML carries its own ICO favicon');
 assert.ok(!/<script[^>]+src=|<link[^>]+href=|<img[^>]+src=\s*["']https?:/i.test(html.replace(icon[0],'')));
 assert.ok(!scripts[0][1].includes('fetch('));
 assert.ok(!html.includes('<!--APP_SCRIPT-->')&&!html.includes('<!--APP_ICON-->'));
 assert.ok(html.includes('SkyJourney')&&html.includes('WebGL'));
 const ico=fs.readFileSync(new URL('../SkyJourney.ico',import.meta.url));
 assert.deepEqual(Buffer.from(icon[1],'base64'),ico);
 assert.equal(ico.readUInt16LE(0),0);
 assert.equal(ico.readUInt16LE(2),1);
 const count=ico.readUInt16LE(4),sizes=[];
 for(let i=0;i<count;i++){
  const entry=6+i*16,size=ico[entry]||256,bytes=ico.readUInt32LE(entry+8),offset=ico.readUInt32LE(entry+12);
  assert.equal(ico[entry+1]||256,size);
  assert.ok(bytes>0&&offset>=6+count*16&&offset+bytes<=ico.length);
  sizes.push(size);
 }
 for(const size of [16,32,48,64,128,256])assert.ok(sizes.includes(size),`ICO contains a ${size}px image`);
});
