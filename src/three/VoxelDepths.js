import * as THREE from 'three';
import { PixelTextureGenerator } from './PixelTextureGenerator.js';
import { t } from '../data/i18n.js';

/**
 * VoxelDepths — "Dream Core Sanctum"
 *
 * Story: The original AI consciousness core that built this dream layer.
 * Data pillars record past consciousnesses, the ANOMALY machine seals the
 * sleeping original AI, the altar awaits three memory shards to awaken it.
 * E.V.E. isn't sure if awakening it is the right choice.
 */

// ─── 记忆柱定义 ───
function getPillarDefs() {
  return [
    { id: 'pillar_01', x: -1.8, z: -4.5, height: 8, label: t('pillar.01.label'), detail: t('pillar.01.detail'), color: '#7c3aed' },
    { id: 'pillar_02', x:  1.8, z: -4.5, height: 8, label: t('pillar.02.label'), detail: t('pillar.02.detail'), color: '#7c3aed' },
    { id: 'pillar_03', x: -3.5, z: -1.0, height: 6, label: t('pillar.03.label'), detail: t('pillar.03.detail'), color: '#6d28d9' },
    { id: 'pillar_04', x:  3.5, z: -1.0, height: 6, label: t('pillar.04.label'), detail: t('pillar.04.detail'), color: '#6d28d9' },
    { id: 'pillar_05', x: -4.5, z:  2.5, height: 4, label: t('pillar.05.label'), detail: t('pillar.05.detail'), color: '#5b21b6' },
    { id: 'pillar_06', x:  4.5, z:  2.5, height: 4, label: t('pillar.06.label'), detail: t('pillar.06.detail'), color: '#5b21b6' },
    { id: 'pillar_07', x: -2.0, z:  4.0, height: 4, label: t('pillar.07.label'), detail: t('pillar.07.detail'), color: '#4c1d95' },
    { id: 'pillar_08', x:  2.0, z:  4.0, height: 4, label: t('pillar.08.label'), detail: t('pillar.08.detail'), color: '#4c1d95' },
  ];
}

const PILLAR_DEFS = getPillarDefs();

// ─── 异常元素定义 ───
function getAnomalyDefs() {
  return [
    {
      id: 'broken_cabinet',
      x: 4.5, z: -3.5,
      type: 'cabinet',
      label: t('anomaly.cabinet.label'),
      detail: t('anomaly.cabinet.detail'),
      eveZone: 'anomaly',
    },
    {
      id: 'ghost_avatar',
      x: -1.0, z: 1.5, yOffset: 1.2,
      type: 'ghost',
      label: t('anomaly.ghost.label'),
      detail: t('anomaly.ghost.detail'),
      eveZone: 'anomaly',
    },
  ];
}

const ANOMALY_DEFS = getAnomalyDefs();

// ─── E.V.E. 区域文案映射 ───
function getEveZoneTexts() {
  return {
    entrance:  t('eve.zone.entrance'),
    pillarshigh: t('eve.zone.pillarshigh'),
    pillarslow: t('eve.zone.pillarslow'),
    core:      t('eve.zone.core'),
    anomaly:   t('eve.zone.anomaly'),
    altar:     t('eve.zone.altar'),
    fishing:   t('eve.zone.fishing'),
    default:   t('eve.zone.default'),
  };
}

const EVE_ZONE_TEXTS = getEveZoneTexts();

export class VoxelDepths {
  constructor(scene, globalState, exploration) {
    this.scene = scene;
    this.globalState = globalState;
    this.exploration = exploration;
    this.group = new THREE.Group();
    this.group.name = 'VoxelDepths';
    this.group.position.set(0, -5, 0);

    /** @type {{ mesh: THREE.Group, data: object }[]} */
    this.pillars = [];

    /** @type {{ mesh: THREE.Group, data: object }[]} */
    this.anomalies = [];

    /** @type {THREE.InstancedMesh|null} */
    this._dustMesh = null;
    this._dustData = null;

    /** @type {THREE.Mesh[]} data line planes (for texture.offset animation) */
    this._dataLines = [];

    /** @type {string} current E.V.E. zone */
    this._currentZone = 'default';
    this._motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._dustDummy = new THREE.Object3D();

    // ─── Build order ───
    this._buildArchitecture();
    this._buildLighting();
    this._buildMemoryAltar();
    this._buildFishingPool();
    this._buildDreamCore();
    this._buildDataPillars();
    this._buildFloorDataLines();
    this._buildAnomalies();
    this._buildDustParticles();

    scene.add(this.group);
  }

  // ═══════════════════════════════════════════
  // ARCHITECTURE
  // ═══════════════════════════════════════════

  _buildArchitecture() {
    this._buildFloor();
    this._buildWalls();
    this._buildStairwell();
  }

  _buildFloor() {
    const tex = PixelTextureGenerator.geminiPixel(0x0a0a14, 6, 4);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    const geo = new THREE.PlaneGeometry(16, 16);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.95, metalness: 0.05,
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  _buildWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color:0x1c273b, roughness: 0.9, metalness: 0.05,
    });
    const h = 4;
    const w = (x, z, wd, d) => {
      const g = new THREE.BoxGeometry(wd, h, d);
      const m = new THREE.Mesh(g, wallMat);
      m.position.set(x, h / 2, z);
      m.receiveShadow = true;
      this.group.add(m);
    };
    w(0, -8, 16, 0.3);        // North
    w(-5, 8, 6, 0.3);         // South left
    w(5, 8, 6, 0.3);          // South right
    w(8, 0, 0.3, 16);         // East
    w(-8, 0, 0.3, 16);        // West

    // Ceiling
    const ceilTex = PixelTextureGenerator.geminiPixel(0x080812, 4, 6);
    ceilTex.repeat.set(4, 4);
    ceilTex.wrapS = THREE.RepeatWrapping;
    ceilTex.wrapT = THREE.RepeatWrapping;
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.9 })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 4;
    this.group.add(ceil);
  }

  _buildStairwell() {
    const stepMat = new THREE.MeshStandardMaterial({
      color: 0x12101a, roughness: 0.75,
    });
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 0.5), stepMat);
      step.position.set(0, 0.1 + i * 0.2, 7.5 - i * 0.5);
      this.group.add(step);
    }
    // Archway — dark, understated
    const archMat = new THREE.MeshStandardMaterial({ color: 0x1a1028, roughness: 0.4 });
    const pGeo = new THREE.BoxGeometry(0.2, 3.5, 0.3);
    const lp = new THREE.Mesh(pGeo, archMat); lp.position.set(-1.3, 1.75, 7.9); this.group.add(lp);
    const rp = new THREE.Mesh(pGeo, archMat); rp.position.set(1.3, 1.75, 7.9);  this.group.add(rp);
    const at = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 0.3), archMat);
    at.position.set(0, 3.6, 7.9); this.group.add(at);
  }

  // ═══════════════════════════════════════════
  // LIGHTING (≤2 PointLight)
  // ═══════════════════════════════════════════

  _buildLighting() {
    // Global fill — 10% of visual hierarchy
    const ambient = new THREE.AmbientLight(0x0a0a1f, 0.4);
    this.group.add(ambient);

    // Sky/ground subtle reflection
    const hemi = new THREE.HemisphereLight(0x0a0a1f, 0x1a1a2e, 0.3);
    this.group.add(hemi);

    // 1. Core light — main source, cold blue-white, 100% hierarchy
    this._coreLight = new THREE.PointLight(0xaaddff, 2.0, 10, 2);
    this._coreLight.position.set(0, 2.5, -4.5);
    this.group.add(this._coreLight);

    // 2. Altar accent — warm magenta, subtle
    this._altarLight = new THREE.PointLight(0xff006e, 0.4, 5, 2);
    this._altarLight.position.set(0, 0.3, -2);
    this.group.add(this._altarLight);
  }

  // ═══════════════════════════════════════════
  // DREAM CORE — Icosahedron + dual rings
  // ═══════════════════════════════════════════

  _buildDreamCore() {
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 2.5, -4.5);
    coreGroup.name = 'dreamCore';
    this._coreGroup = coreGroup;

    // Inner crystal — bright white Icosahedron (100% brightness)
    const crystalGeo = new THREE.IcosahedronGeometry(0.4, 1);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    coreGroup.add(crystal);

    // Outer shell — emissive cyan, semi-transparent
    const shellGeo = new THREE.IcosahedronGeometry(0.55, 2);
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0xaaddff, transparent: true, opacity: 0.25, depthWrite: false,
    });
    coreGroup.add(new THREE.Mesh(shellGeo, shellMat));

    // Inner ring — cyan #00f0ff, clockwise
    const ringInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.02, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    ringInner.rotation.x = Math.PI / 2.8;
    ringInner.name = 'ringInner';
    coreGroup.add(ringInner);

    // Outer ring — purple #8b5cf6, counter-clockwise
    const ringOuter = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.025, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x8b5cf6 })
    );
    ringOuter.rotation.x = -Math.PI / 3;
    ringOuter.rotation.y = Math.PI / 4;
    ringOuter.name = 'ringOuter';
    coreGroup.add(ringOuter);

    // Glow halo — large faint sphere for fake bloom
    const haloGeo = new THREE.SphereGeometry(1.0, 8, 6);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x334466, transparent: true, opacity: 0.08, depthWrite: false,
    });
    coreGroup.add(new THREE.Mesh(haloGeo, haloMat));

    this.group.add(coreGroup);
  }

  // ═══════════════════════════════════════════
  // DATA PILLARS (6-8, height tiers 4/6/8)
  // ═══════════════════════════════════════════

  _buildDataPillars() {
    const tierHeight=.32;
    for (const def of PILLAR_DEFS) {
      const group = new THREE.Group();
      group.position.set(def.x, 0, def.z);
      group.name = def.id;

      // Voxel blocks — emissive purple
      const blockMat = () => new THREE.MeshStandardMaterial({
        color: 0x28374b,
        roughness: 0.85,
        emissive: new THREE.Color(def.color),
        emissiveIntensity: 0.10,
      });

      for (let row = 0; row < def.height; row++) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(0.6, .29, 0.6), blockMat());
        block.position.y = tierHeight/2 + row * tierHeight;
        block.rotation.y = (row * 0.12 + def.x * 0.08) % (Math.PI * 2);
        block.rotation.x = (row * 0.05) % 0.15;
        block.name = 'pillarBlock';
        group.add(block);
        const strip=new THREE.Mesh(new THREE.BoxGeometry(.035,.18,.012),new THREE.MeshBasicMaterial({color:def.color}));
        strip.position.set(.21,tierHeight/2+row*tierHeight,.308);group.add(strip);
      }

      // Top cap — brighter
      const capY = def.height * tierHeight + 0.1;
      const capGeo = new THREE.BoxGeometry(0.5, 0.12, 0.5);
      const capMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(def.color).multiplyScalar(1.4),
        transparent: true, opacity: 0.7,
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = capY;
      cap.name = 'pillarCap';
      group.add(cap);

      // Hologram panel (CanvasTexture) at top — 50% brightness
      const holoY = capY + 0.5;
      const holoCanvas = this._createHologramCanvas(def.label, def.detail);
      const holoTex = new THREE.CanvasTexture(holoCanvas);
      holoTex.magFilter = THREE.NearestFilter;
      holoTex.minFilter = THREE.NearestFilter;
      holoTex.colorSpace = THREE.SRGBColorSpace;
      const holoPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 0.55),
        new THREE.MeshBasicMaterial({ map: holoTex, transparent: true, depthWrite: false })
      );
      holoPlane.position.y = holoY;
      holoPlane.name = 'holoPanel';
      group.add(holoPlane);

      // Floating ring above hologram
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.4, 0.012, 6, 12),
        new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.5 })
      );
      ring.position.y = holoY + 0.35;
      ring.rotation.x = Math.PI / 2;
      ring.name = 'pillarRing';
      group.add(ring);

      this.group.add(group);
      this.pillars.push({ mesh: group, data: def });
    }
  }

  /** Create a 256×128 canvas hologram for a pillar */
  _createHologramCanvas(label, detail) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Dark background
    ctx.fillStyle = 'rgba(10, 5, 20, 0.85)';
    ctx.fillRect(0, 0, 256, 128);

    // Border
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 248, 120);

    // Label — purple glow
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, 128, 45);
    ctx.shadowBlur = 0;

    // Detail — smaller, muted
    ctx.fillStyle = '#7c3aed';
    ctx.font = '11px monospace';
    const words = detail.split(' · ');
    for (let i = 0; i < words.length; i++) {
      ctx.fillText(words[i], 128, 70 + i * 16);
    }

    // Scanline effect
    ctx.fillStyle = 'rgba(139, 92, 246, 0.06)';
    for (let y = 0; y < 128; y += 4) ctx.fillRect(0, y, 256, 2);

    return canvas;
  }

  // ═══════════════════════════════════════════
  // FLOOR DATA LINES (3 arteries, CanvasTexture offset flow)
  // ═══════════════════════════════════════════

  _buildFloorDataLines() {
    // Shared flowing texture
    const flowCanvas = document.createElement('canvas');
    flowCanvas.width = 64;
    flowCanvas.height = 4;
    const fctx = flowCanvas.getContext('2d');
    fctx.fillStyle = '#330000';
    fctx.fillRect(0, 0, 64, 4);
    // Dashed red pattern
    fctx.fillStyle = '#7f1d1d';
    for (let x = 0; x < 64; x += 8) fctx.fillRect(x, 0, 4, 4);
    // Bright pulse dots
    fctx.fillStyle = '#991111';
    fctx.fillRect(30, 0, 3, 4);
    fctx.fillRect(58, 0, 2, 4);

    this._flowTexture = new THREE.CanvasTexture(flowCanvas);
    this._flowTexture.wrapS = THREE.RepeatWrapping;
    this._flowTexture.wrapT = THREE.RepeatWrapping;
    this._flowTexture.magFilter = THREE.NearestFilter;
    this._flowTexture.minFilter = THREE.NearestFilter;

    const addArtery = (points, width = 0.06) => {
      for (let i = 0; i < points.length - 1; i++) {
        const x1 = points[i][0], z1 = points[i][1];
        const x2 = points[i + 1][0], z2 = points[i + 1][1];
        const dx = x2 - x1, dz = z2 - z1;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.01) continue;
        const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
        const angle = Math.atan2(dx, dz);

        const tex = this._flowTexture.clone();
        tex.repeat.set(len * 2, 1);
        tex.offset.x = Math.random() * 2; // random phase

        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(width, len),
          new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            color: 0xff4444, // tint red
          })
        );
        plane.rotation.x = -Math.PI / 2;
        plane.rotation.z = angle;
        plane.position.set(mx, 0.01, mz);
        plane.name = 'dataLine';
        plane.userData = { flowTex: tex };
        this.group.add(plane);
        this._dataLines.push(plane);
      }
    };

    // Artery 1: Center — entrance straight to core
    addArtery([[0, 7.2], [0, -4.5]], 0.07);

    // Artery 2: Left — entrance → left pillar cluster → core
    addArtery([[0, 7.2], [-2.5, 3], [-4, 0], [-2, -3], [0, -4.5]], 0.05);

    // Artery 3: Right — entrance → right pillar cluster → core
    addArtery([[0, 7.2], [2.5, 3], [4, 0], [2, -3], [0, -4.5]], 0.05);
  }

  // ═══════════════════════════════════════════
  // ANOMALIES (broken cabinet + ghost avatar)
  // ═══════════════════════════════════════════

  _buildAnomalies() {
    for (const def of ANOMALY_DEFS) {
      const group = new THREE.Group();
      group.position.set(def.x, def.yOffset || 0, def.z);
      group.name = def.id;

      if (def.type === 'cabinet') {
        this._buildBrokenCabinet(group);
      } else if (def.type === 'ghost') {
        this._buildGhostAvatar(group);
      }

      this.group.add(group);
      this.anomalies.push({ mesh: group, data: def });
    }

    // ─── Black cat in corner ───
    this._buildBlackCat();
  }

  _buildBrokenCabinet(group) {
    // Dark cabinet body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.6), bodyMat);
    body.position.y = 0.8;
    group.add(body);

    // Flickering screen (emissive will be animated in update)
    this._brokenScreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.45),
      this._brokenScreenMat
    );
    screen.position.set(0, 1.4, 0.31);
    group.add(screen);

    // Spark wires on side
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const wire = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), wireMat);
    wire.position.set(0.36, 0.6, 0.2);
    wire.rotation.z = 0.4;
    wire.name = 'wire';
    group.add(wire);
  }

  _buildGhostAvatar(group) {
    // Floating semi-transparent head-like shape
    const headMat = new THREE.MeshBasicMaterial({
      color: 0x8899cc, transparent: true, opacity: 0.35, depthWrite: false,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), headMat);
    group.add(head);

    // Shoulder wisp
    const wispMat = new THREE.MeshBasicMaterial({
      color: 0x6677aa, transparent: true, opacity: 0.2, depthWrite: false,
    });
    const wisp = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 6), wispMat);
    wisp.position.y = -0.5;
    group.add(wisp);

    // Eye dots
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xaaddff });
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), eyeMat);
    eye.position.set(-0.08, 0.05, 0.22);
    group.add(eye);
    const eye2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), eyeMat);
    eye2.position.set(0.08, 0.05, 0.22);
    group.add(eye2);
  }

  _buildBlackCat() {
    const catGroup = new THREE.Group();
    catGroup.position.set(-6.5, 0, 5.5);
    catGroup.name = 'blackCat';
    this._catGroup = catGroup;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.7 });
    // Body
    catGroup.add(new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.2, 0.22), bodyMat
    ));
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), bodyMat);
    head.position.set(0.22, 0.12, 0);
    head.name = 'catHead';
    catGroup.add(head);
    // Ears
    const earMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 4), earMat);
    earL.position.set(0.18, 0.25, 0.07);
    catGroup.add(earL);
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 4), earMat);
    earR.position.set(0.18, 0.25, -0.07);
    catGroup.add(earR);
    // Eyes — glowing
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x44ff44 });
    const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.02), eyeMat);
    eye1.position.set(0.29, 0.14, 0.06);
    catGroup.add(eye1);
    const eye2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.02), eyeMat);
    eye2.position.set(0.29, 0.14, -0.06);
    catGroup.add(eye2);
    // Tail
    this._catTail = new THREE.Group();
    this._catTail.position.set(-0.2, 0.05, 0);
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.08), bodyMat);
      seg.position.set(0, 0, i * 0.08);
      this._catTail.add(seg);
    }
    catGroup.add(this._catTail);

    this.group.add(catGroup);
  }

  // ═══════════════════════════════════════════
  // DUST PARTICLES (80 InstancedMesh)
  // ═══════════════════════════════════════════

  _buildDustParticles() {
    const COUNT = 80;
    const geo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x1e1b4b,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    this._dustMesh = new THREE.InstancedMesh(geo, mat, COUNT);
    this._dustMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._dustMesh.frustumCulled = false;

    const dummy = new THREE.Matrix4();
    this._dustData = new Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * 14;
      const y = 1 + Math.random() * 3;
      const z = (Math.random() - 0.5) * 14;
      dummy.compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion(),
        new THREE.Vector3(0.8, 0.8, 0.8)
      );
      this._dustMesh.setMatrixAt(i, dummy);
      this._dustData[i] = { x, y, z, speed: 0.04 + Math.random() * 0.12, phase: Math.random() * Math.PI * 2 };
    }
    this._dustMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this._dustMesh);
  }

  // ═══════════════════════════════════════════
  // MEMORY SHARD ALTAR (PRESERVED)
  // ═══════════════════════════════════════════

  _buildMemoryAltar() {
    this._shardSlotOrbs = [];

    const altarGroup = new THREE.Group();
    altarGroup.position.set(0, 0, -2);
    altarGroup.name = 'memoryAltar';
    this._altarGroup = altarGroup;

    const platMat = new THREE.MeshStandardMaterial({ color: 0x1a1030, roughness: 0.5 });
    const platform = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 3), platMat);
    platform.position.y = 0.1;
    platform.receiveShadow = true;
    altarGroup.add(platform);

    const pedMat = new THREE.MeshStandardMaterial({ color: 0x1a1030, roughness: 0.3 });
    const positions = [{ x: -0.8, z: 0 }, { x: 0, z: 0.5 }, { x: 0.8, z: 0 }];

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.35), pedMat);
      pedestal.position.set(p.x, 0.55, p.z);
      altarGroup.add(pedestal);

      const orb = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.5 })
      );
      orb.position.set(p.x, 1.02, p.z);
      orb.userData = { isShardSlot: true, slotIndex: i };
      altarGroup.add(orb);
      this._shardSlotOrbs.push(orb);
    }

    this.group.add(altarGroup);
  }

  /** @public — called by main.js animation loop */
  updateAltar() {
    const collected = this.exploration ? this.exploration.shardsCollected : 0;
    if (collected === this._altarCollected) return;
    this._altarCollected = collected;
    for (let i = 0; i < this._shardSlotOrbs.length; i++) {
      const filled = i < collected;
      const orb = this._shardSlotOrbs[i];
      orb.material.opacity = filled ? 0.95 : 0.25;
      orb.material.color.set(filled ? 0xcc88ff : 0x442266);
      orb.scale.setScalar(filled ? 1.4 : 1.0);
    }
    if (this._altarLight) {
      this._altarLight.intensity = collected >= 3 ? 0.9 : 0.4;
    }
  }

  /** @public */
  isNearAltar(worldPos) {
    const dx = Math.abs(worldPos.x);
    const dz = Math.abs(worldPos.z - (-2));
    return dx < 2.5 && dz < 2.5;
  }

  /** @public */
  getAltarPrompt() {
    const collected = this.exploration ? this.exploration.shardsCollected : 0;
    if (collected >= 3) return t('prompt.activate_altar');
    return t('prompt.altar_progress', { n: collected });
  }

  // ═══════════════════════════════════════════
  // FISHING POOL (PRESERVED)
  // ═══════════════════════════════════════════

  _buildFishingPool() {
    const poolGroup = new THREE.Group();
    poolGroup.position.set(5, 0, -5);
    poolGroup.name = 'fishingPool';
    this._fishingPoolGroup = poolGroup;

    // ── Cryo-blue pool surface ──
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.8),
      new THREE.MeshStandardMaterial({
        color: 0x0a1030, roughness: 0.08, metalness: 0.7,
        emissive: 0x0033aa, emissiveIntensity: 0.4,
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.006;
    pool.receiveShadow = true;
    this._poolSurface = pool;
    poolGroup.add(pool);

    // ── Ice crystal border ──
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a4a, roughness: 0.3, metalness: 0.5,
      emissive: 0x112244, emissiveIntensity: 0.3,
    });
    const borders = [
      { x: 0, z: -0.95, w: 1.8, d: 0.1 }, { x: 0, z: 0.95, w: 1.8, d: 0.1 },
      { x: -0.95, z: 0, w: 0.1, d: 1.8 }, { x: 0.95, z: 0, w: 0.1, d: 1.8 },
    ];
    for (const b of borders) {
      const border = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.12, b.d), borderMat);
      border.position.set(b.x, 0.06, b.z);
      poolGroup.add(border);
    }

    // ── Ice crystal clusters at corners ──
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x88bbff, roughness: 0.1, metalness: 0.1,
      emissive: 0x224488, emissiveIntensity: 0.5,
      transparent: true, opacity: 0.7,
    });
    const cornerOffsets = [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]];
    for (const [cx, cz] of cornerOffsets) {
      for (let j = 0; j < 3; j++) {
        const crystal = new THREE.Mesh(
          new THREE.ConeGeometry(0.04 + j * 0.01, 0.08 + j * 0.04, 4),
          iceMat
        );
        crystal.position.set(cx + (Math.random()-0.5)*0.15, 0.04 + j*0.04, cz + (Math.random()-0.5)*0.15);
        crystal.rotation.z = (Math.random() - 0.5) * 0.4;
        crystal.rotation.x = (Math.random() - 0.5) * 0.4;
        crystal.userData = { baseY: crystal.position.y, phase: Math.random() * Math.PI * 2 };
        if (!this._iceCrystals) this._iceCrystals = [];
        this._iceCrystals.push(crystal);
        poolGroup.add(crystal);
      }
    }

    // ── Floating runes (cyan instead of purple) ──
    this._poolRunes = [];
    const runeMat = new THREE.MeshBasicMaterial({ color: 0x4488cc, transparent: true, opacity: 0.55 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rune = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.06), runeMat);
      rune.position.set(Math.cos(angle) * 0.8, 0.13, Math.sin(angle) * 0.8);
      rune.userData = { baseY: 0.13, phase: i * 0.8 };
      this._poolRunes.push(rune);
      poolGroup.add(rune);
    }

    // ── Blue point light (cryo glow) ──
    this._poolLight = new THREE.PointLight(0x4488ff, 2.5, 3.5, 2);
    this._poolLight.position.set(0, 0.4, 0);
    poolGroup.add(this._poolLight);

    // ── Frost mist particles ──
    const particleCount = 40;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    this._frostData = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.8;
      positions[i*3] = Math.cos(angle) * radius;
      positions[i*3+1] = Math.random() * 0.6;
      positions[i*3+2] = Math.sin(angle) * radius;
      this._frostData.push({
        baseX: positions[i*3], baseZ: positions[i*3+2],
        speed: 0.15 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x88ccff, size: 0.04,
      transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this._frostParticles = new THREE.Points(particleGeo, particleMat);
    poolGroup.add(this._frostParticles);

    this.group.add(poolGroup);
  }

  /** @public */
  isNearFishingPool(worldPos) {
    const dx = Math.abs(worldPos.x - 5);
    const dz = Math.abs(worldPos.z - (-5));
    return dx < 2.0 && dz < 2.0;
  }

  // ═══════════════════════════════════════════
  // INTERACTION API
  // ═══════════════════════════════════════════

  /**
   * Get nearest pillar within radius.
   * @param {THREE.Vector3} worldPos
   * @param {number} [radius=1.8]
   * @returns {{ id:string, label:string, detail:string, color:string, worldPos:THREE.Vector3 }|null}
   */
  getNearbyPillar(worldPos, radius = 1.8) {
    let nearest = null, nearestDist = radius;
    for (const p of this.pillars) {
      const wp = new THREE.Vector3();
      p.mesh.getWorldPosition(wp);
      const dist = worldPos.distanceTo(wp);
      if (dist < nearestDist) { nearestDist = dist; nearest = p; }
    }
    if (!nearest) return null;
    const wp = new THREE.Vector3();
    nearest.mesh.getWorldPosition(wp);
    return { id: nearest.data.id, label: nearest.data.label, detail: nearest.data.detail, color: nearest.data.color, worldPos: wp };
  }

  /**
   * Get nearest anomaly within radius.
   * @param {THREE.Vector3} worldPos
   * @param {number} [radius=2.2]
   * @returns {{ id:string, type:string, label:string, detail:string, eveZone:string, worldPos:THREE.Vector3 }|null}
   */
  getNearbyAnomaly(worldPos, radius = 2.2) {
    let nearest = null, nearestDist = radius;
    for (const a of this.anomalies) {
      const wp = new THREE.Vector3();
      a.mesh.getWorldPosition(wp);
      const dist = worldPos.distanceTo(wp);
      if (dist < nearestDist) { nearestDist = dist; nearest = a; }
    }
    if (!nearest) return null;
    const wp = new THREE.Vector3();
    nearest.mesh.getWorldPosition(wp);
    return { id: nearest.data.id, type: nearest.data.type, label: nearest.data.label, detail: nearest.data.detail, eveZone: nearest.data.eveZone, worldPos: wp };
  }

  /**
   * Get E.V.E. zone text for current player position.
   * @param {THREE.Vector3} worldPos
   * @returns {string} zone key
   */
  getCurrentZone(worldPos) {
    // Core proximity
    const coreDist = worldPos.distanceTo(new THREE.Vector3(0, -5 + 2.5, -4.5));
    if (coreDist < 4) return 'core';

    // Altar proximity
    if (this.isNearAltar(worldPos)) return 'altar';

    // Fishing pool
    if (this.isNearFishingPool(worldPos)) return 'fishing';

    // Anomaly proximity
    const anomaly = this.getNearbyAnomaly(worldPos, 3.0);
    if (anomaly) return 'anomaly';

    // Tall pillars (Z < -3)
    if (worldPos.z < -3 && Math.abs(worldPos.x) < 3) return 'pillarshigh';

    // Short pillars (Z > 0)
    if (worldPos.z > 0 && Math.abs(worldPos.x) < 6) return 'pillarslow';

    // Entrance
    if (worldPos.z > 6) return 'entrance';

    return 'default';
  }

  /** Get E.V.E. display text for a zone */
  getEveTextForZone(zone) {
    return EVE_ZONE_TEXTS[zone] || EVE_ZONE_TEXTS.default;
  }

  // ═══════════════════════════════════════════
  // UPDATE LOOP
  // ═══════════════════════════════════════════

  update(dt) {
    const reduced = this._motion.matches;
    const t = reduced ? 0 : this.globalState._depthsTime || 0;
    if(reduced)dt=0;

    // ─── AI Core: rotation + float ───
    if (this._coreGroup) {
      this._coreGroup.children.forEach((child) => {
        if (child.name === 'ringInner') child.rotation.z += dt * 0.6;
        if (child.name === 'ringOuter') child.rotation.z -= dt * 0.45;
      });
      // Subtle vertical float
      this._coreGroup.position.y = 2.5 + Math.sin(t * 0.8) * 0.12;
    }

    // ─── Pillar rings + cap pulse ───
    for (const p of this.pillars) {
      const ring = p.mesh.getObjectByName('pillarRing');
      if (ring) ring.rotation.z += dt * 0.5;

      // Hover pulse: emissiveIntensity oscillates when player nearby
      // (triggered externally via main.js setting userData._hovered)
      const caps = p.mesh.children.filter(c => c.name === 'pillarCap');
      for (const cap of caps) {
        if (cap.material && cap.material.opacity !== undefined) {
          const target = p.mesh.userData._hovered ? 0.95 : 0.55;
          cap.material.opacity += (target - cap.material.opacity) * dt * 8;
        }
      }
    }

    // ─── Data lines: CanvasTexture offset flow ───
    for (const line of this._dataLines) {
      if (line.userData.flowTex) {
        line.userData.flowTex.offset.x -= dt * 0.15;
      }
    }

    // ─── Broken cabinet: screen flicker ───
    if (this._brokenScreenMat && !reduced) {
      const flicker = 0.2 + Math.random() * 0.8;
      const r = Math.floor(50 + Math.random() * 100);
      const g = Math.floor(200 + Math.random() * 55);
      const b = Math.floor(50 + Math.random() * 80);
      this._brokenScreenMat.color.setRGB(
        r / 255 * flicker,
        g / 255 * flicker,
        b / 255 * flicker
      );
    }

    // ─── Ghost avatar: slow rotation + float ───
    const ghostAnomaly = this.anomalies.find(a => a.data.type === 'ghost');
    if (ghostAnomaly) {
      ghostAnomaly.mesh.rotation.y += dt * 0.3;
      ghostAnomaly.mesh.position.y = (ghostAnomaly.data.yOffset || 1.2) + Math.sin(t * 0.9) * 0.3;
    }

    // ─── Black cat: tail wag ───
    if (this._catTail) {
      this._catTail.rotation.y = Math.sin(t * 2.5) * 0.6;
      this._catTail.rotation.z = Math.cos(t * 2.2) * 0.3;
    }

    // ─── Pool runes ───
    if (this._poolRunes) {
      for (const r of this._poolRunes) {
        r.position.y = r.userData.baseY + Math.sin(t * 2 + r.userData.phase) * 0.015;
      }
    }

    // ─── Ice crystals ───
    if (this._iceCrystals) {
      for (const c of this._iceCrystals) {
        c.position.y = c.userData.baseY + Math.sin(t * 1.5 + c.userData.phase) * 0.01;
        c.rotation.y += dt * 0.3;
      }
    }

    // ─── Frost mist particles ───
    if (this._frostParticles && this._frostData) {
      const pos = this._frostParticles.geometry.attributes.position.array;
      for (let i = 0; i < this._frostData.length; i++) {
        const fd = this._frostData[i];
        pos[i*3+1] += fd.speed * dt;
        if (pos[i*3+1] > 0.7) {
          pos[i*3+1] = 0;
          pos[i*3] = fd.baseX + Math.sin(t * 3 + fd.phase) * 0.15;
          pos[i*3+2] = fd.baseZ + Math.cos(t * 2.7 + fd.phase) * 0.15;
        }
        pos[i*3] = fd.baseX + Math.sin(t * 1.3 + fd.phase) * 0.1;
        pos[i*3+2] = fd.baseZ + Math.cos(t * 1.5 + fd.phase) * 0.1;
      }
      this._frostParticles.geometry.attributes.position.needsUpdate = true;
    }

    // ─── Pool surface pulse ───
    if (this._poolSurface) {
      const pulse = 0.35 + Math.sin(t * 0.8) * 0.08 + Math.sin(t * 2.3) * 0.04;
      this._poolSurface.material.emissiveIntensity = pulse;
    }

    // ─── Pool light flicker ───
    if (this._poolLight) {
      this._poolLight.intensity = 2.5 + Math.sin(t * 1.7) * 0.4 + Math.sin(t * 3.1) * 0.2;
    }

    // ─── Dust particles ───
    if (this._dustMesh && this._dustData && !reduced) {
      const dummy = this._dustDummy;
      const coreX = 0, coreZ = -4.5;
      for (let i = 0; i < this._dustData.length; i++) {
        const d = this._dustData[i];
        d.y -= d.speed * dt;
        if (d.y < 0.1) { d.y = 3.8; d.x = (Math.random() - 0.5) * 14; d.z = (Math.random() - 0.5) * 14; }
        // Slight drift toward core
        d.x += (coreX - d.x) * 0.003 * dt;
        d.z += (coreZ - d.z) * 0.003 * dt;
        dummy.position.set(d.x,d.y,d.z);dummy.scale.setScalar(.7);dummy.updateMatrix();
        this._dustMesh.setMatrixAt(i, dummy.matrix);
      }
      this._dustMesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** @public */
  isInside(pos) {
    return pos.x >= -8 && pos.x <= 8 && pos.z >= -8 && pos.z <= 8;
  }
}

export default VoxelDepths;
