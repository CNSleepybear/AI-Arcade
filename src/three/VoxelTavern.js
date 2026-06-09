import * as THREE from 'three';
import { PixelTextureGenerator } from './PixelTextureGenerator.js';

/**
 * VoxelTavern — Gemini-style "Iron Anchor Tavern" (铁锚酒馆).
 * Spans X: [-15, -6], Z: [-5, 5].
 *
 * V3 Upgrade: Warm wood floors, plaster walls, pixel wood bar counter,
 * warm lantern lighting, glowing drink cups.
 */
export class VoxelTavern {
  constructor(scene, audioManager, globalState) {
    this.scene = scene;
    this.audioManager = audioManager;
    this.globalState = globalState;
    this.group = new THREE.Group();
    this.group.name = 'VoxelTavern';
    this._musicOrigin = new THREE.Vector3(-11, 3.5, -3);

    this._buildFloor();
    this._buildWalls();
    this._buildBarCounter();
    this._buildStage();
    this._buildSkeletonBand();
    this._buildAmbientLighting();
    this._buildRooftopLadder();
    this._buildFireplaceEmbers();

    scene.add(this.group);
  }

  _buildFloor() {
    const tex = PixelTextureGenerator.tavernFloor();
    tex.repeat.set(9, 10);
    const geo = new THREE.PlaneGeometry(9, 10);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
      metalness: 0.05,
      color: 0xaa8855
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-10.5, 0, 0);
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  _buildWalls() {
    const wallTex = PixelTextureGenerator.plasterWall();
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.9,
      metalness: 0.02,
      color: 0xddd5c0
    });

    const buildWall = (x, y, z, w, h, d, rotY = 0) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.set(x, y + h / 2, z);
      wall.rotation.y = rotY;
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);
      return wall;
    };

    buildWall(-10.5, 0, -5, 9, 4, 0.3);
    buildWall(-10.5, 0, 5, 9, 4, 0.3);
    buildWall(-15, 0, 0, 0.3, 4, 10);

    // East wall at X = -6 with 3m opening
    buildWall(-6, 2.5, 0, 0.3, 1.5, 3, 0);
    buildWall(-6, 0, 3.25, 0.3, 4, 3.5, 0);
    buildWall(-6, 0, -3.25, 0.3, 4, 3.5, 0);
    buildWall(-6, 3.85, 0, 0.3, 0.3, 3, 0);

    const ceilGeo = new THREE.PlaneGeometry(9, 10);
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0xd4c8ad,
      roughness: 0.95,
      metalness: 0.02
    });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(-10.5, 4, 0);
    this.group.add(ceil);
  }

  _buildBarCounter() {
    // ===== Minecraft-style Bar Base =====
    const plankTex = PixelTextureGenerator.geminiStriped(0x4a3018, 0x3a2010, 6, 4);
    const baseMat = new THREE.MeshStandardMaterial({
      map: plankTex, roughness: 0.8, metalness: 0.05
    });

    // Front face — vertical planks
    const frontGeo = new THREE.BoxGeometry(5.5, 1.2, 0.15);
    const front = new THREE.Mesh(frontGeo, baseMat);
    front.position.set(-10.25, 0.6, 3.3);
    front.castShadow = true; front.receiveShadow = true;
    this.group.add(front);

    // Back face
    const back = new THREE.Mesh(frontGeo, baseMat);
    back.position.set(-10.25, 0.6, 3.72);
    back.castShadow = true;
    this.group.add(back);

    // Side faces
    const sideGeo = new THREE.BoxGeometry(0.15, 1.2, 0.5);
    for (const sx of [-13, -7.5]) {
      const side = new THREE.Mesh(sideGeo, baseMat);
      side.position.set(sx, 0.6, 3.5);
      side.castShadow = true;
      this.group.add(side);
    }

    // Bottom kickboard (darker)
    const kickMat = new THREE.MeshStandardMaterial({
      map: PixelTextureGenerator.geminiPixel(0x1a0c04, 8, 4),
      roughness: 0.9, metalness: 0.02
    });
    const kickGeo = new THREE.BoxGeometry(5.5, 0.15, 0.55);
    const kick = new THREE.Mesh(kickGeo, kickMat);
    kick.position.set(-10.25, 0.08, 3.5);
    this.group.add(kick);

    // Foot rail (brass bar)
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xcc9944, roughness: 0.2, metalness: 0.9
    });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.04, 0.06), railMat);
    rail.position.set(-10.25, 0.3, 3.08);
    this.group.add(rail);

    // ===== Countertop =====
    const topTex = PixelTextureGenerator.geminiPixel(0x3e2723, 6, 4);
    const topGeo = new THREE.BoxGeometry(5.8, 0.1, 0.8);
    const topMat = new THREE.MeshStandardMaterial({
      map: topTex, roughness: 0.25, metalness: 0.35
    });
    const barTop = new THREE.Mesh(topGeo, topMat);
    barTop.position.set(-10.25, 1.25, 3.5);
    barTop.castShadow = true; barTop.receiveShadow = true;
    this.group.add(barTop);

    // Counter edge trim
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x886644, roughness: 0.3, metalness: 0.5
    });
    const trimFront = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.03, 0.04), trimMat);
    trimFront.position.set(-10.25, 1.18, 3.1);
    this.group.add(trimFront);

    // ===== Minecraft Block Stools =====
    const stoolTex = PixelTextureGenerator.geminiPixel(0xa08060, 8, 4);
    const stoolMat = new THREE.MeshStandardMaterial({
      map: stoolTex, roughness: 0.6, metalness: 0.08
    });

    for (let sx = -12; sx <= -8; sx += 1.3) {
      // Square seat
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.34), stoolMat);
      seat.position.set(sx, 0.76, 2.75);
      seat.castShadow = true;
      this.group.add(seat);

      // 4 square legs
      const legGeo = new THREE.BoxGeometry(0.06, 0.7, 0.06);
      for (const [lx, lz] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]]) {
        const leg = new THREE.Mesh(legGeo, stoolMat);
        leg.position.set(sx + lx, 0.36, 2.75 + lz);
        leg.castShadow = true;
        this.group.add(leg);
      }
    }

    this._buildGlowingCups();
    this._buildBarDecor();
  }

  _buildGlowingCups() {
    this._cupData = [
      { x: -12, z: 3.88, type: 'VoidBeer', color: 0x00ffcc },
      { x: -10.25, z: 3.88, type: 'RedstoneLiquor', color: 0xff2200 },
      { x: -8.5, z: 3.88, type: 'NetherBlend', color: 0xcc44ff },
    ];

    for (const def of this._cupData) {
      // Minecraft-style block mug
      const mugGeo = new THREE.BoxGeometry(0.1, 0.16, 0.1);
      const mugMat = new THREE.MeshStandardMaterial({
        color: def.color, emissive: def.color,
        emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.3,
        transparent: true, opacity: 0.85
      });
      const mug = new THREE.Mesh(mugGeo, mugMat);
      mug.position.set(def.x, 1.39, def.z);
      mug.userData = { drinkType: def.type, isDrink: true };
      this.group.add(mug);

      // Foam top — white block
      const foam = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.03, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xfffef0, roughness: 0.6 })
      );
      foam.position.set(def.x, 1.49, def.z);
      this.group.add(foam);

      // Floating glow orb above
      const orb = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 0.05),
        new THREE.MeshBasicMaterial({ color: def.color })
      );
      orb.position.set(def.x, 1.55, def.z);
      orb.userData = { drinkType: def.type, isDrinkOrb: true };
      this.group.add(orb);

      // Point light
      const light = new THREE.PointLight(def.color, 3, 2, 2);
      light.position.set(def.x, 1.5, def.z);
      this.group.add(light);
    }
  }

  _buildBarDecor() {
    // ===== Neon Tavern Sign above bar =====
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256; signCanvas.height = 64;
    const sctx = signCanvas.getContext('2d');
    sctx.fillStyle = '#0a0604'; sctx.fillRect(0, 0, 256, 64);
    sctx.strokeStyle = '#ff8844'; sctx.lineWidth = 2;
    sctx.strokeRect(8, 8, 240, 48);
    sctx.fillStyle = '#ff8833'; sctx.font = 'bold 32px monospace';
    sctx.textAlign = 'center';
    sctx.fillText('⚓ 铁锚酒馆', 128, 44);

    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.magFilter = THREE.NearestFilter;
    signTex.minFilter = THREE.NearestFilter;

    const signGeo = new THREE.PlaneGeometry(2.5, 0.65);
    const signMat = new THREE.MeshBasicMaterial({
      map: signTex, transparent: true
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(-10.25, 3.6, 3.3);
    this.group.add(sign);

    // Sign glow strip
    const glowStrip = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.04, 0.04),
      new THREE.MeshBasicMaterial({ color: 0xff8844 })
    );
    glowStrip.position.set(-10.25, 3.25, 3.28);
    this.group.add(glowStrip);

    // ===== Bottle Shelf =====
    const shelfTex = PixelTextureGenerator.geminiStriped(0x4a3018, 0x3a2010, 4, 4);
    const shelfMat = new THREE.MeshStandardMaterial({
      map: shelfTex, roughness: 0.7, metalness: 0.05
    });

    const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.06, 0.3), shelfMat);
    shelf.position.set(-10.25, 2.5, 3.7);
    shelf.castShadow = true;
    this.group.add(shelf);

    // Bottles on shelf
    for (let bi = 0; bi < 7; bi++) {
      const hue = 0.05 + bi * 0.1;
      const bColor = new THREE.Color().setHSL(hue, 0.7, 0.35);
      const bottleMat = new THREE.MeshStandardMaterial({
        color: bColor, roughness: 0.25, metalness: 0.4,
        transparent: true, opacity: 0.85
      });
      const bottle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), bottleMat);
      bottle.position.set(-12 + bi * 0.58, 2.65, 3.7);
      bottle.castShadow = true;
      this.group.add(bottle);

      // Bottle neck
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), bottleMat);
      neck.position.set(-12 + bi * 0.58, 2.8, 3.7);
      this.group.add(neck);
    }
  }

  _buildStage() {
    const stageMat = new THREE.MeshStandardMaterial({
      map: PixelTextureGenerator.warmStone(),
      roughness: 0.6,
      metalness: 0.1
    });

    const stageGeo = new THREE.BoxGeometry(5, 0.4, 3);
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.set(-11, 0.2, -3);
    stage.castShadow = true;
    stage.receiveShadow = true;
    this.group.add(stage);

    const stepGeo = new THREE.BoxGeometry(2, 0.2, 1);
    const step = new THREE.Mesh(stepGeo, stageMat);
    step.position.set(-11, 0.1, -1.3);
    step.castShadow = true;
    step.receiveShadow = true;
    this.group.add(step);

    // Pillars
    const pillarMat = new THREE.MeshStandardMaterial({
      map: PixelTextureGenerator.obsidian(),
      roughness: 0.4,
      metalness: 0.6
    });
    const pillarPositions = [[-13.4, -4.4], [-8.6, -4.4], [-13.4, -1.6], [-8.6, -1.6]];
    for (const [px, pz] of pillarPositions) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.5, 0.2), pillarMat);
      pillar.position.set(px, 1.95, pz);
      pillar.castShadow = true;
      this.group.add(pillar);
    }

    // Stage lighting — warm red + blue
    const stageLight1 = new THREE.PointLight(0xff4422, 15, 6, 2);
    stageLight1.position.set(-11, 3.5, -3);
    this.group.add(stageLight1);

    const stageLight2 = new THREE.PointLight(0x3355cc, 12, 6, 2);
    stageLight2.position.set(-13, 3.5, -2);
    this.group.add(stageLight2);
  }

  _buildSkeletonBand() {
    const skelGroup = new THREE.Group();
    skelGroup.name = 'SkeletonBand';
    skelGroup.position.set(-11, 0.4, -3);

    // Minecraft-style bone texture — white with subtle pixel noise
    const boneTex = PixelTextureGenerator.geminiPixel(0xe8e4d8, 8, 2);
    const boneMat = new THREE.MeshStandardMaterial({
      map: boneTex,
      roughness: 0.5,
      metalness: 0.02
    });

    // ===== Minecraft Proportions: big head, thin limbs =====

    // Legs — thin rectangles
    for (const lx of [-0.1, 0.1]) {
      const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), boneMat);
      upperLeg.position.set(lx, 0.45, 0);
      skelGroup.add(upperLeg);
      const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), boneMat);
      lowerLeg.position.set(lx, 0.02, 0);
      skelGroup.add(lowerLeg);
    }

    // Pelvis
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.16), boneMat);
    pelvis.position.y = 0.68;
    skelGroup.add(pelvis);

    // Torso/ribcage — Minecraft style rectangular body
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.16), boneMat);
    torso.position.y = 1.05;
    skelGroup.add(torso);

    // Shoulder nubs
    for (const sx of [-0.18, 0.18]) {
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), boneMat);
      shoulder.position.set(sx, 1.32, 0);
      skelGroup.add(shoulder);
    }

    // Arms — thin hanging rectangles (Minecraft style)
    const armGeo = new THREE.BoxGeometry(0.1, 0.52, 0.1);
    const leftArm = new THREE.Mesh(armGeo, boneMat);
    leftArm.position.set(-0.22, 1.0, 0);
    leftArm.rotation.z = 0.15;
    skelGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, boneMat);
    rightArm.position.set(0.22, 0.95, 0);
    rightArm.rotation.z = -0.15;
    skelGroup.add(rightArm);

    // ===== Big Minecraft Head =====
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), boneMat);
    head.position.y = 1.52;
    skelGroup.add(head);

    // Black empty eye sockets — Minecraft signature look
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.04);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 1.56, 0.16);
    skelGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 1.56, 0.16);
    skelGroup.add(rightEye);

    // Nose/mouth shadow
    const mouthGeo = new THREE.BoxGeometry(0.1, 0.04, 0.04);
    const mouth = new THREE.Mesh(mouthGeo, eyeMat);
    mouth.position.set(0, 1.43, 0.16);
    skelGroup.add(mouth);

    // ===== Straw Hat (草帽) =====
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 1.68, 0);

    const strawTex = PixelTextureGenerator.geminiPixel(0xd4b85c, 10, 2);
    const strawMat = new THREE.MeshStandardMaterial({
      map: strawTex,
      roughness: 0.7,
      metalness: 0.02
    });

    // Wide brim
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.48), strawMat);
    brim.position.y = 0;
    hatGroup.add(brim);

    // Crown base
    const crownBase = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.26), strawMat);
    crownBase.position.y = 0.09;
    hatGroup.add(crownBase);

    // Crown top (slightly narrower)
    const crownTop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.2), strawMat);
    crownTop.position.y = 0.2;
    hatGroup.add(crownTop);

    // Hat band (dark red ribbon)
    const bandMat = new THREE.MeshBasicMaterial({ color: 0x993333 });
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.28), bandMat);
    band.position.y = 0.08;
    hatGroup.add(band);

    skelGroup.add(hatGroup);
    this.hatGroup = hatGroup;

    // ===== Minecraft Guitar =====
    const guitarGroup = new THREE.Group();
    guitarGroup.position.set(0.28, 0.95, 0.12);
    guitarGroup.rotation.z = -0.5;
    guitarGroup.rotation.x = 0.2;

    // Guitar body — warm red-brown
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xcc5533,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x441100,
      emissiveIntensity: 0.3
    });
    const guitarBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.06), bodyMat);
    guitarGroup.add(guitarBody);

    // Sound hole
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const soundHole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), holeMat);
    soundHole.position.set(0, 0.08, 0.04);
    guitarGroup.add(soundHole);

    // Neck
    const neckMat = new THREE.MeshStandardMaterial({
      map: PixelTextureGenerator.darkWood(),
      roughness: 0.5,
      metalness: 0.2
    });
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.04), neckMat);
    neck.position.y = 0.42;
    guitarGroup.add(neck);

    // Headstock
    const headstock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.04), neckMat);
    headstock.position.y = 0.65;
    guitarGroup.add(headstock);

    // Strings
    const gStringMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
    for (let si = 0; si < 3; si++) {
      const gString = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.6, 0.01), gStringMat);
      gString.position.set(-0.04 + si * 0.04, 0.35, 0.04);
      guitarGroup.add(gString);
    }

    skelGroup.add(guitarGroup);
    this.guitarGroup = guitarGroup;

    // ===== State Machine =====
    this.animState = 'idle';
    this.animTimer = 0;
    this.animSwitchCd = 3 + Math.random() * 4; // 3-7s per state

    this.skeletonGroup = skelGroup;
    this.group.add(skelGroup);
  }

  _buildAmbientLighting() {
    const lanternColor = 0xff8833;
    for (let x = -14; x <= -7; x += 3) {
      const lanternGeo = new THREE.BoxGeometry(0.15, 0.25, 0.15);
      const lanternMat = new THREE.MeshStandardMaterial({
        color: lanternColor,
        emissive: lanternColor,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.4
      });
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(x, 3.3, 4.7);
      this.group.add(lantern);

      const light = new THREE.PointLight(lanternColor, 8, 5, 2);
      light.position.set(x, 3.0, 4.3);
      this.group.add(light);
    }

    const barGlow = new THREE.PointLight(0xffaa66, 12, 6, 2);
    barGlow.position.set(-10.5, 0.8, 3.2);
    this.group.add(barGlow);
  }

  // ==================== Rooftop Access Ladder (Tavern north wall) ====================
  _buildRooftopLadder() {
    // --- Glowing floor pad near bar area, north wall ---
    const padGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const padMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(-10, 0.015, -4.5);
    pad.name = 'rooftopPad';
    this.group.add(pad);

    // Border ring
    const ringGeo = new THREE.TorusGeometry(0.55, 0.04, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x66aaff });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-10, 0.02, -4.5);
    ring.name = 'rooftopRing';
    this.group.add(ring);

    // --- Vertical light beam ---
    const beamGeo = new THREE.CylinderGeometry(0.25, 0.4, 4, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.12,
      depthWrite: false
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(-10, 2, -4.5);
    beam.name = 'rooftopBeam';
    this.group.add(beam);

    // --- "ROOFTOP" sign ---
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 256; textCanvas.height = 64;
    const tctx = textCanvas.getContext('2d');
    tctx.fillStyle = '#ffffff';
    tctx.font = 'bold 24px monospace';
    tctx.textAlign = 'center';
    tctx.fillText('🌌 楼顶观星台', 128, 28);
    tctx.fillStyle = '#aaccff';
    tctx.font = '14px monospace';
    tctx.fillText('按 [E] 登上楼顶', 128, 50);

    const textTex = new THREE.CanvasTexture(textCanvas);
    textTex.magFilter = THREE.NearestFilter;
    textTex.minFilter = THREE.NearestFilter;
    textTex.colorSpace = THREE.SRGBColorSpace;

    const textGeo = new THREE.PlaneGeometry(1.8, 0.45);
    const textMesh = new THREE.Mesh(textGeo, new THREE.MeshBasicMaterial({
      map: textTex, transparent: true, depthWrite: false
    }));
    textMesh.position.set(-10, 1.8, -4.68);
    textMesh.name = 'rooftopSign';
    this.group.add(textMesh);

    // --- Ladder on wall ---
    const ladderMat = new THREE.MeshStandardMaterial({
      color: 0x889999,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x112233,
      emissiveIntensity: 0.3
    });
    for (const sx of [-10.25, -9.75]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 4, 0.06),
        ladderMat
      );
      rail.position.set(sx, 2, -4.7);
      this.group.add(rail);
    }
    for (let y = 0.3; y < 3.9; y += 0.35) {
      const rung = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.03, 0.04),
        ladderMat
      );
      rung.position.set(-10, y, -4.7);
      this.group.add(rung);
    }
  }

  // ==================== Audio ====================
  _buildFireplaceEmbers() {
    const count=30;this._emberData=[];
    const emberGroup=new THREE.Group();emberGroup.name="fireplaceEmbers";emberGroup.position.set(-11,0.4,-3);
    for(let i=0;i<count;i++){
      const ember=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.03,0.03),new THREE.MeshBasicMaterial({color:0xff6622,transparent:true,opacity:0.7,depthWrite:false}));
      ember.position.set((Math.random()-0.5)*2,Math.random()*2,(Math.random()-0.5)*1.5);
      ember.userData={life:1.5+Math.random()*3,speed:0.3+Math.random()*0.8,driftX:(Math.random()-0.5)*0.3,driftZ:(Math.random()-0.5)*0.2};
      emberGroup.add(ember);this._emberData.push(ember);
    }
    this.group.add(emberGroup);this._emberGroup=emberGroup;
  }

  // ==================== Audio ====================
  startMusic() { if (this.audioManager) this.audioManager.playPlaylist('tavern_playlist', this._musicOrigin); }
  stopMusic() { if (this.audioManager) this.audioManager.stopPlaylist('tavern_playlist'); }
  nextTrack() { if (this.audioManager) this.audioManager.nextTrack('tavern_playlist'); }
  prevTrack() { if (this.audioManager) this.audioManager.prevTrack('tavern_playlist'); }
  getTrackInfo() { return this.audioManager ? this.audioManager.getTrackInfo('tavern_playlist') : null; }

  update(dt, playerPos) {
    if (!this.skeletonGroup) return;

    const t = Date.now() * 0.001;

    // ===== State Machine =====
    this.animTimer += dt;
    if (this.animTimer > this.animSwitchCd) {
      this.animTimer = 0;
      this.animState = this.animState === 'idle' ? 'playing' : 'idle';
      this.animSwitchCd = 3 + Math.random() * 5; // 3-8s per state
    }

    // Base subtle breathing bob
    this.skeletonGroup.position.y = 0.4 + Math.sin(t * 2.5) * 0.025;

    if (this.animState === 'playing') {
      // ===== PLAYING: energetic strumming =====
      // Body sway
      this.skeletonGroup.rotation.z = Math.sin(t * 3.5) * 0.06;

      // Head nod to the beat
      if (this.hatGroup) {
        this.hatGroup.rotation.x = Math.sin(t * 7) * 0.08;
        this.hatGroup.position.y = 1.68 + Math.abs(Math.sin(t * 7)) * 0.03;
      }

      // Guitar strumming — fast rotation
      if (this.guitarGroup) {
        this.guitarGroup.rotation.z = -0.5 + Math.sin(t * 14) * 0.25;
        this.guitarGroup.rotation.x = 0.2 + Math.sin(t * 10) * 0.1;
        // Strum displacement
        this.guitarGroup.position.y = 0.95 + Math.sin(t * 14) * 0.04;
      }
    } else {
      // ===== IDLE: subtle ambient movement =====
      // Slow gentle sway
      this.skeletonGroup.rotation.z = Math.sin(t * 0.8) * 0.02;

      // Occasional head tilt
      if (this.hatGroup) {
        this.hatGroup.rotation.x = Math.sin(t * 1.2) * 0.03;
        this.hatGroup.position.y = 1.68;
      }

      // Guitar resting — subtle drift
      if (this.guitarGroup) {
        this.guitarGroup.rotation.z = -0.5 + Math.sin(t * 2) * 0.04;
        this.guitarGroup.rotation.x = 0.2;
        this.guitarGroup.position.y = 0.95 + Math.sin(t * 1.5) * 0.01;
      }
    }

    // ===== Floating cup orbs =====
    this.group.children.forEach(child => {
      if (child.userData?.isDrinkOrb) {
        const baseY = 1.55;
        child.position.y = baseY + Math.sin(t * 3 + child.position.x) * 0.04;
        child.rotation.y += dt * 1.5;
      }
    });
  }
}

export default VoxelTavern;
