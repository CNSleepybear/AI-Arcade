import * as THREE from 'three';
import { voxelPart } from './VoxelRig.js';

const GLOVE=0x526379,PAD=0x8493a3,SEAM=0x293b50,CUFF=0x35465b,ACCENT=0x79c8be;

function makeHand(side) {
  const root=new THREE.Group();root.name=side>0?'right-signal-glove':'left-signal-glove';
  const palm=voxelPart('articulated-palm',[
    [0,0,0,.065,.041,.068,GLOVE],[0,.024,.004,.051,.012,.049,PAD],
    [0,.031,.008,.022,.006,.018,SEAM],[0,.035,.008,.012,.004,.009,ACCENT],
    [-.031,0,.005,.004,.032,.046,SEAM],[.031,0,.005,.004,.032,.046,SEAM],
    [0,-.022,.006,.047,.007,.04,SEAM],
  ]);root.add(palm);
  const cuff=voxelPart('wrist-cuff',[
    [0,-.012,.06,.069,.056,.057,CUFF],[0,.019,.044,.073,.008,.012,SEAM],
    [0,.025,.044,.047,.004,.007,ACCENT],[-.025,.018,.069,.007,.008,.023,PAD],[.025,.018,.069,.007,.008,.023,PAD],
    [0,-.017,.1,.062,.052,.025,SEAM],
  ]);root.add(cuff);
  const fingers=[];
  for(let i=0;i<4;i++) {
    const length=[.028,.035,.033,.026][i];
    const finger=voxelPart(`finger-${i}`,[[0,0,-length/2,.012,.019,length,GLOVE],[0,.011,-.009,.011,.005,.013,PAD]]);
    finger.position.set((i-1.5)*.016,0,-.035);
    const tip=voxelPart('finger-tip',[[0,0,-.013,.011,.017,.027,GLOVE],[0,.01,-.014,.008,.004,.014,SEAM]]);
    tip.position.z=-length;finger.add(tip);root.add(finger);fingers.push({finger,tip});
  }
  const thumb=voxelPart('opposable-thumb',[[0,0,-.013,.02,.023,.029,GLOVE],[0,.014,-.01,.016,.005,.019,PAD]]);
  thumb.position.set(-side*.039,-.003,.002);thumb.rotation.y=side*.65;
  const thumbTip=voxelPart('thumb-tip',[[0,0,-.012,.018,.021,.027,GLOVE]]);thumbTip.position.z=-.024;thumb.add(thumbTip);root.add(thumb);
  // A small view-model fill keeps the glove readable even in the archive.
  root.traverse(mesh=>{if(!mesh.isMesh)return;mesh.material=mesh.material.clone();mesh.material.emissive.copy(mesh.material.color);mesh.material.emissiveIntensity=.2;mesh.material.roughness=.68;mesh.castShadow=false;mesh.receiveShadow=false;});
  if(side<0) {
    const display=voxelPart('wrist-signal-display',[[0,.028,.075,.029,.004,.023,0x122e3b],[-.008,.032,.079,.004,.003,.008,ACCENT],[0,.032,.075,.004,.003,.016,ACCENT],[.008,.032,.072,.004,.003,.021,0xe8b47e]]);root.add(display);
  }
  const glass=voxelPart('held-drink',[[0,.02,0,.032,.04,.032,0xc59873],[0,.044,0,.034,.008,.034,0xdcd0ae],[0,.049,0,.025,.003,.025,0x7ec5bc]]);
  glass.position.set(0,.018,-.067);glass.visible=false;root.add(glass);
  return {root,fingers,thumb,thumbTip,side,glass};
}

export function buildHands(controller) {
  controller._handRigs=[makeHand(-1),makeHand(1)];
  controller._lHand=controller._handRigs[0].root;controller._rHand=controller._handRigs[1].root;
  for(const {root} of controller._handRigs){root.position.set(0,-.38,-.48);root.visible=false;controller.camera.add(root);}
  controller._handsVisible=false;controller._handsAnim=0;controller._idlePhase=0;
  controller._handGesture=null;controller._handGestureTime=0;controller._lookSway=new THREE.Vector2();
  controller._reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
}

export function gesture(controller,kind='reach') {
  if(controller._isSitting)return;
  controller._handGesture=kind;controller._handGestureTime=0;controller._handsVisible=true;
}

export function updateHands(controller,dt,moving) {
  const quiet=controller._reducedMotion.matches;
  controller._idlePhase+=dt;
  const showing=controller._handsVisible||controller._handGesture;
  controller._handsAnim=THREE.MathUtils.damp(controller._handsAnim,showing?1:0,showing?12:8,dt);
  if(controller._handsAnim<.005){controller._lHand.visible=false;controller._rHand.visible=false;return;}
  const type=controller._handGesture;
  const duration=type==='pet'?1.15:type==='drink'?.85:.48;
  controller._handGestureTime+=dt;
  const progress=Math.min(1,controller._handGestureTime/duration),action=type&&!quiet?Math.sin(progress*Math.PI):0;
  if(progress>=1)controller._handGesture=null;
  const visible=controller._handsAnim,t=quiet?0:controller._idlePhase;
  const offset=Math.min(.165,.48*Math.tan(THREE.MathUtils.degToRad(controller.camera.fov/2))*controller.camera.aspect*.68);
  controller._lookSway.multiplyScalar(Math.exp(-dt*10));
  for(const rig of controller._handRigs) {
    const {root,fingers,thumb,thumbTip,side,glass}=rig,right=side>0;
    glass.visible=right&&type==='drink';
    root.visible=true;
    root.position.set(side*(offset+.01*(1-visible))+Math.sin(t*.9)*.0015,-.36+.14*visible+Math.sin(t*1.5+side)*.002+(moving?Math.sin(t*8+side)*.002:0),-.48);
    root.rotation.set(-.08,side*-.12,side*-.12);
    if(!quiet){root.rotation.z+=controller._lookSway.x;root.rotation.x+=controller._lookSway.y;}
    if(right){root.position.z-=action*(type==='pet'?.025:.045);root.position.y+=action*(type==='drink'?.045:.012);root.rotation.x+=action*(type==='pet'?Math.sin(progress*Math.PI*4)*.12:type==='drink'?.5:-.15);}
    fingers.forEach(({finger,tip},i)=>{
      let curl=.22+(Math.sin(t*.8+i)*.015);
      if(right&&type)curl=type==='pet'?.1:type==='drink'?.65:i===0?.02:.45;
      finger.rotation.x=curl;tip.rotation.x=curl*.7;
      finger.rotation.y=(i-1.5)*.025;
    });
    thumb.rotation.x=.12+action*(right?.25:0);thumbTip.rotation.x=.3+action*(right?.4:0);
  }
}
