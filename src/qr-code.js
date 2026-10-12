/*!
 * qrcode-generator — Copyright (c) 2009 Kazuhiko Arase. MIT License.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import qrcode from 'qrcode-generator';

export function createPairingURL(controllerURL,pin){
 if(!/^\d{6}$/.test(pin))throw new Error('El código de emparejamiento no es válido.');
 const url=new URL(controllerURL);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/controller')throw new Error('La dirección del mando no es válida.');
 if(['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Conectá la PC a la Wi-Fi para obtener una dirección accesible desde el celular.');
 url.searchParams.delete('pin');url.hash='pin='+pin;
 return url.href;
}

export function createQRMatrix(text){
 const code=qrcode(0,'M');code.addData(text,'Byte');code.make();
 const size=code.getModuleCount();
 return Array.from({length:size},(_,row)=>Array.from({length:size},(_,col)=>code.isDark(row,col)));
}

export function renderPairingQR(canvas,link){
 const matrix=createQRMatrix(link),margin=4,cell=7,size=(matrix.length+margin*2)*cell;
 canvas.width=canvas.height=size;
 const context=canvas.getContext('2d');
 context.fillStyle='#ffffff';context.fillRect(0,0,size,size);context.fillStyle='#111111';
 for(let row=0;row<matrix.length;row++)for(let col=0;col<matrix.length;col++)if(matrix[row][col])context.fillRect((col+margin)*cell,(row+margin)*cell,cell,cell);
 return link;
}
