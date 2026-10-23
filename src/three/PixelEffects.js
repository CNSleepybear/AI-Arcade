import * as THREE from 'three';

const ACTIVE = [];
const CUBE = new THREE.BoxGeometry(1,1,1);
const DUMMY = new THREE.Object3D();
const MAX_BURSTS = 12;

function dispose(burst) {
  burst.group.removeFromParent();
  burst.mesh.dispose();burst.material.dispose();
  burst.ring.geometry.dispose();burst.ring.material.dispose();
}

/** Bounded instanced pixel bursts: shared geometry, one particle draw per effect. */
export class ParticleBurst {
  static spawn(scene, pos, options = {}) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const count = Math.min(48,Math.max(1,Math.round((options.count??18)*(reduced ? .3 : 1))));
    const kind = options.kind??'collect',color=new THREE.Color(options.color??0x79d9ce);
    const life=Math.max(.1,options.life??1.2),size=options.size??.045,spread=options.spread??.7,speed=options.speed??1.5;
    while(ACTIVE.length>=MAX_BURSTS)dispose(ACTIVE.shift());
    const group=new THREE.Group();group.position.copy(pos);scene.add(group);
    const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false,opacity:1});
    const mesh=new THREE.InstancedMesh(CUBE,material,count);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;group.add(mesh);
    const particles=[];
    for(let i=0;i<count;i++) {
      const angle=i/count*Math.PI*2,radial=.3+Math.random()*.7;
      const start=new THREE.Vector3(Math.cos(angle)*spread*.25,(Math.random()-.5)*spread*.3,Math.sin(angle)*spread*.25);
      const velocity=new THREE.Vector3(Math.cos(angle)*speed*radial,(kind==='drink'?.8:1.2)+Math.random()*speed,Math.sin(angle)*speed*radial);
      if(kind==='teleport'){start.multiplyScalar(2);velocity.y=1+Math.random();}
      particles.push({start,velocity,angle,size:size*(.5+Math.random()),spin:(Math.random()-.5)*8});
      mesh.setColorAt(i,color.clone().lerp(new THREE.Color(i%4===0?0xffe0ac:0xccefe5),i%4===0?.6:.15));
    }
    const points=[];for(let i=0;i<32;i++){const angle=i/32*Math.PI*2;points.push(new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)));}
    const ring=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity:reduced?0:.6,depthWrite:false}));
    group.add(ring);
    const burst={group,mesh,material,ring,particles,elapsed:0,life,kind,reduced};ACTIVE.push(burst);
    // Initialize matrices before the next render (no origin flash).
    this._update(burst,0);
  }

  static _update(burst,elapsed) {
    const t=elapsed/burst.life,ease=1-Math.pow(1-t,3);
    burst.material.opacity=Math.max(0,1-t*t);
    burst.ring.scale.setScalar(.1+ease*1.5);burst.ring.material.opacity=burst.reduced?0:Math.max(0,.6*(1-t*2));
    burst.particles.forEach((p,i)=>{
      DUMMY.position.copy(p.start);
      const travel=burst.reduced?elapsed*.2:elapsed;
      DUMMY.position.addScaledVector(p.velocity,travel);
      DUMMY.position.y-=(burst.kind==='drink'?.12:burst.kind==='teleport'?0:1.6)*travel*travel;
      if(burst.kind==='teleport') {
        DUMMY.position.x=Math.cos(p.angle+travel*3)*(1-t)*.7;DUMMY.position.z=Math.sin(p.angle+travel*3)*(1-t)*.7;
      }
      DUMMY.rotation.set(p.spin*travel,p.angle+travel*p.spin,travel*p.spin*.4);
      const s=p.size*Math.max(.05,1-t*.8);DUMMY.scale.set(s,burst.kind==='teleport'?s*(2+ease*3):s,s);
      DUMMY.updateMatrix();burst.mesh.setMatrixAt(i,DUMMY.matrix);
    });
    burst.mesh.instanceMatrix.needsUpdate=true;
  }

  static update(dt) {
    for(let i=ACTIVE.length-1;i>=0;i--) {
      const burst=ACTIVE[i];burst.elapsed+=dt;
      if(burst.elapsed>=burst.life){dispose(burst);ACTIVE.splice(i,1);continue;}
      this._update(burst,burst.elapsed);
    }
  }

  static clear() { while(ACTIVE.length)dispose(ACTIVE.pop()); }
  static get activeCount() { return ACTIVE.length; }
}
