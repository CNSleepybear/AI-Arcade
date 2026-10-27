import * as THREE from 'three';
import { t } from '../data/i18n.js';

/**
 * Purely functional attract mode renderers — one per game ID.
 * Each returns a canvas rendering that ArcadeMachine calls per-frame.
 * Allows AI-generated custom attract loops without touching ArcadeMachine core.
 */

// ANOMALY: Survive the Meta — glitchy cyberpunk, rule corruption, matrix rain
export function drawAnomalyAttract(ctx, w, h, time, color) {
  ctx.fillStyle = '#020508';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;

  // Matrix-like digital rain (green falling characters)
  ctx.save();
  for (let col = 0; col < 20; col++) {
    const x = (col / 20) * w + Math.sin(time * 0.7 + col) * 8;
    const speed = 40 + (col % 5) * 25;
    const headY = ((time * speed + col * 73) % (h + 100)) - 50;
    const tailLen = 40 + (col % 3) * 30;

    for (let i = 0; i < 12; i++) {
      const cy2 = headY - i * 8;
      if (cy2 < 0 || cy2 > h) continue;
      const alpha = Math.max(0, 1 - i / 12) * 0.5;
      ctx.fillStyle = `rgba(0,255,68,${alpha})`;
      ctx.font = `${10 + Math.random() * 4}px monospace`;
      const chars = '0123456789ABCDEF';
      ctx.fillText(chars[Math.floor((Math.sin(time * 13 + col + i) * 0.5 + 0.5) * chars.length)], x, cy2);
    }
  }
  ctx.restore();

  // Pulsing corrupted hex ring
  ctx.save();
  ctx.translate(cx, cy);
  const pulse = 0.8 + 0.2 * Math.sin(time * 2.5);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + time * 0.4;
    const r = 70 * pulse;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(Math.cos(angle + 0.15) * r * 0.7, Math.sin(angle + 0.15) * r * 0.7);
    ctx.strokeStyle = `rgba(0,255,68,${0.4 + Math.sin(time * 3 + i) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff44';
    ctx.shadowBlur = 8;
    ctx.stroke();
  }
  // Corrupted inner circle
  ctx.beginPath();
  ctx.arc(0, 0, 50 * pulse, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0,255,68,0.25)`;
  ctx.lineWidth = 1;
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Random glitch blocks
  if (Math.sin(time * 5.3) > 0.93 || Math.random() < 0.03) {
    for (let g = 0; g < 4; g++) {
      const gx = Math.random() * w;
      const gy = Math.random() * h;
      const gw = 20 + Math.random() * 60;
      const gh = 4 + Math.random() * 12;
      ctx.fillStyle = `rgba(0,255,68,${0.15 + Math.random() * 0.3})`;
      ctx.fillRect(gx - gw / 2, gy, gw, gh);
      ctx.fillStyle = `rgba(255,0,100,${0.1 + Math.random() * 0.2})`;
      ctx.fillRect(gx - gw / 2 + 4, gy + 2, gw, gh * 0.7);
    }
  }

  // Rule corruption warning text
  const warningAlpha = 0.5 + 0.5 * Math.sin(time * 1.8);
  ctx.fillStyle = `rgba(255,200,0,${warningAlpha})`;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(t('attract.anomaly.warning'), cx, h * 0.22);
  ctx.fillText(t('attract.anomaly.corruption') + Math.floor((Math.sin(time * 0.7) * 0.5 + 0.5) * 100) + '%', cx, h * 0.28);

  // Title
  ctx.fillStyle = '#00ff44';
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#00ff44';
  ctx.shadowBlur = 20;
  ctx.fillText('ANOMALY', cx, h * 0.78);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = '#ffaa00';
  ctx.font = '16px monospace';
  ctx.fillText(t('attract.anomaly.subtitle'), cx, h * 0.87);

  // Scanline overlay
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = `rgba(0,0,0,0.06)`;
    ctx.fillRect(0, y, w, 1);
  }
}

// CYBER HUNDER: Hex grid, pulsing fighter, energy beams, tech overlays
export function drawCyberHunderAttract(ctx, w, h, time, color) {
  ctx.fillStyle = '#020812';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;

  // Hex grid background
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = `rgba(0,204,255,0.12)`;
  ctx.lineWidth = 0.5;
  const hexR = 28;
  for (let row = -4; row <= 4; row++) {
    for (let col = -5; col <= 5; col++) {
      const hx = col * hexR * 1.8 + (row % 2) * hexR * 0.9;
      const hy = row * hexR * 1.6;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const px = hx + Math.cos(angle) * hexR * 0.55;
        const py = hy + Math.sin(angle) * hexR * 0.55;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  // Pulsing central hex — fighter core
  ctx.save();
  ctx.translate(cx, cy - 10);
  const corePulse = 0.7 + 0.3 * Math.sin(time * 2.5);
  for (let ring = 0; ring < 3; ring++) {
    const r = (25 + ring * 18) * corePulse;
    const alpha = 0.5 - ring * 0.15;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + time * (0.3 + ring * 0.1);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(0,204,255,${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00ccff';
    ctx.shadowBlur = 8 - ring * 2;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Inner glow
  const innerGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 40);
  innerGrad.addColorStop(0, `rgba(0,204,255,${0.3 * corePulse})`);
  innerGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = innerGrad;
  ctx.fillRect(-60, -60, 120, 120);
  ctx.restore();

  // Energy beam sweeps
  for (let b = 0; b < 3; b++) {
    const bx = cx + Math.sin(time * 0.7 + b * 2.1) * 140;
    const by = cy + Math.cos(time * 0.5 + b * 1.8) * 80;
    ctx.strokeStyle = `rgba(0,204,255,${0.15 + Math.sin(time * 3 + b) * 0.1})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 10);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  // Scrolling tech data left
  ctx.fillStyle = `rgba(0,204,255,0.3)`;
  ctx.font = '9px monospace';
  for (let i = 0; i < 6; i++) {
    const ty = ((time * 30 + i * 55) % (h + 20)) - 10;
    ctx.fillText('> SYS.OK // CORE:ACTIVE // HEX:STABLE', 8, ty);
  }

  // Title
  ctx.fillStyle = '#00ccff';
  ctx.font = 'bold 38px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#00ccff';
  ctx.shadowBlur = 18;
  ctx.fillText('CYBER HUNDER', cx, h * 0.78);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = '#4488cc';
  ctx.font = '16px monospace';
  ctx.fillText(t('attract.cyber_hunder.sub'), cx, h * 0.88);

  // Scanline overlay
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = `rgba(0,0,0,0.05)`;
    ctx.fillRect(0, y, w, 1);
  }
}

// Dark Water Stealth: rippling water, lurking fish, stealth atmosphere
export function drawDarkWaterStealthAttract(ctx, w, h, time, color) {
  ctx.fillStyle = '#010812';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;

  // Water ripple layers
  for (let ring = 0; ring < 5; ring++) {
    const r = 30 + ring * 28 + Math.sin(time * 0.6 + ring) * 12;
    const alpha = 0.15 - ring * 0.025;
    ctx.beginPath();
    ctx.arc(cx, cy + 15, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,136,204,${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Caustic light patterns
  ctx.save();
  for (let i = 0; i < 20; i++) {
    const cx2 = (i / 20) * w + Math.sin(time * 0.4 + i) * 30;
    const cy2 = (i % 4) * 60 + Math.cos(time * 0.5 + i) * 20;
    const sz = 3 + Math.sin(time + i) * 2;
    ctx.beginPath();
    ctx.arc(cx2, cy2, sz, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,136,204,${0.08 + Math.random() * 0.05})`;
    ctx.fill();
  }
  ctx.restore();

  // Lurking fish silhouette
  const fishPhase = time * 0.3;
  const fishX = cx + Math.sin(fishPhase) * 100;
  const fishY = cy + 20 + Math.cos(fishPhase * 1.3) * 35;
  ctx.save();
  ctx.translate(fishX, fishY);
  const fishDir = Math.sin(fishPhase) > Math.sin(fishPhase - 0.1) ? 1 : -1;
  ctx.scale(fishDir, 1);

  // Fish body
  ctx.fillStyle = `rgba(0,136,204,0.25)`;
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.bezierCurveTo(8, -14, -14, -14, -18, 0);
  ctx.bezierCurveTo(-14, 14, 8, 14, 22, 0);
  ctx.fill();

  // Tail
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(-30, -12);
  ctx.lineTo(-30, 12);
  ctx.closePath();
  ctx.fillStyle = `rgba(0,136,204,0.15)`;
  ctx.fill();

  // Eye glow
  ctx.beginPath();
  ctx.arc(10, -3, 3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,200,255,0.5)`;
  ctx.fill();
  ctx.restore();

  // Depth particles rising
  for (let i = 0; i < 12; i++) {
    const pSeed = i * 137.5;
    const px = cx + Math.sin(time * 0.3 + pSeed) * 80;
    const py = cy + 60 - ((time * 15 + pSeed) % 120);
    const alpha = Math.max(0, 1 - py / (cy + 70));
    ctx.beginPath();
    ctx.arc(px, py, 1, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,136,204,${alpha * 0.4})`;
    ctx.fill();
  }

  // Title
  ctx.fillStyle = '#0088cc';
  ctx.font = 'bold 34px serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#0088cc';
  ctx.shadowBlur = 16;
  ctx.fillText('DARK WATER', cx, h * 0.76);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = '#335577';
  ctx.font = '15px monospace';
  ctx.fillText(t('attract.dark_water.sub'), cx, h * 0.87);
}

// Leave at 6PM Evolved: city grid, scooter trails, time pressure, golden sunset
export function drawLeaveAt6pmAttract(ctx, w, h, time, color) {
  // Sunset gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1a0a2e');
  grad.addColorStop(0.4, '#2a1040');
  grad.addColorStop(0.7, '#4a2030');
  grad.addColorStop(1, '#6a3020');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;

  // City skyline silhouette
  ctx.fillStyle = '#0a0618';
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x < w; x += 2) {
    const bh = h * 0.45 + Math.sin(x * 0.04) * 30 + Math.sin(x * 0.13) * 18 + Math.sin(x * 0.07 + 2) * 25;
    ctx.lineTo(x, bh);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Window lights
  for (let i = 0; i < 30; i++) {
    const wx = 20 + (i / 30) * (w - 40);
    const wy = h * 0.48 + Math.sin(i * 2.7) * 25;
    if (wy > h * 0.38 && wy < h * 0.65) {
      const flicker = 0.5 + 0.5 * Math.sin(time * (2 + i * 0.3) + i);
      ctx.fillStyle = `rgba(255,215,0,${0.15 + flicker * 0.25})`;
      ctx.fillRect(wx, wy, 3 + Math.random() * 3, 4);
    }
  }

  // Street grid lines
  ctx.save();
  ctx.translate(cx, h * 0.68);
  // Horizon grid
  for (let i = -5; i <= 5; i++) {
    const px = i * 30;
    ctx.beginPath();
    ctx.moveTo(px, -80);
    ctx.lineTo(px * 0.4, 30);
    ctx.strokeStyle = `rgba(255,215,0,0.08)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  ctx.restore();

  // Scooter trail — player rush
  const rushX = cx + Math.sin(time * 1.2) * 60;
  const rushY = h * 0.55 + Math.cos(time * 1.5) * 15;
  // Trail
  ctx.strokeStyle = `rgba(255,215,0,0.2)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rushX, rushY);
  ctx.lineTo(rushX - 40, rushY + 5);
  ctx.stroke();

  // Player dot
  ctx.beginPath();
  ctx.arc(rushX, rushY, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Obstacle dots (scooters/enemies)
  for (let i = 0; i < 5; i++) {
    const ox = ((time * 40 + i * 120) % (w + 60)) - 30;
    const oy = h * 0.52 + Math.sin(i * 2.1) * 20;
    ctx.beginPath();
    ctx.arc(ox, oy, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,60,40,0.6)`;
    ctx.fill();
  }

  // Time pressure — countdown bar
  const barW = w * 0.5, barH = 4;
  const barX = cx - barW / 2, barY = h * 0.2;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(barX, barY, barW, barH);
  const barProgress = 0.3 + 0.3 * Math.sin(time * 0.7);
  const barFill = ctx.createLinearGradient(barX, 0, barX + barW * barProgress, 0);
  barFill.addColorStop(0, '#ff4444');
  barFill.addColorStop(0.5, '#ffaa00');
  barFill.addColorStop(1, '#ffd700');
  ctx.fillStyle = barFill;
  ctx.fillRect(barX, barY, barW * barProgress, barH);

  // Clock display
  const clockStr = '18:0' + (Math.floor(time * 0.4) % 6);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(clockStr, cx, h * 0.16);

  // Title
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = 16;
  ctx.fillText('LEAVE AT 6PM', cx, h * 0.80);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = '#cc8844';
  ctx.font = '16px monospace';
  ctx.fillText(t('attract.leave_6pm.sub'), cx, h * 0.90);
}

function drawAttractChrome(ctx, w, h, time, accent, code) {
  ctx.save(); ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.font = 'bold 10px monospace';
  ctx.fillStyle = 'rgba(3,10,18,.78)'; ctx.fillRect(10, 10, w - 20, 25);
  ctx.fillStyle = accent; ctx.fillRect(10, 10, 3, 25); ctx.fillText(`ABYSS / ${code}`, 23, 27);
  ctx.textAlign = 'right'; ctx.fillStyle = '#b8cbd2'; ctx.fillText('INSERT COIN', w - 23, 27);
  ctx.strokeStyle = accent; ctx.globalAlpha = .45; ctx.lineWidth = 2; ctx.strokeRect(5, 5, w - 10, h - 10);
  ctx.globalAlpha = .12;
  for (let y = 0; y < h; y += 4) { ctx.fillStyle = '#000'; ctx.fillRect(0, y, w, 1); }
  ctx.globalAlpha = .35 + Math.sin(time * 2) * .08; ctx.fillStyle = accent;
  for (const [x,y,sx,sy] of [[5,5,1,1],[w-5,5,-1,1],[5,h-5,1,-1],[w-5,h-5,-1,-1]]) {
    ctx.fillRect(x, y, sx * 24, sy * 2); ctx.fillRect(x, y, sx * 2, sy * 24);
  }
  ctx.restore();
}

// Dispatch table
export const ATTRACT_RENDERERS = {
  'anomaly': (ctx,w,h,time,color) => { drawAnomalyAttract(ctx,w,h,time,color); drawAttractChrome(ctx,w,h,time,'#65ef9a','META_01'); },
  'cyber-hunder': (ctx,w,h,time,color) => { drawCyberHunderAttract(ctx,w,h,time,color); drawAttractChrome(ctx,w,h,time,'#63ccec','HEX_02'); },
  'dark-water-stealth': (ctx,w,h,time,color) => { drawDarkWaterStealthAttract(ctx,w,h,time,color); drawAttractChrome(ctx,w,h,time,'#719ed6','DEEP_03'); },
  'leave-at-6pm-evolved': (ctx,w,h,time,color) => { drawLeaveAt6pmAttract(ctx,w,h,time,color); drawAttractChrome(ctx,w,h,time,'#efbb82','RUSH_04'); },
};

export function drawDefaultAttract(ctx, w, h, time, name, subtitle, color) {
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, y, w, 2);
  }
  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = color || '#0ff';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = color || '#0ff';
  ctx.shadowBlur = 15;
  ctx.fillText(name, w / 2, h / 2 - 20);
  ctx.font = '22px monospace';
  ctx.fillStyle = '#aaa';
  ctx.shadowBlur = 5;
  ctx.shadowColor = '#aaa';
  ctx.fillText(subtitle || '', w / 2, h / 2 + 30);
  ctx.shadowBlur = 0;
}
