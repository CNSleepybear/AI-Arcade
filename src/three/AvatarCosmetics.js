import * as THREE from 'three';
import { SaveManager } from '../data/saveManager.js';

/**
 * Avatar visual effects that appear when the player sits at a machine.
 * Effects unlock based on game progress (cross-game persistence).
 *
 * - Roshambo: 10 wins → floating red geometric aura
 * - Abyss Angler: caught boss → fishing rod prop
 * - Paper Ritual: completed → ash particles
 */
export class AvatarCosmetics {
  constructor(avatarGroup) {
    this.group = avatarGroup;
    this.activeEffects = [];
    this.particleSystems = [];

    this._checkUnlocks();
  }

  _checkUnlocks() {
    const save = SaveManager.load();
    const char = save.characters[save.currentCharId] || {};

    // Roshambo mastery
    if ((char.roshamboWins || 0) >= 5) {
      this._addGeometricAura('#ff4444');
    } else if ((char.roshamboWins || 0) >= 3) {
      this._addGeometricAura('#ff6644');
    }

    // Abyss Angler boss
    if (char.abyssAnglerBoss) {
      this._addFishingRodProp();
    }

    // Paper Ritual completed
    if (char.paperRitualCompleted) {
      this._addAshParticles();
    }
  }

  _addGeometricAura(color) {
    const auraGroup = new THREE.Group();
    auraGroup.position.y = 1.1;

    // Rotating tetrahedron behind player
    const auraGeo = new THREE.TetrahedronGeometry(0.2, 0);
    const auraMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.7
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.z = -0.35;
    auraGroup.add(aura);

    // Small orbiting particles
    const particleGroup = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const dotGeo = new THREE.SphereGeometry(0.03, 4, 4);
      const dotMat = new THREE.MeshBasicMaterial({ color });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.userData = { angle: (i / 5) * Math.PI * 2, radius: 0.4, speed: 1.5 + Math.random() };
      particleGroup.add(dot);
    }
    auraGroup.add(particleGroup);
    this.particleSystems.push(particleGroup);

    this.group.add(auraGroup);
    this.activeEffects.push({ type: 'aura', group: auraGroup, color });
  }

  _addFishingRodProp() {
    const rodGroup = new THREE.Group();
    rodGroup.position.y = 0.6;
    rodGroup.rotation.x = 0.3;

    // Rod shaft
    const shaftGeo = new THREE.CylinderGeometry(0.015, 0.02, 1.0, 6);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.5 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 0.15;
    rodGroup.add(shaft);

    // Line
    const lineGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.4, 4);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.6 });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.position.set(0.3, -0.05, 0);
    line.rotation.z = -0.4;
    rodGroup.add(line);

    rodGroup.position.set(0.3, 0.6, -0.1);
    this.group.add(rodGroup);
    this.activeEffects.push({ type: 'rod', group: rodGroup });
  }

  _addAshParticles() {
    const ashGroup = new THREE.Group();
    ashGroup.position.y = 1.0;

    for (let i = 0; i < 20; i++) {
      const dotGeo = new THREE.SphereGeometry(0.015, 3, 3);
      const dotMat = new THREE.MeshBasicMaterial({
        color: 0xaaaaaa,
        transparent: true,
        opacity: 0.5
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.userData = {
        baseY: (Math.random() - 0.5) * 0.8,
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      };
      dot.position.set(
        (Math.random() - 0.5) * 0.6,
        dot.userData.baseY,
        (Math.random() - 0.5) * 0.4
      );
      ashGroup.add(dot);
    }

    this.group.add(ashGroup);
    this.particleSystems.push(ashGroup);
    this.activeEffects.push({ type: 'ash', group: ashGroup });
  }

  update(dt) {
    const t = Date.now() * 0.001;

    for (const ps of this.particleSystems) {
      for (const child of ps.children) {
        if (child.userData.radius !== undefined) {
          // Orbiting particle
          child.userData.angle += child.userData.speed * dt;
          const a = child.userData.angle;
          const r = child.userData.radius;
          child.position.set(Math.cos(a) * r, Math.sin(a * 0.5) * 0.15, Math.sin(a) * r);
        } else if (child.userData.baseY !== undefined) {
          // Rising ash
          child.position.y = child.userData.baseY + Math.sin(t * child.userData.speed + child.userData.phase) * 0.3;
          child.material.opacity = 0.3 + 0.2 * Math.sin(t * 0.7 + child.userData.phase);
        }
      }
    }

    // Rotate geometric auras
    for (const eff of this.activeEffects) {
      if (eff.type === 'aura') {
        eff.group.rotation.y += dt * 0.8;
        eff.group.rotation.x += dt * 0.3;
      }
    }
  }

  /** Called when avatar sits — make cosmetics visible */
  show() {
    for (const eff of this.activeEffects) {
      eff.group.visible = true;
    }
  }

  /** Called when avatar stands */
  hide() {
    for (const eff of this.activeEffects) {
      eff.group.visible = false;
    }
  }
}
