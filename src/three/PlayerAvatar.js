import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();

/**
 * PlayerAvatar — always-visible player body in the world.
 *
 * During roaming (first-person), the avatar sits at floor level under the camera.
 * The player doesn't see their own body (camera is above it), but other players
 * would see it in multiplayer. Includes a collision capsule for physics.
 *
 * During sitting, the avatar snaps to the seat position with sitting pose.
 */
export class PlayerAvatar {
  constructor(characterData) {
    this.data = characterData;
    this.isSitting = false;

    this.group = new THREE.Group();
    this.group.name = 'PlayerAvatar';

    this._buildBlockyBody();
    this._buildCollisionCapsule();
    this._buildShadowDisc();

    // Hidden during first-person roaming, visible when sitting
    this.group.visible = false;
  }

  // ==================== Minecraft-Style Blocky Body ====================
  _buildBlockyBody() {
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e, roughness: 0.7, metalness: 0.05
    });
    const detailMat = new THREE.MeshStandardMaterial({
      color: 0x222244, roughness: 0.7, metalness: 0.05
    });
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x111133, roughness: 0.7, metalness: 0.05
    });

    // Torso: 0.4w x 0.5h x 0.25d
    const bodyGeo = new THREE.BoxGeometry(0.4, 0.5, 0.25);
    this.body = new THREE.Mesh(bodyGeo, skinMat);
    this.body.position.y = 0.55;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Head: 0.4 x 0.4 x 0.4
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x334455, roughness: 0.7, metalness: 0.05
    });
    this.headBase = new THREE.Mesh(headGeo, headMat);
    this.headBase.position.y = 1.0;
    this.group.add(this.headBase);

    // Face sprite (flat on front of head)
    const tex = textureLoader.load(this.data.avatar);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    const faceMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    this.face = new THREE.Sprite(faceMat);
    this.face.position.set(0, 1.0, -0.21);
    this.face.scale.set(0.4, 0.4, 1);
    this.group.add(this.face);

    // Name tag
    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = 256; nameCanvas.height = 64;
    const nctx = nameCanvas.getContext('2d');
    nctx.fillStyle = 'rgba(0,0,0,0.7)';
    nctx.beginPath(); nctx.roundRect(0, 0, 256, 64, 10); nctx.fill();
    nctx.strokeStyle = '#00ff88'; nctx.lineWidth = 2;
    nctx.beginPath(); nctx.roundRect(1, 1, 254, 62, 10); nctx.stroke();
    nctx.fillStyle = '#00ff88';
    nctx.font = 'bold 28px monospace'; nctx.textAlign = 'center';
    nctx.fillText(this.data.name, 128, 42);
    const nameTex = new THREE.CanvasTexture(nameCanvas);
    nameTex.minFilter = THREE.NearestFilter;
    const nameMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true });
    this.nameTag = new THREE.Sprite(nameMat);
    this.nameTag.position.y = 1.4;
    this.nameTag.scale.set(1.0, 0.25, 1);
    this.group.add(this.nameTag);

    // Arms: 0.15 x 0.4 x 0.15
    const armGeo = new THREE.BoxGeometry(0.15, 0.4, 0.15);
    this.leftArm = new THREE.Mesh(armGeo, detailMat);
    this.leftArm.position.set(-0.27, 0.5, 0);
    this.leftArm.castShadow = true;
    this.group.add(this.leftArm);
    this.rightArm = new THREE.Mesh(armGeo, detailMat);
    this.rightArm.position.set(0.27, 0.5, 0);
    this.rightArm.castShadow = true;
    this.group.add(this.rightArm);

    // Legs: 0.15 x 0.4 x 0.15
    const legGeo = new THREE.BoxGeometry(0.15, 0.4, 0.15);
    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.1, 0.1, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);
    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(0.1, 0.1, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);
  }

  // ==================== Collision Capsule ====================
  _buildCollisionCapsule() {
    // Invisible collision body: box approximating player hitbox
    const colGeo = new THREE.BoxGeometry(0.5, 1.6, 0.5);
    const colMat = new THREE.MeshBasicMaterial({
      visible: false,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    this._collider = new THREE.Mesh(colGeo, colMat);
    this._collider.position.y = 0.8; // center of player body
    this._collider.name = 'playerCollider';
    this.group.add(this._collider);

    // Foot-level sphere for ground collision
    const footGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const footMat = new THREE.MeshBasicMaterial({
      visible: false, transparent: true, opacity: 0, depthWrite: false
    });
    this._footCollider = new THREE.Mesh(footGeo, footMat);
    this._footCollider.position.y = 0.1;
    this.group.add(this._footCollider);
  }

  /** Get collision radius for wall checks */
  getCollisionRadius() { return 0.25; }

  // ==================== Shadow Disc ====================
  _buildShadowDisc() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    // Pixel-style block shadow — concentric squares instead of radial gradient
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 64, 64);
    const steps = [
      { s: 55, a: 0.35 }, { s: 48, a: 0.28 }, { s: 40, a: 0.20 },
      { s: 32, a: 0.13 }, { s: 24, a: 0.08 }, { s: 16, a: 0.04 },
    ];
    for (const { s, a } of steps) {
      const offset = (64 - s) / 2;
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(offset, offset, s, s);
    }
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const geo = new THREE.PlaneGeometry(0.55, 0.55);
    this.shadowDisc = new THREE.Mesh(geo, mat);
    this.shadowDisc.rotation.x = -Math.PI / 2;
    this.shadowDisc.position.y = 0.01;
    this.group.add(this.shadowDisc);
  }

  // ==================== Pose Transitions ====================
  sit(seatPos) {
    this.group.position.copy(seatPos);
    this.group.visible = true;
    this.isSitting = true;

    // Sitting pose
    this.body.position.y = 0.25;
    this.leftArm.position.set(-0.27, 0.15, 0.05);
    this.rightArm.position.set(0.27, 0.15, 0.05);
    this.headBase.position.y = 0.65;
    this.face.position.set(0, 0.65, -0.21);
    this.nameTag.position.y = 0.95;
    this.leftLeg.position.y = 0.02;
    this.rightLeg.position.y = 0.02;
    if (this._collider) this._collider.position.y = 0.5;
  }

  stand() {
    this.group.visible = false;
    this.isSitting = false;

    // Restore standing pose
    this.body.position.y = 0.55;
    this.leftArm.position.set(-0.27, 0.5, 0);
    this.rightArm.position.set(0.27, 0.5, 0);
    this.headBase.position.y = 1.0;
    this.face.position.set(0, 1.0, -0.21);
    this.nameTag.position.y = 1.4;
    this.leftLeg.position.y = 0.1;
    this.rightLeg.position.y = 0.1;
    if (this._collider) this._collider.position.y = 0.8;
  }

  // ==================== Update ====================
  /**
   * Called every frame. During roaming, positions avatar at camera's floor level
   * and rotates to face the camera direction.
   */
  update(dt, camera, floorY) {
    if (!camera) return;

    if (this.isSitting) {
      // Face sprites toward camera
      if (this.face) this.face.lookAt(camera.position);
      if (this.nameTag) this.nameTag.lookAt(camera.position);
      return;
    }

    // Roaming: position avatar at floor under camera
    this.group.position.set(camera.position.x, floorY, camera.position.z);

    // Rotate body to face camera forward direction
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    if (forward.lengthSq() > 0.001) {
      forward.normalize();
      const targetAngle = Math.atan2(forward.x, forward.z);
      // Smooth rotation to avoid jitter
      const currentAngle = this.group.rotation.y;
      let diff = targetAngle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1, dt * 12);
    }

    // Face sprites always face camera
    if (this.face) this.face.lookAt(camera.position);
    if (this.nameTag) this.nameTag.lookAt(camera.position);

    // Walking bob animation
    const speed = new THREE.Vector3(
      camera.position.x - (this._lastCamX || camera.position.x),
      0,
      camera.position.z - (this._lastCamZ || camera.position.z)
    ).length() / Math.max(0.001, dt);

    this._lastCamX = camera.position.x;
    this._lastCamZ = camera.position.z;

    if (speed > 0.5) {
      const bob = Math.sin(Date.now() * 0.01) * 0.03;
      this.body.position.y = 0.55 + bob;
      this.headBase.position.y = 1.0 + bob;
      this.face.position.y = 1.0 + bob;
    } else {
      this.body.position.y = 0.55;
      this.headBase.position.y = 1.0;
      this.face.position.y = 1.0;
    }
  }
}
