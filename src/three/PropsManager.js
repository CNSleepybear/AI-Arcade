import * as THREE from 'three';

/**
 * Manages environment dressing: posters, trash, wires, boxes.
 * All props are simple meshes or billboard sprites with Canvas textures.
 */
export class PropsManager {
  constructor(scene) {
    this.scene = scene;
    this._buildPosters();
    this._buildFloorClutter();
    this._buildWallDetails();
  }

  // ==================== Wall Posters ====================
  _buildPosters() {
    const posterDefs = [
      { x: -10, y: 2.0, z: -6, w: 1.5, h: 2.0, text: '深渊\nABYSS', color: '#cc4422', desc: '街机厅主人收藏的复古海报' },
      { x: -10, y: 1.8, z: 2, w: 1.4, h: 1.8, text: '💀\nPAPER\nRITUAL', color: '#9966cc', desc: '纸劫' },
      { x: 10, y: 2.2, z: -4, w: 1.5, h: 2.0, text: '🎣\nABYSS\nANGLER', color: '#ddaa44', desc: '深渊钓手' },
      { x: 10, y: 1.6, z: 4, w: 1.3, h: 1.7, text: '⚔️\nROSHAMBO\nDUNGEON', color: '#cc5533', desc: 'Roshambo' },
      { x: -6, y: 2.4, z: -9.5, w: 1.2, h: 1.5, text: '⚠️\nNO\nSIGNAL', color: '#ddcc44', desc: '故障标识' },
      { x: 6, y: 2.4, z: -9.5, w: 1.2, h: 1.5, text: 'INSERT\nCOIN', color: '#cc7722', desc: '投币提示' },
    ];

    for (const pd of posterDefs) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');

      // Torn paper background
      ctx.fillStyle = '#1a1508';
      ctx.fillRect(0, 0, 256, 320);
      // Noise/grunge
      for (let i = 0; i < 400; i++) {
        const rx = Math.random() * 256;
        const ry = Math.random() * 320;
        ctx.fillStyle = `rgba(${20 + Math.random() * 30},${15 + Math.random() * 20},${5 + Math.random() * 10},0.3)`;
        ctx.fillRect(rx, ry, 3, 3);
      }
      // Border
      ctx.strokeStyle = pd.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(8, 8, 240, 304);
      // Text
      ctx.fillStyle = pd.color;
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      const lines = pd.text.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, 128, 80 + i * 50);
      });
      // Glow
      ctx.shadowColor = pd.color;
      ctx.shadowBlur = 20;
      ctx.fillText(lines[0], 128, 80);
      ctx.shadowBlur = 0;

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;

      const geo = new THREE.PlaneGeometry(pd.w, pd.h);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.6,
        metalness: 0.05,
        side: THREE.DoubleSide
      });
      const poster = new THREE.Mesh(geo, mat);

      // Position against walls
      if (Math.abs(pd.x) > 11) {
        // Left/right wall — rotate to face inward
        poster.rotation.y = pd.x > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
      poster.position.set(pd.x, pd.y, pd.z);
      // Slight lean
      poster.rotation.x = (Math.random() - 0.5) * 0.05;
      poster.rotation.z = (Math.random() - 0.5) * 0.08;

      this.scene.add(poster);
    }
  }

  // ==================== Floor Clutter ====================
  _buildFloorClutter() {
    // Soda cans (cylinders on their side)
    const canDefs = [
      { x: -3.5, z: 1.5, rot: 0.4 },
      { x: 5.2, z: -2.1, rot: -0.7 },
      { x: -7.8, z: 3.2, rot: 1.2 },
      { x: 1.8, z: -6.5, rot: -0.3 },
      { x: 8.5, z: 5.5, rot: 0.9 },
    ];

    for (const cd of canDefs) {
      const canGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8);
      const canMat = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.5 ? 0xcc2222 : 0x2244cc,
        roughness: 0.2,
        metalness: 0.7
      });
      const can = new THREE.Mesh(canGeo, canMat);
      can.position.set(cd.x, 0.1, cd.z);
      can.rotation.z = Math.PI / 2;
      can.rotation.y = cd.rot;
      can.castShadow = true;
      can.receiveShadow = true;
      this.scene.add(can);
    }

    // Scattered wires (thin cylinders)
    for (let i = 0; i < 6; i++) {
      const wireGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5 + Math.random() * 0.8, 6);
      const wireMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.8,
        metalness: 0.2
      });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.position.set(
        -10 + Math.random() * 20,
        0.03,
        -8 + Math.random() * 16
      );
      wire.rotation.z = Math.PI / 2;
      wire.rotation.y = Math.random() * Math.PI;
      wire.castShadow = true;
      wire.receiveShadow = true;
      this.scene.add(wire);
    }

    // Cardboard boxes in corners
    const boxDefs = [
      { x: -9.5, z: 7.5, s: 0.35 },
      { x: 9.8, z: 8.0, s: 0.4 },
      { x: -10, z: -8.5, s: 0.3 },
    ];

    for (const bd of boxDefs) {
      const size = bd.s;
      const boxGeo = new THREE.BoxGeometry(size, size * 0.8, size * 1.2);
      const boxMat = new THREE.MeshStandardMaterial({
        color: 0x332211,
        roughness: 0.7,
        metalness: 0.1
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(bd.x, size * 0.4, bd.z);
      box.rotation.y = Math.random() * Math.PI;
      box.castShadow = true;
      box.receiveShadow = true;
      this.scene.add(box);
    }
  }

  // ==================== Wall Details ====================
  _buildWallDetails() {
    // Wall-mounted junction box
    const junctionGeo = new THREE.BoxGeometry(0.25, 0.3, 0.08);
    const junctionMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.3,
      metalness: 0.8
    });
    const junction = new THREE.Mesh(junctionGeo, junctionMat);
    junction.position.set(-11.5, 1.2, 3);
    junction.rotation.y = Math.PI / 2;
    this.scene.add(junction);

    // Pipe along back wall
    const pipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 6, 8);
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.3,
      metalness: 0.7
    });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(-3, 0.5, -9.7);
    this.scene.add(pipe);

    // Small vent on ceiling
    const ventGeo = new THREE.PlaneGeometry(0.6, 0.4);
    const ventCanvas = document.createElement('canvas');
    ventCanvas.width = 128; ventCanvas.height = 64;
    const vctx = ventCanvas.getContext('2d');
    vctx.fillStyle = '#222';
    vctx.fillRect(0, 0, 128, 64);
    vctx.strokeStyle = '#444';
    vctx.lineWidth = 2;
    for (let lx = 0; lx < 128; lx += 12) {
      vctx.beginPath(); vctx.moveTo(lx, 0); vctx.lineTo(lx, 64); vctx.stroke();
    }
    const ventTex = new THREE.CanvasTexture(ventCanvas);
    const ventMat = new THREE.MeshStandardMaterial({
      map: ventTex,
      roughness: 0.5,
      metalness: 0.6,
      side: THREE.DoubleSide
    });
    const vent = new THREE.Mesh(ventGeo, ventMat);
    vent.rotation.x = -Math.PI / 2;
    vent.position.set(0, 4.95, -5);
    this.scene.add(vent);
  }
}
