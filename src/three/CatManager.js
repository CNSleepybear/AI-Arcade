import * as THREE from 'three';
import { Cat } from './Cat.js';

/**
 * CatManager — places 4 cats across zones, tracks petting stats, triggers EVE.
 *
 * Cats:
 *   - 橘猫 (orange) → Plaza — near center pillar
 *   - 布偶 (ragdoll) → Tavern — near bar counter
 *   - 蓝猫 (russian_blue) → Arcade — between cabinets
 *   - 蓝白 (blue_white) → Rooftop — near telescope
 */

const CAT_PLACEMENTS = [
  {
    breed: 'orange',
    zone: 'SURFACE',
    pos: [0, 0, 2.5],
    bounds: { xMin: -4.5, xMax: 4.5, zMin: -4.5, zMax: 4.5 },
  },
  {
    breed: 'ragdoll',
    zone: 'SURFACE',
    pos: [-10, 0, 2],
    bounds: { xMin: -14.5, xMax: -6.5, zMin: -4.5, zMax: 4.5 },
  },
  {
    breed: 'russian_blue',
    zone: 'SURFACE',
    pos: [10, 0, -2],
    bounds: { xMin: 6.5, xMax: 14.5, zMin: -4.5, zMax: 4.5 },
  },
  {
    breed: 'blue_white',
    zone: 'ROOFTOP',
    pos: [1, 12, -1],
    bounds: { xMin: -4.5, xMax: 4.5, zMin: -4.5, zMax: 4.5 },
  },
];

/**
 * Achievement milestones:
 *   - pet_any: 1 unique cat   → 猫奴初体验
 *   - pet_all: 4 unique cats  → 铲屎官
 *   - pet_20:  20 total pets  → 猫薄荷
 */
const ACHIEVEMENT_CHECKS = {
  pet_any: (stats) => stats.uniqueCats >= 1,
  pet_all: (stats) => stats.uniqueCats >= 4,
  pet_20: (stats) => stats.totalPets >= 20,
};

export class CatManager {
  constructor(scene) {
    this.scene = scene;
    /** @type {Cat[]} */
    this.cats = [];

    // Pet tracking (persisted in save)
    this.stats = {
      totalPets: 0,
      uniqueCats: 0,
      petBreeds: {},  // { orange: 5, ragdoll: 2, ... }
    };

    // Callbacks
    this._onPet = null;       // (cat, result) => void
    this._onAchievement = null; // (achId) => void

    for (const cfg of CAT_PLACEMENTS) {
      const spawnPos = new THREE.Vector3(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      const cat = new Cat(cfg.breed, spawnPos, cfg.bounds);
      this.cats.push(cat);
      cat.group.visible = cfg.zone === 'SURFACE';
      scene.add(cat.group);
    }
  }

  /** Load save data for pet tracking */
  loadSave(save) {
    if (save._catStats) {
      this.stats.totalPets = save._catStats.totalPets || 0;
      this.stats.uniqueCats = save._catStats.uniqueCats || 0;
      this.stats.petBreeds = save._catStats.petBreeds || {};
    }
  }

  /** Save pet tracking data */
  saveTo(save) {
    save._catStats = {
      totalPets: this.stats.totalPets,
      uniqueCats: this.stats.uniqueCats,
      petBreeds: { ...this.stats.petBreeds },
    };
  }

  /** Set callback for pet events */
  onPet(fn) { this._onPet = fn; }
  onAchievement(fn) { this._onAchievement = fn; }

  /** Find nearest cat on current floor within range (2D horizontal distance) */
  getNearbyCat(worldPos, range = 2.5, currentFloor = 'SURFACE') {
    let nearest = null;
    let nearestDist = range;
    for (let i = 0; i < this.cats.length; i++) {
      const cat = this.cats[i];
      const cfg = CAT_PLACEMENTS[i];
      if (cfg.zone !== currentFloor) continue;
      // 2D horizontal distance (cats are at floor level, camera is at eye height)
      const dx = cat.group.position.x - worldPos.x;
      const dz = cat.group.position.z - worldPos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = cat;
      }
    }
    return nearest;
  }

  /** Pet a cat, update stats, check achievements */
  petCat(cat, playerPos) {
    const result = cat.pet(playerPos);
    if (!result) return null; // cooldown

    // Update stats
    this.stats.totalPets++;
    if (!this.stats.petBreeds[result.breed]) {
      this.stats.petBreeds[result.breed] = 0;
      this.stats.uniqueCats = Object.keys(this.stats.petBreeds).length;
    }
    this.stats.petBreeds[result.breed]++;

    // Fire callback
    if (this._onPet) this._onPet(cat, result);

    // Check achievements
    const newly = [];
    for (const [id, check] of Object.entries(ACHIEVEMENT_CHECKS)) {
      if (check(this.stats)) {
        newly.push(id);
      }
    }
    if (newly.length > 0 && this._onAchievement) {
      for (const id of newly) this._onAchievement(id);
    }

    return result;
  }

  /** Update all cats */
  update(dt, playerPos, currentFloor) {
    for (const cat of this.cats) {
      // Only update cats on the current floor
      const catCfg = CAT_PLACEMENTS.find(c => c.breed === cat.breed);
      if (catCfg && catCfg.zone === currentFloor) {
        cat.update(dt, playerPos);
      }
    }
  }

  /** Set visibility for cats on a specific floor */
  setFloorVisible(floorKey, visible) {
    for (let i = 0; i < this.cats.length; i++) {
      const cat = this.cats[i];
      const cfg = CAT_PLACEMENTS[i];
      if (cfg.zone === floorKey) {
        cat.group.visible = visible;
      }
    }
  }
}
