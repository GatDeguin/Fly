import test from 'node:test';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import {createPairingURL, createQRMatrix} from '../src/qr-code.js';

test('QR links contain the controller address and current PIN in a fragment',()=>{
 const link=createPairingURL('https://192.168.1.20:8443/controller','123456');
 assert.equal(link,'https://192.168.1.20:8443/controller#pin=123456');
 const url=new URL(link);assert.equal(url.search,'');
 assert.throws(()=>createPairingURL('https://192.168.1.20:8443/controller','12foo6'));
 assert.throws(()=>createPairingURL('http://192.168.1.20:8443/controller','123456'));
});

test('generated QR decodes back to the exact phone pairing link without an external service',()=>{
 const link=createPairingURL('https://192.168.1.20:8443/controller','654321');
 const matrix=createQRMatrix(link),scale=6,padding=4,size=(matrix.length+padding*2)*scale;
 const pixels=new Uint8ClampedArray(size*size*4);pixels.fill(255);
 for(let row=0;row<matrix.length;row++)for(let col=0;col<matrix.length;col++)if(matrix[row][col]){
  for(let y=0;y<scale;y++)for(let x=0;x<scale;x++){
   const p=(((row+padding)*scale+y)*size+(col+padding)*scale+x)*4;
   pixels[p]=pixels[p+1]=pixels[p+2]=0;
  }
 }
 const decoded=jsQR(pixels,size,size);assert.ok(decoded,'real QR decoder recognizes the code');assert.equal(decoded.data,link);
});
