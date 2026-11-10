import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = await readFile(new URL('../assets/skyjourney-icon.svg', import.meta.url));
const output = new URL('../SkyJourney.ico', import.meta.url);
const sizes = [16, 24, 32, 48, 64, 96, 128, 256];

// Small entries use 32-bit Windows DIBs so older shell icon readers can use them too.
async function bitmapEntry(size) {
  const rgba = await sharp(source).resize(size, size).ensureAlpha().raw().toBuffer();
  const headerBytes = 40;
  const colorBytes = size * size * 4;
  const maskStride = Math.ceil(size / 32) * 4;
  const bitmap = Buffer.alloc(headerBytes + colorBytes + maskStride * size);
  bitmap.writeUInt32LE(headerBytes, 0);
  bitmap.writeInt32LE(size, 4);
  bitmap.writeInt32LE(size * 2, 8); // The DIB height includes both the color image and the AND mask.
  bitmap.writeUInt16LE(1, 12);
  bitmap.writeUInt16LE(32, 14);

  for (let y = 0; y < size; y++) {
    const row = size - 1 - y; // Windows DIB rows run bottom to top.
    for (let x = 0; x < size; x++) {
      const from = (y * size + x) * 4;
      const to = headerBytes + (row * size + x) * 4;
      const alpha = rgba[from + 3];
      if (alpha === 0) {
        bitmap[headerBytes + colorBytes + row * maskStride + (x >> 3)] |= 0x80 >> (x & 7);
      } else {
        bitmap[to] = rgba[from + 2];
        bitmap[to + 1] = rgba[from + 1];
        bitmap[to + 2] = rgba[from];
        bitmap[to + 3] = alpha;
      }
    }
  }
  return bitmap;
}

const images = await Promise.all(sizes.map(size => size <= 64
  ? bitmapEntry(size)
  : sharp(source).resize(size, size).png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer()));

const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
for (let i = 0; i < sizes.length; i++) {
  const entry = 6 + i * 16;
  directory[entry] = directory[entry + 1] = sizes[i] % 256;
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(images[i].length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += images[i].length;
}
await writeFile(output, Buffer.concat([directory, ...images], offset));
console.log(`SkyJourney.ico · ${sizes.join(', ')} px · ${offset} bytes`);
