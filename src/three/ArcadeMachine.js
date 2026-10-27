import * as THREE from 'three';
import { PixelTextureGenerator } from './PixelTextureGenerator.js';
import { ATTRACT_RENDERERS, drawDefaultAttract } from './AttractModes.js';
import { buildCabinetShell } from './CabinetArt.js';
import { t } from '../data/i18n.js';

/**
 * ArcadeMachine — Gemini V3 style pixel-textured arcade cabinet.
 *
 * Features:
 *   - Gemini pixel wood textures per game (no external image loading)
 *   - 128×96 dynamic canvas screen with per-game attract animations
 *   - Wooden seat with backrest
 *   - Joystick + 2 buttons on control panel
 *   - Neon accent strips with per-game color glow
 *   - Marquee sign above screen
 */

// Cabinet texture mapping per game ID (Gemini pixel textures)
const CABINET_TEXTURES = {
  'anomaly':              () => PixelTextureGenerator.cabinetAnomaly(),
  'cyber-hunder':         () => PixelTextureGenerator.cabinetCyberHunder(),
  'dark-water-stealth':   () => PixelTextureGenerator.cabinetDarkWater(),
  'leave-at-6pm-evolved': () => PixelTextureGenerator.cabinetLeaveAt6pm(),
};

export class ArcadeMachine {
  constructor(config, x, z, rotation = 0) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = rotation;

    // Per-game accent color
    this.accentColor = new THREE.Color(config.attractColor || '#00ffcc');
    this.screenColor = new THREE.Color(config.attractColor || '#00ffcc');

    // Neon animation state
    this.neonElements = [];
    this.neonPhase = Math.random() * Math.PI * 2;

    // Screen spark particles
    this.sparkParticles = [];
    this.sparkTimer = 0;
    this.sparkInterval = 0.3 + Math.random() * 0.8;

    this._buildCabinet();
    this._buildNeonMarqueeSign();
    this._buildScreen();
    this._buildControlPanel();
    this._buildSeat();
    this._buildNeonTubes();
    this._attractCanvas = document.createElement('canvas');
    this._attractCanvas.width = 512; this._attractCanvas.height = 384;
    this._attractCtx = this._attractCanvas.getContext('2d');
    this._reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Seat/camera positions
    const rotAxis = new THREE.Vector3(0, 1, 0);
    this.seatPosition = new THREE.Vector3(x, 0.35, z).add(
      new THREE.Vector3(0, 0, 1.8).applyAxisAngle(rotAxis, rotation)
    );
    this.firstPersonCamPos = new THREE.Vector3(x, 1.5, z).add(
      new THREE.Vector3(0, 0, 1.3).applyAxisAngle(rotAxis, rotation)
    );
    this.firstPersonLookAt = new THREE.Vector3(x, 1.5, z).add(
      new THREE.Vector3(0, 0, 0.35).applyAxisAngle(rotAxis, rotation)
    );

    this.time = Math.random() * 100;
    this.attractPhase = 0;
    this._screenElapsed = 1;
    this._marqueeElapsed = 1;
  }

  // ==================== Cabinet Body ====================
  _buildCabinet() {
    const texFn = CABINET_TEXTURES[this.config.id] || CABINET_TEXTURES['anomaly'];
    const cabinetTex = texFn();
    cabinetTex.wrapS = THREE.RepeatWrapping;
    cabinetTex.wrapT = THREE.RepeatWrapping;

    const mat = new THREE.MeshStandardMaterial({ map: cabinetTex, roughness: .58, metalness: .28 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x34485e, roughness: .38, metalness: .68 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0c1522, roughness: .8, metalness: .2 });
    const accent = new THREE.MeshStandardMaterial({ color: this.accentColor, emissive: this.accentColor, emissiveIntensity: .45, roughness: .35 });
    const { part } = buildCabinetShell(this.group, this.config.id, mat, trim, dark, accent);
    part(1.1,.12,.96,0,.13,.02,trim);
    part(.88,.18,.055,0,.24,.455,dark);
    part(.76,.035,.02,0,.24,.49,accent);
    part(1.08,.16,.96,0,2.03,.02,trim);
    part(1.04,.12,.88,0,2.16,-.03,mat);
    for (const side of [-1,1]) {
      part(.09,1.7,.96,side*.535,1.05,.02,trim);
      part(.035,1.25,.035,side*.585,1.08,.5,accent);
      part(.1,.22,.98,side*.535,1.93,.02,mat);
      for (let i=0;i<5;i++) part(.018,.035,.34,side*.585,.55+i*.09,-.08,dark);
    }
    if (this.config.id === 'anomaly') {
      part(.72,.12,.7,0,2.3,-.04,dark);
      part(.08,.24,.08,-.3,2.43,-.05,accent);
      part(.08,.16,.08,.3,2.39,-.05,accent);
    } else if (this.config.id === 'cyber-hunder') {
      for (const side of [-1,1]) part(.24,.12,.82,side*.48,2.29,-.02,accent);
      part(.52,.08,.68,0,2.28,-.03,trim);
    } else if (this.config.id === 'dark-water-stealth') {
      part(.86,.09,.72,0,2.29,-.03,accent);
      part(.58,.08,.62,0,2.38,-.06,trim);
    } else {
      part(.92,.16,.75,0,2.3,-.02,mat);
      part(.62,.035,.04,0,2.31,.375,accent);
    }
  }

  // ==================== Neon Marquee Sign ====================
  _buildNeonMarqueeSign() {
    // Backing box — dark metal
    const signGeo = new THREE.BoxGeometry(0.96, 0.28, 0.12);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.5,
      metalness: 0.7
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 2.15, 0.35);
    this.group.add(sign);

    // Neon tube frame — top, bottom, left, right around the sign
    const tubeW = 0.05;
    const tubeD = 0.04;
    const tubeMat = new THREE.MeshStandardMaterial({
      color: this.accentColor,
      emissive: this.accentColor,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.1
    });

    const halfW = 0.50, halfH = 0.16;
    const zFwd = 0.42;

    const tubes = [
      { geo: new THREE.BoxGeometry(1.02, tubeW, tubeD), pos: [0, 2.15 + halfH, zFwd] },   // top
      { geo: new THREE.BoxGeometry(1.02, tubeW, tubeD), pos: [0, 2.15 - halfH, zFwd] },   // bottom
      { geo: new THREE.BoxGeometry(tubeW, 0.30, tubeD), pos: [-halfW, 2.15, zFwd] },       // left
      { geo: new THREE.BoxGeometry(tubeW, 0.30, tubeD), pos: [halfW, 2.15, zFwd] },        // right
    ];

    for (const t of tubes) {
      const mesh = new THREE.Mesh(t.geo, tubeMat.clone());
      mesh.position.set(...t.pos);
      this.group.add(mesh);
      this.neonElements.push({ mesh, baseIntensity: 1.2, phase: Math.random() * Math.PI * 2 });
    }

    // Marquee text canvas
    this._marqueeCanvas = document.createElement('canvas');
    this._marqueeCanvas.width = 256;
    this._marqueeCanvas.height = 64;
    this._marqueeCtx = this._marqueeCanvas.getContext('2d');
    this._drawMarqueeText(1.0);

    const mTex = new THREE.CanvasTexture(this._marqueeCanvas);
    mTex.magFilter = THREE.NearestFilter;
    mTex.minFilter = THREE.NearestFilter;
    mTex.colorSpace = THREE.SRGBColorSpace;

    const mGeo = new THREE.PlaneGeometry(0.88, 0.22);
    this._marqueeMesh = new THREE.Mesh(mGeo, new THREE.MeshBasicMaterial({ map: mTex }));
    this._marqueeMesh.position.set(0, 2.15, 0.43);
    this.group.add(this._marqueeMesh);
  }

  /** Redraw marquee text with given intensity (1.0 = full bright) */
  _drawMarqueeText(intensity) {
    const ctx = this._marqueeCtx;
    const w = this._marqueeCanvas.width;
    const h = this._marqueeCanvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = `rgba(8,8,18,${0.9})`;
    ctx.fillRect(0, 0, w, h);

    // Glow halo behind text
    const glowAlpha = 0.3 * intensity;
    ctx.shadowColor = '#' + this.accentColor.getHexString();
    ctx.shadowBlur = 12 * intensity;
    ctx.fillStyle = `rgba(${Math.round(this.accentColor.r*255)},${Math.round(this.accentColor.g*255)},${Math.round(this.accentColor.b*255)},${0.7*intensity})`;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText((this.config.name || 'GAME').toUpperCase(), 128, 42);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Border
    ctx.strokeStyle = `rgba(${Math.round(this.accentColor.r*255)},${Math.round(this.accentColor.g*255)},${Math.round(this.accentColor.b*255)},${0.5*intensity})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, w - 12, h - 12);
  }

  // ==================== Screen ====================
  _buildScreen() {
    // Screen canvas — 128×96 low-res like v3
    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 128;
    this.screenCanvas.height = 96;
    this.screenCtx = this.screenCanvas.getContext('2d');
    this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTexture.magFilter = THREE.NearestFilter;
    this.screenTexture.minFilter = THREE.NearestFilter;
    this.screenTexture.colorSpace = THREE.SRGBColorSpace;

    // Metal bezel frame
    const bezelGeo = new THREE.BoxGeometry(0.75, 0.6, 0.06);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x444455,
      roughness: 0.4,
      metalness: 0.6
    });
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.position.set(0, 1.55, 0.46);
    this.group.add(bezel);

    // Screen plane
    const screenGeo = new THREE.PlaneGeometry(0.65, 0.48);
    this.screenMat = new THREE.ShaderMaterial({
      uniforms: { tScreen: { value: this.screenTexture }, uGlow: { value: .8 }, uTime: { value: 0 }, uAccent: { value: this.screenColor } },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;vec3 p=position;p.z+=.018*(1.-pow(abs(uv.x*2.-1.),2.));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: `
        uniform sampler2D tScreen; uniform float uGlow; uniform float uTime; uniform vec3 uAccent; varying vec2 vUv;
        void main(){
          vec2 p=vUv*2.-1.;p*=1.+dot(p,p)*.035;vec2 uv=p*.5+.5;
          if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.){gl_FragColor=vec4(.005,.009,.014,1.);return;}
          vec3 col=texture2D(tScreen,uv).rgb;
          float scan=.92+.08*abs(sin(uv.y*96.*3.14159));
          float vig=1.-smoothstep(.3,1.25,dot(p,p))*.38;
          float glass=pow(max(0.,1.-abs(p.x+p.y*.55+.35)),18.)*.075;
          col=col*scan*vig*(.75+uGlow*.45)+uAccent*glass;
          gl_FragColor=vec4(col,1.);
        }`,
      toneMapped: false
    });
    this.screenMesh = new THREE.Mesh(screenGeo, this.screenMat);
    this.screenMesh.position.set(0, 1.55, 0.5);
    this.screenMesh.name = 'arcadeScreen';
    this.group.add(this.screenMesh);
  }

  // ==================== Control Panel ====================
  _buildControlPanel() {
    // Slanted panel
    const panelGeo = new THREE.BoxGeometry(0.85, 0.12, 0.4);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x444455,
      roughness: 0.35,
      metalness: 0.55
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, 0.95, 0.5);
    panel.rotation.x = -0.25;
    this.group.add(panel);

    // Joystick — red neon
    const stickGeo = new THREE.BoxGeometry(0.06, 0.2, 0.06);
    const stickMat = new THREE.MeshStandardMaterial({
      color: 0xff0040,
      emissive: 0xff0040,
      emissiveIntensity: 0.9,
      roughness: 0.3
    });
    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.position.set(-0.18, 1.15, 0.55);
    this.group.add(stick);
    const knob = new THREE.Mesh(new THREE.BoxGeometry(.12,.1,.12), new THREE.MeshStandardMaterial({ color: 0xd95567, roughness: .28, metalness: .18 }));
    knob.position.set(-.18,1.27,.55);knob.rotation.y=Math.PI/4;this.group.add(knob);
    const washerMat = new THREE.MeshStandardMaterial({ color: 0x8294a5, roughness: .32, metalness: .8 });
    for (const x of [.08,.22]) { const ring=new THREE.Mesh(new THREE.TorusGeometry(.064,.012,4,12),washerMat);ring.rotation.x=-Math.PI/2-.25;ring.position.set(x,1.035,.52);this.group.add(ring); }

    // Button 1 — cyan
    const btn1Geo = new THREE.BoxGeometry(0.08, 0.04, 0.08);
    const btn1Mat = new THREE.MeshStandardMaterial({
      color: 0x00ffe0,
      emissive: 0x00ffe0,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });
    const btn1 = new THREE.Mesh(btn1Geo, btn1Mat);
    btn1.position.set(0.08, 1.05, 0.52);
    this.group.add(btn1);

    // Button 2 — gold
    const btn2Geo = new THREE.BoxGeometry(0.08, 0.04, 0.08);
    const btn2Mat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });
    const btn2 = new THREE.Mesh(btn2Geo, btn2Mat);
    btn2.position.set(0.22, 1.05, 0.52);
    this.group.add(btn2);
  }

  // ==================== Seat ====================
  _buildSeat() {
    const seatMat = PixelTextureGenerator.lightWood
      ? new THREE.MeshStandardMaterial({
          map: PixelTextureGenerator.lightWood(),
          roughness: 0.85
        })
      : new THREE.MeshStandardMaterial({ color: 0x8e714a, roughness: 0.85 });

    // Seat cushion
    const seatGeo = new THREE.BoxGeometry(0.55, 0.1, 0.45);
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.45, 0.85);
    seat.castShadow = true;
    this.group.add(seat);

    // Seat back
    const backGeo = new THREE.BoxGeometry(0.55, 0.45, 0.08);
    const back = new THREE.Mesh(backGeo, seatMat);
    back.position.set(0, 0.75, 1.1);
    this.group.add(back);
  }

  // ==================== Neon Tubes (all cabinet edge lighting) ====================
  _buildNeonTubes() {
    const tubeMat = () => new THREE.MeshStandardMaterial({
      color: this.accentColor,
      emissive: this.accentColor,
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.1
    });

    // Vertical side strips
    const vGeo = new THREE.BoxGeometry(0.04, 1.6, 0.04);
    const leftStrip = new THREE.Mesh(vGeo, tubeMat());
    leftStrip.position.set(-0.52, 1.0, 0);
    this.group.add(leftStrip);
    this.neonElements.push({ mesh: leftStrip, baseIntensity: 0.9, phase: 0 });

    const rightStrip = new THREE.Mesh(vGeo, tubeMat());
    rightStrip.position.set(0.52, 1.0, 0);
    this.group.add(rightStrip);
    this.neonElements.push({ mesh: rightStrip, baseIntensity: 0.9, phase: 1.2 });

    // Horizontal top strip
    const hGeo = new THREE.BoxGeometry(0.92, 0.04, 0.04);
    const topStrip = new THREE.Mesh(hGeo, tubeMat());
    topStrip.position.set(0, 1.98, 0.44);
    this.group.add(topStrip);
    this.neonElements.push({ mesh: topStrip, baseIntensity: 0.9, phase: 2.5 });

    // Horizontal bottom strip (under control panel)
    const bottomStrip = new THREE.Mesh(hGeo, tubeMat());
    bottomStrip.position.set(0, 0.82, 0.44);
    this.group.add(bottomStrip);
    this.neonElements.push({ mesh: bottomStrip, baseIntensity: 0.9, phase: 3.7 });

    // Screen glow point light
    this.glow = new THREE.PointLight(this.accentColor, 1.2, 4, 1.5);
    this.glow.position.set(0, 0.2, 0);
    this.group.add(this.glow);
  }

  // ==================== Update ====================
  update(dt, playerPos) {
    this.time += dt;
    this._proximity = playerPos ? THREE.MathUtils.clamp(1 - (this.getDistance(playerPos) - 1.2) / 3.8, 0, 1) : 0;
    this.attractPhase += dt * 2;
    this._screenElapsed += dt;
    this._marqueeElapsed += dt;

    // Canvas drawing and texture uploads need far fewer ticks than the camera.
    const screenInterval = this._reduced.matches ? 0.25 : 1 / 24;
    if (this._screenElapsed + 1e-8 >= screenInterval) {
      const screenDt = this._screenElapsed;
      this._screenElapsed = Math.max(0, this._screenElapsed - Math.floor((this._screenElapsed + 1e-8) / screenInterval) * screenInterval);
      this._drawScreen(screenDt);
    }

    const breathe = this._reduced.matches ? .5 : 0.5 + 0.5 * Math.sin(this.time * 2.5);
    this.screenMat.uniforms.uGlow.value = .65 + breathe * .18 + this._proximity * .55;
    this.screenMat.uniforms.uTime.value = this._reduced.matches ? 0 : this.time;
    this.glow.intensity = 1.2 + this._proximity * 2.1;

    this.neonPhase += dt * (1.8 + Math.sin(this.time * 0.7) * 0.6);
    for (const el of this.neonElements) {
      const flicker = 0.65 + 0.35 * Math.sin(this.neonPhase + el.phase);
      const buzz = 1.0 - 0.15 * Math.max(0, Math.sin(this.time * 13.7 + el.phase * 3.1));
      el.mesh.material.emissiveIntensity = el.baseIntensity * flicker * buzz;
    }

    if (this._marqueeElapsed + 1e-8 >= 0.1) {
      this._marqueeElapsed = Math.max(0, this._marqueeElapsed - Math.floor((this._marqueeElapsed + 1e-8) / 0.1) * 0.1);
      this._drawMarqueeText(0.8 + 0.2 * Math.sin(this.time * 1.7));
      this._marqueeMesh.material.map.needsUpdate = true;
    }

    this.sparkTimer -= dt;
    if (!this._reduced.matches && this.sparkTimer <= 0 && this.sparkParticles.length < 15) {
      this.sparkTimer = this.sparkInterval * (0.5 + Math.random());
      this._spawnSpark();
    }
    this._updateSparks(dt);
  }

  _drawScreen(dt) {

    // --- Screen attract mode rendering ---
    const ctx = this.screenCtx;
    const w = this.screenCanvas.width;
    const h = this.screenCanvas.height;

    const renderer = ATTRACT_RENDERERS[this.config.id];
    if (renderer) {
      const origW = 512, origH = 384;
      const tempCanvas = this._attractCanvas;
      const tempCtx = this._attractCtx;
      renderer(tempCtx, origW, origH, this.time, this.config.attractColor || '#0ff');
      ctx.drawImage(tempCanvas, 0, 0, w, h);

      // Pixel scanlines overlay
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
      // Occasional horizontal glitch line
      if (!this._reduced.matches && Math.random() < dt * 0.35) {
        const gy = Math.floor(Math.random() * h);
        ctx.fillStyle = `rgba(${Math.floor(Math.random()*100)},${Math.floor(Math.random()*255)},${Math.floor(Math.random()*100)},0.15)`;
        ctx.fillRect(0, gy, w, 1 + Math.floor(Math.random() * 2));
      }
    } else {
      drawDefaultAttract(ctx, w, h, this.time, this.config.name, this.config.subtitle, this.config.attractColor || '#0ff');
    }

    // Pulsing "insert coin" label
    const alpha = 0.4 + 0.4 * Math.sin(this.attractPhase);
    ctx.fillStyle = `rgba(255,255,200,${alpha})`;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const label = this.config.status === 'ready' ? t('cabinet.play') : t('cabinet.locked');
    ctx.fillText(label, w / 2, h * 0.9);
    this.screenTexture.needsUpdate = true;

  }

  // ==================== CRT Spark Particles ====================

  /** Spawn a single spark near the screen bezel edge */
  _spawnSpark() {
    const hw = 0.38, hh = 0.32;
    let lx, ly;
    const edge = Math.floor(Math.random() * 4);
    const t = Math.random();
    switch (edge) {
      case 0: lx = -hw + t * hw * 2; ly = hh; break;
      case 1: lx = -hw + t * hw * 2; ly = -hh; break;
      case 2: lx = -hw; ly = -hh + t * hh * 2; break;
      default: lx = hw; ly = -hh + t * hh * 2; break;
    }

    const geo = new THREE.BoxGeometry(0.015, 0.015, 0.015);
    const mat = new THREE.MeshBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const spark = new THREE.Mesh(geo, mat);
    spark.position.set(lx + (Math.random() - 0.5) * 0.04, ly + (Math.random() - 0.5) * 0.03, 0.52);

    spark.userData = {
      life: 0.25 + Math.random() * 0.6,
      elapsed: 0,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.25 - 0.05,
      baseScale: 0.6 + Math.random() * 0.4
    };

    this.screenMesh.add(spark);
    this.sparkParticles.push(spark);
  }

  /** Update all active sparks, remove dead ones */
  _updateSparks(dt) {
    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const s = this.sparkParticles[i];
      s.userData.elapsed += dt;
      const t = s.userData.elapsed / s.userData.life;
      if (t >= 1.0) {
        s.material.dispose();
        s.geometry.dispose();
        this.screenMesh.remove(s);
        this.sparkParticles.splice(i, 1);
        continue;
      }
      s.material.opacity = 1.0 - t;
      s.position.x += s.userData.vx * dt;
      s.position.y += s.userData.vy * dt;
      const scale = s.userData.baseScale * (1.0 - t * 0.7);
      s.scale.setScalar(scale);
    }
  }

  // ==================== Helpers ====================
  getDistance(pos) {
    const gpos = this.group.position;
    const dx = pos.x - gpos.x;
    const dz = pos.z - gpos.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  addToScene(scene) {
    scene.add(this.group);
  }
}

export default ArcadeMachine;
