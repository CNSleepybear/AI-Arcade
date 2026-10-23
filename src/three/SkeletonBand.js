import * as THREE from 'three';
import { voxelPart } from './VoxelRig.js';

const BONE=0xded7ba,EDGE=0xb1a78e,DARK=0x202437,COAT=0x374053,BRASS=0xd8ac70;
const DOWN=new THREE.Vector3(0,-1,0),DIRECTION=new THREE.Vector3(),POLE=new THREE.Vector3(),ELBOW=new THREE.Vector3(),LOWER=new THREE.Vector3(),LOWER_ROTATION=new THREE.Quaternion();
function placeHand(joint, x, y, z) {
  const shoulder=joint.arm.position;
  DIRECTION.set(x,y,z).sub(shoulder);
  const distance=Math.min(.489,Math.max(.02,DIRECTION.length()));DIRECTION.normalize();
  const along=(.24*.24-.25*.25+distance*distance)/(2*distance);
  const height=Math.sqrt(Math.max(0,.24*.24-along*along));
  POLE.set(joint.side,-.4,.1).addScaledVector(DIRECTION,-POLE.dot(DIRECTION)).normalize();
  ELBOW.copy(shoulder).addScaledVector(DIRECTION,along).addScaledVector(POLE,height);
  LOWER.set(x,y,z).sub(ELBOW).normalize();
  DIRECTION.copy(ELBOW).sub(shoulder).normalize();
  joint.arm.quaternion.setFromUnitVectors(DOWN,DIRECTION);
  LOWER_ROTATION.setFromUnitVectors(DOWN,LOWER);
  joint.forearm.quaternion.copy(joint.arm.quaternion).invert().multiply(LOWER_ROTATION);
}

function musician(name,drummer=false) {
  const group=new THREE.Group();group.name=name;
  const torso=[
    [0,.97,-.04,.06,.52,.06,EDGE],[0,1.24,.035,.37,.065,.1,BONE],
    [0,1.02,.08,.035,.37,.055,BONE],[0,.71,0,.3,.12,.15,BONE],
    [-.16,1.05,-.01,.065,.36,.14,COAT],[.16,1.05,-.01,.065,.36,.14,COAT],
    [0,.77,.04,.27,.035,.17,DARK],
  ];
  for(let i=0;i<4;i++)for(const side of [-1,1])torso.push([side*.078,.87+i*.085,.04,.12,.028,.13,BONE]);
  group.add(voxelPart('ribcage-and-waistcoat',torso));
  const head=voxelPart('skull',[
    [0,.02,0,.31,.27,.27,BONE],[0,.15,-.025,.27,.045,.24,BONE],
    [-.126,-.07,.045,.045,.1,.2,EDGE],[.126,-.07,.045,.045,.1,.2,EDGE],
    [-.076,.035,.142,.085,.085,.015,DARK],[.076,.035,.142,.085,.085,.015,DARK],
    [-.076,.025,.153,.019,.022,.006,0x93b9b1],[.076,.025,.153,.019,.022,.006,0x93b9b1],
    [0,-.035,.146,.033,.042,.018,DARK],[0,-.097,.12,.18,.043,.06,DARK],
    [-.055,.1,.143,.1,.019,.015,EDGE],[.055,.1,.143,.1,.019,.015,EDGE],
  ]);head.position.set(0,1.5,0);group.add(head);
  const jaw=voxelPart('jaw',[[0,-.138,.04,.23,.04,.2,BONE],...[-.075,-.025,.025,.075].map(x=>[x,-.113,.135,.029,.045,.025,BONE])]);head.add(jaw);
  const hat=voxelPart('straw-hat',[
    [0,.184,0,.45,.035,.4,BRASS],[0,.26,-.018,.27,.12,.25,0xb69260],
    [0,.335,-.03,.21,.04,.2,0xc6a77a],[0,.215,-.018,.282,.04,.262,0x794a58],
    [.128,.25,.095,.045,.055,.018,0x79bdb4],
  ]);head.add(hat);
  const arms=[];
  for(const side of [-1,1]) {
    const arm=voxelPart(`shoulder-${side}`,[[0,-.11,0,.065,.24,.07,BONE],[0,0,0,.09,.08,.09,EDGE]]);arm.position.set(side*.24,1.23,.01);
    const forearm=voxelPart('forearm',[[0,-.1,0,.055,.2,.06,BONE],[0,0,0,.075,.065,.075,EDGE],...[-.032,-.01,.012,.034].map(x=>[x,-.235,.015,.016,.075,.045,BONE])]);
    forearm.position.y=-.24;arm.add(forearm);group.add(arm);arms.push({arm,forearm,side});
    if(drummer)forearm.add(voxelPart('drumstick',[[0,-.23,.15,.016,.016,.33,BRASS]]));
  }
  const legs=[];
  for(const side of [-1,1]) {
    const leg=voxelPart('shin-and-boot',[
      [0,-.15,0,.067,.3,.075,BONE],[0,-.3,.015,.09,.075,.09,EDGE],
      [0,-.44,0,.06,.25,.07,BONE],[0,-.58,.055,.12,.08,.21,DARK],
      [0,-.62,.055,.13,.025,.23,0x121b28],
    ]);leg.position.set(side*.115,.65,0);group.add(leg);legs.push(leg);
  }
  group.add(voxelPart('bowtie',[[-.037,1.28,.08,.06,.05,.04,0xb27474],[.037,1.28,.08,.06,.05,.04,0xb27474],[0,1.28,.105,.025,.03,.02,BRASS]]));
  return {group,head,jaw,arms,legs};
}

export class SkeletonBand {
  constructor(parent) {
    this.group=new THREE.Group();this.group.name='SkeletonBand';this.group.position.set(-11,.4,-3);
    this.lead=musician('the-nightshift-guitarist');this.group.add(this.lead.group);
    this.drummer=musician('the-afterhours-drummer',true);this.drummer.group.position.set(-1.45,0,-.45);this.drummer.group.scale.setScalar(.85);this.group.add(this.drummer.group);
    const guitarBoxes=[
      [0,-.08,0,.29,.23,.075,0x985a42],[0,.08,0,.21,.2,.075,0xba8056],
      [0,-.06,.045,.255,.2,.018,0xd1a46e],[0,.09,.045,.09,.09,.022,DARK],
      [0,.35,0,.055,.4,.04,0x534235],[0,.59,0,.085,.1,.05,0x986f4f],
      [0,-.08,.064,.12,.025,.015,DARK],
    ];
    for(let i=0;i<6;i++)guitarBoxes.push([0,.2+i*.05,.026,.06,.008,.012,EDGE]);
    for(let i=0;i<4;i++)guitarBoxes.push([-.024+i*.016,.25,.06,.004,.65,.006,BRASS]);
    for(const side of [-1,1])for(let i=0;i<2;i++)guitarBoxes.push([side*.055,.57+i*.04,0,.035,.02,.025,BRASS]);
    this.guitar=voxelPart('six-string-dream',guitarBoxes);this.guitar.position.set(.12,.94,.22);this.guitar.rotation.z=-.5;this.lead.group.add(this.guitar);
    const strap=voxelPart('guitar-strap',[[0,0,0,.04,.62,.025,0x79515b]]);strap.position.set(-.05,1.05,.115);strap.rotation.z=-.6;this.lead.group.add(strap);
    const drums=voxelPart('voxel-drum-kit',[
      [-1.45,.35,.05,.58,.57,.35,0x7e4f52],[-1.45,.35,.237,.51,.5,.025,0xc5bca7],
      [-1.45,.35,.258,.14,.13,.015,DARK],[-1.45,.65,.05,.63,.035,.4,BRASS],
      [-1.82,.74,.05,.3,.22,.3,0x7e4f52],[-1.82,.86,.05,.32,.025,.32,EDGE],
      [-1.1,.74,.05,.3,.22,.3,0x7e4f52],[-1.1,.86,.05,.32,.025,.32,EDGE],
      [-2.04,.62,-.15,.025,1.2,.025,EDGE],[-2.04,1.23,-.15,.47,.025,.38,BRASS],
      [-.88,.65,-.15,.025,1.2,.025,EDGE],[-.88,1.26,-.15,.4,.025,.4,BRASS],
    ]);this.group.add(drums);
    const mic=voxelPart('microphone',[[.48,.7,.35,.025,1.4,.025,DARK],[.48,.025,.35,.32,.04,.28,DARK],[.48,1.42,.35,.08,.16,.08,EDGE],[.48,1.42,.398,.07,.12,.012,0x435063]]);this.group.add(mic);
    parent.add(this.group);this.time=0;this._reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  }

  update(dt,playing) {
    this.time+=dt;const t=this.time,beat=t*Math.PI*2*1.6,amount=this._reduced.matches?0:playing?1:.18;
    this.lead.group.rotation.z=Math.sin(beat*.5)*.035*amount;
    this.lead.head.rotation.x=Math.sin(beat)*.065*amount;this.lead.head.rotation.y=Math.sin(beat*.25)*.09*amount;
    this.lead.jaw.position.y=-Math.max(0,Math.sin(beat*.5))*.018*amount;
    placeHand(this.lead.arms[0],.045,.94+Math.sin(beat*2)*.035*amount,.29);
    placeHand(this.lead.arms[1],.32,1.24+Math.sin(beat*.5)*.015*amount,.25);
    this.guitar.rotation.z=-.5+Math.sin(beat*.5)*.018*amount;
    this.lead.legs[1].rotation.x=Math.max(0,Math.sin(beat))*.1*amount;
    this.drummer.head.rotation.x=Math.sin(beat)*.05*amount;
    for(const {arm,forearm,side} of this.drummer.arms) {
      const hit=Math.sin(beat*2+(side<0?0:Math.PI));arm.rotation.x=-.5+hit*.22*amount;arm.rotation.z=side*.18;forearm.rotation.x=-.8+hit*.3*amount;
    }
  }
}
