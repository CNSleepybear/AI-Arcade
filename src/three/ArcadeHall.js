import * as THREE from 'three';
import { GAME_REGISTRY, getGameById } from '../games/registry.js';
import { ArcadeMachine } from './ArcadeMachine.js';

export class ArcadeHall {
  constructor(scene) {
    this.scene = scene;
    this.machines = [];
    this._buildFloor();
    this._buildWalls();
    this._buildLighting();
    this._buildCeiling();
    this._placeMachines();
    this._buildPuddles();
  }

  /**
   * Spawn the hidden 4th cabinet after all memory shards are collected.
   * Places it at the back-center of the hall, surrounded by ambient particles.
   */
  spawnHiddenMachine() {
    // Find first locked game config as the hidden machine
    const hiddenGame = GAME_REGISTRY.find(g => g.status === 'locked');
    if (!hiddenGame) return null;

    // Make a copy and mark it ready for interaction
    const config = { ...hiddenGame, status: 'ready' };

    // Back-center position — between the existing cabinets, slightly pushed back
    const x = 0, z = -5.2, rot = 0;
    const machine = new ArcadeMachine(config, x, z, rot);
    machine.addToScene(this.scene);
    this.machines.push(machine);

    // Spawn a dramatic particle burst around the machine
    this._spawnUnlockParticles(x, z);

    return machine;
  }

  /**
   * Check if the hidden machine has already been unlocked (for boot-time restore).
   * @param {boolean} alreadyUnlocked - if true, spawn it immediately
   */
  restoreHiddenMachine(alreadyUnlocked) {
    if (!alreadyUnlocked) return;
    // Check it hasn't already been spawned (any machine beyond the initial 3)
    const exists = this.machines.some(m => m.config.status === 'locked' || m.config._isHidden);
    if (!exists) {
      const machine = this.spawnHiddenMachine();
      if (machine) machine.config._isHidden = true;
    }
  }

  _spawnUnlockParticles(x, z) {
    const particleCount = 40;
    const particleGroup = new THREE.Group();
    particleGroup.position.set(x, 0.3, z);

    for (let i = 0; i < particleCount; i++) {
      const geo = new THREE.SphereGeometry(0.03, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 0.9, 0.6),
        transparent: true,
        opacity: 1
      });
      const p = new THREE.Mesh(geo, mat);
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.8 + Math.random() * 1.5;
      p.position.set(Math.cos(angle) * radius, Math.random() * 2.5, Math.sin(angle) * radius);
      p.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          1.5 + Math.random() * 2.5,
          (Math.random() - 0.5) * 1.5
        ),
        life: 1.0 + Math.random() * 1.5,
        elapsed: 0
      };
      particleGroup.add(p);
    }

    this.scene.add(particleGroup);

    // Animate and auto-remove after ~2.5s
    const startTime = performance.now() / 1000;
    const animateParticles = () => {
      const now = performance.now() / 1000;
      const dt = Math.min(now - startTime, 0.1);

      let allDead = true;
      for (const child of particleGroup.children) {
        child.userData.elapsed += dt;
        const t = child.userData.elapsed / child.userData.life;
        if (t >= 1) {
          child.visible = false;
          continue;
        }
        allDead = false;
        child.position.add(child.userData.velocity.clone().multiplyScalar(dt));
        child.material.opacity = 1 - t;
        child.scale.setScalar(1 - t * 0.7);
      }

      if (allDead) {
        this.scene.remove(particleGroup);
        return;
      }
      if (child.userData.elapsed < 3.0) { // safety cutoff
        requestAnimationFrame(animateParticles);
      } else {
        this.scene.remove(particleGroup);
      }
    };
    requestAnimationFrame(animateParticles);
  }

  _buildFloor() {
    // Synthwave grid floor — dark with emissive grid lines
    const floorGeo = new THREE.PlaneGeometry(24, 20);

    // Create a checker-grid texture via canvas
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = 512;
    gridCanvas.height = 512;
    const gctx = gridCanvas.getContext('2d');
    gctx.fillStyle = '#0a0018';
    gctx.fillRect(0, 0, 512, 512);

    // Perspective grid lines — synthwave style
    gctx.strokeStyle = '#1a0044';
    gctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < 512; x += gridSize) {
      gctx.beginPath(); gctx.moveTo(x, 0); gctx.lineTo(x, 512); gctx.stroke();
    }
    for (let y = 0; y < 512; y += gridSize) {
      gctx.beginPath(); gctx.moveTo(0, y); gctx.lineTo(512, y); gctx.stroke();
    }

    // Brighter accent lines
    gctx.strokeStyle = '#330066'; gctx.lineWidth = 2;
    gctx.strokeRect(0, 0, 512, 512);
    gctx.beginPath(); gctx.moveTo(256, 0); gctx.lineTo(256, 512); gctx.stroke();
    gctx.beginPath(); gctx.moveTo(0, 256); gctx.lineTo(512, 256); gctx.stroke();

    const floorTex = new THREE.CanvasTexture(gridCanvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(1.5, 1.5);
    floorTex.colorSpace = THREE.SRGBColorSpace;

    // ===== REFLECTIVE FLOOR — key for bloom puddle effect =====
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.12,
      metalness: 0.9,
      color: 0x8888cc
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Central carpet area — slightly less reflective
    const carpetGeo = new THREE.PlaneGeometry(8, 5);
    const carpetCanvas = document.createElement('canvas');
    carpetCanvas.width = 256;
    carpetCanvas.height = 160;
    const cctx = carpetCanvas.getContext('2d');
    const cGrad = cctx.createRadialGradient(128, 80, 30, 128, 80, 140);
    cGrad.addColorStop(0, '#0d0d2a');
    cGrad.addColorStop(0.6, '#080818');
    cGrad.addColorStop(1, '#050510');
    cctx.fillStyle = cGrad;
    cctx.fillRect(0, 0, 256, 160);
    const carpetTex = new THREE.CanvasTexture(carpetCanvas);
    carpetTex.colorSpace = THREE.SRGBColorSpace;
    const carpetMat = new THREE.MeshStandardMaterial({
      map: carpetTex,
      roughness: 0.3,
      metalness: 0.7
    });
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.007, 0);
    carpet.receiveShadow = true;
    this.scene.add(carpet);
  }

  _buildWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x080818,
      roughness: 0.55,
      metalness: 0.15
    });

    // Back wall
    const back = new THREE.Mesh(new THREE.PlaneGeometry(24, 5), wallMat);
    back.position.set(0, 2.5, -10); back.receiveShadow = true; this.scene.add(back);
    // Left
    const left = new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMat);
    left.rotation.y = Math.PI / 2; left.position.set(-12, 2.5, 0); left.receiveShadow = true; this.scene.add(left);
    // Right
    const right = new THREE.Mesh(new THREE.PlaneGeometry(20, 5), wallMat);
    right.rotation.y = -Math.PI / 2; right.position.set(12, 2.5, 0); right.receiveShadow = true; this.scene.add(right);

    // Synthwave neon strips
    this._addNeon(-11.9, 0.05, 3.2, 20, 0xff00cc, Math.PI / 2, 1.3);
    this._addNeon(11.9, 0.05, 3.2, 20, 0x00ccff, Math.PI / 2, 1.3);
    this._addNeon(0, 0.05, -9.9, 24, 0xff00cc, 0, 1.3);
    this._addNeon(-11.9, 4.6, 3.2, 20, 0xff44ff, Math.PI / 2, 0.7);
    this._addNeon(11.9, 4.6, 3.2, 20, 0x44ffff, Math.PI / 2, 0.7);
  }

  _addNeon(x, y, z, length, color, rotY, intensity) {
    const geo = new THREE.BoxGeometry(length, 0.02, 0.04);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: intensity, roughness: 0.15
    });
    const strip = new THREE.Mesh(geo, mat);
    strip.position.set(x, y, z);
    strip.rotation.y = rotY;
    this.scene.add(strip);
  }

  _buildLighting() {
    const ambient = new THREE.AmbientLight(0x1a0a2e, 0.35);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x3322aa, 0x050510, 0.3);
    this.scene.add(hemi);

    // Main ceiling spot — softer shadows to avoid crushing bloom
    const spot = new THREE.SpotLight(0xffccdd, 40, 22, Math.PI / 5, 0.3, 0.6);
    spot.position.set(0, 4.8, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.width = 1024;
    spot.shadow.mapSize.height = 1024;
    spot.shadow.bias = -0.0004;
    this.scene.add(spot);

    // Colored point lights — higher intensity for bloom
    const lights = [
      { pos: [-4, 2.2, -5], color: 0xff44ff, int: 12, dist: 8 },
      { pos: [4, 2.2, -5], color: 0x44ffff, int: 12, dist: 8 },
      { pos: [0, 1.5, 5], color: 0x44ff44, int: 6, dist: 6 },
      { pos: [-8, 1.5, 5], color: 0x9944ff, int: 4, dist: 5 },
      { pos: [8, 1.5, 5], color: 0x4499ff, int: 4, dist: 5 },
      { pos: [-5, 0.6, -7], color: 0xff0066, int: 8, dist: 4 },
      { pos: [5, 0.6, -7], color: 0x0066ff, int: 8, dist: 4 },
    ];
    for (const l of lights) {
      const pt = new THREE.PointLight(l.color, l.int, l.dist, 1.5);
      pt.position.set(...l.pos);
      this.scene.add(pt);
    }
  }

  _buildCeiling() {
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 20),
      new THREE.MeshStandardMaterial({ color: 0x050510, roughness: 0.7, metalness: 0.2 })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 5;
    this.scene.add(ceil);

    // Hanging bulbs
    for (let x = -6; x <= 6; x += 4) {
      for (let z = -6; z <= 6; z += 6) {
        const color = (x + z) % 2 === 0 ? 0xffccaa : 0xccaaff;
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 8, 8),
          new THREE.MeshBasicMaterial({ color })
        );
        bulb.position.set(x + (Math.random() - 0.5) * 0.4, 4.85, z + (Math.random() - 0.5) * 0.4);
        this.scene.add(bulb);

        const wire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 0.6, 4),
          new THREE.MeshBasicMaterial({ color: 0x222222 })
        );
        wire.position.copy(bulb.position);
        wire.position.y += 0.3;
        this.scene.add(wire);
      }
    }
  }

  _placeMachines() {
    const readyGames = GAME_REGISTRY;
    const positions = [
      { x: -5, z: -6.5, rot: 0.15 },
      { x: 0, z: -7, rot: 0 },
      { x: 5, z: -6.5, rot: -0.15 }
    ];

    for (let i = 0; i < Math.min(readyGames.length, positions.length); i++) {
      const cfg = { ...readyGames[i] };
      const pos = positions[i];
      const machine = new ArcadeMachine(cfg, pos.x, pos.z, pos.rot);
      machine.addToScene(this.scene);
      this.machines.push(machine);
    }

    // Decorative dormant cabinets
    const dummyGeo = new THREE.BoxGeometry(1.2, 2.2, 1.4);
    const dummyMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a, roughness: 0.5, metalness: 0.6
    });
    for (const dp of [{ x: -8.5, z: -3.5 }, { x: 8.5, z: -3.5 }]) {
      const dummy = new THREE.Mesh(dummyGeo, dummyMat);
      dummy.position.set(dp.x, 1.1, dp.z);
      dummy.castShadow = true;
      dummy.receiveShadow = true;
      this.scene.add(dummy);
    }

    this._addBench(-2.5, 0, 0);
    this._addBench(2.5, 0, 0);
  }

  _addBench(x, y, z) {
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.15, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x1a1030, roughness: 0.3, metalness: 0.5 })
    );
    seat.position.set(x, 0.4, z);
    seat.castShadow = true; seat.receiveShadow = true;
    this.scene.add(seat);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x333355, metalness: 0.8, roughness: 0.3 });
    for (const ox of [-0.7, 0.7]) {
      for (const oz of [-0.2, 0.2]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), legMat);
        leg.position.set(x + ox, 0.2, z + oz);
        leg.castShadow = true;
        this.scene.add(leg);
      }
    }
  }

  // ==================== Puddles (积水反射) ====================
  _buildPuddles() {
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a20,
      roughness: 0.05,
      metalness: 1.0,
      opacity: 0.75,
      transparent: true,
      depthWrite: false
    });

    // Puddle positions — scattered across the floor
    const puddleDefs = [
      { x: -3, z: 3, w: 1.8, h: 0.9 },
      { x: 4, z: 4, w: 1.4, h: 0.7 },
      { x: -6, z: -2, w: 2.0, h: 1.0 },
      { x: 6, z: -1, w: 1.6, h: 0.8 },
      { x: -1, z: -5, w: 2.2, h: 1.1 },
      { x: 8, z: 6, w: 1.2, h: 0.6 },
      { x: -8, z: 7, w: 1.5, h: 0.75 },
      { x: 2, z: 7, w: 1.0, h: 0.5 },
      { x: -4, z: -8, w: 1.8, h: 0.9 },
      { x: 5, z: -5, w: 1.3, h: 0.65 },
    ];

    for (const pd of puddleDefs) {
      const geo = new THREE.PlaneGeometry(pd.w, pd.h);
      // Slightly irregular — rotate randomly
      const puddle = new THREE.Mesh(geo, puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.rotation.z = (Math.random() - 0.5) * 0.3;
      puddle.position.set(pd.x, 0.012, pd.z);
      puddle.renderOrder = 1;
      puddle.receiveShadow = true;
      this.scene.add(puddle);
    }
  }
}
