import * as THREE from 'three';
import { PixelTextureGenerator } from './PixelTextureGenerator.js';
import { ArcadeMachine } from './ArcadeMachine.js';
import { GAME_REGISTRY } from '../games/registry.js';

/**
 * VoxelArcade — Gemini-style "Hive Arcade" (蜂巢游戏厅).
 * Spans X: [6, 15], Z: [-5, 5].
 *
 * V3 Upgrade: Warm wood floors, plaster walls, pixel-textured cabinets
 * with animated screens, warm ambient lighting with redstone flicker strips.
 */
export class VoxelArcade {
  constructor(scene, globalState) {
    this.scene = scene;
    this.globalState = globalState;
    this.group = new THREE.Group();
    this.group.name = 'VoxelArcade';
    this.machines = [];
    this._redstoneStrips = [];

    this._buildFloor();
    this._buildWalls();
    this._placeCabinets();
    this._buildRedstoneStrips();
    this._buildAmbientLighting();
    this._buildDecorations();
    this._buildCRTStatic();

    scene.add(this.group);
  }

  // ==================== Floor ====================
  _buildFloor() {
    const tex = PixelTextureGenerator.woodFloor();
    tex.repeat.set(9, 10);
    const geo = new THREE.PlaneGeometry(9, 10);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(10.5, 0, 0);
    floor.receiveShadow = true;
    this.group.add(floor);

    // Central pixel carpet runner
    const runnerTex = PixelTextureGenerator.arcadeCarpet();
    runnerTex.wrapS = THREE.RepeatWrapping;
    runnerTex.wrapT = THREE.RepeatWrapping;
    runnerTex.repeat.set(2, 1);

    const runnerGeo = new THREE.PlaneGeometry(6, 10);
    const runnerMat = new THREE.MeshStandardMaterial({
      map: runnerTex,
      roughness: 0.4,
      metalness: 0.2
    });
    const runner = new THREE.Mesh(runnerGeo, runnerMat);
    runner.rotation.x = -Math.PI / 2;
    runner.position.set(10.5, 0.008, 0);
    runner.receiveShadow = true;
    this.group.add(runner);
  }

  // ==================== Walls ====================
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
    };

    // North wall (Z = -5)
    buildWall(10.5, 0, -5, 9, 4, 0.3);
    // South wall (Z = 5)
    buildWall(10.5, 0, 5, 9, 4, 0.3);
    // East wall (X = 15)
    buildWall(15, 0, 0, 0.3, 4, 10);
    // West wall (X = 6) with 3m opening to plaza
    buildWall(6, 2.5, 0, 0.3, 1.5, 3, 0);
    buildWall(6, 0, 3.25, 0.3, 4, 3.5, 0);
    buildWall(6, 0, -3.25, 0.3, 4, 3.5, 0);
    buildWall(6, 3.85, 0, 0.3, 0.3, 3, 0);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(9, 10);
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0xd4c8ad,
      roughness: 0.95,
      metalness: 0.02
    });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(10.5, 4, 0);
    this.group.add(ceil);
  }

  // ==================== Arcade Cabinets ====================
  _placeCabinets() {
    const readyGames = GAME_REGISTRY;

    // World-space positions within arcade zone X[6,15] Z[-5,5]
    const northRow = [
      { x: 8, z: -4.2, rot: 0 },
      { x: 10.5, z: -4.2, rot: 0 },
      { x: 13, z: -4.2, rot: 0 },
    ];

    const southRow = [
      { x: 8, z: 4.2, rot: Math.PI },
      { x: 10.5, z: 4.2, rot: Math.PI },
      { x: 13, z: 4.2, rot: Math.PI },
    ];

    const allPositions = [...northRow, ...southRow];

    for (let i = 0; i < Math.min(readyGames.length, allPositions.length); i++) {
      const cfg = { ...readyGames[i] };
      const pos = allPositions[i];
      const machine = new ArcadeMachine(cfg, pos.x, pos.z, pos.rot);
      machine.addToScene(this.scene);
      machine._arcadeParent = this;
      this.machines.push(machine);
    }
  }

  // ==================== Redstone LED Strips ====================
  _buildRedstoneStrips() {
    const stripTex = PixelTextureGenerator.redstoneLamp();

    // Each cabinet gets two side strips
    for (const machine of this.machines) {
      const stripGeo = new THREE.BoxGeometry(0.04, 1.6, 0.06);
      const stripMat = new THREE.MeshBasicMaterial({
        map: stripTex,
        color: 0xff4422
      });

      const leftStrip = new THREE.Mesh(stripGeo, stripMat);
      leftStrip.position.set(-0.64, 1.1, 0);
      machine.group.add(leftStrip);

      const rightStrip = new THREE.Mesh(stripGeo, stripMat);
      rightStrip.position.set(0.64, 1.1, 0);
      machine.group.add(rightStrip);

      this._redstoneStrips.push({
        mesh: leftStrip, material: stripMat,
        phase: Math.random() * Math.PI * 2,
        baseIntensity: 0.4 + Math.random() * 0.6
      });
      this._redstoneStrips.push({
        mesh: rightStrip, material: stripMat,
        phase: Math.random() * Math.PI * 2,
        baseIntensity: 0.4 + Math.random() * 0.6
      });
    }

    // Wall-mounted redstone lamps
    const lampGeo = new THREE.BoxGeometry(0.2, 0.3, 0.1);
    for (let lx = 7; lx <= 14; lx += 2.5) {
      for (const z of [-4.85, 4.85]) {
        const lamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({
          map: stripTex, color: 0xff4422
        }));
        lamp.position.set(lx, 3, z);
        this.group.add(lamp);
        this._redstoneStrips.push({
          mesh: lamp, material: lamp.material,
          phase: Math.random() * Math.PI * 2,
          baseIntensity: 0.3 + Math.random() * 0.5
        });
      }
    }
  }

  // ==================== Ambient Lighting ====================
  _buildAmbientLighting() {
    // Warm central fill
    const ambientArcade = new THREE.PointLight(0xffcc88, 6, 9, 2);
    ambientArcade.position.set(10.5, 1.5, 0);
    this.group.add(ambientArcade);

    // Floor strip lights (warm amber)
    for (let x = 7; x <= 14; x += 3) {
      for (const z of [-4.5, 4.5]) {
        const stripLight = new THREE.PointLight(0xff8844, 3, 3, 2);
        stripLight.position.set(x, 0.2, z);
        this.group.add(stripLight);
      }
    }

    // East wall glow (warm)
    const eastGlow = new THREE.PointLight(0xffaa66, 8, 5, 2);
    eastGlow.position.set(14, 1.8, 0);
    this.group.add(eastGlow);
  }

  // ==================== Decorations ====================
  _buildDecorations() {
    const benchMat = new THREE.MeshStandardMaterial({
      map: PixelTextureGenerator.lightWood(),
      roughness: 0.85,
      metalness: 0.05
    });

    // Benches
    for (const bx of [8.5, 12.5]) {
      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.15, 0.5),
        benchMat
      );
      bench.position.set(bx, 0.3, 0);
      bench.castShadow = true;
      bench.receiveShadow = true;
      this.group.add(bench);

      const legMat = new THREE.MeshStandardMaterial({
        color: 0x5a4a3a,
        roughness: 0.4,
        metalness: 0.3
      });
      for (const lx of [-0.5, 0.5]) {
        for (const lz of [-0.15, 0.15]) {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6),
            legMat
          );
          leg.position.set(bx + lx, 0.15, lz);
          leg.castShadow = true;
          this.group.add(leg);
        }
      }
    }

    // Ceiling hex sign (pixel style)
    const hexCanvas = document.createElement('canvas');
    hexCanvas.width = 256;
    hexCanvas.height = 128;
    const hctx = hexCanvas.getContext('2d');
    hctx.fillStyle = '#1a1008';
    hctx.fillRect(0, 0, 256, 128);
    hctx.fillStyle = '#ff8844';
    hctx.font = 'bold 80px monospace';
    hctx.textAlign = 'center';
    hctx.fillText('蜂巢', 128, 82);
    hctx.strokeStyle = '#ff8844';
    hctx.lineWidth = 2;
    hctx.strokeRect(20, 10, 216, 108);

    const hexTex = new THREE.CanvasTexture(hexCanvas);
    hexTex.magFilter = THREE.NearestFilter;
    hexTex.minFilter = THREE.NearestFilter;
    hexTex.colorSpace = THREE.SRGBColorSpace;

    const hexSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 1.25),
      new THREE.MeshBasicMaterial({
        map: hexTex,
        transparent: true,
        side: THREE.DoubleSide
      })
    );
    hexSign.rotation.x = -Math.PI / 2;
    hexSign.position.set(10.5, 3.95, 0);
    this.group.add(hexSign);

    // Scattered crates
    const crateMat = new THREE.MeshStandardMaterial({
      map: PixelTextureGenerator.darkWood(),
      roughness: 0.8,
      metalness: 0.05
    });
    const cratePositions = [
      { x: 7.5, z: -3.5 },
      { x: 13.5, z: 3.5 },
      { x: 14, z: -2 },
    ];
    for (const cp of cratePositions) {
      const size = 0.3 + Math.random() * 0.2;
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        crateMat
      );
      crate.position.set(cp.x, size / 2, cp.z);
      crate.rotation.y = Math.random() * Math.PI;
      crate.castShadow = true;
      crate.receiveShadow = true;
      this.group.add(crate);
    }
  }

  _buildCRTStatic() {
    const count=25;this._crtStaticData=[];
    const staticGroup=new THREE.Group();staticGroup.name="crtStatic";
    for(let i=0;i<count;i++){
      const dot=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.02,0.02),new THREE.MeshBasicMaterial({color:Math.random()>0.5?0x00ffcc:0xff00cc,transparent:true,opacity:0.4,depthWrite:false}));
      dot.position.set(7+Math.random()*8,0.5+Math.random()*3,-4.5+Math.random()*9);
      dot.userData={life:1+Math.random()*4,baseX:dot.position.x,baseY:dot.position.y,baseZ:dot.position.z,phase:Math.random()*Math.PI*2};
      staticGroup.add(dot);this._crtStaticData.push(dot);
    }
    this.group.add(staticGroup);
  }

  // ==================== Update ====================
  update(dt) {
    // CRT static particles
    if(this._crtStaticData){const t=Date.now()*0.001;for(const d of this._crtStaticData){d.userData.life-=dt;d.position.y+=Math.sin(t*3+d.userData.phase)*0.003;d.material.opacity=0.15+0.25*Math.abs(Math.sin(t*5+d.userData.phase));if(d.userData.life<=0){d.position.set(d.userData.baseX,0.5+Math.random()*3,d.userData.baseZ);d.userData.life=1+Math.random()*4;}}}
    const t = Date.now() * 0.001;

    for (const strip of this._redstoneStrips) {
      const baseFlicker = 0.5 + 0.5 * Math.sin(t * 4 + strip.phase);
      const glitch = Math.random() < 0.08 ? 2.0 : 0;
      const intensity = (baseFlicker * strip.baseIntensity) + glitch;

      strip.material.color.setRGB(
        Math.min(1, 1.0 * intensity),
        Math.min(1, 0.25 * intensity + 0.05),
        Math.min(1, 0.1 * intensity + 0.02)
      );
    }
  }

}

export default VoxelArcade;
