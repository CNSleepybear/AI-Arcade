/**
 * Generates a minimal 32×32 ICO file for AI Arcade.
 * Writes raw BMP data embedded in ICO container — no external dependencies.
 *
 * Usage: node scripts/generate-icon.js
 * Output: public/favicon.ico
 */

import { writeFileSync } from 'fs';

const W = 256, H = 256;

// Color palette (BGR)
const BG = [0x1a, 0x15, 0x10];  // dark brown
const FG = [0xe0, 0xff, 0x00];  // neon cyan
const AC = [0xcc, 0xaa, 0x44];  // warm amber

// Build a 256×256 pixel pattern: "A" letter shape in neon cyan on dark bg
const pixels = Buffer.alloc(W * H);
const m = W / 32; // scale factor from 32x32 design
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const cx = W / 2, cy = H / 2;
    // "A" shape (proportional)
    const yl = 4 * m, yh = 28 * m, yb = 12 * m, yt = 16 * m;
    const xl0 = 4 * m, xl1 = 6 * m, xr1 = 26 * m, xr0 = 28 * m;
    const inA =
      (y > yl && y < yh && x > xl0 + (y - yl) * 0.55 && x < xr0 - (y - yl) * 0.55) ||
      (y > yb && y < yt && x > xl1 && x < xr1);
    // Outer glow ring
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const ringR = 13.5 * m;
    const inRing = d > ringR && d < ringR + 1.5 * m;
    pixels[y * W + x] = inA ? 1 : inRing ? 2 : 0;
  }
}

// Build 4bpp BMP (16 colors, 2 colors used)
const palette = [BG, FG, AC, ...Array(13).fill([0, 0, 0])].flat();
const rowSize = Math.ceil(W / 2); // 4bpp → 2 pixels per byte
const pixelDataSize = rowSize * H;
const bmpHeaderSize = 14;
const dibHeaderSize = 40;
const paletteSize = 16 * 4;
const bmpFileSize = bmpHeaderSize + dibHeaderSize + paletteSize + pixelDataSize;

const bmp = Buffer.alloc(bmpFileSize);
let off = 0;
// BMP file header
bmp.write('BM', off); off += 2;
bmp.writeUInt32LE(bmpFileSize, off); off += 4;
bmp.writeUInt16LE(0, off); off += 2; // reserved
bmp.writeUInt16LE(0, off); off += 2; // reserved
bmp.writeUInt32LE(bmpHeaderSize + dibHeaderSize + paletteSize, off); off += 4; // data offset

// DIB header
bmp.writeUInt32LE(dibHeaderSize, off); off += 4;
bmp.writeInt32LE(W, off); off += 4;
bmp.writeInt32LE(H * 2, off); off += 4; // double height (ICO convention for BMP)
bmp.writeUInt16LE(1, off); off += 2; // planes
bmp.writeUInt16LE(4, off); off += 2; // bpp
bmp.writeUInt32LE(0, off); off += 4; // compression
bmp.writeUInt32LE(pixelDataSize, off); off += 4;
bmp.writeInt32LE(0, off); off += 4; // h res
bmp.writeInt32LE(0, off); off += 4; // v res
bmp.writeUInt32LE(16, off); off += 4; // palette colors
bmp.writeUInt32LE(0, off); off += 4; // important colors

// Palette
for (const c of palette) { bmp.writeUInt8(c, off); off += 1; }

// Pixels (bottom-up for BMP, with 4bpp packing)
for (let y = H - 1; y >= 0; y--) {
  for (let x = 0; x < W; x += 2) {
    const p0 = pixels[y * W + x] & 0xf;
    const p1 = (x + 1 < W) ? (pixels[y * W + x + 1] & 0xf) : 0;
    bmp.writeUInt8((p0 << 4) | p1, off); off += 1;
  }
}

// ICO container
const icoHeaderSize = 6;
const icoDirEntrySize = 16;
const icoFileSize = icoHeaderSize + icoDirEntrySize + bmp.length;

const ico = Buffer.alloc(icoFileSize);
off = 0;
ico.writeUInt16LE(0, off); off += 2;  // reserved
ico.writeUInt16LE(1, off); off += 2;  // type: ICO
ico.writeUInt16LE(1, off); off += 2;  // count: 1 image
// Directory entry (ICO convention: 256 → store as 0)
ico.writeUInt8(W >= 256 ? 0 : W, off); off += 1;
ico.writeUInt8(H >= 256 ? 0 : H, off); off += 1;
ico.writeUInt8(0, off); off += 1;     // palette colors
ico.writeUInt8(0, off); off += 1;     // reserved
ico.writeUInt16LE(0, off); off += 2;  // planes
ico.writeUInt16LE(4, off); off += 2;  // bpp
ico.writeUInt32LE(bmp.length, off); off += 4; // image size
ico.writeUInt32LE(icoHeaderSize + icoDirEntrySize, off); off += 4; // offset
// Image data
bmp.copy(ico, off);

writeFileSync('public/favicon.ico', ico);
console.log('✅ Generated public/favicon.ico (32×32, "A" logo)');
