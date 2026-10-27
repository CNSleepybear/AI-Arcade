import * as THREE from 'three';

const THEMES = {
  anomaly: { title: 'ANOMALY', code: 'META-01', ink: '#071810', accent: '#65ef9a', secondary: '#d2e8b0' },
  'cyber-hunder': { title: 'CYBER HUNDER', code: 'HEX-02', ink: '#081523', accent: '#63ccec', secondary: '#afa0e8' },
  'dark-water-stealth': { title: 'DARK WATER', code: 'DEEP-03', ink: '#07131f', accent: '#719ed6', secondary: '#79d9ce' },
  'leave-at-6pm-evolved': { title: 'LEAVE AT 6PM', code: 'RUSH-04', ink: '#211324', accent: '#efbb82', secondary: '#e7837f' },
};

function canvasTexture(canvas) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = map.minFilter = THREE.NearestFilter;
  return map;
}

function pixel(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(x, y, w, h); }

function drawMotif(c, id, accent, secondary) {
  c.save(); c.translate(128, 195);
  if (id === 'anomaly') {
    for (let y = -100; y < 100; y += 16) for (let x = -80; x < 80; x += 16) {
      if ((x * 3 + y * 7) % 5) continue;
      pixel(c, x, y, 5, 11, accent);
    }
    pixel(c,-58,-65,116,130,accent); pixel(c,-44,-51,88,102,'#0b1d19');
    pixel(c,-32,-25,20,24,accent); pixel(c,12,-25,20,24,accent);
    pixel(c,-22,25,44,8,accent); pixel(c,-8,42,16,18,secondary);
    pixel(c,-65,-8,10,46,secondary); pixel(c,55,-8,10,46,secondary);
  } else if (id === 'cyber-hunder') {
    c.strokeStyle = accent; c.lineWidth = 7;
    for (const r of [82,58]) { c.beginPath(); for (let i=0;i<6;i++) { const a=i*Math.PI/3-Math.PI/2; const x=Math.cos(a)*r,y=Math.sin(a)*r; i?c.lineTo(x,y):c.moveTo(x,y); } c.closePath(); c.stroke(); }
    pixel(c,-20,-58,40,116,secondary); pixel(c,-58,-20,116,40,secondary);
    pixel(c,-12,-44,24,88,accent); pixel(c,-44,-12,88,24,accent); pixel(c,-8,-8,16,16,'#eef6ed');
  } else if (id === 'dark-water-stealth') {
    c.strokeStyle = accent; c.lineWidth = 3;
    for (const r of [36,62,88]) { c.beginPath(); c.ellipse(0,20,r,r*.35,0,0,Math.PI*2); c.stroke(); }
    pixel(c,-65,-25,100,50,accent); pixel(c,35,-13,45,26,accent);
    c.beginPath(); c.moveTo(-60,0); c.lineTo(-98,-38); c.lineTo(-98,38); c.closePath(); c.fillStyle=accent; c.fill();
    pixel(c,38,-14,8,8,'#eef6ed'); pixel(c,42,-12,4,4,accent);
    for (const [x,y,r] of [[-60,-65,6],[-30,-88,4],[55,-75,7]]) { c.strokeStyle=secondary;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke(); }
  } else {
    for (let i=0;i<7;i++) { const h=30+(i*37%90); pixel(c,-100+i*30,40-h,24,h,i%2?accent:secondary); }
    pixel(c,-105,45,210,8,accent); pixel(c,-80,65,160,5,secondary);
    pixel(c,-25,-5,50,34,'#111b2b'); pixel(c,-16,-28,32,25,'#111b2b');
    pixel(c,-38,27,22,22,secondary); pixel(c,20,27,22,22,secondary);
    pixel(c,-75,-70,70,8,accent); pixel(c,-92,-52,45,5,secondary);
  }
  c.restore();
}

export function cabinetSideTexture(id) {
  const theme = THEMES[id] || THEMES.anomaly;
  const canvas = document.createElement('canvas'); canvas.width=256; canvas.height=512;
  const c=canvas.getContext('2d'); c.imageSmoothingEnabled=false;
  pixel(c,0,0,256,512,theme.ink); pixel(c,12,12,232,488,'#18283a');
  pixel(c,20,20,216,472,theme.ink); pixel(c,20,20,5,472,theme.accent);
  c.fillStyle=theme.accent;c.font='10px monospace';c.fillText(`ABYSS AMUSEMENT / ${theme.code}`,35,48);
  drawMotif(c,id,theme.accent,theme.secondary);
  c.fillStyle='#e9e5d9';c.font='bold 25px monospace';c.textAlign='center';
  const words=theme.title.split(' '); let lines=[];
  if (theme.title.length>12) { const mid=Math.ceil(words.length/2);lines=[words.slice(0,mid).join(' '),words.slice(mid).join(' ')]; } else lines=[theme.title];
  lines.forEach((line,i)=>c.fillText(line,128,345+i*30));
  c.fillStyle=theme.accent;c.font='11px monospace';c.fillText('ONE MORE GAME / ONE MORE LIFE',128,421);
  for(let i=0;i<16;i++) pixel(c,35+i*11,455,4,18,i%3?theme.accent:theme.secondary);
  c.textAlign='left';c.fillStyle='#8ea4b3';c.font='9px monospace';c.fillText('© NIGHTSHIFT ARCADE · 2026',35,490);
  return canvasTexture(canvas);
}

export function cabinetControlTexture(id) {
  const theme=THEMES[id]||THEMES.anomaly;
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
  const c=canvas.getContext('2d');pixel(c,0,0,256,128,'#111d2c');
  c.strokeStyle='#405a6d';c.lineWidth=3;c.strokeRect(4,4,248,120);
  c.fillStyle=theme.accent;c.font='bold 12px monospace';c.fillText(theme.code,14,23);
  c.fillStyle='#6d8799';c.font='8px monospace';c.fillText('MOVE',37,94);c.fillText('ACTION',149,94);c.fillText('START',215,94);
  c.strokeStyle=theme.accent;c.lineWidth=2;c.beginPath();c.arc(48,58,25,0,Math.PI*2);c.stroke();
  for(const x of [155,207]) { c.beginPath();c.arc(x,58,18,0,Math.PI*2);c.stroke(); }
  for(let i=0;i<5;i++) pixel(c,93+i*5,47,2,22,'#496275');
  return canvasTexture(canvas);
}

export function buildCabinetShell(group, id, material, trim, dark, accent) {
  const profile=new THREE.Shape();
  profile.moveTo(-.44,.1);profile.lineTo(.43,.1);profile.lineTo(.43,.82);profile.lineTo(.65,.98);
  profile.lineTo(.48,1.17);profile.lineTo(.48,1.78);profile.lineTo(.34,2.1);profile.lineTo(-.44,2.1);profile.closePath();
  const geometry=new THREE.ExtrudeGeometry(profile,{depth:1,bevelEnabled:false,steps:1});
  geometry.rotateY(-Math.PI/2);geometry.translate(.5,0,0);
  const shell=new THREE.Mesh(geometry,material);shell.castShadow=shell.receiveShadow=true;group.add(shell);
  const part=(w,h,d,x,y,z,mat=trim)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;};
  for(const x of [-.36,.36]) { part(.22,.12,.72,x,.06,0,dark);part(.27,.035,.77,x,.015,0,trim); }
  const control=new THREE.Mesh(new THREE.PlaneGeometry(.76,.32),new THREE.MeshBasicMaterial({map:cabinetControlTexture(id)}));
  control.rotation.x=-Math.PI/2-.25;control.position.set(0,1.022,.51);group.add(control);
  for(const side of [-1,1]) {
    const art=new THREE.Mesh(new THREE.PlaneGeometry(.72,1.44),new THREE.MeshBasicMaterial({map:cabinetSideTexture(id)}));
    art.position.set(side*.592,1.08,-.015);art.rotation.y=side*Math.PI/2;group.add(art);
    for(const y of [.35,1.82])for(const z of [-.31,.31])part(.018,.035,.035,side*.598,y,z,accent);
  }
  for(let i=0;i<9;i++)part(.035,.025,.025,-.25+i*.063,1.91,.485,dark);
  part(.2,.3,.035,.23,.54,.455,trim);part(.13,.17,.018,.23,.57,.477,dark);
  part(.045,.105,.012,.23,.59,.49,accent);part(.12,.035,.02,.23,.45,.48,accent);
  part(.25,.11,.025,-.2,.52,.46,dark);part(.18,.025,.02,-.2,.52,.48,trim);
  return { part, shell };
}
