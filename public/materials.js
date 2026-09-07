import * as THREE from '/vendor/three.module.js';
// Higgsfield-generated albedo maps. These are real in-scene materials, never a backdrop.
// Procedural textures serve as placeholders until the generated images arrive.
export function installHiggsfieldMaterials(renderer,materials,{onLoaded}={}){
 const loader=new THREE.TextureLoader(),maxAniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const jobs=[
  {file:'oak.jpg',roles:[{name:'floor',repeat:[15.55,11.25],color:'#ffffff'},{name:'oak',repeat:[.17,.25],color:'#f2e9d8'}]},
  {file:'clay.jpg',roles:[{name:'clay',repeat:[3,3],color:'#f3e8db'}]},
  {file:'linen.jpg',roles:[{name:'cream',repeat:[3,3],color:'#eee6d4'},{name:'terracotta',repeat:[3,3],color:'#c3947a'}]},
 ];
 let done=0;
 for(const job of jobs){
  const maps=[];
  const finish=()=>{if(++done===jobs.length)onLoaded?.();};
  const texture=loader.load('/assets/higgsfield/'+job.file,loaded=>{
   // Reallocate the GPU texture when the placeholder and final image have different sizes.
   for(const map of maps){map.dispose();map.source=new THREE.Source(loaded.image);map.needsUpdate=true;}
   finish();
  },undefined,()=>{console.warn('Material could not load:',job.file);finish();});
  const placeholder=document.createElement('canvas');placeholder.width=placeholder.height=1;const context=placeholder.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,1,1);
  texture.image=materials[job.roles[0].name]?.map?.image||placeholder;
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=maxAniso;
  // Assign now: prop material clones share the same texture while its image loads.
  for(const role of job.roles){const target=materials[role.name];if(!target)continue;const map=texture.clone();map.repeat.set(...role.repeat);maps.push(map);target.map=map;target.color.set(role.color);target.needsUpdate=true;}
 }
}
