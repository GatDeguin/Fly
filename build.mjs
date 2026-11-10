import {build} from 'esbuild';
import fs from 'node:fs/promises';
await build({entryPoints:['src/main.js'],bundle:true,format:'iife',target:['chrome100','safari15'],minify:true,legalComments:'inline',outfile:'artifacts/app.js'});
const shell=await fs.readFile('src/shell.html','utf8');
const script=(await fs.readFile('artifacts/app.js','utf8')).replace(/<\/script/gi,'<\\/script');
const icon=await fs.readFile('SkyJourney.ico');
const favicon=`<link rel="icon" type="image/x-icon" href="data:image/x-icon;base64,${icon.toString('base64')}">`;
await fs.writeFile('index.html',shell.replace('<!--APP_ICON-->',()=>favicon).replace('<!--APP_SCRIPT-->',()=>'<script>'+script+'</script>'));
console.log('Built offline index.html:',(await fs.stat('index.html')).size,'bytes');
