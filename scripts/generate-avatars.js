// Generate 128x128 pixel art character avatars for the cyberpunk trio
// Run: node scripts/generate-avatars.js
// Pure JS — no external dependencies (uses node:zlib for PNG compression)

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'characters');
mkdirSync(outDir, { recursive: true });

const W = 128, H = 128;

// ============ Minimal PNG Encoder ============
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeData), 0);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  return Buffer.concat([len, typeData, crcBuf]);
}

function encodePNG(pixels) {
  // pixels: array of [r,g,b,a] rows, H arrays of W quads
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data (filter byte + scanline)
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    const offset = y * (1 + W * 4);
    raw[offset] = 0; // filter: none
    for (let x = 0; x < W; x++) {
      const [r, g, b, a] = pixels[y][x];
      raw[offset + 1 + x * 4] = r;
      raw[offset + 1 + x * 4 + 1] = g;
      raw[offset + 1 + x * 4 + 2] = b;
      raw[offset + 1 + x * 4 + 3] = a;
    }
  }

  const compressed = deflateSync(raw);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// ============ Drawing Helpers ============
function blank(r = 8, g = 4, b = 20) {
  const rows = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) row.push([r, g, b, 255]);
    rows.push(row);
  }
  return rows;
}

function rect(p, x1, y1, w, h, color) {
  for (let y = Math.max(0, y1); y < Math.min(H, y1 + h); y++)
    for (let x = Math.max(0, x1); x < Math.min(W, x1 + w); x++)
      p[y][x] = [...color];
}

function circle(p, cx, cy, r, color, aa = true) {
  for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(H, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(W, Math.ceil(cx + r)); x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (d <= r) {
        if (aa && d > r - 1.2) {
          const a = Math.max(0, Math.min(1, r - d + 0.5));
          const existing = p[y][x];
          const blend = (1 - a) * existing[3] / 255 + a;
          p[y][x] = [
            Math.round(existing[0] * (1 - a) + color[0] * a),
            Math.round(existing[1] * (1 - a) + color[1] * a),
            Math.round(existing[2] * (1 - a) + color[2] * a),
            Math.round(Math.min(255, blend * 255))
          ];
        } else {
          p[y][x] = [...color];
        }
      }
    }
  }
}

function line(p, x1, y1, x2, y2, color, thick = 1) {
  const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
  let err = dx - dy, x = x1, y = y1;
  while (true) {
    for (let ty = -Math.floor(thick / 2); ty <= Math.floor(thick / 2); ty++)
      for (let tx = -Math.floor(thick / 2); tx <= Math.floor(thick / 2); tx++)
        if (x + tx >= 0 && x + tx < W && y + ty >= 0 && y + ty < H) p[y + ty][x + tx] = [...color];
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

// ============ Character 1: Null·Cipher (断网黑客) ============
function drawNullCipher() {
  const p = blank(2, 2, 10);

  // Dark hood silhouette
  rect(p, 20, 8, 88, 115, [3, 3, 12, 255]);

  // Hood outline
  rect(p, 18, 10, 3, 110, [8, 24, 8, 255]);
  rect(p, 107, 10, 3, 110, [8, 24, 8, 255]);
  rect(p, 20, 6, 88, 6, [8, 24, 8, 255]);

  // Hood top arc
  for (let x = 20; x < 108; x++) {
    const y = 8 + Math.round(20 * Math.sin((x - 20) / 88 * Math.PI));
    if (y >= 0 && y < H) p[y][x] = [8, 24, 8, 255];
  }

  // Face shadow area (under hood)
  rect(p, 38, 35, 52, 60, [1, 1, 6, 255]);

  // Glowing green eyes
  circle(p, 53, 58, 7, [0, 255, 100, 255]);
  circle(p, 75, 58, 7, [0, 255, 100, 255]);
  // Eye pupils
  rect(p, 52, 57, 3, 4, [0, 20, 0, 255]);
  rect(p, 74, 57, 3, 4, [0, 20, 0, 255]);

  // Eye glow aura
  circle(p, 53, 58, 12, [0, 255, 100, 20]);
  circle(p, 75, 58, 12, [0, 255, 100, 20]);

  // Terminal green reflection on face
  rect(p, 38, 45, 52, 4, [0, 80, 40, 30]);

  // Mouth — slight smirk line (green tint)
  rect(p, 55, 78, 18, 1, [0, 200, 80, 180]);

  // Data streams on hood (green lines)
  for (let i = 0; i < 8; i++) {
    const lx = 48 + i * 4, ly = 16 + (i % 3) * 8;
    rect(p, lx, ly, 1, 6, [0, 200, 100, 100 + i * 15]);
  }

  // Background circuit pattern
  for (let i = 0; i < 6; i++) {
    rect(p, 10, 90 + i * 5, 30, 1, [0, 50, 30, 40]);
    rect(p, 90, 90 + i * 5, 30, 1, [0, 50, 30, 40]);
  }

  return p;
}

// ============ Character 2: Chrome·Sable (义体武士) ============
function drawChromeSable() {
  const p = blank(20, 8, 18);

  // Metallic face plate
  rect(p, 30, 20, 68, 90, [120, 120, 135, 255]);

  // Face plate border (dark chrome)
  rect(p, 28, 18, 72, 4, [60, 60, 70, 255]);
  rect(p, 28, 108, 72, 4, [60, 60, 70, 255]);
  rect(p, 28, 20, 4, 90, [60, 60, 70, 255]);
  rect(p, 96, 20, 4, 90, [60, 60, 70, 255]);

  // Cybernetic jaw lines
  rect(p, 42, 90, 44, 2, [80, 80, 90, 255]);
  rect(p, 45, 96, 38, 2, [80, 80, 90, 255]);

  // Red optic eye (left) — cybernetic implant
  circle(p, 52, 62, 9, [200, 20, 20, 255]);
  rect(p, 47, 60, 10, 4, [255, 50, 50, 255]);
  // Inner glow
  circle(p, 52, 61, 4, [255, 100, 100, 255]);
  circle(p, 52, 62, 14, [255, 0, 0, 15]);

  // Normal eye (right) — human, narrow
  rect(p, 70, 58, 14, 5, [20, 20, 25, 255]);
  rect(p, 72, 59, 10, 3, [220, 220, 230, 255]);
  rect(p, 75, 60, 4, 2, [40, 40, 50, 255]);

  // Scar across right eye
  line(p, 64, 56, 82, 64, [40, 40, 50, 255], 1);

  // Temple cyber-port (left side)
  circle(p, 35, 58, 4, [255, 30, 30, 255]);
  rect(p, 33, 54, 4, 8, [255, 10, 10, 255]);

  // Nose bridge — sharp metallic
  rect(p, 62, 68, 4, 14, [100, 100, 112, 255]);

  // Mouth — stern line
  rect(p, 54, 84, 20, 2, [60, 60, 70, 255]);

  // Head top — metallic plates
  rect(p, 34, 10, 60, 12, [140, 140, 155, 255]);
  rect(p, 36, 8, 56, 4, [160, 160, 175, 255]);

  // Side panels
  rect(p, 26, 24, 6, 60, [100, 100, 112, 255]);

  // Glow highlights on face
  rect(p, 48, 40, 2, 20, [180, 180, 195, 100]);
  rect(p, 78, 40, 2, 20, [180, 180, 195, 100]);

  // Background — dark red glow
  for (let i = 0; i < 10; i++) {
    rect(p, 10, 80 + i * 4, 30, 1, [60, 10, 10, 30 + i * 10]);
    rect(p, 88, 80 + i * 4, 30, 1, [60, 10, 10, 30 + i * 10]);
  }

  return p;
}

// ============ Character 3: Phantom·Eve (AI残响) ============
function drawPhantomEve() {
  const p = blank(5, 0, 18);

  // Ethereal face shape — translucent purple
  rect(p, 34, 30, 60, 70, [80, 40, 140, 120]);

  // Face inner glow
  rect(p, 38, 34, 52, 62, [60, 30, 110, 80]);

  // Fragmented face — horizontal glitch lines
  for (let y = 38; y < 88; y += 6) {
    const alpha = 60 + ((y - 38) % 12 === 0 ? 80 : 0);
    rect(p, 40, y, 48, 2, [120, 80, 200, alpha]);
  }

  // Eyes — hollow cyan-blue
  circle(p, 54, 58, 8, [0, 180, 220, 180]);
  circle(p, 74, 58, 8, [0, 180, 220, 180]);
  // Eye centers — bright white-blue
  circle(p, 54, 57, 3, [180, 240, 255, 255]);
  circle(p, 74, 57, 3, [180, 240, 255, 255]);

  // Eye glow aura
  circle(p, 54, 58, 16, [0, 150, 255, 10]);
  circle(p, 74, 58, 16, [0, 150, 255, 10]);

  // Data tear from left eye
  for (let i = 0; i < 5; i++) {
    rect(p, 52 + i, 68 + i * 4, 1, 4, [0, 180, 220, 200 - i * 30]);
  }

  // Mouth — fragmented whisper
  rect(p, 55, 82, 8, 1, [120, 200, 255, 150]);
  rect(p, 67, 83, 6, 1, [120, 200, 255, 120]);

  // Hair/aura — flowing data tendrils
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const cx = 64 + Math.cos(angle) * 10;
    const cy = 18 + Math.sin(angle) * 8;
    for (let t = 0; t < 14; t++) {
      const x = Math.round(cx + Math.cos(angle) * t * 3);
      const y = Math.round(cy + Math.sin(angle) * t * 3 - t * 2);
      if (x >= 0 && x < W && y >= 0 && y < H) {
        p[y][x] = [100, 60, 200, Math.max(0, 180 - t * 13)];
      }
    }
  }

  // Background data streams
  for (let i = 0; i < 15; i++) {
    const bx = 8 + i * 8, by = 10 + (i % 4) * 32;
    rect(p, bx, by, 1, 20, [60, 20, 180, 30 + (i % 5) * 10]);
    rect(p, bx + 60, by + 16, 1, 16, [60, 20, 180, 25 + (i % 5) * 8]);
  }

  // Glitch blocks on face
  rect(p, 42, 52, 18, 4, [0, 200, 255, 80]);
  rect(p, 68, 72, 14, 3, [200, 0, 255, 60]);

  return p;
}

// ============ Generate & Save ============
const portraits = [
  { name: 'char_01_null_cipher.png', draw: drawNullCipher },
  { name: 'char_02_chrome_sable.png', draw: drawChromeSable },
  { name: 'char_03_phantom_eve.png', draw: drawPhantomEve },
];

for (const { name, draw } of portraits) {
  const pixels = draw();
  const png = encodePNG(pixels);
  const path = join(outDir, name);
  writeFileSync(path, png);
  console.log(`Created: ${path} (${png.length} bytes)`);
}

console.log('\n✅ Cyberpunk character avatars generated.');
console.log('   public/characters/char_01_null_cipher.png — Null·Cipher 断网黑客');
console.log('   public/characters/char_02_chrome_sable.png — Chrome·Sable 义体武士');
console.log('   public/characters/char_03_phantom_eve.png — Phantom·Eve AI残响');
