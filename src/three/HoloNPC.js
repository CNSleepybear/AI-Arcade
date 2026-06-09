import * as THREE from 'three';
import { PixelTextureGenerator } from './PixelTextureGenerator.js';
import { t } from '../data/i18n.js';

/**
 * HoloNPC — Gemini-style warm pixel ghost bartender.
 *
 * V3 Upgrade: Replaced cyan hologram with warm amber pixel ghost,
 * grounded at bar height instead of floating. Uses NearestFilter
 * canvas texture for pixel look.
 */
export class HoloNPC {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Position behind the bar counter (tavern zone, Z=3.5 is bar area)
    this.group.position.set(-10.5, 0, 3.8);

    this._buildHoloBody();
    this._buildBase();
    this._buildDialogueBubble();

    scene.add(this.group);

    this._messageKeys = [
      'holo.welcome.0',
      'holo.welcome.1',
      'holo.welcome.2',
      'holo.welcome.3',
      'holo.welcome.4',
      'holo.welcome.5',
    ];
    this._currentMsgIdx = 0;
    this._msgTimer = 0;
    this._msgInterval = 6;
    this._visible = false;
  }

  _buildHoloBody() {
    const holoCanvas = document.createElement('canvas');
    holoCanvas.width = 128;
    holoCanvas.height = 256;
    const hctx = holoCanvas.getContext('2d');

    // Warm pixel ghost silhouette
    hctx.fillStyle = 'rgba(255,180,100,0.18)';
    hctx.beginPath();
    hctx.ellipse(64, 180, 30, 60, 0, 0, Math.PI * 2);
    hctx.fill();

    // Head
    hctx.fillStyle = 'rgba(255,200,130,0.28)';
    hctx.beginPath();
    hctx.arc(64, 80, 35, 0, Math.PI * 2);
    hctx.fill();

    // Pixel-style blocky eyes
    hctx.fillStyle = '#ffcc66';
    hctx.fillRect(46, 66, 12, 8);
    hctx.fillRect(70, 66, 12, 8);

    // Warm smile
    hctx.strokeStyle = '#ffcc66';
    hctx.lineWidth = 2;
    hctx.beginPath();
    hctx.arc(64, 82, 16, 0.1, Math.PI - 0.1);
    hctx.stroke();

    // Antennae (warm)
    hctx.strokeStyle = '#ffaa44';
    hctx.lineWidth = 2;
    hctx.beginPath();
    hctx.moveTo(50, 45);
    hctx.quadraticCurveTo(30, 10, 35, 5);
    hctx.stroke();
    hctx.beginPath();
    hctx.moveTo(78, 45);
    hctx.quadraticCurveTo(98, 10, 93, 5);
    hctx.stroke();

    // Arms/claws (warm)
    hctx.strokeStyle = '#ffaa44';
    hctx.beginPath();
    hctx.moveTo(30, 120);
    hctx.lineTo(10, 140);
    hctx.lineTo(18, 150);
    hctx.closePath();
    hctx.stroke();
    hctx.beginPath();
    hctx.moveTo(98, 120);
    hctx.lineTo(118, 140);
    hctx.lineTo(110, 150);
    hctx.closePath();
    hctx.stroke();

    // Pixel scanlines
    for (let y = 0; y < 256; y += 4) {
      hctx.fillStyle = y % 8 === 0 ? 'rgba(255,180,80,0.08)' : 'rgba(0,0,0,0.04)';
      hctx.fillRect(0, y, 128, 2);
    }

    const tex = new THREE.CanvasTexture(holoCanvas);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
    this.holoSprite = new THREE.Sprite(mat);
    this.holoSprite.scale.set(1.0, 2.0, 1);
    this.holoSprite.position.y = 1.0;
    this.group.add(this.holoSprite);
  }

  _buildBase() {
    // Wooden projector base
    const baseGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.12, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      map: PixelTextureGenerator.darkWood(),
      roughness: 0.7,
      metalness: 0.1
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.06;
    base.castShadow = true;
    this.group.add(base);

    // Warm amber glow ring
    const ringGeo = new THREE.TorusGeometry(0.3, 0.02, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    this.group.add(ring);
  }

  _buildDialogueBubble() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 80;
    this._bubbleCanvas = canvas;
    this._bubbleCtx = canvas.getContext('2d');

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;

    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false
    });
    this.bubble = new THREE.Sprite(mat);
    this.bubble.scale.set(2.5, 0.4, 1);
    this.bubble.position.y = 2.4;
    this.bubble.visible = false;
    this.group.add(this.bubble);
  }

  _renderBubble(text) {
    const ctx = this._bubbleCtx;
    const w = 512, h = 80;
    ctx.clearRect(0, 0, w, h);

    // Warm bubble
    ctx.fillStyle = 'rgba(25, 15, 8, 0.9)';
    ctx.beginPath();
    ctx.roundRect(10, 4, w - 20, h - 8, 12);
    ctx.fill();

    ctx.strokeStyle = '#ffbb55';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(10, 4, w - 20, h - 8, 12);
    ctx.stroke();

    // Bright readable text
    ctx.fillStyle = '#ffeebb';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, h / 2 + 6);

    this.bubble.material.map.needsUpdate = true;
  }

  update(dt, playerPos) {
    if (playerPos) {
      this.holoSprite.lookAt(playerPos);
      this.bubble.lookAt(playerPos);
    }

    // Gentle pulse
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.003);
    this.holoSprite.material.opacity = pulse;

    this._msgTimer += dt;
    if (this._msgTimer > this._msgInterval) {
      this._msgTimer = 0;
      this._currentMsgIdx = (this._currentMsgIdx + 1) % this._messageKeys.length;
      this._renderBubble(t(this._messageKeys[this._currentMsgIdx]));
      this.bubble.visible = true;

      setTimeout(() => {
        this.bubble.visible = false;
      }, 4000);
    }
  }
}
