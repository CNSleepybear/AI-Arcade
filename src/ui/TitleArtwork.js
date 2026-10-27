/** Original, deterministic pixel diorama. No remote images or font dependencies. */
export class TitleArtwork {
  constructor(canvas, screen) {
    this.canvas = canvas;
    this.screen = screen;
    this.ctx = canvas.getContext('2d');
    this.frame = 0;
    this.draw(0);
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.observer = new MutationObserver(() => this.sync());
    this.observer.observe(screen, { attributes: true, attributeFilter: ['class', 'style'] });
    document.addEventListener('visibilitychange', () => this.sync());
    this.motion.addEventListener('change', () => this.sync());
    this.sync();
  }

  sync() {
    const visible = !this.screen.classList.contains('hidden') && !this.screen.classList.contains('fade-out') && this.screen.style.display !== 'none' && !document.hidden;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    if (!visible || this.motion.matches) return;
    const tick = (now) => {
      if (!this.lastDraw || now - this.lastDraw > 100) {
        this.draw(now / 1000);
        this.lastDraw = now;
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  draw(time) {
    const c = this.ctx;
    c.clearRect(0, 0, 640, 520);
    c.imageSmoothingEnabled = false;
    // Reset the seed every frame so only the intentional lights animate.
    let seed = 7081;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
    const poly = (points, color) => {
      c.fillStyle = color; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(Math.round(x), Math.round(y)) : c.moveTo(Math.round(x), Math.round(y))); c.closePath(); c.fill();
    };
    const p = (x, z, y = 0) => [290 + (x - z) * 23, 245 + (x + z) * 11.5 - y * 23];
    const face = (points, color) => poly(points.map(([x, z, y]) => p(x, z, y)), color);
    const block = (x, z, y, w, d, h, top, left, right) => {
      face([[x,z,y+h],[x+w,z,y+h],[x+w,z+d,y+h],[x,z+d,y+h]], top);
      face([[x,z+d,y],[x+w,z+d,y],[x+w,z+d,y+h],[x,z+d,y+h]], left);
      face([[x+w,z,y],[x+w,z+d,y],[x+w,z+d,y+h],[x+w,z,y+h]], right);
    };
    const line = (a, b, color, width = 2) => { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(...p(...a)); c.lineTo(...p(...b)); c.stroke(); };

    // Quiet skyline, orbital grid and stars behind the playable little world.
    for (let i = 0; i < 60; i++) {
      c.fillStyle = i % 4 === 0 ? '#356266' : '#23303e';
      c.fillRect(Math.floor(random() * 600) + 20, Math.floor(random() * 360) + 30, 2, 2);
    }
    c.strokeStyle = '#1a2833'; c.lineWidth = 1;
    c.beginPath(); c.ellipse(320, 401, 277, 102, 0, 0, Math.PI * 2); c.stroke();
    c.setLineDash([3, 8]); c.beginPath(); c.ellipse(320, 401, 298, 114, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    const aura = c.createRadialGradient(330, 300, 10, 330, 300, 250);
    aura.addColorStop(0, '#203b493d'); aura.addColorStop(1, '#10151d00'); c.fillStyle = aura; c.fillRect(0, 0, 640, 520);
    for (let layer = 0; layer < 2; layer++) {
      const baseY = 332 + layer * 35;
      for (let i = 0; i < 15; i++) {
        const bw = 18 + (i * 13 % 30), bh = 30 + (i * 37 % (95 - layer * 25));
        const bx = 20 + i * 42 - layer * 17;
        c.fillStyle = layer ? '#142430' : '#101d29'; c.fillRect(bx, baseY - bh, bw, bh);
        c.fillStyle = layer ? '#28404b' : '#1d303d'; c.fillRect(bx + 3, baseY - bh + 4, 2, bh - 4);
        for (let wy = baseY - bh + 10; wy < baseY - 8; wy += 13) for (let wx = bx + 7; wx < bx + bw - 4; wx += 10) {
          if ((wx + wy + i) % 4) continue;
          c.fillStyle = (i + wy) % 3 ? '#416466' : '#8b725b'; c.fillRect(wx, wy, 3, 4);
        }
        if (i % 4 === 0) { c.fillStyle = '#314552'; c.fillRect(bx + bw / 2, baseY - bh - 15, 2, 15); }
      }
    }

    // Floating foundation and individually laid floor tiles.
    block(-0.5, -0.5, -0.65, 11.8, 8.8, 0.65, '#233740', '#14222e', '#0d1721');
    for (let x = 0; x < 11; x++) for (let z = 0; z < 8; z++) {
      face([[x,z,0.02],[x+0.96,z,0.02],[x+0.96,z+0.96,0.02],[x,z+0.96,0.02]], (x+z)%2 ? '#28353b' : '#243139');
      if (random() > 0.7) line([x+0.1,z+0.25,0.03],[x+0.8,z+0.25,0.03], '#35444a', 1);
    }
    // The open-front, two-wall arcade.
    block(-0.2, -0.25, 0, 11.5, 0.25, 5.3, '#3c4e59', '#263340', '#1a2531');
    block(-0.25, 0, 0, 0.25, 8, 5.3, '#43515a', '#1a2733', '#263441');
    for (let y = 0.6; y < 5; y += 0.65) line([0,0.03,y],[11,0.03,y], '#34434b', 1);
    for (let x = 0.5; x < 11; x += 1) line([x,0.03,0],[x,0.03,5], '#1d2a35', 1);
    line([0.08,0.15,4.85],[10.95,0.15,4.85], '#68d9ce', 4);
    line([0.08,0.15,4.66],[10.95,0.15,4.66], '#315954', 2);
    line([0.12,0.1,4.85],[0.12,7.8,4.85], '#df9973', 3);

    // Back-wall lettering is drawn into the same perspective as the room.
    c.save(); const [tx, ty] = p(3.1, -0.01, 3.65); c.setTransform(1, 0.5, 0, 1, tx, ty);
    c.fillStyle = '#14232d'; c.fillRect(-8,-28,155,44); c.strokeStyle = '#587077'; c.strokeRect(-8,-28,155,44);
    c.font = 'bold 23px monospace'; c.fillStyle = '#f0d6a5'; c.fillText('AI ARCADE', 0, 0);
    c.font = '7px monospace'; c.fillStyle = '#74bbb3'; c.fillText('OPEN LATE / PLAY FOREVER', 1, 10); c.restore();
    for (const x of [3.1, 8.6]) line([x,.02,5.3],[x,.02,6.55], '#526573', 4);
    face([[2.6,.03,5.55],[9.1,.03,5.55],[9.1,.03,6.55],[2.6,.03,6.55]], '#102331');
    line([2.6,.04,5.55],[9.1,.04,5.55], '#e3ad77', 3);
    line([2.6,.04,6.55],[9.1,.04,6.55], '#67d4ca', 3);
    c.save(); const [rx, ry] = p(3.15,.05,6.17); c.setTransform(1,.5,0,1,rx,ry);
    c.font = 'bold 21px monospace'; c.fillStyle = '#f2dec2'; c.fillText('NIGHTSHIFT',0,0);
    c.font = '7px monospace'; c.fillStyle = '#72cfc6'; c.fillText('NEVER CLOSE / ALWAYS A LITTLE STRANGE',2,13); c.restore();

    // Wall vents and a small illuminated poster.
    block(0.15, 2.8, 2, 0.12, 1.7, 1.5, '#334a56', '#1e2f3d', '#b17c61');
    for (let n = 0; n < 5; n++) line([0.29,3,2.2+n*0.22],[0.29,4.3,2.2+n*0.22], '#3a3031', 2);
    face([[8.6,0.03,2.4],[10.2,0.03,2.4],[10.2,0.03,4.3],[8.6,0.03,4.3]], '#d29b6c');
    face([[8.72,0.04,2.55],[10.08,0.04,2.55],[10.08,0.04,4.16],[8.72,0.04,4.16]], '#233f49');
    for (let i = 0; i < 5; i++) block(8.9+i*0.19,0.08,2.8+i*0.12,0.13,0.02,0.7,'#96b0a0','#96b0a0','#96b0a0');

    const cabinet = (x, z, accent, screen, phase) => {
      // Soft, pixel-stepped spill on the tiled floor.
      for (let i = 3; i > 0; i--) {
        c.globalAlpha = 0.035 * (4-i); face([[x-0.12*i,z+0.6,0.04],[x+1.2+0.12*i,z+0.6,0.04],[x+1.2+0.28*i,z+1.7+i*0.2,0.04],[x-0.28*i,z+1.7+i*0.2,0.04]],accent);
      }
      c.globalAlpha = 1;
      block(x,z,0,1.25,0.9,2.7,'#384454','#182431','#101b28');
      block(x-0.05,z+0.1,2.7,1.35,0.88,0.38,accent,'#1c2b39','#233441');
      face([[x+0.08,z+0.995,2.77],[x+1.17,z+0.995,2.77],[x+1.17,z+0.995,3.0],[x+0.08,z+0.995,3.0]],accent);
      block(x+0.06,z+0.92,1.22,1.13,0.08,1.35,'#17222f','#0b1420','#28333e');
      const lit = Math.sin(time*1.4+phase) > -0.96;
      face([[x+0.18,z+1.015,1.5],[x+1.07,z+1.015,1.5],[x+1.07,z+1.015,2.4],[x+0.18,z+1.015,2.4]],lit ? screen : '#152736');
      for(let n=0;n<5;n++) line([x+0.2,z+1.02,1.6+n*0.15],[x+1.04,z+1.02,1.6+n*0.15], '#0e263e', 1);
      for (let n = 0; n < 10; n++) {
        const xx=x+0.27+random()*0.62, yy=1.6+random()*0.65;
        face([[xx,z+1.025,yy],[xx+0.07,z+1.025,yy],[xx+0.07,z+1.025,yy+0.07],[xx,z+1.025,yy+0.07]],n%2 ? '#f2c786' : '#b5e8dd');
      }
      block(x-0.03,z+0.9,1.03,1.31,0.4,0.17,'#485564','#1a2936','#253340');
      block(x+0.25,z+1.07,1.2,0.08,0.08,0.2,'#f5bca2','#c57976','#975d68');
      block(x+0.85,z+1.1,1.2,0.12,0.09,0.04,accent,accent,accent);
      line([x+0.05,z+1.01,0.15],[x+1.2,z+1.01,0.15],accent,2);
      block(x+0.5,z+1.02,0.45,0.23,0.04,0.35,'#576273','#576273','#293545');
      block(x+0.32,z+2.05,0.55,0.7,0.6,0.18,'#9a6b60','#573f47','#40313c');
      for(const sx of [0.4,0.85]) block(x+sx,z+2.13,0,0.07,0.36,0.55,'#53606b','#35414e','#202e3d');
    };
    cabinet(1.0,0.4,'#69cfc5','#276a76',0);
    cabinet(3.0,0.4,'#a49ae4','#4c477a',1.5);
    cabinet(5.0,0.4,'#e1a675','#8a6654',3);
    cabinet(7.0,0.4,'#75adbe','#2e536d',4);

    // Side-wall equipment and a hanging amber lamp.
    block(0.2,5.3,0,0.9,1.5,2.8,'#425363','#1a2b3b','#273f4e');
    block(1.11,5.45,1.1,0.02,1.16,1.35,'#e7b97e','#e7b97e','#cb9c73');
    for(let z=5.55;z<6.5;z+=0.26) line([1.14,z,1.2],[1.14,z,2.3], '#6e7772', 2);
    line([2,4.7,5.2],[2,4.7,3.8],'#65717b',2);
    block(1.6,4.3,3.5,0.8,0.8,0.3,'#796d63','#e7b77e','#a9886e');
    // Front entrance and luminous floor-edge guide.
    for(let i=0;i<3;i++) block(7.5+i*0.1,7.7+i*0.3,-0.22-i*0.2,2.4-i*0.2,0.4,0.2,'#41505a','#24323c','#182631');
    line([0,8,0.03],[7,8,0.03],'#5dada8',2);
    line([11,0,0.03],[11,8,0.03],'#5dada8',2);
    for(let x=1;x<7;x+=1.3) block(x,7.9,-0.33,0.5,0.04,0.07,'#60bdb3','#60bdb3','#60bdb3');
    // Planter, leaves and the resident pixel cat.
    block(9.4,6.4,0,0.8,0.8,0.6,'#c59d7e','#886856','#5d4d49');
    for(let i=0;i<12;i++) { const x=9.4+random()*0.65,z=6.4+random()*0.65; block(x,z,0.6,0.15,0.18,0.3+random()*0.8,'#769f8a','#426f67','#30515a'); }
    block(5.5,6.5,0,0.65,0.35,0.38,'#8f99a4','#657486','#404f64');
    block(5.45,6.45,0.3,0.35,0.35,0.35,'#a5acaf','#79879b','#53627a');
    block(5.45,6.45,0.65,0.09,0.12,0.15,'#d2a1a1','#d2a1a1','#7a8193');
    block(5.7,6.45,0.65,0.09,0.12,0.15,'#d2a1a1','#d2a1a1','#7a8193');
    line([6.13,6.55,0.2],[6.5,6.55,0.65],'#78869a',5);
    for (let i = 0; i < 7; i++) {
      const glow = .18 + .08 * Math.sin(time * 1.2 + i);
      c.globalAlpha = glow;
      face([[1+i*1.25,7.85,.04],[1.7+i*1.25,7.85,.04],[2.1+i*1.25,8.45,.04],[.7+i*1.25,8.45,.04]], i % 3 ? '#64d6cb' : '#e6ac77');
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 6; i++) block(.3+i*1.85,8.25,-.42,.8,.04,.12,i%2?'#416f74':'#8d725e',i%2?'#416f74':'#8d725e','#24313c');
    // Restrained foreground annotations.
    c.font = '9px monospace'; c.fillStyle = '#6c858c'; c.fillText('A PLACE BETWEEN WORLDS', 68, 488);
    c.fillStyle = '#d9b382'; c.fillRect(526,475,5,5); c.fillStyle = '#648c8b'; c.fillRect(536,475,5,5); c.fillStyle = '#9690bb'; c.fillRect(546,475,5,5);
  }
}
