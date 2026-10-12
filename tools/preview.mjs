import http from 'node:http';
import fs from 'node:fs';
http.createServer((req,res)=>{if(req.url!=='/'&&req.url!=='/index.html'){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');fs.createReadStream(new URL('../index.html',import.meta.url)).pipe(res);}).listen(4173,'127.0.0.1',()=>console.log('Preview http://127.0.0.1:4173'));
