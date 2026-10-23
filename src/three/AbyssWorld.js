import * as THREE from 'three';
import { t } from '../data/i18n.js';
import { WorldSanctuary } from './WorldSanctuary.js';
import { VoxelTavern } from './VoxelTavern.js';
import { VoxelPlaza } from './VoxelPlaza.js';
import { VoxelArcade } from './VoxelArcade.js';
import { VoxelDepths } from './VoxelDepths.js';
import { VoxelRooftop } from './VoxelRooftop.js';
import { PixelTextureGenerator } from './PixelTextureGenerator.js';
import { NightshiftArt } from './NightshiftArt.js';

/**
 * AbyssWorld — Master world assembler for the Gemini-style pixel arcade.
 *
 * Four interconnected zones:
 *   - 禁区广场 (Restricted Plaza)   X: [-5,  5],  Z: [-5, 5]     Y: 0
 *   - 铁锚酒馆 (Iron Anchor Tavern)  X: [-15, -6], Z: [-5, 5]     Y: 0
 *   - 蜂巢游戏厅 (Hive Arcade)       X: [6,  15], Z: [-5, 5]     Y: 0
 *   - 记忆深渊 (Memory Depths)       X: [-8,  8], Z: [-8, 8]     Y: -5
 *
 * V3 Upgrade: Warm ambient lighting, wood floor underlay,
 * plaster-style walls, warm fog, lantern post lighting.
 */
export class AbyssWorld {
  constructor(scene, renderer, audioManager, globalState, exploration) {
    this.scene = scene;
    this.renderer = renderer;
    this.audioManager = audioManager;
    this.globalState = globalState;

    // Build sub-zones
    this.tavern = new VoxelTavern(scene, audioManager, globalState);
    this.plaza = new VoxelPlaza(scene, globalState);
    this.arcade = new VoxelArcade(scene, globalState);
    this.depths = new VoxelDepths(scene, globalState, exploration);
    this.rooftop = new VoxelRooftop(scene, globalState);
    this.sanctuary = new WorldSanctuary(scene, globalState);
    // Aggregate machines from arcade for game interaction
    this.machines = this.arcade.machines || [];

    // Build shared infrastructure
    this._buildSharedFloor();
    this._buildOuterWalls();
    this._buildGlobalLighting();
    this._buildVoxelDecorations();
    this._buildConnectingPassages();
    this._buildSanctuaryGateway();
    this.artDirection = new NightshiftArt(this);

    // Ambient sound loops
    this._startAmbientLoops();

    // Seed chat messages
    this._seedChatMessages();
  }

  // ==================== Shared Floor Underlay ====================
  _buildSharedFloor() {
    const tex = PixelTextureGenerator.woodFloor();
    tex.repeat.set(30, 10);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    const geo = new THREE.PlaneGeometry(30, 10);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.9,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.01, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  // ==================== Outer Boundary Walls ====================
  _buildOuterWalls() {
    const wallTex = PixelTextureGenerator.geminiPixel(0x35445b, 5, 3);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex, roughness: 0.95, metalness: 0.02
    });

    const buildWall = (x, y, z, w, h, d) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.set(x, y + h / 2, z);
      wall.castShadow = true; wall.receiveShadow = true;
      this.scene.add(wall);
    };

    // Plaza south wall (Z = 5, between X[-5, 5])
    buildWall(0, 0, 5, 10, 4, 0.3);
  }

  // ==================== Connecting Passages (enclosed corridors) ====================
  _buildConnectingPassages() {
    const passageTex = PixelTextureGenerator.woodFloor();
    const passageMat = new THREE.MeshStandardMaterial({
      map: passageTex, roughness: 0.85, metalness: 0.05
    });
    const wallTex = PixelTextureGenerator.geminiPixel(0x35445b, 5, 3);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex, roughness: 0.9, metalness: 0.02, color: 0xd0dcea
    });

    const buildPassage = (cx) => {
      // Floor
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 3), passageMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(cx, 0.005, 0);
      floor.receiveShadow = true;
      this.scene.add(floor);

      // Side walls (Z = ±1.5, spanning the 1m gap)
      for (const sz of [-1.5, 1.5]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 0.3), wallMat);
        side.position.set(cx, 2, sz);
        side.castShadow = true; side.receiveShadow = true;
        this.scene.add(side);
      }

      // Ceiling
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(1, 3), wallMat);
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set(cx, 3.95, 0);
      this.scene.add(ceil);

      // Top lintel (arch beam)
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(1, 0.15, 3.3), wallMat);
      lintel.position.set(cx, 3.85, 0);
      lintel.castShadow = true;
      this.scene.add(lintel);

      // Warm glow markers
      const markerMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
      for (const mz of [-1, 0, 1]) {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.1), markerMat);
        marker.position.set(cx, 0.01, mz);
        this.scene.add(marker);
      }
    };

    buildPassage(-5.5); // Plaza ↔ Tavern
    buildPassage(5.5);  // Plaza ↔ Arcade
  }

  // ==================== Sanctuary Gateway (Plaza south wall) ====================
  _buildSanctuaryGateway() {
    const gatewayGroup = new THREE.Group();
    gatewayGroup.name = 'SanctuaryGateway';
    gatewayGroup.position.set(0, 0, 4.9);

    // Glowing floor pad
    const padGeo = new THREE.PlaneGeometry(1.5, 1.5);
    const padMat = new THREE.MeshBasicMaterial({
      color: 0x8844ff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.015;
    gatewayGroup.add(pad);

    // Portal ring on floor
    const ringGeo = new THREE.TorusGeometry(0.65, 0.05, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xaa66ff });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    gatewayGroup.add(ring);

    // Gateway arch — two pillars + top beam
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x221144, roughness: 0.3, metalness: 0.6, emissive: 0x110022, emissiveIntensity: 0.2,
    });
    const pillarGeo = new THREE.BoxGeometry(0.2, 3.5, 0.2);

    for (const px of [-1.0, 1.0]) {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 1.75, 0);
      pillar.castShadow = true;
      gatewayGroup.add(pillar);
    }

    // Top arch beam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.25), pillarMat);
    beam.position.set(0, 3.55, 0);
    beam.castShadow = true;
    gatewayGroup.add(beam);

    // Neon trim on pillars
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x8844ff });
    for (const px of [-1.0, 1.0]) {
      const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.5, 0.04), neonMat);
      neonStrip.position.set(px - 0.12, 1.75, 0.1);
      gatewayGroup.add(neonStrip);
    }

    // Floating sign
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512; signCanvas.height = 96;
    const sctx = signCanvas.getContext('2d');
    sctx.fillStyle = 'rgba(10,5,20,0.9)';
    sctx.fillRect(0, 0, 512, 96);
    sctx.strokeStyle = '#8844ff';
    sctx.lineWidth = 3;
    sctx.strokeRect(8, 8, 496, 80);

    sctx.fillStyle = '#aa88ff';
    sctx.font = 'bold 36px monospace';
    sctx.textAlign = 'center';
    sctx.fillText('🌐 万 国 馆', 256, 42);

    sctx.fillStyle = '#ccaaff';
    sctx.font = '18px monospace';
    sctx.fillText('World Sanctuary', 256, 68);

    sctx.fillStyle = '#ffcc44';
    sctx.font = '16px monospace';
    sctx.fillText('按 [E] 进入 — Press [E] to Enter', 256, 86);

    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.magFilter = THREE.NearestFilter;
    signTex.minFilter = THREE.NearestFilter;
    signTex.colorSpace = THREE.SRGBColorSpace;

    const signGeo = new THREE.PlaneGeometry(3.0, 0.56);
    const signMesh = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({
      map: signTex, transparent: true, depthWrite: false,
    }));
    signMesh.position.set(0, 2.8, 0.18);
    gatewayGroup.add(signMesh);

    // Vertical light beam
    const beamGeo = new THREE.CylinderGeometry(0.3, 0.5, 3.8, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x8844ff,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    });
    const lightBeam = new THREE.Mesh(beamGeo, beamMat);
    lightBeam.position.y = 1.9;
    gatewayGroup.add(lightBeam);

    this.scene.add(gatewayGroup);
  }

  // ==================== Global Lighting (Gemini Warm Style) ====================
  _buildGlobalLighting() {
    // Warm ambient — reduced for pixel-style deeper shadows
    const ambient = new THREE.AmbientLight(0xb5c8e0, 0.5);
    this.scene.add(ambient);

    // Hemisphere — warm top, dark bottom
    const hemi = new THREE.HemisphereLight(0xaabbd5, 0x0b1120, 0.45);
    this.scene.add(hemi);

    // Warm fog (matching v3 cozy room) — stored for dynamic switching
    this._surfaceFog = new THREE.Fog(0x182133, 10, 34);
    this._depthsFog = new THREE.Fog(0x0a0a1f, 6, 22);
    this._rooftopFog = new THREE.Fog(0x040412, 12, 55);
    this._sanctuaryFog = new THREE.Fog(0x0a0a1e, 8, 28);
    this.scene.fog = this._surfaceFog;

    // Main directional — cool moonlight through windows
    const dir = new THREE.DirectionalLight(0xaaccee, 1.2);
    dir.name='SurfaceMoonlight';
    this._globalShadowLight=dir;
    dir.position.set(-4, 6, 2);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 1024;
    dir.shadow.mapSize.height = 1024;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 50;
    dir.shadow.camera.left = -20;
    dir.shadow.camera.right = 20;
    dir.shadow.camera.top = 8;
    dir.shadow.camera.bottom = -8;
    dir.shadow.bias = -0.0003;
    this.scene.add(dir);
  }

  // ==================== Shared Voxel Decorations ====================
  _buildVoxelDecorations() {
    const postMat = new THREE.MeshStandardMaterial({
      map: PixelTextureGenerator.darkWood(),
      roughness: 0.6, metalness: 0.1
    });
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xff8844, emissive: 0xff8844, emissiveIntensity: 0.6,
      roughness: 0.2, metalness: 0.2
    });

    // Lantern posts along the corridor
    for (let px = -13; px <= 13; px += 5) {
      if (Math.abs(px) < 1) continue;

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 3.5, 6), postMat
      );
      post.position.set(px, 1.75, 0);
      post.castShadow = true;
      this.scene.add(post);

      const lantern = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.3, 0.2), lanternMat
      );
      lantern.position.set(px, 3.6, 0);
      this.scene.add(lantern);

      const light = new THREE.PointLight(0xff8844, 6, 5, 2);
      light.position.set(px, 3.4, 0);
      this.scene.add(light);
    }

    // Ceiling beams
    const beamMat = new THREE.MeshStandardMaterial({
      map: PixelTextureGenerator.darkWood(), roughness: 0.7, metalness: 0.05
    });
    for (let bx = -12; bx <= 12; bx += 4) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.15, 10), beamMat
      );
      beam.position.set(bx, 3.9, 0);
      beam.castShadow = true;
      this.scene.add(beam);
    }
  }

  // ==================== Ambient Loops ====================
  _startAmbientLoops() {
    if (!this.audioManager) return;
    // These will silently skip if the audio files don't exist yet
    this.audioManager.playPlaylist('ambient_tavern', new THREE.Vector3(-10.5, 1.5, 0));
    this.audioManager.playPlaylist('ambient_arcade', new THREE.Vector3(10.5, 1.5, 0));
    this.audioManager.playPlaylist('ambient_plaza', new THREE.Vector3(0, 1.5, 0));
  }

  // ==================== Chat Messages Seed ====================
  _seedChatMessages() {
    const seedMessages = [
      { author: 'SYSTEM', text: t('seed.system'), color: '#ffcc00', time: Date.now() - 120000 },
      { author: 'VOID_WALKER', text: t('seed.tavern'), color: '#00ffcc', time: Date.now() - 90000 },
      { author: 'MINER_X', text: t('seed.cyber_hunder'), color: '#00ccff', time: Date.now() - 60000 },
      { author: 'LOBSTER_AI', text: t('seed.welcome'), color: '#ff8844', time: Date.now() - 30000 },
    ];
    if (this.globalState.chatMessages.length === 0) {
      this.globalState.chatMessages.push(...seedMessages);
    }
  }

  // ==================== Update ====================
  update(dt, playerPos, floor = 'SURFACE') {
    if(this._activeFloor!==floor) {
      this._activeFloor=floor;
      for(const zone of [this.plaza,this.tavern,this.arcade])zone.group.visible=floor==='SURFACE';
      this.depths.group.visible=floor==='DEPTHS';this.rooftop.group.visible=floor==='ROOFTOP';this.sanctuary.group.visible=floor==='SANCTUARY';
      this.scene.fog=({SURFACE:this._surfaceFog,DEPTHS:this._depthsFog,ROOFTOP:this._rooftopFog,SANCTUARY:this._sanctuaryFog})[floor] || this._surfaceFog;
      this.scene.background.set(floor==='ROOFTOP'?0x040412:floor==='DEPTHS'?0x0a0a1f:0x182133);
      // The surface shadow camera does not cover rooms above/below the plaza.
      this._globalShadowLight.castShadow=floor==='SURFACE';
    }
    if (floor === 'SURFACE') {
      this.artDirection?.update(dt);
      this.tavern?.update(dt, playerPos);
      this.plaza?.update(dt);
      this.arcade?.update(dt);
    } else if (floor === 'ROOFTOP') {
      this.rooftop?.update(dt);
    } else if (floor === 'SANCTUARY') {
      this.sanctuary?.update(dt, playerPos);
    }
  }

  // ==================== Audio Control ====================
  startTavernMusic() { this.tavern?.startMusic(); }
  stopTavernMusic() { this.tavern?.stopMusic(); }
  startPlazaMusic() { if (this.audioManager) this.audioManager.playPlaylist('plaza_playlist', new THREE.Vector3(0, 2, 0)); }
  startArcadeMusic() { if (this.audioManager) this.audioManager.playPlaylist('arcade_playlist', new THREE.Vector3(10.5, 1.5, 0)); }
}

export default AbyssWorld;
