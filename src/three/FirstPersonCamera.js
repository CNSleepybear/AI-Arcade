import * as THREE from 'three';

const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const PI_2 = Math.PI / 2;

export class FirstPersonCamera {
  constructor(camera) {
    this.camera = camera;

    this.yaw = 0;
    this.pitch = 0;

    this.sensitivityX = 0.002;
    this.sensitivityY = 0.002;

    this.minPitch = -PI_2 * 0.9;
    this.maxPitch = PI_2 * 0.9;

    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();

    // Sitting transition state
    this._sitTargetPos = null;
    this._sitTargetLook = null;
    this._sitDuration = 0;
    this._sitElapsed = 0;
    this._sitStartPos = new THREE.Vector3();
    this._sitStartLook = new THREE.Vector3();
    this._isSitting = false;

    // Walking bob state
    this._bobPhase = 0;
    this._wasMoving = false;

    // Build first-person arms (hierarchical joint rig + voxel aesthetic)
    this._buildHands();
  }

  // ==================== Floating Hands (Interaction-Aware) ====================
  // Narrative: You are a disembodied digital consciousness navigating the
  // decaying memory-space of an abandoned AI arcade. Without a physical body,
  // your consciousness only coalesces hands when it needs to interface with
  // data objects — arcade cabinets, memory pillars, the altar. Between
  // interactions, you are pure signal, invisible even to yourself.
  //
  // Camera: FOV=55°, near=0.08, aspect≈16:9.
  // At Z=-0.45: visible Y≈±0.23, visible X≈±0.42.
  //
  // Hands at rest (visible): screen_x≈±0.35, screen_y≈-0.80
  //   → world: X≈±0.15, Y≈-0.19, Z=-0.45
  // Hands hidden (below screen): Y≈-0.35 (screen_y≈-1.5)
  _buildHands() {
    const HAND_Z = -0.45;

    // ── Materials ──
    const skinMat = new THREE.MeshBasicMaterial({ color: 0x4a4a6a });
    const palmMat = new THREE.MeshBasicMaterial({ color: 0x555580 });
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x55ddcc, transparent: true, opacity: 0.4
    });

    /** Voxel block with neon edge-wireframe */
    const voxel = (w, h, d, mat) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
      return mesh;
    };

    // ── Right Hand ──
    this._rHand = new THREE.Group();
    this._rHand.position.set(0.15, -0.35, HAND_Z); // start hidden below screen
    this._rHand.visible = false;
    this.camera.add(this._rHand);

    const rPalm = voxel(0.075, 0.06, 0.065, skinMat);
    this._rHand.add(rPalm);

    const rThumb = voxel(0.022, 0.04, 0.022, palmMat);
    rThumb.position.set(-0.045, -0.005, 0); // inner edge
    this._rHand.add(rThumb);

    // ── Left Hand ──
    this._lHand = new THREE.Group();
    this._lHand.position.set(-0.15, -0.35, HAND_Z);
    this._lHand.visible = false;
    this.camera.add(this._lHand);

    const lPalm = voxel(0.075, 0.06, 0.065, skinMat);
    this._lHand.add(lPalm);

    const lThumb = voxel(0.022, 0.04, 0.022, palmMat);
    lThumb.position.set(0.045, -0.005, 0); // inner edge
    this._lHand.add(lThumb);

    // ── Animation state ──
    this._handsVisible = false;       // target state
    this._handsAnim = 0;              // 0=hidden, 1=visible (lerp factor)
    this._handsTargetY = -0.19;       // world Y when fully visible
    this._handsHiddenY = -0.35;       // world Y when hidden
    this._idlePhase = Math.random() * Math.PI * 2;
  }

  /**
   * Per-frame update: float animation + idle sway when visible.
   * Called from main.js render loop.
   */
  _updateHands(dt, _isMoving) {
    this._idlePhase += dt;

    // Smooth lerp toward target animation state
    const lerpSpeed = 3.5; // ~0.6s transition
    if (this._handsVisible) {
      this._handsAnim = Math.min(1, this._handsAnim + dt * lerpSpeed);
    } else {
      this._handsAnim = Math.max(0, this._handsAnim - dt * lerpSpeed);
    }

    if (this._handsAnim <= 0.001) {
      // Fully hidden
      if (this._rHand.visible) { this._rHand.visible = false; this._lHand.visible = false; }
      return;
    }

    // Make visible
    this._rHand.visible = true;
    this._lHand.visible = true;

    // Ease-out for float-up
    const t = 1 - Math.pow(1 - this._handsAnim, 3);
    const baseY = this._handsHiddenY + (this._handsTargetY - this._handsHiddenY) * t;

    // Gentle hover sway when visible
    const sway = Math.sin(this._idlePhase * 1.3) * 0.015;
    const bob  = Math.sin(this._idlePhase * 0.7 + 0.8) * 0.01;
    const y = baseY + sway;

    this._rHand.position.y = y + bob;
    this._lHand.position.y = y - bob; // opposite bob for organic feel
    this._rHand.position.x = 0.15 + Math.sin(this._idlePhase * 0.9) * 0.008;
    this._lHand.position.x = -0.15 - Math.sin(this._idlePhase * 0.9) * 0.008;
  }

  /** Show hands — call when near an interactable */
  showHands() {
    this._handsVisible = true;
  }

  /** Hide hands — call when leaving interactable range */
  hideHands() {
    this._handsVisible = false;
  }

  /** Hide/show entire hand rigs (for sitting transitions) */
  setHandsVisible(visible) {
    if (!visible) { this._handsVisible = false; this._handsAnim = 0; }
    if (this._rHand) this._rHand.visible = visible;
    if (this._lHand) this._lHand.visible = visible;
  }

  // ==================== Public API ====================

  rotate(dx, dy) {
    if (this._isSitting) return;
    this.yaw -= dx * this.sensitivityX;
    this.pitch -= dy * this.sensitivityY;
    this.pitch = THREE.MathUtils.clamp(this.pitch, this.minPitch, this.maxPitch);
  }

  getForwardFlat() {
    _euler.set(this.pitch, this.yaw, 0);
    this._forward.set(0, 0, -1).applyEuler(_euler);
    this._forward.y = 0;
    this._forward.normalize();
    return this._forward;
  }

  getRightFlat() {
    _euler.set(this.pitch, this.yaw, 0);
    this._right.set(1, 0, 0).applyEuler(_euler);
    this._right.y = 0;
    this._right.normalize();
    return this._right;
  }

  /** Begin smooth transition to sitting view.
   *  targetPos:  where the camera ends up in world space
   *  targetLook: point the camera should look at */
  sitAt(targetPos, targetLook, duration = 0.7) {
    this._isSitting = true;
    this.setHandsVisible(false);
    this._sitStartPos.copy(this.camera.position);
    // Current look-at point (1m ahead of camera)
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this._sitStartLook.copy(this.camera.position).add(dir);
    this._sitTargetPos = targetPos.clone();
    this._sitTargetLook = targetLook.clone();
    this._sitDuration = duration;
    this._sitElapsed = 0;
  }

  stand() {
    this._isSitting = false;
    this.setHandsVisible(true);
    this._sitTargetPos = null;
    this._sitTargetLook = null;
  }

  get isSitting() { return this._isSitting; }

  update(dt) {
    if (this._isSitting && this._sitTargetPos) {
      this._sitElapsed += dt;
      const t = Math.min(this._sitElapsed / this._sitDuration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      // Interpolate position
      this.camera.position.lerpVectors(this._sitStartPos, this._sitTargetPos, ease);

      // Interpolate look-at direction (vector lerp)
      const currentLook = new THREE.Vector3().lerpVectors(this._sitStartLook, this._sitTargetLook, ease);
      this.camera.lookAt(currentLook);

      // Once arrived, lock in place
      if (t >= 1) {
        this.camera.position.copy(this._sitTargetPos);
        this.camera.lookAt(this._sitTargetLook);
        this._sitTargetPos = null; // stop interpolation
      }
      return; // skip free-look rotation while sitting
    }

    // Roaming: instant rotation from yaw/pitch
    _euler.set(this.pitch, this.yaw, 0);
    this.camera.quaternion.setFromEuler(_euler);
  }

  lookAt(target) {
    this.camera.lookAt(target);
  }
}
