import * as THREE from 'three';

/**
 * PixelTextureGenerator — Gemini-style pixel-art textures for the HD-2D voxel world.
 *
 * V3 Upgrade: 64×64 canvas with controlled noise blocks (pixelSize),
 * generating warm, cozy pixel textures reminiscent of retro 90s pixel art.
 * All textures use NearestFilter for crisp edges.
 *
 * Two families:
 *   - geminiPixel()  — solid color base with per-block noise
 *   - geminiStriped() — alternating stripe colors with per-block noise
 *   - Legacy 16×16 methods retained and upgraded to Gemini quality
 */
export class PixelTextureGenerator {

  // ==================== Core Gemini Generators ====================

  /**
   * Gemini-style pixel texture: 64×64 canvas, pixelSize blocks,
   * each block gets ±noiseIntensity deviation from baseColor.
   */
  static geminiPixel(colorBase, noiseIntensity = 15, pixelSize = 4) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const base = new THREE.Color(colorBase);
    for (let y = 0; y < size; y += pixelSize) {
      for (let x = 0; x < size; x += pixelSize) {
        const noise = (Math.random() - 0.5) * noiseIntensity;
        const r = Math.max(0, Math.min(255, (base.r * 255) + noise));
        const g = Math.max(0, Math.min(255, (base.g * 255) + noise));
        const b = Math.max(0, Math.min(255, (base.b * 255) + noise));
        ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        ctx.fillRect(x, y, pixelSize, pixelSize);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Gemini-style striped texture: alternating c1/c2 bands with noise.
   */
  static geminiStriped(c1, c2, stripeW = 8, pixelSize = 4) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const col1 = new THREE.Color(c1), col2 = new THREE.Color(c2);
    for (let y = 0; y < size; y += pixelSize) {
      const isStripe = Math.floor(y / stripeW) % 2 === 0;
      const base = isStripe ? col1 : col2;
      for (let x = 0; x < size; x += pixelSize) {
        const noise = (Math.random() - 0.5) * 10;
        ctx.fillStyle = `rgb(${(base.r * 255 + noise) | 0},${(base.g * 255 + noise) | 0},${(base.b * 255 + noise) | 0})`;
        ctx.fillRect(x, y, pixelSize, pixelSize);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Gemini-style speckled texture — dark base with colored pixel flecks.
   * Used for arcade carpets, magical surfaces, etc.
   */
  static geminiSpeckled(baseColor, speckleColors, speckleCount = 60, pixelSize = 2) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#' + new THREE.Color(baseColor).getHexString();
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < speckleCount; i++) {
      const rx = Math.floor(Math.random() * (size / pixelSize)) * pixelSize;
      const ry = Math.floor(Math.random() * (size / pixelSize)) * pixelSize;
      const col = speckleColors[Math.floor(Math.random() * speckleColors.length)];
      ctx.fillStyle = col;
      ctx.fillRect(rx, ry, pixelSize, pixelSize);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ==================== Legacy 16×16 (Upgraded to Gemini Quality) ====================

  /** @deprecated Use geminiPixel for new code; kept for backward compat */
  static generate(size = 16, drawFn, opts = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    if (opts.repeat !== false) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    }
    return tex;
  }

  // ==================== Pre-built Textures (Gemini Style) ====================

  /** Warm dark wood planks — Gemini noisy blocks */
  static darkWood() {
    return PixelTextureGenerator.geminiStriped(0x3a2010, 0x2d1808, 6, 4);
  }

  /** Lighter wood for countertops/shelves */
  static lightWood() {
    return PixelTextureGenerator.geminiStriped(0xa0825b, 0x8e714a, 8, 4);
  }

  /** Warm wood floor — wider planks */
  static woodFloor() {
    return PixelTextureGenerator.geminiStriped(0x86654e, 0x765640, 12, 4);
  }

  /** Plaster wall — warm beige with subtle noise */
  static plasterWall() {
    return PixelTextureGenerator.geminiStriped(0xdfd5be, 0xd4c8ad, 16, 4);
  }

  /** Dark stone */
  static darkStone() {
    return PixelTextureGenerator.geminiPixel(0x5a5a6a, 15, 4);
  }

  /** Warm stone for decorative elements */
  static warmStone() {
    return PixelTextureGenerator.geminiPixel(0x6e5e4e, 12, 4);
  }

  /** Cabinet green */
  static cabinetGreen() {
    return PixelTextureGenerator.geminiPixel(0x4a6741, 15, 4);
  }

  /** Cabinet brown */
  static cabinetBrown() {
    return PixelTextureGenerator.geminiPixel(0x5c3a21, 18, 4);
  }

  /** Cabinet blue */
  static cabinetBlue() {
    return PixelTextureGenerator.geminiPixel(0x2c3e50, 12, 4);
  }

  /** Cabinet purple */
  static cabinetPurple() {
    return PixelTextureGenerator.geminiPixel(0x4a3b5c, 12, 4);
  }

  /** Dark stone floor — warm grey with pixel noise */
  static darkStoneFloor() {
    return PixelTextureGenerator.geminiPixel(0x3a3844, 12, 4);
  }

  /** Stone brick wall — warm variant */
  static stoneBrick() {
    return PixelTextureGenerator.geminiPixel(0x5a5a6a, 14, 4);
  }

  /** Obsidian — near-black with subtle purple flecks */
  static obsidian() {
    return PixelTextureGenerator.geminiSpeckled(0x080610,
      ['rgba(80,40,120,0.4)', 'rgba(60,30,90,0.3)', 'rgba(100,50,140,0.25)'], 40, 2);
  }

  /** Redstone lamp — warm glow */
  static redstoneLamp() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, '#ff6633');
    grad.addColorStop(0.4, '#cc3300');
    grad.addColorStop(0.8, '#441100');
    grad.addColorStop(1, '#110400');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    // Grid cage
    ctx.strokeStyle = '#220400';
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 8) {
      ctx.fillRect(i, 0, 1, size);
      ctx.fillRect(0, i, size, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Bar top — polished dark surface */
  static barTop() {
    return PixelTextureGenerator.geminiPixel(0x3e2723, 8, 4);
  }

  /** Tavern floor — wide warm planks */
  static tavernFloor() {
    return PixelTextureGenerator.geminiStriped(0x2d1a0c, 0x251408, 8, 4);
  }

  /** Arcade carpet — dark with colored pixel speckles */
  static arcadeCarpet() {
    return PixelTextureGenerator.geminiSpeckled(0x0a0a14,
      ['#ff00cc', '#00ffcc', '#4400aa', '#004488', '#1a0033'], 50, 2);
  }

  /** Glowing cup texture */
  static glowingCup(color) {
    return PixelTextureGenerator.generate(16, (ctx, s) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(4, 2, 8, 2);
      ctx.fillRect(5, 4, 6, 8);
      ctx.fillRect(6, 12, 4, 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.6;
      ctx.fillRect(6, 3, 4, 1);
    }, { repeat: false });
  }

  // ==================== Arcade Cabinet Textures ====================

  /** Anomaly cabinet — matrix dark green */
  static cabinetAnomaly() {
    return PixelTextureGenerator.geminiPixel(0x1a2a1a, 12, 4);
  }

  /** Cyber Hunder cabinet — neon cyan steel */
  static cabinetCyberHunder() {
    return PixelTextureGenerator.geminiPixel(0x1a2e3e, 14, 4);
  }

  /** Dark Water Stealth cabinet — abyss navy */
  static cabinetDarkWater() {
    return PixelTextureGenerator.geminiPixel(0x0e1a28, 10, 4);
  }

  /** Leave at 6PM cabinet — warm dusk wood */
  static cabinetLeaveAt6pm() {
    return PixelTextureGenerator.geminiPixel(0x3e2a1a, 14, 4);
  }
}

export default PixelTextureGenerator;
