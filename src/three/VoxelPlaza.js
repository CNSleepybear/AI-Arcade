import * as THREE from 'three';
import { PixelTextureGenerator } from './PixelTextureGenerator.js';
import { t } from '../data/i18n.js';

/**
 * VoxelPlaza — Gemini-style "Forbidden Zone Plaza" (禁区广场) central hub.
 * Spans X: [-5, 5], Z: [-5, 5].
 *
 * V3 Upgrade: Warm wood floor, plaster walls, warm stone north wall,
 * pixel-style cyber screen with amber glow, warm ambient lighting.
 */
export class VoxelPlaza {
  constructor(scene, globalState) {
    this.scene = scene;
    this.globalState = globalState;
    this.group = new THREE.Group();
    this.group.name = 'VoxelPlaza';

    this._buildFloor();
    this._buildWalls();
    this._buildObsidianNorthWall();
    this._buildCyberScreen();
    this._buildAmbientLighting();
    this._buildCenterPillar();
    this._buildWallPosters();

    scene.add(this.group);

    this._rttCamera = null;
    this._rttTarget = null;
  }

  // ==================== Floor ====================
  _buildFloor() {
    const tex = PixelTextureGenerator.woodFloor();
    tex.repeat.set(10, 10);
    const geo = new THREE.PlaneGeometry(10, 10);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  // ==================== Walls ====================
  _buildWalls() {
    const wallTex = PixelTextureGenerator.plasterWall();

    const buildWall = (x, y, z, w, h, d, rotY = 0) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({
        map: wallTex,
        roughness: 0.9,
        metalness: 0.02,
        color: 0xddd5c0
      });
      const wall = new THREE.Mesh(geo, mat);
      wall.position.set(x, y + h / 2, z);
      wall.rotation.y = rotY;
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);
    };

    // East wall at X = 5 with 3m opening to arcade
    buildWall(5, 2.5, 0, 0.3, 1.5, 3, 0);
    buildWall(5, 0, 3.25, 0.3, 4, 3.5, 0);
    buildWall(5, 0, -3.25, 0.3, 4, 3.5, 0);
    buildWall(5, 3.85, 0, 0.3, 0.3, 3, 0);

    // West wall at X = -5 with 3m opening to tavern
    buildWall(-5, 2.5, 0, 0.3, 1.5, 3, 0);
    buildWall(-5, 0, 3.25, 0.3, 4, 3.5, 0);
    buildWall(-5, 0, -3.25, 0.3, 4, 3.5, 0);
    buildWall(-5, 3.85, 0, 0.3, 0.3, 3, 0);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(10, 10);
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0xd4c8ad,
      roughness: 0.95,
      metalness: 0.02
    });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 4;
    this.group.add(ceil);
  }

  // ==================== Warm Stone North Wall ====================
  _buildObsidianNorthWall() {
    const stoneTex = PixelTextureGenerator.warmStone();

    // Stacked stone blocks at Z = -5
    for (let bx = -4.5; bx <= 4.5; bx += 0.5) {
      for (let by = 0; by < 4; by += 0.5) {
        const block = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.5, 0.3),
          new THREE.MeshStandardMaterial({
            map: stoneTex,
            roughness: 0.5,
            metalness: 0.15,
            color: 0x998877
          })
        );
        block.position.set(bx, by + 0.25, -5);
        block.castShadow = true;
        block.receiveShadow = true;
        this.group.add(block);
      }
    }
  }

  // ==================== Cyber Screen — 3D texture with LinearFilter ====================
  _buildCyberScreen() {
    // Dark wood bezel
    const bezelGeo = new THREE.BoxGeometry(6.2, 4.2, 0.15);
    const bezelMat = new THREE.MeshStandardMaterial({
      map: PixelTextureGenerator.darkWood(),
      roughness: 0.5,
      metalness: 0.1
    });
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.position.set(0, 2, -4.8);
    this.group.add(bezel);

    // Amber glow border strips
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    const positions = [
      { x: 0, y: 4.05, w: 6.2, h: 0.04 },
      { x: 0, y: -0.05, w: 6.2, h: 0.04 },
      { x: -3.1, y: 2, w: 0.04, h: 4.1 },
      { x: 3.1, y: 2, w: 0.04, h: 4.1 },
    ];
    for (const p of positions) {
      const stripGeo = new THREE.PlaneGeometry(p.w, p.h);
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(p.x, p.y, -4.7);
      this.group.add(strip);
    }

    // Screen canvas — larger for better text readability through dither pipeline
    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 1024;
    this.screenCanvas.height = 682;
    this.screenCtx = this.screenCanvas.getContext('2d');

    this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
    // Linear filtering for readable text (not NearestFilter pixelation)
    this.screenTexture.magFilter = THREE.LinearFilter;
    this.screenTexture.minFilter = THREE.LinearFilter;
    this.screenTexture.colorSpace = THREE.SRGBColorSpace;

    const screenGeo = new THREE.PlaneGeometry(6, 4);
    const screenMat = new THREE.MeshBasicMaterial({ map: this.screenTexture });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 2, -4.7);
    this.group.add(screen);

    this._scrollOffset = 0;
  }

  /**
   * Draw the cyber screen — Gemini pixel style with warm amber/gold tones.
   */
  drawScreen(dt) {
    const ctx = this.screenCtx;
    const w = this.screenCanvas.width;
    const h = this.screenCanvas.height;

    // Dark warm background — slightly lighter for text contrast
    ctx.fillStyle = '#12100c';
    ctx.fillRect(0, 0, w, h);

    // Scanlines
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, y, w, 1);
    }

    // ===== Left Panel: High Scores =====
    const leftX = 30;
    const leftW = w * 0.45;

    ctx.fillStyle = '#886633';
    ctx.fillRect(leftX, 20, leftW, 2);
    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('◆ GLOBAL HIGH SCORES', leftX, 58);

    const scores = this.globalState?.arcadeHighScores || {
      anomaly: { name: 'MINER_X', score: 99 },
      'cyber-hunder': { name: 'VOID_WALKER', score: 8500 }
    };

    const DISPLAY_NAMES = {
      'anomaly': 'ANOMALY',
      'cyber-hunder': 'CYBER HUNDER',
      'dark-water-stealth': 'DARK WATER',
      'leave-at-6pm-evolved': 'LEAVE AT 6PM'
    };

    let sy = 95;
    for (const [game, data] of Object.entries(scores)) {
      ctx.fillStyle = '#dd9944';
      ctx.font = 'bold 22px monospace';
      const displayName = DISPLAY_NAMES[game] || game.toUpperCase();
      ctx.fillText(displayName, leftX, sy);
      sy += 30;

      ctx.fillStyle = '#ffdd88';
      ctx.font = '20px monospace';
      ctx.fillText(`#1  ${data.name.padEnd(16)} ${String(data.score).padStart(8)}`, leftX + 10, sy);
      sy += 42;
    }

    // ===== Right Panel: Chat Messages =====
    const rightX = w * 0.52;
    const rightW = w * 0.44;

    ctx.fillStyle = '#886633';
    ctx.fillRect(rightX, 20, rightW, 2);

    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('◆ WORLD CHAT', rightX, 58);

    const messages = this.globalState?.chatMessages || [];
    let my = 95;
    const recentMsgs = messages.slice(-6);
    for (const msg of recentMsgs) {
      ctx.fillStyle = '#dd9944';
      ctx.font = 'bold 18px monospace';
      const time = new Date(msg.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      ctx.fillText(`[${time}]`, rightX, my);

      ctx.fillStyle = msg.color || '#ffdd88';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${msg.author}:`, rightX + 72, my);

      ctx.fillStyle = '#eeeedd';
      ctx.font = '18px monospace';
      const text = msg.text.length > 28 ? msg.text.slice(0, 26) + '..' : msg.text;
      ctx.fillText(text, rightX + 72 + (msg.author.length + 1) * 11, my);
      my += 30;
    }

    // ===== Bottom: Scrolling Ticker =====
    this._scrollOffset += dt * 60;
    const tickerY = h - 50;
    ctx.fillStyle = '#0e0a06';
    ctx.fillRect(0, tickerY - 5, w, 40);
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(0, tickerY - 6, w, 2);
    ctx.fillRect(0, tickerY + 34, w, 2);

    ctx.fillStyle = '#ffdd88';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';

    const tickerText = '>>> NOW PLAYING: SHATTERED MEMORIES /// AI DREAMS IN EVERY PIXEL /// COLLECT ALL 3 SHARDS TO UNLOCK THE HIDDEN CABINET ///  ';
    const textWidth = ctx.measureText(tickerText).width;
    const scrollPhase = (this._scrollOffset % textWidth);

    ctx.fillText(tickerText, -scrollPhase, tickerY + 18);
    ctx.fillText(tickerText, -scrollPhase + textWidth, tickerY + 18);

    // Occasional glitch
    if (Math.random() < 0.03) {
      const gx = Math.random() * w;
      const gy = Math.random() * h;
      ctx.fillStyle = 'rgba(255,170,68,0.3)';
      ctx.fillRect(gx, gy, Math.random() * 200 + 20, 2);
    }

    this.screenTexture.needsUpdate = true;
  }

  setupRTT(fullScene, renderer) {
    this._rttTarget = new THREE.WebGLRenderTarget(256, 192, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter
    });
    this._rttCamera = new THREE.PerspectiveCamera(60, 256 / 192, 0.1, 30);
    this._rttCamera.position.set(-11, 2, -0.5);
    this._rttCamera.lookAt(-11, 1.2, -3);
    this._fullScene = fullScene;
    this._renderer = renderer;
    this._hasRTT = true;
  }

  renderRTT() {
    if (!this._hasRTT || !this._rttTarget || !this._rttCamera) return;
    const currentRenderTarget = this._renderer.getRenderTarget();
    this._renderer.setRenderTarget(this._rttTarget);
    this._renderer.render(this._fullScene, this._rttCamera);
    this._renderer.setRenderTarget(currentRenderTarget);
  }

  drawRTTInset() {
    // Handled via separate texture sampling — see screen render
  }

  // ==================== Ambient Lighting (Warm) ====================
  _buildAmbientLighting() {
    // Warm amber screen glow
    const screenGlow = new THREE.PointLight(0xffaa44, 10, 12, 2);
    screenGlow.position.set(0, 2, -3);
    this.group.add(screenGlow);

    // Floor edge lights (warm)
    for (let x = -3; x <= 3; x += 3) {
      const floorLight = new THREE.PointLight(0xff8844, 3, 4, 2);
      floorLight.position.set(x, 0.3, 3);
      this.group.add(floorLight);
    }

    // Ambient fill
    const fill = new THREE.PointLight(0xffddaa, 3, 7, 2);
    fill.position.set(0, 2, 2);
    this.group.add(fill);
  }

  // ==================== Center Pillar (Stairwell Entrance to Depths) ====================
  _buildCenterPillar() {
    const pillarMat = new THREE.MeshStandardMaterial({
      map: PixelTextureGenerator.obsidian(),
      roughness: 0.3,
      metalness: 0.7
    });

    // Main pillar — wider base, acts as stairwell housing
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 4, 0.8),
      pillarMat
    );
    pillar.position.set(0, 2, 0);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    pillar.name = 'depthsEntrance';
    this.group.add(pillar);

    // Glowing crack in the pillar surface (south-facing)
    const crackMat = new THREE.MeshBasicMaterial({
      color: 0x8844cc,
      transparent: true,
      opacity: 0.7
    });
    const crackGeo = new THREE.PlaneGeometry(0.1, 1.2);
    const crack = new THREE.Mesh(crackGeo, crackMat);
    crack.position.set(0, 1.2, 0.41);
    this.group.add(crack);

    // Smaller side cracks
    for (let i = 0; i < 3; i++) {
      const scGeo = new THREE.PlaneGeometry(0.04, 0.4 + Math.random() * 0.5);
      const sc = new THREE.Mesh(scGeo, crackMat.clone());
      sc.material.opacity = 0.3 + Math.random() * 0.3;
      sc.position.set((Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 2, 0.41);
      sc.rotation.z = (Math.random() - 0.5) * 0.3;
      this.group.add(sc);
    }

    // Pulsing ring — now purple (depths indicator)
    const ringGeo = new THREE.TorusGeometry(0.4, 0.04, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x8844cc });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 1.0;
    ring.name = 'depthsRing';
    this.group.add(ring);

    // Small glowing arrow marker on floor pointing down
    const arrowCanvas = document.createElement('canvas');
    arrowCanvas.width = 64; arrowCanvas.height = 64;
    const actx = arrowCanvas.getContext('2d');
    actx.fillStyle = '#8844cc';
    actx.font = 'bold 40px monospace';
    actx.textAlign = 'center';
    actx.fillText('⬇', 32, 44);

    const arrowTex = new THREE.CanvasTexture(arrowCanvas);
    arrowTex.magFilter = THREE.NearestFilter;
    arrowTex.minFilter = THREE.NearestFilter;
    arrowTex.colorSpace = THREE.SRGBColorSpace;

    const arrowGeo = new THREE.PlaneGeometry(0.4, 0.4);
    const arrowMesh = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({
      map: arrowTex, transparent: true, depthWrite: false
    }));
    arrowMesh.rotation.x = -Math.PI / 2;
    arrowMesh.position.set(0, 0.008, 0.6);
    arrowMesh.name = 'depthsArrow';
    this.group.add(arrowMesh);
  }

  // ==================== Wall Posters (Pixel Style) ====================
  _buildWallPosters() {
    const posters = [
      { text: t('poster.anomaly') || 'ANOMALY', sub: t('poster.anomaly_sub') || 'SURVIVE THE META', x: 0, z: -4.75, rotY: 0, color: '#00ff44' },
      { text: t('poster.cyber') || 'CYBER HUNDER', sub: t('poster.cyber_sub') || 'TOP SCORES', x: 3.5, z: -4.75, rotY: 0, color: '#00ccff' },
      { text: t('poster.tavern') || 'IRON ANCHOR', sub: t('poster.tavern_sub') || 'OPEN ALL NIGHT', x: -3.5, z: -4.75, rotY: 0, color: '#ff8844' },
    ];

    for (const poster of posters) {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 192;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, 128, 192);
      ctx.strokeStyle = poster.color; ctx.lineWidth = 3;
      ctx.strokeRect(6, 6, 116, 180);
      ctx.fillStyle = poster.color;
      ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
      ctx.fillText(poster.text, 64, 80);
      ctx.font = '9px monospace';
      ctx.fillText(poster.sub, 64, 100);
      // Pixel border noise
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.1})`;
        ctx.fillRect(8 + Math.random() * 112, 8 + Math.random() * 176, 2, 2);
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;

      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      plane.position.set(poster.x, 2.0, poster.z);
      plane.rotation.y = poster.rotY;
      this.group.add(plane);
    }
  }

  update(dt) {
    this.drawScreen(dt);
  }
}

export default VoxelPlaza;
