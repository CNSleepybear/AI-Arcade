/** Keep square retro pixels without oversampling portrait or high-DPI screens. */
export function getRenderViewport(width, height) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const scale = Math.min(1, 960 / w, 720 / h);
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}
