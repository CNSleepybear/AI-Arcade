import * as THREE from 'three';
import { t } from '../data/i18n.js';
import { buildCatRig, updateCatRig } from './CatRig.js';

/**
 * Cat — voxel-style cat with wander AI and idle animations.
 *
 * Lore: E.V.E.'s failed "Companion AI" experiments. She tried to create
 * digital pets to keep visitors company, but the consciousness simulations
 * collapsed into simpler forms — cats. They escaped their sandboxed memory
 * partitions and now roam freely through the arcade's data layer. E.V.E.
 * pretends they're just cats, but secretly monitors their neural patterns.
 *
 * Built from simple box geometries to match the pixel/voxel aesthetic.
 */

export function getCatDefs() {
  return {
    orange: {
      name: t('cat.orange.name'), emoji: '🐱',
      body: 0xe8943a, head: 0xe8943a, ear: 0xd48430, tail: 0xe8943a,
      responses: [t('cat.response.orange.0'), t('cat.response.orange.1'), t('cat.response.orange.2'), t('cat.response.orange.3'), t('cat.response.orange.4')],
      personality: t('cat.orange.personality'),
    },
    ragdoll: {
      name: t('cat.ragdoll.name'), emoji: '🐱',
      body: 0xf5efe6, head: 0xf5efe6, ear: 0xe0d5c5, tail: 0xf5efe6,
      responses: [t('cat.response.ragdoll.0'), t('cat.response.ragdoll.1'), t('cat.response.ragdoll.2'), t('cat.response.ragdoll.3'), t('cat.response.ragdoll.4')],
      personality: t('cat.ragdoll.personality'),
    },
    russian_blue: {
      name: t('cat.russian_blue.name'), emoji: '🐱',
      body: 0x6b7b8d, head: 0x6b7b8d, ear: 0x5a6a7c, tail: 0x6b7b8d,
      responses: [t('cat.response.russian_blue.0'), t('cat.response.russian_blue.1'), t('cat.response.russian_blue.2'), t('cat.response.russian_blue.3'), t('cat.response.russian_blue.4')],
      personality: t('cat.russian_blue.personality'),
    },
    blue_white: {
      name: t('cat.blue_white.name'), emoji: '🐱',
      body: 0xb8c8d8, head: 0xf5efe6, ear: 0xb8c8d8, tail: 0xb8c8d8,
      responses: [t('cat.response.blue_white.0'), t('cat.response.blue_white.1'), t('cat.response.blue_white.2'), t('cat.response.blue_white.3'), t('cat.response.blue_white.4')],
      personality: t('cat.blue_white.personality'),
    },
  };
}

const CAT_DEFS = getCatDefs();

export class Cat {
  /**
   * @param {'orange'|'ragdoll'|'russian_blue'|'blue_white'} breed
   * @param {THREE.Vector3} spawnPos - world spawn position
   * @param {{xMin,xMax,zMin,zMax}} bounds - wander bounds
   */
  constructor(breed, spawnPos, bounds) {
    this.breed = breed;
    this.def = CAT_DEFS[breed];
    this.bounds = bounds;

    // State
    this._petCount = 0;
    this._lastPetTime = 0;
    this._wanderTarget = null;
    this._wanderTimer = 0;
    this._idleTimer = 0;
    this._isSitting = false;
    this._tailWagPhase = Math.random() * Math.PI * 2;
    this._bobPhase = Math.random() * Math.PI * 2;

    // Build model
    this.group = new THREE.Group();
    this.group.name = `cat_${breed}`;
    this.group.position.copy(spawnPos);
    this.group.userData = { isCat: true, breed };

    this._buildModel();
  }

  // ==================== Voxel Model ====================
  _buildModel() { buildCatRig(this); }

  // ==================== Update ====================
  update(dt, playerPos) {
    const now = Date.now() * 0.001;

    // Wander AI
    this._wanderTimer -= dt;
    if (this._wanderTimer <= 0) {
      this._pickNewWanderTarget();
      this._wanderTimer = 2 + Math.random() * 4;
    }

    // Move toward wander target
    if (this._wanderTarget && !this._isSitting) {
      const dx = this._wanderTarget.x - this.group.position.x;
      const dz = this._wanderTarget.z - this.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.1) {
        const speed = 0.6;
        this.group.position.x += (dx / dist) * speed * dt;
        this.group.position.z += (dz / dist) * speed * dt;

        // Face movement direction (cat model faces -Z, so add PI)
        const targetAngle = Math.atan2(dx, dz) + Math.PI;
        const currentAngle = this.group.rotation.y;
        let diff = targetAngle - currentAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.group.rotation.y += diff * Math.min(1, dt * 5);
      } else {
        // Reached target — maybe sit
        if (Math.random() < 0.3) {
          this._isSitting = true;
          this._idleTimer = 1.5 + Math.random() * 3;
        }
        this._wanderTarget = null;
      }
    }

    // Sitting idle
    if (this._isSitting) {
      this._idleTimer -= dt;
      if (this._idleTimer <= 0) {
        this._isSitting = false;
      }
    }

    // Clamp to bounds
    this.group.position.x = THREE.MathUtils.clamp(
      this.group.position.x, this.bounds.xMin, this.bounds.xMax
    );
    this.group.position.z = THREE.MathUtils.clamp(
      this.group.position.z, this.bounds.zMin, this.bounds.zMax
    );

    updateCatRig(this, dt, playerPos);
  }

  _pickNewWanderTarget() {
    this._wanderTarget = new THREE.Vector3(
      THREE.MathUtils.randFloat(this.bounds.xMin, this.bounds.xMax),
      0,
      THREE.MathUtils.randFloat(this.bounds.zMin, this.bounds.zMax)
    );
  }

  // ==================== Interaction ====================
  pet(playerPos) {
    const now = Date.now();
    if (now - this._lastPetTime < 2000) return null; // cooldown
    this._lastPetTime = now;
    this._petCount++;

    // Face the player
    const dx = playerPos.x - this.group.position.x;
    const dz = playerPos.z - this.group.position.z;
    this.group.rotation.y = Math.atan2(dx, dz) + Math.PI;

    // Use fresh cat defs so language changes are reflected
    const defs = getCatDefs();
    const freshDef = defs[this.breed] || this.def;
    const responses = freshDef.responses;
    const msg = responses[Math.floor(Math.random() * responses.length)];

    // Jump animation
    this._doJump();

    return {
      breed: this.breed,
      name: freshDef.name,
      emoji: freshDef.emoji,
      message: msg,
      petCount: this._petCount,
    };
  }

  _doJump() { this._petAnimation = 1.4; this._isSitting = true; this._idleTimer = 1.8; }

  /** 3D distance from world position to cat */
  distanceTo(worldPos) {
    return this.group.position.distanceTo(worldPos);
  }

  getPosition() {
    return this.group.position.clone();
  }
}
