/**
 * WorldBounds — single source of truth for player movement limits
 * and valid world-space coordinates across all systems.
 */

/** Floor level definitions */
export const FLOORS = {
  SURFACE:    { y: 0, eyeHeight: 1.6 },
  DEPTHS:     { y: -5, eyeHeight: 1.6 },
  ROOFTOP:    { y: 12, eyeHeight: 1.6 },
  SANCTUARY:  { y: 16, eyeHeight: 1.6 },
};

/** Bounds per floor */
const BOUNDS_BY_FLOOR = {
  SURFACE:    { xMin: -14.8, xMax: 14.8, zMin: -4.8, zMax: 4.8 },
  DEPTHS:     { xMin: -7.8,  xMax: 7.8,  zMin: -7.8, zMax: 7.8 },
  ROOFTOP:    { xMin: -4.8,  xMax: 4.8,  zMin: -4.8, zMax: 4.8 },
  SANCTUARY:  { xMin: -4.8,  xMax: 4.8,  zMin: -4.8, zMax: 4.8 },
};

/** Get bounds for current floor level */
export function getFloorBounds(floorKey) {
  return BOUNDS_BY_FLOOR[floorKey] || BOUNDS_BY_FLOOR.SURFACE;
}

// Legacy flat bounds (surface only, for backward compat)
export const WORLD_BOUNDS = {
  xMin: -14.8,
  xMax: 14.8,
  zMin: -4.8,
  zMax: 4.8,
  yHeight: 1.6,
};

/** Check if a world position is within player-accessible bounds */
export function isWithinBounds(x, z, floorKey = 'SURFACE') {
  const b = BOUNDS_BY_FLOOR[floorKey] || BOUNDS_BY_FLOOR.SURFACE;
  return x >= b.xMin && x <= b.xMax && z >= b.zMin && z <= b.zMax;
}

/** Clamp a position to world bounds */
export function clampToBounds(x, z, floorKey = 'SURFACE') {
  const b = BOUNDS_BY_FLOOR[floorKey] || BOUNDS_BY_FLOOR.SURFACE;
  return {
    x: Math.max(b.xMin, Math.min(b.xMax, x)),
    z: Math.max(b.zMin, Math.min(b.zMax, z)),
  };
}
