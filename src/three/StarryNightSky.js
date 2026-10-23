import * as THREE from 'three';

/** An original painted panorama: short impasto strokes follow authored currents. */
export class StarryNightSky {
  constructor() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = 1024;
    const c = canvas.getContext('2d');
    let seed = 1889;
    const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
    const w = canvas.width, h = canvas.height;
    const base = c.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#0b193c'); base.addColorStop(.44, '#193d6e'); base.addColorStop(.62, '#496b89'); base.addColorStop(.77, '#14253f'); base.addColorStop(1, '#080f22');
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    const blues = ['#214678', '#2b5485', '#3a6a9a', '#567fa1', '#749da9', '#173563', '#a2b9b1'];
    // Flow around multiple vortices blends into a long, sinuous horizon current.
    const vortices = [[380, 318, 230], [1070, 300, 280], [1640, 365, 205]];
    for (let i = 0; i < 23000; i++) {
      const x = random() * w, y = random() * 660;
      let angle = .17 + Math.cos(x / 170 + y / 160) * .3;
      for (const [vx, vy, radius] of vortices) {
        const dx = x - vx, dy = (y - vy) * 1.35, d = Math.hypot(dx, dy);
        if (d < radius) { const weight = (1 - d / radius) ** .4; angle = angle * (1 - weight) + (Math.atan2(dy, dx) + 1.32 + d / radius * .5) * weight; }
      }
      const band = Math.sin(y / 13 + Math.sin(x / 180) * 3.5);
      c.strokeStyle = blues[Math.min(6, Math.floor(random() * 4 + (band > .5 ? 2 : 0)))];
      c.globalAlpha = .3 + random() * .5;
      c.lineWidth = 1.2 + random() * 3.4; c.lineCap = 'round';
      const length = 5 + random() * 15;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(angle + .12) * length * .5, y + Math.sin(angle + .12) * length * .5, x + Math.cos(angle) * length, y + Math.sin(angle) * length); c.stroke();
    }
    c.globalAlpha = 1;
    // Sweeping cobalt ribbons, built out of broken pale brush marks.
    for (const [vx, vy, radius] of vortices) {
      for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 280; i++) {
        const a = i * .033 + arm * Math.PI * 2 / 3, r = 8 + i / 280 * radius;
        const x = vx + Math.cos(a) * r, y = vy + Math.sin(a) * r * .53;
        c.strokeStyle = i % 5 ? '#8bacb2' : '#d2c891'; c.globalAlpha = .2 + random() * .38;
        c.lineWidth = 2 + random() * 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.sin(a) * 8, y + Math.cos(a) * 4); c.stroke();
      }
    }
    const stars = [[.05,.16,15],[.13,.35,20],[.23,.12,17],[.31,.42,12],[.42,.19,23],[.51,.08,13],[.59,.39,18],[.68,.15,16],[.76,.30,12],[.91,.15,24],[.96,.42,14]];
    for (const [u,v,r] of stars) {
      const x=u*w,y=v*h;
      for (let ring=4;ring>0;ring--) {
        c.globalAlpha=.13; c.fillStyle=ring%2?'#d5b960':'#9bb6b7'; c.beginPath();c.ellipse(x,y,r+ring*7,(r+ring*7)*.9,0,0,Math.PI*2);c.fill();
        for(let i=0;i<36;i++){const a=i/36*Math.PI*2,rr=r+ring*7;c.globalAlpha=.55;c.strokeStyle=i%3?'#c6ba78':'#7e9ca5';c.lineWidth=2;c.beginPath();c.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.9);c.lineTo(x+Math.cos(a+.1)*rr,y+Math.sin(a+.1)*rr*.9);c.stroke();}
      }
      c.globalAlpha=1;c.fillStyle='#efdb96';c.beginPath();c.ellipse(x,y,r*.6,r*.65,0,0,Math.PI*2);c.fill();c.fillStyle='#fff0be';c.fillRect(x-2,y-4,4,8);
    }
    // Amber crescent with circular paint ridges; it sits above the horizon.
    const mx=w*.823,my=h*.19;
    for(let i=7;i>0;i--){c.globalAlpha=.10;c.strokeStyle='#dfc66e';c.lineWidth=4;c.beginPath();c.arc(mx,my,28+i*5,0,Math.PI*2);c.stroke();}
    c.globalAlpha=1;c.fillStyle='#eed58a';c.beginPath();c.arc(mx,my,29,0,Math.PI*2);c.fill();c.fillStyle='#284a76';c.beginPath();c.arc(mx-12,my-8,28,0,Math.PI*2);c.fill();
    // Layered ridges stay below eye level and wrap seamlessly around the sphere.
    for(let layer=0;layer<3;layer++){
      c.fillStyle=['#1b3551','#12263d','#0c1c30'][layer];c.beginPath();c.moveTo(0,h);
      for(let x=0;x<=w;x+=8)c.lineTo(x,610+layer*38+Math.sin(x/w*Math.PI*8+layer)*24+Math.sin(x/w*Math.PI*18)*11);
      c.lineTo(w,h);c.closePath();c.fill();
    }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=THREE.RepeatWrapping; map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;
    // Blend the seam in a narrow overlap without mirroring the entire painting.
    const seam=c.getImageData(0,0,24,h);c.putImageData(seam,w-24,0);map.needsUpdate=true;
    this.uniforms={uTime:{value:0},uPaint:{value:map}};
    const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:this.uniforms,
      vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'varying vec2 vUv; uniform sampler2D uPaint; uniform float uTime; void main(){vec3 color=texture2D(uPaint,vUv).rgb;float light=.985+.015*sin(uTime*.18+vUv.x*12.0);gl_FragColor=vec4(color*light,1.0);}'
    });
    this.mesh=new THREE.Mesh(new THREE.SphereGeometry(55,48,32),material);this.mesh.name='PaintedStarryNight';this.mesh.position.y=1.6;this.mesh.renderOrder=-1000;this.mesh.frustumCulled=false;
  }
}
