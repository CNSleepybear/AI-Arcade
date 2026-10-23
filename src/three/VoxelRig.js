import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const materials = new Map();
/** Batch only direct, static meshes; animated child groups keep their own pivots. */
export function mergeStaticMeshes(group) {
  const batches = new Map();
  for (const mesh of [...group.children]) {
    if (!mesh.isMesh || mesh.isInstancedMesh || Array.isArray(mesh.material) || mesh.material.transparent) continue;
    mesh.updateMatrix();
    const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrix);
    if(!batches.has(mesh.material))batches.set(mesh.material,{geometries:[],cast:false,receive:false});
    const batch=batches.get(mesh.material);batch.geometries.push(geometry);batch.cast ||= mesh.castShadow;batch.receive ||= mesh.receiveShadow;
    group.remove(mesh);
  }
  for(const [material,batch] of batches) {
    const mesh=new THREE.Mesh(mergeGeometries(batch.geometries),material);
    batch.geometries.forEach(geometry=>geometry.dispose());mesh.castShadow=batch.cast;mesh.receiveShadow=batch.receive;group.add(mesh);
  }
}
/** Merge static voxels by material while retaining separate animated joint groups. */
export function voxelPart(name, boxes) {
  const group = new THREE.Group(); group.name = name;
  const batches = new Map();
  for (const [x,y,z,w,h,d,color] of boxes) {
    const geometry = new THREE.BoxGeometry(w,h,d); geometry.translate(x,y,z);
    if(!batches.has(color)) batches.set(color,[]);
    batches.get(color).push(geometry);
  }
  for (const [color,geometries] of batches) {
    if(!materials.has(color)) materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.82,metalness:.02}));
    const merged=mergeGeometries(geometries);geometries.forEach(geometry=>geometry.dispose());
    const mesh=new THREE.Mesh(merged,materials.get(color));mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  return group;
}
