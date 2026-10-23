import * as THREE from 'three';
import { buildHands, updateHands, gesture } from './HandRig.js';

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
  // HandRig owns articulated fingers, context gestures, view sway and adaptive
  // placement inside the camera frustum. The interaction API stays unchanged.
  _buildHands() { buildHands(this); }

  _updateHands(dt, isMoving) { updateHands(this, dt, isMoving); }

  gesture(kind) { gesture(this, kind); }

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
    if (!visible) { this._handsVisible = false; this._handsAnim = 0; this._handGesture = null; }
    if (this._rHand) this._rHand.visible = visible;
    if (this._lHand) this._lHand.visible = visible;
  }

  // ==================== Public API ====================

  rotate(dx, dy) {
    if (this._isSitting) return;
    this.yaw -= dx * this.sensitivityX;
    this.pitch -= dy * this.sensitivityY;
    this.pitch = THREE.MathUtils.clamp(this.pitch, this.minPitch, this.maxPitch);
    this._lookSway.x = THREE.MathUtils.clamp(this._lookSway.x - dx * .0002, -.045, .045);
    this._lookSway.y = THREE.MathUtils.clamp(this._lookSway.y - dy * .00015, -.035, .035);
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
