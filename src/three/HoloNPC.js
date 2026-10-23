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

    // Original block-pixel anchor keeper: visor, apron, radio and signal halo.
    hctx.imageSmoothingEnabled = false;
    const pixel = (x,y,w,h,color) => { hctx.fillStyle=color;hctx.fillRect(x,y,w,h); };
    pixel(28,42,72,74,'#31515b');pixel(34,36,60,84,'#47717a');
    pixel(39,48,50,54,'#82afa8');pixel(44,55,40,28,'#142d3c');
    pixel(48,63,10,7,'#e8c48f');pixel(70,63,10,7,'#e8c48f');
    pixel(55,92,18,3,'#31515b');pixel(23,64,9,20,'#bc9871');pixel(96,64,9,20,'#bc9871');
    pixel(60,22,6,16,'#799b9b');pixel(56,16,14,7,'#e8b47e');
    pixel(39,112,50,72,'#3a5967');pixel(46,114,36,78,'#bc9871');
    pixel(50,127,28,37,'#e2c7a0');pixel(55,136,18,18,'#345364');pixel(60,141,8,8,'#79d9ce');
    pixel(21,119,16,44,'#82afa8');pixel(91,119,16,44,'#82afa8');
    pixel(16,153,23,12,'#e2c7a0');pixel(89,153,23,12,'#e2c7a0');
    pixel(42,186,17,26,'#466b77');pixel(69,186,17,26,'#466b77');
    pixel(35,211,30,4,'#79d9ce');pixel(24,224,80,2,'#527f85');
    for(let i=0;i<5;i++)pixel(44+i*8,235,4,3,i%2?'#e8b47e':'#79d9ce');
    for(let y=40;y<216;y+=6)pixel(20,y,88,1,'#101d2c26');

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
    ctx.fillStyle = 'rgba(16, 29, 44, 0.95)';
    ctx.beginPath();
    ctx.roundRect(10, 4, w - 20, h - 8, 2);
    ctx.fill();

    ctx.strokeStyle = '#d3ad7f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(10, 4, w - 20, h - 8, 2);
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
    this.holoSprite.material.opacity = 0.85 + pulse * 0.12;

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
