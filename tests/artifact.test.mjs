import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('deliverable is a valid classic single-file offline bundle',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);new vm.Script(scripts[0][1]);
 assert.ok(!/<script[^>]+src=|<link[^>]+href=|<img[^>]+src=\s*["']https?:/i.test(html));
 assert.ok(!scripts[0][1].includes('fetch('));
 assert.ok(!html.includes('<!--APP_SCRIPT-->'));
 assert.ok(html.includes('SkyJourney')&&html.includes('WebGL'));
});
