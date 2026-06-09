import * as THREE from 'three';

/**
 * ParticleBurst — simple Minecraft-style block particle effects.
 *
 * Usage:
 *   ParticleBurst.spawn(scene, worldPos, { count: 12, color: 0xffcc00, life: 1.2 });
 */

const ACTIVE_BURSTS = [];

export class ParticleBurst {
  /**
   * Spawn a burst of pixel block particles at a world position.
   * @param {THREE.Scene} scene
   * @param {THREE.Vector3|{x:number,y:number,z:number}} pos
   * @param {object} opts
   * @param {number} [opts.count=8]      - number of particles
   * @param {number} [opts.color=0xffffff] - base color
   * @param {number} [opts.spread=0.8]    - max spawn radius
   * @param {number} [opts.life=1.0]      - lifetime in seconds
   * @param {number} [opts.size=0.04]     - particle cube size
   * @param {number} [opts.speed=1.5]     - upward velocity
   */
  static spawn(scene, pos, opts = {}) {
    const count = opts.count ?? 8;
    const color = new THREE.Color(opts.color ?? 0xffffff);
    const spread = opts.spread ?? 0.8;
    const life = opts.life ?? 1.0;
    const size = opts.size ?? 0.04;
    const speed = opts.speed ?? 1.5;

    const group = new THREE.Group();
    group.position.copy(pos);

    const particles = [];

    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshBasicMaterial({
        color: color.clone().offsetHSL((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.2),
        transparent: true,
        opacity: 1,
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.set(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.5,
        (Math.random() - 0.5) * spread
      );
      p.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * speed * 0.6,
          Math.random() * speed + 0.5,
          (Math.random() - 0.5) * speed * 0.6
        ),
        elapsed: 0,
        life,
      };
      group.add(p);
      particles.push(p);
    }

    scene.add(group);
    ACTIVE_BURSTS.push({ group, particles, elapsed: 0, life });
  }

  /**
   * Call every frame. Auto-removes expired bursts.
   * @param {number} dt
   */
  static update(dt) {
    for (let b = ACTIVE_BURSTS.length - 1; b >= 0; b--) {
      const burst = ACTIVE_BURSTS[b];
      burst.elapsed += dt;

      if (burst.elapsed >= burst.life) {
        burst.group.parent?.remove(burst.group);
        ACTIVE_BURSTS.splice(b, 1);
        continue;
      }

      const progress = burst.elapsed / burst.life;
      for (const p of burst.particles) {
        p.userData.elapsed += dt;
        const t = p.userData.elapsed / p.userData.life;
        p.position.add(p.userData.velocity.clone().multiplyScalar(dt));
        p.userData.velocity.y -= 2 * dt; // gravity
        p.material.opacity = Math.max(0, 1 - t);
        p.scale.setScalar(1 - t * 0.5);
        p.rotation.x += dt * 4;
        p.rotation.y += dt * 3;
      }
    }
  }
}

export default ParticleBurst;
