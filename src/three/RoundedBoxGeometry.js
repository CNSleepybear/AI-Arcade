import * as THREE from 'three';

/**
 * Creates a box geometry with rounded (beveled) edges.
 * Works by creating a high-segment BoxGeometry and lerping each vertex
 * between the box shape and a sphere — producing smooth rounded corners.
 *
 * @param {number} width
 * @param {number} height
 * @param {number} depth
 * @param {number} radius - bevel radius (0 = sharp box, 0.3 = heavily rounded)
 * @param {number} segments - subdivisions per axis (higher = smoother bevel)
 */
export class RoundedBoxGeometry extends THREE.BufferGeometry {
  constructor(width = 1, height = 1, depth = 1, radius = 0.1, segments = 4) {
    super();

    // Start from a box with enough segments for smooth roundness
    const base = new THREE.BoxGeometry(width, height, depth, segments, segments, segments);
    const pos = base.getAttribute('position');
    const norm = base.getAttribute('normal');

    const halfW = width / 2;
    const halfH = height / 2;
    const halfD = depth / 2;

    // The "inner box" size after subtracting radius from each side
    const iw = Math.max(0.001, halfW - radius);
    const ih = Math.max(0.001, halfH - radius);
    const id = Math.max(0.001, halfD - radius);

    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Sign of each axis
      const sx = Math.sign(v.x);
      const sy = Math.sign(v.y);
      const sz = Math.sign(v.z);

      // Clamp to inner box, then push outward by radius
      const cx = sx * Math.min(Math.abs(v.x), iw);
      const cy = sy * Math.min(Math.abs(v.y), ih);
      const cz = sz * Math.min(Math.abs(v.z), id);

      // Direction from inner box corner to vertex
      const dx = v.x - cx;
      const dy = v.y - cy;
      const dz = v.z - cz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > 0.0001) {
        // Normalize and scale by radius
        const scale = radius / dist;
        pos.setXYZ(i, cx + dx * scale, cy + dy * scale, cz + dz * scale);
      } else {
        pos.setXYZ(i, cx, cy, cz);
      }
    }

    // Recompute normals from modified positions
    base.computeVertexNormals();

    // Copy attributes to our geometry
    this.copy(base);
    base.dispose();
  }
}
