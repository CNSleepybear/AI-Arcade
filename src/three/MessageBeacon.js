import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { getTemplateText, getTemplateColor } from '../data/messageDB.js';

/**
 * MessageBeacon — a ground-level neon beacon representing one player message.
 *
 * Visual:
 *   - Vertical beam (thin emissive box, color by category)
 *   - Rotating ring at base
 *   - CSS2D label (appears when player within 1.5m)
 */
export class MessageBeacon {
  /**
   * @param {THREE.Scene} scene
   * @param {{ id: number, zone: string, x: number, z: number, template_id: string, author: string, likes: number, dislikes: number, created_at: string, expires_at: string }} data
   */
  constructor(scene, data) {
    this.scene = scene;
    this.id = data.id;
    this.data = data;
    this.isActive = true;

    const color = getTemplateColor(data.template_id);
    this._colorCode = color;

    this.group = new THREE.Group();
    this.group.name = `message-beacon-${data.id}`;
    this.group.position.set(data.x, 0, data.z);

    // ---- Beam ----
    const beamGeo = new THREE.BoxGeometry(0.08, 1.2, 0.08);
    const beamMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    this._beam = new THREE.Mesh(beamGeo, beamMat);
    this._beam.position.y = 0.6;
    this.group.add(this._beam);

    // Glow shell (larger, more transparent)
    const glowGeo = new THREE.BoxGeometry(0.14, 1.3, 0.14);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    this._glow = new THREE.Mesh(glowGeo, glowMat);
    this._glow.position.y = 0.65;
    this.group.add(this._glow);

    // ---- Base ring ----
    const ringGeo = new THREE.TorusGeometry(0.12, 0.03, 8, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.5,
    });
    this._ring = new THREE.Mesh(ringGeo, ringMat);
    this._ring.rotation.x = Math.PI / 2;
    this._ring.position.y = 0.04;
    this.group.add(this._ring);

    // ---- CSS2D Label (hidden by default) ----
    const labelDiv = document.createElement('div');
    labelDiv.className = 'msg-beacon-label';
    labelDiv.style.cssText = `
      background: rgba(5,5,22,0.92);
      border: 1px solid ${color};
      border-radius: 8px;
      padding: 6px 12px;
      color: #ccc;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      pointer-events: none;
      text-align: center;
      white-space: nowrap;
      box-shadow: 0 0 10px ${color}44;
      display: none;
    `;
    this._labelDiv = labelDiv;
    this._labelObject = new CSS2DObject(labelDiv);
    this._labelObject.position.set(0, 1.5, 0);
    this._labelObject.visible = false;
    this.group.add(this._labelObject);

    this._updateLabelContent();

    scene.add(this.group);
  }

  _updateLabelContent() {
    const text = getTemplateText(this.data.template_id);
    const s = this.data.likes - (this.data.dislikes || 0);
    const sign = s > 0 ? '+' : s < 0 ? '' : '';
    this._labelDiv.innerHTML = `
      <div style="color:${this._colorCode};font-weight:bold;margin-bottom:2px">${text}</div>
      <div style="font-size:10px;color:#888">
        — ${this.data.author} ·
        <span style="color:#88ff88">👍${this.data.likes || 0}</span>
        <span style="color:#ff8888">👎${this.data.dislikes || 0}</span>
      </div>
    `;
    // Store for proximity check
    this._labelDiv.dataset.beaconId = this.id;
  }

  /** Show the hover label */
  showLabel() {
    this._labelObject.visible = true;
    this._labelDiv.style.display = '';
  }

  /** Hide the hover label */
  hideLabel() {
    this._labelObject.visible = false;
    this._labelDiv.style.display = 'none';
  }

  /** Called every frame. dt in seconds. */
  update(dt, playerPos) {
    if (!this.isActive) return;

    // Rotate ring
    this._ring.rotation.z += dt * 2.5;

    // Pulse glow
    const pulse = 0.85 + Math.sin(Date.now() * 0.004) * 0.15;
    this._glow.material.opacity = 0.1 + Math.sin(Date.now() * 0.004) * 0.08;

    // Height decay based on remaining lifetime
    if (this.data.expires_at) {
      const now = Date.now();
      const created = new Date(this.data.created_at).getTime();
      const expires = new Date(this.data.expires_at).getTime();
      const total = expires - created;
      const remaining = Math.max(0, expires - now);
      const ratio = total > 0 ? remaining / total : 1;
      const h = ratio * 1.2;
      this._beam.scale.y = Math.max(0.05, ratio);
      this._beam.position.y = h / 2;
      this._glow.scale.y = Math.max(0.05, ratio);
      this._glow.position.y = h / 2;

      // Fade out near end
      if (ratio < 0.15) {
        this._beam.material.opacity = ratio / 0.15 * 0.85;
      }
    }
  }

  /** Update likes/dislikes without recreating */
  updateVotes(likes, dislikes) {
    this.data.likes = likes;
    this.data.dislikes = dislikes;
    this._updateLabelContent();
  }

  /** Clean up */
  dispose() {
    this.isActive = false;
    this.scene.remove(this.group);
    // Dispose geometries & materials
    this.group.traverse((child) => {
      if (child.geometry && child.geometry !== this._ring.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
