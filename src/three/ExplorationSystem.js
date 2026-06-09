import * as THREE from 'three';
import { SaveManager } from '../data/saveManager.js';
import { t } from '../data/i18n.js';

/**
 * Exploration system: poster lore examine + memory shard collectibles.
 * - Near a poster → press E to read lore (floating text overlay)
 * - Memory shards are hidden glowing orbs scattered in corners
 * - Collect 3 shards → unlocks the hidden 4th machine
 */
export class ExplorationSystem {
  constructor(scene) {
    this.scene = scene;
    this.shards = [];
    this.shardsCollected = 0;
    this.posterLoreActive = null;
    this.onAllShardsCollected = null; // callback when 3/3 shards collected

    this._buildMemoryShards();
    this._buildPosterLore();
  }

  // ==================== Memory Shards ====================
  _buildMemoryShards() {
    const save = SaveManager.load();
    this.shardsCollected = save.shardsCollected || 0;

    const shardDefs = [
      { x: -9,  y: 0.6, z: -2.5, hint: t('shard.hint_1') },
      { x: 9,   y: 0.6, z: 2.5,  hint: t('shard.hint_2') },
      { x: -2,  y: 0.5, z: 3.5,  hint: t('shard.hint_3') },
    ];

    for (let i = 0; i < shardDefs.length; i++) {
      const sd = shardDefs[i];
      const collected = i < this.shardsCollected;

      if (collected) continue; // Already picked up — invisible

      // Glowing crystal shard
      const group = new THREE.Group();
      group.position.set(sd.x, sd.y, sd.z);

      // Core
      const coreGeo = new THREE.OctahedronGeometry(0.08, 0);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xcc44ff,
        emissive: 0xcc44ff,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.5
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core);

      // Outer glow ring
      const ringGeo = new THREE.TorusGeometry(0.12, 0.015, 8, 12);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xcc44ff,
        transparent: true,
        opacity: 0.5
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      group.add(ring);

      // Floating light
      const light = new THREE.PointLight(0xcc44ff, 3, 3, 2);
      light.position.y = 0.2;
      group.add(light);

      this.scene.add(group);

      this.shards.push({
        index: i,
        group,
        core,
        ring,
        light,
        position: new THREE.Vector3(sd.x, sd.y, sd.z),
        hint: sd.hint,
        collected: false
      });
    }
  }

  // ==================== Poster Lore ====================
  _buildPosterLore() {
    this.posterLoreMap = new Map();

    const loreDefs = [
      {
        pos: new THREE.Vector3(-10, 2.0, -6), radius: 2.5,
        title: t('lore.abyss.title'),
        text: t('lore.abyss.text'),
      },
      {
        pos: new THREE.Vector3(-10, 1.8, 2), radius: 2.5,
        title: t('lore.anomaly.title'),
        text: t('lore.anomaly.text'),
      },
      {
        pos: new THREE.Vector3(10, 2.2, -4), radius: 2.5,
        title: t('lore.dark_water.title'),
        text: t('lore.dark_water.text'),
      },
      {
        pos: new THREE.Vector3(10, 1.6, 4), radius: 2.5,
        title: t('lore.cyber_hunder.title'),
        text: t('lore.cyber_hunder.text'),
      },
    ];

    for (const ld of loreDefs) {
      this.posterLoreMap.set(`${ld.pos.x},${ld.pos.y},${ld.pos.z}`, ld);
    }
  }

  /** Check proximity to any lore object and return it, or null */
  getNearbyLore(playerPos) {
    let closest = null, closestDist = Infinity;
    for (const [key, ld] of this.posterLoreMap) {
      const dist = playerPos.distanceTo(ld.pos);
      if (dist < ld.radius && dist < closestDist) {
        closestDist = dist;
        closest = ld;
      }
    }
    return closest;
  }

  /** Check proximity to any uncollected shard and return it, or null */
  getNearbyShard(playerPos, pickupDist = 2.5) {
    let closest = null, closestDist = Infinity;
    for (const s of this.shards) {
      if (s.collected) continue;
      const dist = playerPos.distanceTo(s.position);
      if (dist < pickupDist && dist < closestDist) {
        closestDist = dist;
        closest = s;
      }
    }
    return closest;
  }

  /** Collect a shard */
  collectShard(shard) {
    shard.collected = true;
    shard.group.visible = false;
    shard.light.intensity = 0;
    this.shardsCollected++;

    const save = SaveManager.load();
    save.shardsCollected = this.shardsCollected;

    // Unlock the hidden 4th machine on 3 shards
    if (this.shardsCollected >= 3 && !save.hiddenMachineUnlocked) {
      save.hiddenMachineUnlocked = true;
      // Unlock all locked characters
      for (const c of Object.values(save.characters)) {
        c.unlocked = true;
      }
      // Fire callback so ArcadeHall can spawn the hidden machine
      if (typeof this.onAllShardsCollected === 'function') {
        this.onAllShardsCollected();
      }
    }

    SaveManager.save(save);
    return this.shardsCollected;
  }

  update(dt) {
    const t = Date.now() * 0.001;
    for (const s of this.shards) {
      if (s.collected) continue;
      // Float & rotate
      s.core.rotation.y += dt * 1.5;
      s.ring.rotation.x += dt * 0.8;
      s.ring.rotation.z += dt * 0.6;
      s.group.position.y = s.position.y + Math.sin(t * 2 + s.index) * 0.06;
      // Pulse light
      s.light.intensity = 2.5 + Math.sin(t * 3 + s.index) * 1.5;
    }
  }
}
