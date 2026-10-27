import * as THREE from 'three';

function makeTexture(canvas) {
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.magFilter=map.minFilter=THREE.NearestFilter;return map;
}

let metalMap;
export function brushedMetalTexture() {
  if(metalMap)return metalMap;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');
  c.fillStyle='#d9dde0';c.fillRect(0,0,64,64);
  for(let y=0;y<64;y+=4){c.fillStyle=y%8?'#cbd1d5':'#e5e8e9';c.fillRect(0,y,64,1);}
  c.fillStyle='#aeb8bf';c.fillRect(0,0,64,2);c.fillRect(0,62,64,2);c.fillRect(0,0,2,64);c.fillRect(62,0,2,64);
  c.fillStyle='#f5f3e9';c.fillRect(2,2,60,1);c.fillRect(2,2,1,60);
  for(const [x,y] of [[5,5],[58,5],[5,58],[58,58]]){c.fillStyle='#77858f';c.fillRect(x,y,2,2);c.fillStyle='#f0f0e8';c.fillRect(x,y,1,1);}
  for(let i=0;i<12;i++){const x=(i*23)%54+4,y=(i*37)%54+4;c.fillStyle='#b4bdc2';c.fillRect(x,y,4+(i%7),1);}
  metalMap=makeTexture(canvas);metalMap.wrapS=metalMap.wrapT=THREE.RepeatWrapping;return metalMap;
}

function text(c,value,x,y,size=16,color='#dce7e5',align='left'){c.fillStyle=color;c.font=`bold ${size}px monospace`;c.textAlign=align;c.fillText(value,x,y);}
function grid(c,w,h,color){c.strokeStyle=color;c.lineWidth=1;for(let x=16;x<w;x+=32){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}for(let y=16;y<h;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}}
function frame(c,w,h,accent,code){c.fillStyle='#0b1624';c.fillRect(0,0,w,h);grid(c,w,h,'#27405255');c.strokeStyle='#4c6478';c.lineWidth=3;c.strokeRect(8,8,w-16,h-16);c.fillStyle=accent;c.fillRect(8,8,5,h-16);text(c,`ABYSS VISUAL ARCHIVE / ${code}`,28,34,11,accent);}

export function muralTexture(kind) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  const accents={plaza:'#afa0e8',arcade:'#79d9ce',tavern:'#e8b47e',depths:'#afa0e8',rooftop:'#e8b47e',sanctuary:'#e8b47e'};
  const accent=accents[kind]||'#79d9ce';frame(c,512,256,accent,kind.toUpperCase());
  if(kind==='plaza'){
    text(c,'DESCEND / REMEMBER',28,70,24);
    c.strokeStyle=accent;c.lineWidth=4;for(const r of [28,48,68]){c.beginPath();c.ellipse(355,139,r,r*.65,0,0,Math.PI*2);c.stroke();}
    c.fillStyle='#e9e5d9';c.fillRect(347,105,16,68);c.fillStyle=accent;c.fillRect(351,113,8,52);
    for(let i=0;i<5;i++){c.fillStyle=i===4?accent:'#52677a';c.fillRect(32+i*38,112+i*17,28,5);}
    text(c,'SURFACE',28,208,11,'#849cac');text(c,'B1 / MEMORY VAULT',28,229,12,accent);
  }else if(kind==='arcade'){
    text(c,'HIGH SCORE HEROES',28,69,24);
    const colors=['#79d9ce','#afa0e8','#e8b47e'];
    for(let i=0;i<3;i++){const x=66+i*112;c.fillStyle=colors[i];c.fillRect(x,104,54,54);c.fillStyle='#0d1b29';c.fillRect(x+8,112,38,38);c.fillStyle=colors[i];c.fillRect(x+15,121,8,8);c.fillRect(x+32,121,8,8);c.fillRect(x+19,140,24,4);text(c,`0${i+1}`,x+27,184,12,colors[i],'center');}
    text(c,'09',427,144,58,'#eee8db','center');text(c,'CONTINUES',427,169,10,accent,'center');
    c.fillStyle=accent;c.fillRect(28,213,454,3);text(c,'YOUR NEXT STORY STARTS WITH ONE CREDIT.',28,238,11,'#9db2bf');
  }else if(kind==='tavern'){
    text(c,'BONE & STRING',28,70,25);text(c,'LIVE AT THE IRON ANCHOR',28,94,11,accent);
    c.fillStyle='#e8e0cf';c.fillRect(66,120,50,45);c.fillRect(74,165,34,25);c.fillRect(82,190,18,7);c.fillStyle='#132031';c.fillRect(75,132,10,12);c.fillRect(97,132,10,12);c.fillRect(85,157,12,5);
    c.strokeStyle=accent;c.lineWidth=5;c.beginPath();c.moveTo(147,190);c.lineTo(205,112);c.stroke();c.fillStyle=accent;c.fillRect(175,109,42,30);
    for(let i=0;i<18;i++){const h=18+(i*29%68);c.fillStyle=i%3?accent:'#e7837f';c.fillRect(251+i*12,192-h,7,h);}
    text(c,'GOOD DRINKS. LOST SOULS. GREAT MUSIC.',28,232,11,'#a9b7bd');
  }else if(kind==='depths'){
    text(c,'MEMORY CIRCUIT / 07',28,68,23);
    c.strokeStyle='#766a9c';c.lineWidth=3;for(let i=0;i<5;i++){c.beginPath();c.moveTo(28,105+i*23);c.lineTo(180+i*22,105+i*23);c.lineTo(180+i*22,220);c.stroke();c.fillStyle=accent;c.fillRect(174+i*22,99+i*23,12,12);}
    c.strokeStyle=accent;c.lineWidth=5;c.beginPath();c.arc(391,147,54,0,Math.PI*2);c.stroke();c.beginPath();c.ellipse(391,147,74,25,.5,0,Math.PI*2);c.stroke();c.fillStyle='#e8e5df';c.fillRect(382,138,18,18);
    text(c,'DO NOT DISCONNECT',391,229,11,accent,'center');
  }else if(kind==='rooftop'){
    text(c,'NIGHT OBSERVATION LOG',28,68,22);
    c.strokeStyle='#688397';c.lineWidth=2;for(const r of [30,55,80]){c.beginPath();c.arc(340,151,r,0,Math.PI*2);c.stroke();}c.beginPath();c.moveTo(245,151);c.lineTo(470,151);c.moveTo(340,75);c.lineTo(340,230);c.stroke();
    c.fillStyle=accent;for(const [x,y] of [[298,120],[370,104],[390,171],[320,191],[356,144]]){c.fillRect(x,y,6,6);}
    text(c,'35° 41′ N',28,118,14,accent);text(c,'CLEAR / 12°C',28,146,12,'#a2b6c2');text(c,'LOOK UP. STAY A WHILE.',28,216,12,accent);
  }else{
    text(c,'SEVEN WORLDS / ONE HOME',28,68,22);
    c.strokeStyle='#6c8195';c.lineWidth=2;c.beginPath();c.moveTo(51,158);c.bezierCurveTo(130,62,332,74,460,153);c.bezierCurveTo(353,235,151,235,51,158);c.stroke();
    const pts=[[99,146],[164,119],[225,166],[289,110],[344,161],[403,123],[442,173]];
    pts.forEach(([x,y],i)=>{c.fillStyle=i%2?accent:'#afa0e8';c.fillRect(x-6,y-6,12,12);if(i){c.strokeStyle='#526a7e';c.beginPath();c.moveTo(pts[i-1][0],pts[i-1][1]);c.lineTo(x,y);c.stroke();}});
    text(c,'TRAVEL SLOWLY / NOTICE EVERYTHING',28,231,11,'#a2b6c2');
  }
  return makeTexture(canvas);
}

export function muralMesh(kind,width=3.2) {
  const map=muralTexture(kind);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/2),new THREE.MeshBasicMaterial({map,toneMapped:false}));mesh.name=`Mural-${kind}`;return mesh;
}
