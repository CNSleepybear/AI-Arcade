import * as THREE from 'three';
import { mergeStaticMeshes } from './VoxelRig.js';

export const NIGHTSHIFT = Object.freeze({ ink: 0x111b2b, slate: 0x2d3d50, cyan: 0x72d9ce, amber: 0xe8b47e, violet: 0xafa0e8 });

function texture(canvas) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = map.minFilter = THREE.NearestFilter;
  return map;
}

/** Repeating industrial tiles with deliberate seams rather than random noise. */
export function nightshiftTiles() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d');
  c.fillStyle = '#182436'; c.fillRect(0, 0, 64, 64);
  for (let x = 0; x < 64; x += 32) for (let y = 0; y < 64; y += 32) {
    c.fillStyle = (x + y) % 64 ? '#344153' : '#2e3b4c'; c.fillRect(x + 1, y + 1, 30, 30);
    c.fillStyle = '#435166'; c.fillRect(x + 2, y + 2, 28, 1);
    c.fillStyle = '#657180'; c.fillRect(x + 4, y + 4, 1, 1); c.fillRect(x + 27, y + 27, 1, 1);
    c.fillStyle = '#293547'; c.fillRect(x + 6, y + 17, 12, 1); c.fillRect(x + 21, y + 10, 5, 1);
  }
  const map = texture(canvas); map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

function signTexture(title, subtitle, accent, type = 'sign') {
  const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = type === 'poster' ? 512 : 128;
  const c = canvas.getContext('2d'), h = canvas.height;
  const color = '#' + new THREE.Color(accent).getHexString();
  c.fillStyle = '#101c2c'; c.fillRect(0, 0, 384, h);
  c.strokeStyle = '#405166'; c.lineWidth = 2; c.strokeRect(6, 6, 372, h - 12);
  c.fillStyle = color; c.fillRect(16, 16, 4, h - 32);
  if (type === 'poster') {
    // Original geometric print: descending sun over a pixel city.
    c.fillStyle = color;
    for (let i = 0; i < 11; i++) {
      const half = Math.sqrt(Math.max(0, 92 * 92 - (i * 16 - 80) ** 2));
      c.fillRect(Math.round(200-half), 58+i*16, Math.round(half*2), i > 6 ? 6 : 12);
    }
    for (let i = 0; i < 12; i++) {
      const height = 35 + (i * 47 % 105);
      c.fillStyle = i % 2 ? '#263b51' : '#1c3046'; c.fillRect(32+i*28, 290-height, 24, height);
      c.fillStyle = color; c.fillRect(38+i*28, 299-height, 3, 5);
    }
    c.fillStyle = '#718797'; c.font = '12px monospace'; c.fillText('ABYSS CULTURE / VOL. 01', 32, 330);
    c.fillStyle = '#eee6d9'; c.font = 'bold 34px monospace';
    title.split('\n').forEach((text, i) => c.fillText(text, 32, 380+i*40));
    c.fillStyle = color; c.font = '14px monospace'; c.fillText(subtitle, 32, h-32);
    c.fillRect(300, h-48, 5, 18); c.fillRect(310, h-48, 2, 18); c.fillRect(317, h-48, 8, 18);
  } else {
    c.fillStyle = color; c.font = '11px monospace'; c.fillText('ABYSS DISTRICT / NIGHTSHIFT', 34, 29);
    c.fillStyle = '#eee6d9';
    let fontSize = 28;
    do { c.font = `bold ${fontSize}px monospace`; fontSize--; } while(c.measureText(title).width > 296 && fontSize > 14);
    c.fillText(title, 32, 67);
    c.fillStyle = '#97aeb9'; c.font = '12px monospace'; c.fillText(subtitle, 34, 101, 320);
    c.fillStyle = color; c.fillRect(340, 44, 18, 18);
  }
  return texture(canvas);
}

/** Adds authored set dressing to existing zone groups, preserving floor visibility. */
export class NightshiftArt {
  constructor(world) {
    this.time = 0;
    this.motes = [];
    this._dummy = new THREE.Object3D();
    this._reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._materials = new Map();
    this._cube = new THREE.BoxGeometry(1, 1, 1);
    this._plaza(world.plaza.group);
    this._arcade(world.arcade.group);
    this._tavern(world.tavern.group);
    this._depths(world.depths.group);
    this._rooftop(world.rooftop.group);
    this._sanctuary(world.sanctuary.group);
    world.machines.forEach((machine, i) => this._cabinet(machine, i));
    this._motes(world.tavern.group, -14, -7, NIGHTSHIFT.amber);
    this._motes(world.plaza.group, -4.5, 4.5, NIGHTSHIFT.cyan);
  }

  _material(color, glow = false) {
    const key = `${color}:${glow}`;
    if (!this._materials.has(key)) this._materials.set(key, glow
      ? new THREE.MeshBasicMaterial({ color })
      : new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.25 }));
    return this._materials.get(key);
  }

  _box(group, x, y, z, w, h, d, color, glow = false) {
    const mesh = new THREE.Mesh(this._cube, this._material(color, glow));
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.receiveShadow = !glow;
    group.add(mesh); return mesh;
  }

  _sign(group, x, y, z, w, title, subtitle, accent, rotation = 0, poster = false) {
    const map = signTexture(title, subtitle, accent, poster ? 'poster' : 'sign');
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * map.image.height / map.image.width), new THREE.MeshBasicMaterial({ map }));
    mesh.position.set(x, y, z); mesh.rotation.y = rotation;
    group.add(mesh); return mesh;
  }

  _pool(group, x, z, w, d, color) {
    // Pixel-stepped light spill is baked into one plane, with no extra lights.
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    const c = canvas.getContext('2d');
    for (let i = 0; i < 12; i++) {
      c.fillStyle = `rgba(${color},${0.012 + i * 0.0015})`;
      c.fillRect(i, i, 32-i*2, 32-i*2);
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: texture(canvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.025, z); group.add(mesh);
  }

  _plaza(g) {
    // Recessed ceiling frames and asymmetric guides leave the central pillar clear.
    for (const x of [-3.4, 3.4]) {
      this._box(g,x,3.86,0,0.12,0.12,9.4,NIGHTSHIFT.slate);
      this._box(g,x,3.78,0,0.045,0.03,8.6,NIGHTSHIFT.cyan,true);
      this._box(g,x,0.028,0,0.035,0.018,8.5,0x437e83,true);
    }
    this._sign(g,-4.82,3.06,0,2.6,'01 / IRON ANCHOR','BAR · MUSIC · ROOFTOP',NIGHTSHIFT.amber,Math.PI/2);
    this._sign(g,4.82,3.06,0,2.6,'02 / THE HIVE','GAMES · HIGH SCORES',NIGHTSHIFT.cyan,-Math.PI/2);
    this._sign(g,-3.1,2,4.81,1.25,'STAY\nCURIOUS.','EXPLORE THE UNKNOWN',NIGHTSHIFT.amber,Math.PI,true);
    this._sign(g,3.1,2,4.81,1.25,'BEYOND\nTHE VOID.','A WORLD IS WAITING',NIGHTSHIFT.violet,Math.PI,true);
    this._pool(g,0,-3,7,3,'87,170,189');
    for (const x of [-4.6,4.6]) {
      this._box(g,x,0.14,-3.6,0.48,0.28,0.48,0x46505b);
      for(let i=0;i<5;i++) this._box(g,x+(i%2)*0.12-0.06,0.55+i*0.07,-3.6+(i%3)*0.08,0.09,0.55,0.1,i%2?0x386e65:0x5e9380);
    }
  }

  _arcade(g) {
    for(const z of [-4.77,4.77]) {
      this._box(g,10.5,2.78,z,8.6,0.18,0.14,NIGHTSHIFT.ink);
      this._box(g,10.5,2.79,z+(z<0?0.08:-0.08),8.4,0.035,0.02,z<0?NIGHTSHIFT.cyan:NIGHTSHIFT.violet,true);
      this._box(g,10.5,0.06,z,8.5,0.1,0.1,NIGHTSHIFT.slate);
    }
    for (const x of [7,9.3,11.6,13.9]) this._box(g,x,3.86,0,0.16,0.22,9.6,0x1a283b);
    this._sign(g,14.81,2.8,0,3,'THE HIVE / 02','ONE MORE GAME. ONE MORE LIFE.',NIGHTSHIFT.cyan,-Math.PI/2);
    this._sign(g,14.81,1.85,-2.3,1.15,'AFTER\nHOURS.','PLAY UNTIL THE SUN',NIGHTSHIFT.violet,-Math.PI/2,true);
    this._sign(g,14.81,1.85,2.3,1.15,'INSERT\nDREAMS.','CONTINUE?  09',NIGHTSHIFT.amber,-Math.PI/2,true);
    for(const z of [-2.5,2.5]) this._box(g,10.5,0.022,z,8.2,0.012,0.025,0x4d9e9e,true);
    // A compact service terminal against the east wall.
    this._box(g,14.48,0.65,0,0.55,1.3,0.8,0x26374a);
    this._box(g,14.18,0.85,0,0.025,0.58,0.56,NIGHTSHIFT.cyan,true);
    this._sign(g,14.14,0.9,0,0.48,'TOKENS','24 / 7',NIGHTSHIFT.cyan,-Math.PI/2);
    this._pool(g,10.5,-3.7,8,3,'76,186,190');
    this._pool(g,10.5,3.7,8,3,'147,112,199');
  }

  _tavern(g) {
    this._sign(g,-10.3,3.18,4.8,3.4,'THE IRON ANCHOR','GOOD DRINKS. LOST SOULS.',NIGHTSHIFT.amber,Math.PI);
    for(const z of [-4.78,4.78]) {
      this._box(g,-10.5,3.65,z,8.5,0.16,0.15,0x302a30);
      this._box(g,-10.5,3.56,z,8.2,0.025,0.035,0xdda776,true);
    }
    this._sign(g,-14.81,2.5,1.5,1.2,'SLOW\nNIGHTS.','LIVE MUSIC / EVERY NIGHT',NIGHTSHIFT.amber,Math.PI/2,true);
    this._box(g,-10.25,0.2,3.205,5.4,0.035,0.02,0xc38f60,true);
    this._pool(g,-10.25,2.4,6.6,2.2,'218,145,79');
  }

  _depths(g) {
    const structure = new THREE.Group(); structure.name='ArchiveInfrastructure';g.add(structure);
    for(const x of [-6.8,-3.4,3.4,6.8]) {
      this._box(structure,x,3.7,0,.13,.22,15,0x243349);
      for(const z of [-6.5,6.5]) this._box(structure,x,1.8,z,.18,3.6,.18,0x29384e);
    }
    for(const x of [-7.55,7.55]) {
      this._box(structure,x,3.25,0,.12,.12,14.5,0x526077);
      this._box(structure,x,3.04,0,.05,.05,14.5,0x64789e,true);
      for(let z=-6;z<=6;z+=2) this._box(structure,x,3.2,z,.25,.32,.06,0x1c293c);
    }
    for(const x of [-5.6,5.6]) for(let z=1.5;z<6;z+=.7) this._box(structure,x,.018,z,.035,.012,.32,0x587b87,true);
    for(let i=0;i<4;i++) {
      const x=-5.6+i*.95;
      this._box(structure,x,1,-7.6,.72,2,.35,0x26364b);
      for(let row=0;row<7;row++) {
        this._box(structure,x,.35+row*.2,-7.405,.58,.12,.02,0x101b2a);
        this._box(structure,x+.22,.35+row*.2,-7.386,.035,.035,.015,row%3?0x74b9af:0xc39677,true);
      }
    }
    this._sign(g,-4.2,2.65,-7.38,3,'THE MEMORY VAULT','ARCHIVE / RESONANCE / RECOVERY',NIGHTSHIFT.violet);
    this._sign(g,5.05,1.4,-7.7,2.2,'STILL WATER','FISHING / LISTEN BEFORE YOU CAST',NIGHTSHIFT.cyan);
    this._sign(g,-7.72,2.2,3.3,2.6,'FRAGMENTS REMAIN','FOLLOW THE SIGNAL. TAKE YOUR TIME.',NIGHTSHIFT.violet,Math.PI/2);
    mergeStaticMeshes(structure);
    // Broken concentric light segments frame the existing dream core and altar.
    for(let i=0;i<24;i++) {
      const angle = i/24*Math.PI*2;
      const mesh = this._box(g,Math.sin(angle)*6.7,0.02,Math.cos(angle)*6.7,0.48,0.014,0.04,i%3===0?NIGHTSHIFT.cyan:0x66568f,true);
      mesh.rotation.y = angle;
    }
    for(const x of [-7.79,7.79]) {
      this._box(g,x,2,0,0.06,0.03,14,0x544a80,true);
      this._sign(g,x,2.6,-4,2.4,'MEMORY / ARCHIVE','SOME THINGS NEVER FADE.',NIGHTSHIFT.violet,x<0?Math.PI/2:-Math.PI/2);
    }
    this._pool(g,0,-2,8,8,'92,70,165');
  }

  _rooftop(g) {
    const terrace=new THREE.Group();terrace.name='ObservatoryTerrace';g.add(terrace);
    for(const x of [-3.4,3.4]) {
      this._box(terrace,x,.48,2.5,1.9,.13,.58,0x6c6c70);
      this._box(terrace,x,.85,2.77,1.9,.56,.09,0x46546b);
      for(const dx of [-.65,.65])this._box(terrace,x+dx,.22,2.5,.09,.44,.42,0x25364c);
      this._box(terrace,x,.27,3.7,1.5,.54,.55,0x334456);
      for(let i=0;i<8;i++)this._box(terrace,x-.6+i*.17,.7+(i%3)*.1,3.7,.11,.4+(i%3)*.15,.22,0x527782);
    }
    for(let i=0;i<64;i++){
      const a=i/64*Math.PI*2,r=1.45;
      const marker=this._box(terrace,Math.sin(a)*r,.022,Math.cos(a)*r+1,.018,.012,i%8===0?.16:.06,i%8===0?0xb8aa84:0x526d82,true);marker.rotation.y=a;
    }
    this._sign(g,-4.63,1.35,-.2,2.3,'A SKY TO STAY FOR','SLOW LIGHT / AFTER THE LAST GAME',NIGHTSHIFT.amber,Math.PI/2);
    this._sign(g,2,1.45,-3.65,1.55,'NIGHT OBSERVATORY','OPTICS 07 / LOOK UP',NIGHTSHIFT.cyan);
    mergeStaticMeshes(terrace);
    g.add(new THREE.HemisphereLight(0xa5c9df, 0x243149, 0.9));
    // A distant city in two instanced batches. Buildings sit beyond the railings.
    const count = 58, windows = [], dummy = new THREE.Object3D();
    const city = new THREE.InstancedMesh(this._cube, this._material(0x142237), count);
    for(let i=0;i<count;i++) {
      const angle = i/count*Math.PI*2, radius=18+(i%5)*4;
      const height=2.5+(i*17%13), width=1.1+(i%4)*0.6;
      const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
      dummy.position.set(x,height/2-5,z); dummy.scale.set(width,height,width); dummy.rotation.y=-angle; dummy.updateMatrix(); city.setMatrixAt(i,dummy.matrix);
      // Windows on the face toward the deck, colored individually in one draw.
      for(let row=0;row<Math.floor(height/0.8);row++) for(let col=0;col<2;col++) {
        if((row*7+col*3+i)%5===0) continue;
        const inward = new THREE.Vector3(-x,0,-z).normalize();
        const tangent = new THREE.Vector3(-inward.z,0,inward.x);
        windows.push({x:x+inward.x*(width/2+0.02)+tangent.x*(col-0.5)*width*0.4,y:-4.6+row*0.8,z:z+inward.z*(width/2+0.02)+tangent.z*(col-0.5)*width*0.4,angle:Math.atan2(inward.x,inward.z),color:i%4===0?0xd3a277:i%3===0?0x766aab:0x5c9ba3});
      }
    }
    // The box face rotation must use the same inward-facing axis as the windows.
    for(let i=0;i<count;i++) {
      city.getMatrixAt(i,dummy.matrix); dummy.matrix.decompose(dummy.position,dummy.quaternion,dummy.scale);
      dummy.rotation.set(0,Math.atan2(-dummy.position.x,-dummy.position.z),0); dummy.updateMatrix(); city.setMatrixAt(i,dummy.matrix);
    }
    city.instanceMatrix.needsUpdate=true; g.add(city);
    const lights = new THREE.InstancedMesh(this._cube, new THREE.MeshBasicMaterial({color:0xffffff}), windows.length);
    windows.forEach((w,i)=>{dummy.position.set(w.x,w.y,w.z);dummy.rotation.set(0,w.angle,0);dummy.scale.set(0.19,0.3,0.025);dummy.updateMatrix();lights.setMatrixAt(i,dummy.matrix);lights.setColorAt(i,new THREE.Color(w.color));});
    lights.instanceMatrix.needsUpdate=true; g.add(lights);
    for(const z of [-4.8,4.8]) this._box(g,0,0.04,z,9.5,0.025,0.035,0x57778d,true);
    this._sign(g,-4.82,1.1,1.5,2.5,'END OF THE DAY','TAKE A BREATH. LOOK UP.',NIGHTSHIFT.amber,Math.PI/2);
    // Small seating cluster stays at the perimeter, away from the telescope.
    for(const z of [1.5,3.3]) {
      this._box(g,4.3,0.35,z,0.6,0.16,1.4,0x53546a);
      this._box(g,4.56,0.65,z,0.1,0.6,1.4,0x3d4157);
      for(const dz of [-0.5,0.5]) this._box(g,4.3,0.16,z+dz,0.48,0.32,0.08,0x273343);
    }
  }

  _sanctuary(g) {
    g.add(new THREE.HemisphereLight(0xb5ced8,0x383144,1.1));
    for(const x of [-1.1,1.1])this._box(g,x,.025,1.8,.025,.012,5.3,0x927e61,true);
    for(let i=0;i<7;i++)this._box(g,-4.2+i*1.4,4.8,-4.75,.8,.045,.06,0xddc9a5,true);
    for(const x of [-1.65,1.65]) this._box(g,x,0.04,0,0.025,0.012,9,0x8b7ba7,true);
    this._sign(g,0,4.1,-4.81,4,'THE WORLD / IN MINIATURE','SEVEN PLACES. A THOUSAND STORIES.',NIGHTSHIFT.violet);
  }

  _cabinet(machine, index) {
    const g=machine.group, accent=machine.accentColor.getHex();
    for(const side of [-1,1]) {
      const map = signTexture(['META\nBREAK.','NEON\nHUNT.','DEEP\nDIVE.','CLOCK\nOUT.'][index%4],`PLAYER ${String(index+1).padStart(2,'0')} / READY`,accent,'poster');
      const art = new THREE.Mesh(new THREE.PlaneGeometry(0.62,1.3), new THREE.MeshBasicMaterial({map}));
      art.position.set(side*0.506,1.05,0);art.rotation.y=side*Math.PI/2;g.add(art);
    }
    this._box(g,0,0.13,0.44,0.85,0.035,0.025,accent,true);
    this._box(g,0.23,0.55,0.44,0.18,0.28,0.04,0x4d5967);
    this._box(g,0.23,0.6,0.465,0.035,0.11,0.015,0x101b29);
    this._box(g,0.23,0.48,0.466,0.09,0.025,0.015,accent,true);
    for(let i=0;i<4;i++) this._box(g,-0.2,0.48+i*0.055,0.44,0.2,0.018,0.025,0x101c2b);
  }

  _motes(g, minX, maxX, color) {
    const count = 36;
    const mesh = new THREE.InstancedMesh(this._cube, new THREE.MeshBasicMaterial({color,transparent:true,opacity:.45,depthWrite:false}),count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
    const particles=Array.from({length:count},(_,i)=>({x:minX+(i*0.61803398875%1)*(maxX-minX),z:-4+(i*0.41421356%1)*8,y:i*0.7320508%1,phase:i*2.4}));
    g.add(mesh);this.motes.push({mesh,particles});
  }

  update(dt) {
    this.time+=dt;
    for(const {mesh,particles} of this.motes) {
      particles.forEach((p,i)=>{
        const t=this._reduced.matches?0:this.time;
        this._dummy.position.set(p.x+Math.sin(t*.15+p.phase)*.14,.4+((p.y+t*.018)%1)*3,p.z+Math.cos(t*.12+p.phase)*.1);
        this._dummy.rotation.set(0,t*.2+p.phase,0);this._dummy.scale.setScalar(.012+.014*(.5+.5*Math.sin(t+p.phase)));
        this._dummy.updateMatrix();mesh.setMatrixAt(i,this._dummy.matrix);
      });mesh.instanceMatrix.needsUpdate=true;
    }
  }
}
