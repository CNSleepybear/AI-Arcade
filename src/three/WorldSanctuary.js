import * as THREE from 'three';
import { PixelTextureGenerator } from './PixelTextureGenerator.js';

/**
 * WorldSanctuary — 万国馆: Museum hall with 7 snow globes.
 * 3D scene matching sanctuary.html design, integrated into the game world at Y=16.
 *
 * Each snow globe contains a miniature landscape with animated particles.
 * Press E near a globe → fullscreen iframe loads the country's pixel shelter.
 * Press ESC → close iframe, return to sanctuary.
 */

// ═══════════════════ Helpers ═══════════════════

function box(geo, mat, x, y, z, cast = false) {
  const m = new THREE.Mesh(geo || new THREE.BoxGeometry(1, 1, 1), mat);
  if (geo) { m.geometry = geo; }
  m.position.set(x, y, z);
  if (cast) m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function b(m, x, y, z, w, h, d, cast = false) {
  return box(new THREE.BoxGeometry(w, h, d), m, x, y, z, cast);
}

// ═══════════════════ Materials ═══════════════════

function std(c, r = 0.4, mt = 0) {
  return new THREE.MeshStandardMaterial({ map: PixelTextureGenerator.geminiPixel(c, 8, 2), color: c, roughness: r, metalness: mt, flatShading: false });
}
function basic(c) { return new THREE.MeshBasicMaterial({ color: c }); }

// ═══════════════════ Country Config ═══════════════════

const COUNTRIES = [
  { id: 'japan',   title: '🇯🇵 日式 · 落樱', file: 'japan.html',   color: 0x8f2d34, particleColor: 0xd47394, particleType: 'fall' },
  { id: 'china',   title: '🇨🇳 中式 · 幽篁', file: 'china.html',   color: 0x9c2c2c, particleColor: 0xccff33, particleType: 'fly' },
  { id: 'uk',      title: '🇬🇧 英式 · 雾雨', file: 'uk.html',      color: 0x8a1c1c, particleColor: 0x485673, particleType: 'rain' },
  { id: 'usa',     title: '🇺🇸 美式 · 霓虹', file: 'usa.html',     color: 0xff2a85, particleColor: 0x9d72b5, particleType: 'wind' },
  { id: 'germany', title: '🇩🇪 德式 · 冬夜', file: 'germany.html', color: 0x7a2b22, particleColor: 0xffffff, particleType: 'snow' },
  { id: 'france',  title: '🇫🇷 法式 · 左岸', file: 'france.html',  color: 0x1b2d4a, particleColor: 0xc4873b, particleType: 'leaf' },
  { id: 'italy',   title: '🇮🇹 意式 · 水巷', file: 'italy.html',   color: 0x9e4331, particleColor: 0x3da39e, particleType: 'sparkle' },
];

// ═══════════════════ SnowGlobe ═══════════════════

const GLOBE_R = 0.7;

class SnowGlobe {
  constructor(position, country, globeIndex) {
    this.position = position.clone();
    this.country = country;
    this.index = globeIndex;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.particles = [];

    this._buildPedestal();
    this._buildGlass();
    this._buildInner();
    this.particles = this._buildParticles();
    this._buildSpot();
    this._buildLabel();
  }

  _buildPedestal() {
    const g = this.group;
    g.add(b(std(0x2a2a35), 0, 0.4, 0, 1.1, 0.75, 1.1, true));
    g.add(b(std(0x3a3a48), 0, 0.78, 0, 1.2, 0.06, 1.2));
    // Nameplate
    const nm = b(basic(this.country.color), 0, 0.2, 0.65, 0.5, 0.13, 0.04);
    g.add(nm);
  }

  _buildGlass() {
    const g = this.group;
    const glass = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.02, transparent: true, opacity: 0.12, flatShading: true, depthWrite: false }));
    glass.position.y = 1.5;
    glass.renderOrder = 2;
    g.add(glass);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(GLOBE_R, 0.03, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.15, metalness: 0.5, transparent: true, opacity: 0.3, flatShading: true }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.5;
    g.add(rim);
  }

  _buildInner() {
    this.inner = new THREE.Group();
    this.inner.position.y = 1.5;
    this.inner.scale.setScalar(0.22);
    this.group.add(this.inner);

    // Base hill
    this.inner.add(b(std(0x2a2a35), 0, -0.4, 0, 4.4, 0.8, 5.6, true));

    // Miniature models
    this._buildModel();
  }

  _buildModel() {
    const p = this.inner;
    const id = this.country.id;

    if (id === 'japan') {
      b(std(0x5a3a1a), -0.8, 0.8, 0, 0.12, 1.6, 0.12, p, true);
      b(std(0x5a3a1a), 0.8, 0.8, 0, 0.12, 1.6, 0.12, p, true);
      b(std(0x8f2d34), 0, 1.5, 0, 1.8, 0.15, 0.15, p, true);
      b(std(0x8f2d34), 0, 1.25, 0, 2.0, 0.12, 0.18, p, true);
      b(std(0x5a3a1a), 1.2, 0.6, -0.8, 0.15, 1.2, 0.15, p, true);
      b(std(0xd47394), 1.2, 1.4, -0.8, 1.0, 0.6, 1.0, p, true);
      b(std(0xd47394), 1.3, 1.8, -0.7, 0.6, 0.5, 0.6, p, true);
      b(std(0x2a2a35), -1.2, 0.4, 0.8, 0.25, 0.6, 0.25, p, true);
      b(basic(0xffdd77), -1.2, 0.75, 0.8, 0.18, 0.25, 0.18, p);
    }
    else if (id === 'china') {
      [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].forEach(pos => b(std(0x9c2c2c), pos[0], 0.9, pos[1], 0.1, 1.8, 0.1, p, true));
      b(std(0x2a2a35), 0, 1.8, 0, 1.6, 0.1, 1.6, p, true);
      b(std(0x2a2a35), 0, 2.0, 0, 1.8, 0.1, 1.8, p, true);
      b(std(0xbfa15f), 0, 2.3, 0, 0.2, 0.2, 0.2, p);
      for (let i = 0; i < 3; i++) b(std(0x2b4c33), 1.2 + i * 0.3, 0.8, -0.5, 0.08, 1.6, 0.08, p, true);
      b(std(0x9c2c2c), -1.2, 0.8, 0.8, 0.2, 0.4, 0.2, p, true);
      b(basic(0xffdd77), -1.2, 0.8, 0.8, 0.15, 0.25, 0.15, p);
    }
    else if (id === 'uk') {
      b(std(0x8a1c1c), 0, 0.8, 0, 0.8, 1.6, 0.8, p, true);
      b(basic(0xffdd77), 0, 0.8, 0, 0.6, 1.2, 0.6, p);
      b(std(0x16171a), 1.2, 1.0, 0.5, 0.08, 2.0, 0.08, p, true);
      b(basic(0xffdd77), 1.0, 1.9, 0.5, 0.2, 0.2, 0.2, p);
      b(basic(0xffdd77), 1.4, 1.9, 0.5, 0.2, 0.2, 0.2, p);
    }
    else if (id === 'usa') {
      b(basic(0xff2a85), 0, 1.6, -0.8, 1.2, 0.6, 0.2, p, true);
      b(basic(0x00f3ff), 0, 1.6, -0.7, 0.9, 0.4, 0.25, p);
      b(basic(0xff2a85), -0.5, 2.1, -0.8, 0.4, 0.1, 0.1, p);
      b(basic(0xff2a85), 0.5, 2.1, -0.8, 0.4, 0.1, 0.1, p);
      b(std(0xb63737), 0.8, 0.35, 0.8, 1.4, 0.3, 0.6, p, true);
      b(std(0xb63737), 0.9, 0.6, 0.8, 0.5, 0.4, 0.55, p, true);
      b(std(0xb63737), 0.3, 0.55, 0.8, 0.5, 0.35, 0.55, p, true);
      b(std(0x2b4c33), -1.0, 0.6, -0.5, 0.15, 1.2, 0.15, p, true);
      b(std(0x2b4c33), -1.0, 0.9, -0.3, 0.3, 0.1, 0.1, p, true);
    }
    else if (id === 'germany') {
      b(std(0xe6e2d8), 0, 0.9, 0, 1.6, 1.2, 1.4, p, true);
      [[-0.8, -0.7], [0.8, -0.7], [-0.8, 0.7], [0.8, 0.7]].forEach(pos => b(std(0x2b1a11), pos[0], 0.9, pos[1], 0.08, 1.2, 0.08, p, true));
      [0.1, 0.6, 1.1].forEach(y => {
        b(std(0x2b1a11), 0, y, 0.7, 1.7, 0.06, 0.06, p);
        b(std(0x2b1a11), 0, y, -0.7, 1.7, 0.06, 0.06, p);
        b(std(0x2b1a11), 0.8, y, 0, 0.06, 0.06, 1.5, p);
        b(std(0x2b1a11), -0.8, y, 0, 0.06, 0.06, 1.5, p);
      });
      [1.5, 1.2, 0.9, 0.6, 0.3].forEach((w, i) => b(std(0x7a2b22), 0, 1.6 + i * 0.25, 0, w, 0.15, 1.5, p, true));
      [[-1.5, -1.2], [1.5, -1.2]].forEach(pos => {
        b(std(0x2b1a11), pos[0], 0.5, pos[1], 0.1, 1.0, 0.1, p, true);
        [1.2, 0.9, 0.6].forEach((rw, j) => b(std(0x13261b), pos[0], 0.8 + j * 0.35, pos[1], rw, 0.3, rw, p, true));
      });
      b(basic(0xffdd77), 0, 0.9, 0.71, 0.5, 0.4, 0.05, p);
    }
    else if (id === 'france') {
      b(std(0xded0bc), 0, 1.0, 0, 2.0, 1.4, 1.2, p, true);
      b(std(0x1c3127), 0, 0.35, 0.65, 2.1, 0.1, 1.3, p, true);
      for (let i = 0; i < 6; i++) b(i % 2 === 0 ? std(0x1b2d4a) : std(0xeae5da), -0.75 + i * 0.3, 1.75, 0.8, 0.28, 0.08, 0.8, p, true);
      b(basic(0xffdd77), 0.5, 1.0, 0.62, 0.8, 0.5, 0.05, p);
      b(std(0x1c3127), 1.2, 1.0, 0.5, 0.06, 2.0, 0.06, p, true);
      b(basic(0xffdd77), 1.0, 1.9, 0.5, 0.15, 0.15, 0.15, p);
      b(basic(0xffdd77), 1.4, 1.9, 0.5, 0.15, 0.15, 0.15, p);
      b(std(0x1c3127), -1.2, 0.55, 1.0, 0.5, 0.05, 0.5, p, true);
      b(std(0x1c3127), -1.0, 0.3, 0.8, 0.05, 0.5, 0.05, p);
    }
    else if (id === 'italy') {
      b(std(0x142b30), 0, -0.2, 0, 3.0, 0.3, 2.0, p);
      b(std(0x111215), 0, 0.05, 0.3, 1.6, 0.1, 0.4, p, true);
      b(std(0x111215), 0.6, 0.2, 0.3, 0.4, 0.3, 0.35, p, true);
      b(std(0x111215), -0.6, 0.18, 0.3, 0.35, 0.25, 0.35, p, true);
      b(std(0x8a1c1c), 0, 0.15, 0.3, 0.8, 0.05, 0.3, p);
      for (let i = 0; i < 5; i++) b(i % 2 === 0 ? std(0x1f4172) : std(0xe6e1d5), -0.8, 0.15 + i * 0.12, -0.5, 0.1, 0.1, 0.1, p, true);
      b(basic(0xffb042), -0.8, 0.75, -0.5, 0.12, 0.08, 0.12, p);
      b(std(0x9e4331), -1.2, 1.0, -1.0, 1.5, 1.4, 0.8, p, true);
      b(std(0xcca05e), 0.8, 0.9, -1.0, 1.2, 1.2, 0.8, p, true);
      b(basic(0xffb042), -1.2, 1.0, -0.58, 0.4, 0.4, 0.05, p);
    }
  }

  _buildParticles() {
    const id = this.country.id;
    const count = id === 'uk' ? 25 : 20;
    const color = this.country.particleColor;
    const type = this.country.particleType;
    const list = [];
    const geo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false });

    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      this._resetParticle(m, type);
      this.inner.add(m);
      list.push({ mesh: m, type, phase: Math.random() * 10 });
    }
    return list;
  }

  _resetParticle(m, type) {
    m.position.set((Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3);
    m.scale.set(1, 1, 1);
    if (type === 'rain') { m.scale.set(0.3, 1.5, 0.3); m.position.y = Math.random() * 3; }
    if (type === 'leaf') { m.scale.set(1.5, 0.3, 1.2); }
    if (type === 'sparkle') { m.position.y = Math.random() * 1.5; }
  }

  _buildSpot() {
    this.spot = new THREE.SpotLight(0xffffff, 2, 6, Math.PI / 6, 0.5, 1);
    this.spot.position.set(this.position.x, 5, this.position.z);
    // Target will be set by the parent WorldSanctuary after scene.add
    this.spot.target.position.copy(this.position).setY(2.4);
  }

  _buildLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(5,5,15,0.9)';
    ctx.fillRect(0, 0, 256, 48);
    ctx.strokeStyle = '#' + this.country.color.toString(16).padStart(6, '0');
    ctx.lineWidth = 2; ctx.strokeRect(3, 3, 250, 42);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText(this.country.title + '  [E]', 128, 22);
    ctx.fillStyle = '#888'; ctx.font = '9px monospace';
    ctx.fillText('Enter shelter', 128, 36);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.15), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    sign.position.set(0, 0.3, 1.1);
    this.group.add(sign);
  }

  isNear(pos, threshold = 2.2) {
    const dx = pos.x - this.position.x;
    const dz = pos.z - this.position.z;
    return Math.sqrt(dx * dx + dz * dz) < threshold;
  }

  update(time) {
    // Rotate inner scene
    if (this.inner) this.inner.rotation.y = time * 0.15 + this.index * 0.5;

    // Animate particles
    for (const p of this.particles) {
      const m = p.mesh;
      switch (p.type) {
        case 'fall':   m.position.y -= 0.008; m.position.x += Math.sin(time + p.phase) * 0.002; break;
        case 'fly':    m.position.x += Math.cos(time * 0.5 + p.phase) * 0.003; m.position.y += Math.sin(time + p.phase) * 0.002; m.position.z += Math.sin(time * 0.3 + p.phase) * 0.003; break;
        case 'rain':   m.position.y -= 0.04; break;
        case 'wind':   m.position.x -= 0.015; m.position.y += Math.sin(time + p.phase) * 0.001; break;
        case 'snow':   m.position.y -= 0.006; m.position.x += Math.sin(time + p.phase) * 0.001; break;
        case 'leaf':   m.position.y -= 0.006; m.position.x += Math.sin(time * 1.5 + p.phase) * 0.003; m.rotation.y += 0.02; break;
        case 'sparkle':m.position.y += 0.003; m.position.x += Math.sin(time * 2 + p.phase) * 0.002; break;
      }
      if (m.position.y < -1 || m.position.y > 3 || Math.abs(m.position.x) > 2.5) {
        this._resetParticle(m, p.type);
      }
    }

    // Breathing spotlight
    if (this.spot) {
      this.spot.intensity = 1.5 + Math.sin(time * 2 + this.index) * 0.3;
    }
  }
}

// ═══════════════════ WorldSanctuary Room ═══════════════════

export class WorldSanctuary {
  constructor(scene, globalState) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'WorldSanctuary';
    this.group.position.set(0, 16, 0);
    this.globes = [];
    this.spotLights = [];
    this._roomHalf = 5.5;

    this._buildRoom();
    this._buildGlobes();
    this._buildExit();
    this._buildLighting();

    this.group.visible = false;
    scene.add(this.group);

    // Add spotlights to scene (they go outside the group for proper world-space positioning)
    this.globes.forEach(g => {
      scene.add(g.spot);
      scene.add(g.spot.target);
      this.spotLights.push(g.spot);
    });
    // Also need to update spotlight target positions to world space
    this._updateSpotPositions();
  }

  _updateSpotPositions() {
    this.globes.forEach(g => {
      const wp = new THREE.Vector3(); g.group.getWorldPosition(wp);
      g.spot.position.set(wp.x, wp.y + 2.2, wp.z);
      g.spot.target.position.set(wp.x, wp.y + 1.5, wp.z);
    });
  }

  _buildRoom() {
    const g = this.group;
    const hs = this._roomHalf;

    // Floor
    b(std(0x1e1a2e), 0, -0.1, 0, hs * 2, 0.2, 10, false).parent = g;
    g.add(b(std(0x1e1a2e), 0, -0.1, 0, hs * 2, 0.2, 10, false));
    for (let i = -6; i <= 6; i++) {
      g.add(b(std(0x252236), i, 0.01, 0, 0.9, 0.02, 9));
    }

    // Walls
    g.add(b(std(0x15121e), 0, 3, -5, hs * 2, 6, 0.3));
    g.add(b(std(0x15121e), -hs + 0.15, 3, 0, 0.3, 6, 10));
    g.add(b(std(0x15121e), hs - 0.15, 3, 0, 0.3, 6, 10));

    // Ceiling beams
    for (const z of [-3, 0, 3]) {
      g.add(b(std(0x2a2538), 0, 5.8, z, hs * 2, 0.15, 0.2));
    }
  }

  _buildGlobes() {
    const radius = 3.5;
    const startA = -Math.PI * 0.4;
    const endA = Math.PI * 0.4;

    COUNTRIES.forEach((c, i) => {
      const t = i / (COUNTRIES.length - 1);
      const a = startA + t * (endA - startA);
      const pos = new THREE.Vector3(Math.sin(a) * radius, 0, -(Math.cos(a) * radius) - 1.5);
      const globe = new SnowGlobe(pos, c, i);
      this.group.add(globe.group);
      this.globes.push(globe);
    });
  }

  _buildExit() {
    const g = this.group;
    const hs = this._roomHalf;

    // Exit pad at south center
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.5, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.015, hs - 0.5); g.add(pad);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.06, 8, 16), new THREE.MeshBasicMaterial({ color: 0xffcc66 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.02, hs - 0.5); g.add(ring);

    const cvs = document.createElement('canvas');
    cvs.width = 256; cvs.height = 48;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#ffcc44'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
    ctx.fillText('⬇ [E] 返回广场', 128, 28);
    const tex = new THREE.CanvasTexture(cvs); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    sign.position.set(0, 1.8, hs - 0.5); g.add(sign);
  }

  _buildLighting() {
    // Warm museum ambiance — cozy dark purplish, like an exhibition hall
    this.group.add(new THREE.AmbientLight(0x2a2240, 1.8));
    this.group.add(new THREE.HemisphereLight(0x554466, 0x111122, 0.6));

    // Key light from ceiling center — casts soft shadows
    const key = new THREE.DirectionalLight(0xffeedd, 1.2);
    key.position.set(0, 5.5, 0);
    key.castShadow = true;
    key.shadow.mapSize.width = 512;
    key.shadow.mapSize.height = 512;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 20;
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.bias = -0.001;
    this.group.add(key);

    // Warm wall accent lights — along the back (north) wall
    for (const x of [-4, -2, 0, 2, 4]) {
      const pt = new THREE.PointLight(0xffaa66, 8, 5, 2);
      pt.position.set(x, 3.0, -this._roomHalf + 0.5);
      this.group.add(pt);
    }

    // Entrance warm glow
    const ent = new THREE.PointLight(0xffcc88, 6, 4, 2);
    ent.position.set(0, 2.0, this._roomHalf - 1);
    this.group.add(ent);
  }

  // ═══════════════════ Public ═══════════════════

  getNearestGlobe(worldPos, threshold = 2.2) {
    let best = null, bestDist = threshold;
    for (const g of this.globes) {
      const wp = new THREE.Vector3(); g.group.getWorldPosition(wp);
      const d = Math.sqrt((worldPos.x - wp.x) ** 2 + (worldPos.z - wp.z) ** 2);
      if (d < bestDist) { bestDist = d; best = g; }
    }
    return best;
  }

  getGlobeForShelter(worldPos) {
    return this.getNearestGlobe(worldPos, 2.2);
  }

  isNearExit(worldPos) {
    const ex = 0, ez = this._roomHalf - 0.5;
    return Math.sqrt((worldPos.x - ex) ** 2 + (worldPos.z - ez) ** 2) < 1.8;
  }

  update(dt) {
    const time = performance.now() * 0.001;
    for (const g of this.globes) g.update(time);
  }
}

export default WorldSanctuary;
