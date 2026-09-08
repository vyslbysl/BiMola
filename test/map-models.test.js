import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildMapProp,buildMapArchitecture} from '../public/map-models.js';
import {MAPS,mapTypes} from '../public/maps.js';
// Exercise the production geometry builders without a browser or WebGL context.
function context(){
 const material=new THREE.MeshStandardMaterial(),m=new Proxy({},{get:()=>material}),pieces=[];
 const mesh=(geometry,x,y,z,mat,parent)=>{assert.ok(mat?.isMaterial);assert.ok([x,y,z].every(Number.isFinite));const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);parent.add(o);return o;};
 const box=(w,h,d,x,y,z,mat,g)=>mesh(new THREE.BoxGeometry(w,h,d),x,y,z,mat,g);
 const cyl=(rt,rb,h,x,y,z,mat,g,n=12)=>mesh(new THREE.CylinderGeometry(rt,rb,h,n),x,y,z,mat,g);
 return {THREE,m,mapMaterials:m,box,round:(w,h,d,r,...args)=>box(w,h,d,...args),cyl,
  sphere:(r,x,y,z,mat,g,sx=1,sy=1,sz=1)=>{const o=mesh(new THREE.SphereGeometry(r,12,8),x,y,z,mat,g);o.scale.set(sx,sy,sz);return o;},
  torus:(r,t,x,y,z,mat,g,arc=Math.PI*2)=>mesh(new THREE.TorusGeometry(r,t,6,16,arc),x,y,z,mat,g),
  rod:(a,b,r,mat,g)=>{const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va),mid=va.clone().add(vb).multiplyScalar(.5);const o=cyl(r,r,delta.length(),mid.x,mid.y,mid.z,mat,g);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;},
  plant:(g,x,z,scale)=>{const p=new THREE.Group();p.position.set(x,0,z);p.scale.setScalar(scale);g.add(p);cyl(.25,.2,1,0,.5,0,material,p);return p;},
  shellPiece:()=>{const g=new THREE.Group();pieces.push(g);return g;},bake:()=>{},pieces};
}
test('every new disguise builds finite 3D geometry within its declared footprint',()=>{
 const c=context();for(const [id,t]of Object.entries(mapTypes)){const g=new THREE.Group();assert.equal(buildMapProp(c,t.model,g),true,id);assert.ok(g.children.length>0);const b=new THREE.Box3().setFromObject(g),size=b.getSize(new THREE.Vector3());assert.ok([size.x,size.y,size.z].every(Number.isFinite));assert.ok(size.x<=t.w+.15&&size.z<=t.d+.15&&b.max.y<=t.height+.15,`${id}: ${size.toArray()} / ${t.w},${t.height},${t.d}`);}
});
test('each environment builds distinct architecture with removable wall groups',()=>{
 const counts=[];for(const map of Object.values(MAPS)){const c=context(),g=buildMapArchitecture(c,map);assert.ok(g.children.length>0);assert.ok(c.pieces.length>=map.walls.length);const bounds=new THREE.Box3().setFromObject(g);assert.ok(Number.isFinite(bounds.max.y));counts.push(g.children.length);}
 assert.equal(new Set(counts).size,5);
});
