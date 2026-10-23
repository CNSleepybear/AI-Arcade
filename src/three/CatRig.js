import * as THREE from 'three';
import { voxelPart } from './VoxelRig.js';

export function buildCatRig(cat) {
  const d=cat.def,breed=cat.breed;
  const cream=breed==='russian_blue'?0xa1b0bc:0xffe9cb;
  const dark=breed==='orange'?0x9a5335:breed==='ragdoll'?0x79675f:0x4a5d74;
  const sock=breed==='orange'?0xffd4a0:breed==='russian_blue'?0x7f91a2:0xf9f1e4;
  const fur=d.body;
  const bodyBoxes=[
    [0,.24,.03,.34,.27,.55,fur],[0,.23,.26,.3,.24,.14,fur],
    [0,.21,-.23,.25,.23,.09,cream],[0,.12,.08,.28,.09,.4,sock],
  ];
  if(breed==='orange')for(const z of [-.13,.02,.17]) {
    bodyBoxes.push([0,.38,z,.24,.016,.045,dark],[-.175,.28,z,.015,.12,.04,dark],[.175,.28,z,.015,.12,.04,dark]);
  }
  if(breed==='blue_white')bodyBoxes.push([-.08,.38,.07,.15,.015,.28,0x6c819b]);
  const body=voxelPart('body',bodyBoxes);cat.group.add(body);cat._body=body;
  const head=voxelPart('head',[
    [0,0,0,.3,.25,.26,d.head],[0,-.09,-.08,.25,.09,.2,cream],
    [-.09,-.05,-.145,.11,.08,.055,cream],[.09,-.05,-.145,.11,.08,.055,cream],
    [-.105,.155,.015,.095,.1,.085,d.ear],[.105,.155,.015,.095,.1,.085,d.ear],
    [-.115,.215,.015,.055,.035,.065,d.ear],[.115,.215,.015,.055,.035,.065,d.ear],
    [-.105,.155,-.033,.045,.065,.014,0xcf8c8b],[.105,.155,-.033,.045,.065,.014,0xcf8c8b],
    [0,-.045,-.181,.035,.024,.016,0xc28289],[0,-.073,-.177,.012,.025,.012,0x715963],
    [-.026,-.085,-.177,.04,.009,.012,0x715963],[.026,-.085,-.177,.04,.009,.012,0x715963],
    [-.16,-.055,-.144,.1,.008,.009,0xc5c6ba],[.16,-.055,-.144,.1,.008,.009,0xc5c6ba],
    [-.16,-.08,-.14,.08,.008,.009,0xc5c6ba],[.16,-.08,-.14,.08,.008,.009,0xc5c6ba],
  ]);
  head.position.set(0,.44,-.255);cat.group.add(head);cat._head=head;
  if(breed==='ragdoll') {
    const mask=voxelPart('mask',[[-.087,.015,-.134,.09,.1,.016,dark],[.087,.015,-.134,.09,.1,.016,dark]]);head.add(mask);
  }
  if(breed==='orange')head.add(voxelPart('tabby-mark',[[0,.08,-.136,.028,.08,.01,dark],[-.055,.09,-.136,.024,.055,.01,dark],[.055,.09,-.136,.024,.055,.01,dark]]));
  const eyes=voxelPart('eyes',[-1,1].flatMap(side=>[
    [side*.071,.014,-.149,.06,.057,.021,breed==='ragdoll'||breed==='blue_white'?0x74c2dc:0xbad27c],
    [side*.071,.014,-.162,.019,.051,.006,0x172332],
    [side*.071-.012,.029,-.168,.012,.012,.005,0xfff6df],
  ]));head.add(eyes);cat._eyes=eyes;
  const collar=voxelPart('collar',[[0,.33,-.2,.32,.035,.055,breed==='orange'?0x4b9d9e:0xb38fae],[0,.3,-.234,.04,.05,.012,0xe8c58a]]);cat.group.add(collar);
  cat._legs=[];
  for(const [i,x,z] of [[0,-.12,-.2],[1,.12,-.2],[2,-.12,.2],[3,.12,.2]]) {
    const leg=voxelPart(`paw-${i}`,[[0,-.065,0,.085,.14,.095,fur],[0,-.125,-.018,.1,.055,.13,sock],[-.022,-.151,-.065,.008,.008,.025,dark],[.022,-.151,-.065,.008,.008,.025,dark]]);
    leg.position.set(x,.175,z);cat.group.add(leg);cat._legs.push(leg);
  }
  const tail=voxelPart('tail',Array.from({length:5},(_,i)=>[0,i*.026,i*.078,.07-i*.006,.07-i*.005,.095,breed==='orange'&&i%2?dark:i===4?sock:d.tail]));
  tail.position.set(0,.27,.28);cat.group.add(tail);cat._tail=tail;
  const heart=voxelPart('affection',[[-.04,.025,0,.06,.06,.022,0xe9a0b2],[.04,.025,0,.06,.06,.022,0xe9a0b2],[0,-.025,0,.1,.06,.022,0xe9a0b2],[0,-.065,0,.04,.025,.022,0xe9a0b2]]);
  heart.visible=false;heart.position.y=.9;cat.group.add(heart);cat._heart=heart;
  cat._rigTime=0;cat._petAnimation=0;cat._floorY=cat.group.position.y;
  cat._reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
}

export function updateCatRig(cat,dt,playerPos) {
  cat._rigTime+=dt;
  const t=cat._rigTime,quiet=cat._reduced.matches,moving=cat._wanderTarget&&!cat._isSitting;
  const affection=Math.max(0,cat._petAnimation-dt);cat._petAnimation=affection;
  cat._tail.rotation.z=quiet?0:Math.sin(t*(affection?7:2.8))*.25;
  cat._tail.rotation.x=-.65+(quiet?0:Math.sin(t*1.7)*.14);
  cat._body.scale.y=1+(quiet?0:Math.sin(t*2.6)*.016);
  cat._head.position.y=.44+(quiet?0:Math.sin(t*2.6)*.008);
  const nearby=playerPos&&cat.group.position.distanceTo(playerPos)<3;
  cat._head.rotation.z=quiet?0:nearby?Math.sin(t*.8)*.09:Math.sin(t*.4)*.025;
  cat._head.rotation.x=affection?-.15:0;
  const blink=(t+cat._bobPhase)%4.7;
  cat._eyes.scale.y=affection ? .15 : blink>4.5 ? Math.max(.08,Math.abs(blink-4.6)*10) : 1;
  cat._legs.forEach((leg,i)=>{leg.visible=true;leg.rotation.x=moving&&!quiet?Math.sin(t*12+(i===0||i===3?0:Math.PI))*.35:0;leg.scale.y=cat._isSitting?.7:1;});
  cat._body.position.y=cat._isSitting?-.035:0;
  cat._heart.visible=affection>0;
  if(affection>0){cat._heart.position.y=.86+(1-affection/1.4)*.35;cat._heart.quaternion.copy(cat._head.quaternion);cat._heart.scale.setScalar(Math.min(1,affection*3));}
  cat.group.position.y=cat._floorY+(affection>1.05&&!quiet?Math.sin((1.4-affection)/.35*Math.PI)*.1:0);
}
