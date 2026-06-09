// Generates placeholder texture assets for the AI Arcade
// Run: node scripts/generate-placeholders.js

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Minimal valid 1x1 transparent PNG (base64)
const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal valid 128x128 colored PNG
function makePNG(r, g, b, a = 255) {
  // Simple approach: write a valid 128x128 PNG with solid color
  // We'll create a minimal BMP-style approach, but actually let's just write the same pixel
  // For real placeholders, we need a proper approach
  return pixel;
}

// Generate character portraits (128x128 solid color + text would need canvas)
// For now, create minimal valid PNGs that will be replaced by AI-generated art
const characterFiles = [
  'char_01_sleepy.png',
  'char_02_lobster.png',
  'char_03_yuki.png'
];

const textureFiles = [
  'floor_tiles.png',
  'wall_neon.png',
  'cabinet_wood.png',
  'cabinet_neon.png',
  'cabinet_dark.png'
];

// Create directories
const dirs = [
  join(publicDir, 'characters'),
  join(publicDir, 'textures'),
  join(publicDir, 'games', 'roshambo')
];

for (const d of dirs) {
  mkdirSync(d, { recursive: true });
}

// Write character placeholders
for (const f of characterFiles) {
  const path = join(publicDir, 'characters', f);
  writeFileSync(path, pixel);
  console.log(`Created: ${path}`);
}

// Write texture placeholders
for (const f of textureFiles) {
  const path = join(publicDir, 'textures', f);
  writeFileSync(path, pixel);
  console.log(`Created: ${path}`);
}

console.log('\n✅ Placeholder assets generated.');
console.log('   Replace with AI-generated art in public/characters/ and public/textures/');
