import * as THREE from '/vendor/three.module.js';
import {installHiggsfieldMaterials} from './materials.js';
import {ROOM,walls,props as initialProps,propTypes,dimensions,objectDistance,hitParts} from './world.js';

// Every game object and its disguise share these models. No second, telltale silhouette.
export function createScene(container){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#d9e3df');scene.fog=new THREE.Fog('#e9e6dc',62,150);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;renderer.outputColorSpace=THREE.SRGBColorSpace;container.appendChild(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.045,170);camera.rotation.order='YXZ';scene.add(camera);
 let seed=73823;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
 const maxAniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 function canvasTexture(w,h,draw,repeat=[1,1]){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=maxAniso;return t;}
 const oak=canvasTexture(1024,1024,(c,w,h)=>{c.fillStyle='#b99162';c.fillRect(0,0,w,h);for(let p=0;p<12;p++){const y=p*h/12;const tone=rand()*25-9;c.fillStyle=`rgb(${183+tone},${143+tone*.85},${97+tone*.66})`;c.fillRect(0,y,w,h/12);for(let j=0;j<210;j++){const yy=y+rand()*h/12;c.strokeStyle=`rgba(${rand()>.4?'93,60,30':'238,205,153'},${.025+rand()*.08})`;c.lineWidth=.25+rand()*.6;c.beginPath();c.moveTo(0,yy);for(let x=0;x<=w;x+=32)c.lineTo(x,yy+Math.sin(x*.014+j)*(.3+rand()*.9));c.stroke();}c.fillStyle='#71563b60';c.fillRect(0,y,w,1);const joint=(p%3)*340+rand()*120;c.fillRect(joint,y,1.65,h/12);c.fillStyle='#ead0a53d';c.fillRect(joint+1.65,y,1,h/12);if(p%2===0){c.fillStyle='#71563b4a';c.fillRect((joint+520)%w,y,1.5,h/12);}if(p%4===0){c.save();c.translate(200+rand()*550,y+h/24);c.scale(4,1);for(let r=1;r<10;r++){c.strokeStyle='#78563530';c.lineWidth=.4;c.beginPath();c.ellipse(0,0,r*2,r*.8,0,0,Math.PI*2);c.stroke();}c.restore();}}},[5,12]);
 const timber=oak.clone();timber.repeat.set(.3,.3);timber.needsUpdate=true;
 const plaster=canvasTexture(256,256,(c,w,h)=>{c.fillStyle='#eee9df';c.fillRect(0,0,w,h);for(let i=0;i<15000;i++){const v=150+rand()*90;c.fillStyle=`rgba(${v},${v-3},${v-8},.09)`;c.fillRect(rand()*w,rand()*h,1+rand()*2,1+rand()*2);}},[5,4]);
 const linen=canvasTexture(256,256,(c,w,h)=>{c.fillStyle='#d9d0c3';c.fillRect(0,0,w,h);for(let i=0;i<256;i++){c.strokeStyle=i%2?'#fff3':'#584435';c.lineWidth=.8;c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.stroke();c.strokeStyle=i%3?'#3b302520':'#ffffff40';c.beginPath();c.moveTo(0,i);c.lineTo(w,i);c.stroke();}},[4,4]);
 const woven=canvasTexture(512,512,(c,w,h)=>{c.fillStyle='#b99564';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=12)for(let x=0;x<w;x+=12){c.fillStyle=(x/12+y/12)%2?'#d6b889':'#aa8251';c.fillRect(x+1,y+1,10,10);c.fillStyle='#ead1a35b';c.fillRect(x+2,y+2,8,2);c.fillStyle='#6b4e3738';c.fillRect(x+1,y+9,10,1);}},[2,1]);
 const terrazzo=canvasTexture(512,512,(c,w,h)=>{c.fillStyle='#e0dcd0';c.fillRect(0,0,w,h);for(let i=0;i<1400;i++){const x=rand()*w,y=rand()*h,r=rand()*3.8+.3;c.fillStyle=['#b5b5a1','#b99378','#f3efe4','#a4a69b','#cbc5b4'][i%5];c.beginPath();c.moveTo(x-r,y-r);c.lineTo(x+r,y-r*.7);c.lineTo(x+r*.6,y+r);c.lineTo(x-r*.8,y+r*.5);c.fill();}},[2,2]);
 const rugMap=canvasTexture(1024,1024,(c,w,h)=>{c.fillStyle='#d8c4a6';c.fillRect(0,0,w,h);c.fillStyle='#426e71';c.fillRect(46,46,w-92,h-92);c.fillStyle='#e4d8be';c.fillRect(68,68,w-136,h-136);for(let y=125;y<930;y+=130)for(let x=120;x<930;x+=130){c.save();c.translate(x,y);c.rotate(Math.PI/4);c.strokeStyle='#b8765590';c.lineWidth=13;c.strokeRect(-29,-29,58,58);c.fillStyle='#577b7540';c.fillRect(-8,-8,16,16);c.restore();}for(let i=0;i<45000;i++){c.fillStyle=rand()>.5?'#fff2':'#503c2115';c.fillRect(rand()*w,rand()*h,rand()*2+.5,rand()*4+1);}},[1,1]);
 const mat=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.7,...opts});
 const m={oak:mat('#ffffff',{map:timber,roughness:.5,bumpMap:timber,bumpScale:.009}),floor:mat('#e7d3b3',{map:oak,roughness:.53,bumpMap:oak,bumpScale:.028}),wall:mat('#f8f4e8',{map:plaster,bumpMap:plaster,bumpScale:.01,roughness:.92}),white:mat('#f5f1e8',{roughness:.4}),cream:mat('#efe4ce',{map:linen,bumpMap:linen,bumpScale:.008}),terracotta:mat('#c1805e',{map:linen,bumpMap:linen,bumpScale:.008}),teal:mat('#457b79',{roughness:.4}),orange:mat('#f5a947',{roughness:.4}),rattan:mat('#ffffff',{map:woven,bumpMap:woven,bumpScale:.018}),stone:mat('#f6f2e7',{map:terrazzo,bumpMap:terrazzo,bumpScale:.003,roughness:.38}),brass:mat('#b1a07a',{metalness:.78,roughness:.3}),metal:mat('#c2c7bd',{metalness:.83,roughness:.25}),black:mat('#353b37',{roughness:.68}),rubber:mat('#28312e',{roughness:.9}),soil:mat('#3c3326',{roughness:1}),leaf:mat('#426b38',{roughness:.65,side:THREE.DoubleSide}),leafLight:mat('#73954a',{roughness:.68,side:THREE.DoubleSide}),leafDark:mat('#2e5631',{roughness:.75,side:THREE.DoubleSide}),paper:mat('#e8dfcc'),navy:mat('#415564'),pink:mat('#c09182'),blue:mat('#7fa3ae'),water:mat('#31bce4',{roughness:.1,metalness:.1,transparent:true,opacity:.77}),glass:mat('#d7f1ea',{transparent:true,opacity:.18,roughness:.12,metalness:.2,depthWrite:false}),rug:mat('#fff8e9',{map:rugMap,roughness:1,bumpMap:rugMap,bumpScale:.01})};

 // Material roles are shared by movable props and furniture, so disguises stay visually identical.
 m.sage=mat('#8b9f94',{roughness:.72});
 m.clay=mat('#ae7154',{roughness:.79});
 m.wall.color.set('#eee8d9');m.teal.color.set('#78958a');m.cream.color.set('#e9dfce');
 m.floor.roughness=.7;m.floor.bumpScale=.006;m.oak.bumpScale=.003;
 installHiggsfieldMaterials(renderer,m);
 const architecture=new THREE.Group();scene.add(architecture);
 const geoCache=new Map();function geo(key,fn){if(!geoCache.has(key))geoCache.set(key,fn());return geoCache.get(key);}
 function mesh(g,material,parent=architecture){const o=new THREE.Mesh(g,material);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,x,y,z,material=m.wall,parent=architecture){const o=mesh(geo(`b${w},${h},${d}`,()=>new THREE.BoxGeometry(w,h,d)),material,parent);o.position.set(x,y,z);return o;}
 function round(w,h,d,r,x,y,z,material,parent=architecture){r=Math.min(r,w/2-.001,h/2-.001,d/2-.001);const g=geo(`r${w},${h},${d},${r}`,()=>{const s=new THREE.Shape(),a=-w/2+r,b=-h/2+r,W=w-2*r,H=h-2*r;s.moveTo(a,b-r);s.lineTo(a+W,b-r);s.quadraticCurveTo(a+W+r,b-r,a+W+r,b);s.lineTo(a+W+r,b+H);s.quadraticCurveTo(a+W+r,b+H+r,a+W,b+H+r);s.lineTo(a,b+H+r);s.quadraticCurveTo(a-r,b+H+r,a-r,b+H);s.lineTo(a-r,b);s.quadraticCurveTo(a-r,b-r,a,b-r);const e=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r*.65,bevelSegments:3,steps:1,curveSegments:6});e.translate(0,0,-d/2+r);return e;});const o=mesh(g,material,parent);o.position.set(x,y,z);return o;}
 function cyl(rt,rb,h,x,y,z,material=m.oak,parent=architecture,n=18){const o=mesh(geo(`c${rt},${rb},${h},${n}`,()=>new THREE.CylinderGeometry(rt,rb,h,n)),material,parent);o.position.set(x,y,z);return o;}
 function sphere(r,x,y,z,material,parent=architecture,sx=1,sy=1,sz=1){const o=mesh(geo(`s${r}`,()=>new THREE.SphereGeometry(r,32,24)),material,parent);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
 function torus(r,t,x,y,z,material,parent=architecture,arc=Math.PI*2){const o=mesh(geo(`t${r},${t},${arc}`,()=>new THREE.TorusGeometry(r,t,6,28,arc)),material,parent);o.position.set(x,y,z);return o;}
 function rod(a,b,r,material,parent=architecture){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va);const o=cyl(r,r,delta.length(),0,0,0,material,parent,8);o.position.copy(va.add(vb).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;}
 // Merging static pieces keeps the richly furnished room inexpensive to render.
 function bake(group){group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),batches=new Map();group.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const key=o.material.id+':'+o.castShadow+':'+o.receiveShadow;if(!batches.has(key))batches.set(key,{material:o.material,cast:o.castShadow,receive:o.receiveShadow,gs:[]});const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));batches.get(key).gs.push(g);});group.clear();for(const b of batches.values()){const g=new THREE.BufferGeometry();for(const attr of ['position','normal','uv']){if(!b.gs.every(e=>e.getAttribute(attr)))continue;const len=b.gs.reduce((n,e)=>n+e.getAttribute(attr).array.length,0),arr=new Float32Array(len);let offset=0;for(const part of b.gs){arr.set(part.getAttribute(attr).array,offset);offset+=part.getAttribute(attr).array.length;}g.setAttribute(attr,new THREE.BufferAttribute(arr,attr==='uv'?2:3));}g.computeBoundingSphere();const o=new THREE.Mesh(g,b.material);o.castShadow=b.cast;o.receiveShadow=b.receive;group.add(o);b.gs.forEach(e=>e.dispose());}}
 const contactTex=canvasTexture(128,128,c=>{const g=c.createRadialGradient(64,64,8,64,64,64);g.addColorStop(0,'rgba(28,28,19,.26)');g.addColorStop(.45,'rgba(28,28,19,.17)');g.addColorStop(1,'rgba(28,28,19,0)');c.fillStyle=g;c.fillRect(0,0,128,128);});
 const contactMat=new THREE.MeshBasicMaterial({map:contactTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});function contact(x,z,w,d,parent=architecture,y=.024){const o=new THREE.Mesh(geo('plane',()=>new THREE.PlaneGeometry(1,1)),contactMat);o.rotation.x=-Math.PI/2;o.scale.set(w,d,1);o.position.set(x,y,z);parent.add(o);return o;}
 // Architectural envelope, deep window reveals, a sun-filled glazed east wall.
 box(28.4,.22,36.4,0,-.12,0,m.floor);
 function tiledFloor(x,z,w,d){const g=new THREE.PlaneGeometry(w,d);const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/4.8,uv.getY(i)*d/4.8);const o=mesh(g,m.clay);o.rotation.x=-Math.PI/2;o.position.set(x,.006,z);o.castShadow=false;}
 tiledFloor(0,0,4.55,35.65);tiledFloor(8.2,-7.1,11.35,21.1);tiledFloor(8.2,10.7,11.35,14.1);
for(const [x,z,w,d] of walls){if(x===14){box(.3,.58,36,14,.29,0);box(.3,.3,36,14,4.66,0);for(let v=-18;v<=18;v+=6){box(.38,4.2,.44,14,2.65,v,m.wall);box(.5,.13,.65,13.94,.62,v,m.stone);}}else{box(w,ROOM.height,d,x,ROOM.height/2,z);box(w+.02,.13,d+.025,x,.07,z,m.white);box(w+.025,.095,d+.025,x,4.59,z,m.white);}}
 for(let z=-15;z<=15;z+=6){box(.62,.1,5.64,13.82,.63,z,m.stone);for(const dz of [-2.78,0,2.78])box(.09,3.85,.065,13.83,2.62,z+dz,m.white);for(const y of [.72,2.75,4.53])box(.09,.065,5.6,13.83,y,z,m.white);const glass=box(.015,3.75,5.4,13.92,2.62,z,m.glass);glass.castShadow=false;}

 // Door reveals from the reference: painted sage frames, real depth, quiet architectural scale.
 function portal(x,z,width,rotation=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;architecture.add(g);for(const side of [-1,1]){box(.14,2.88,.33,side*(width/2+.06),1.44,0,m.sage,g);box(.045,2.78,.39,side*(width/2-.035),1.39,0,m.sage,g);}box(width+.26,.15,.33,0,2.86,0,m.sage,g);box(width+.02,1.84,.255,0,3.83,0,m.wall,g);}
 portal(-2.4,-9,1.8,Math.PI/2);portal(-2.4,8,1.8,Math.PI/2);portal(-2.4,14,1.8,Math.PI/2);
 portal(2.4,-7,1.8,Math.PI/2);portal(2.4,10,1.8,Math.PI/2);
 portal(-8,-1.4,1.8);portal(-8,10.5,1.8);portal(8,3.6,1.8);
 // Ceiling reveals and cornices visually bring each room to a human residential scale.
 for(const [x,z,w,d] of walls){if(x===14)continue;box(w+.05,.1,d+.05,x,3.3,z,m.white);}
 for(const [x,z,w,d] of [[-8,-9.6,11.2,16.2],[-8,4.5,11.2,11.6],[-8,14.1,11.2,7],[8,-7.2,11.2,20.8],[8,10.7,11.2,14.2]]){
  const panel=box(w,.10,d,x,3.48,z,m.wall);panel.castShadow=false;
 }
 // Frosted ceiling panels give the hallway soft skylight without exposing an industrial roof.
 for(const z of [-13,-3,7,16]){const panel=box(4.5,.07,5.5,0,3.54,z,m.white);panel.castShadow=false;}
 // High ceiling and exposed beams stay quiet above the game space.
 for(const x of [-10,10])box(8,.12,36,x,4.86,0,m.wall).castShadow=false;for(const z of [-15,-7,1,9,17]){box(28,.25,.21,0,4.6,z,m.oak);box(.18,.17,36,0,4.72,0,m.white);}for(const x of [-4,4])box(.16,.17,36,x,4.74,0,m.white);
 for(const x of [-5,5])box(2,.14,36,x,4.8,0,m.wall).castShadow=false;for(const z of [-15,-5,5,15])box(8,.14,6,0,4.8,z,m.wall).castShadow=false;for(const z of [-10,0,10]){const skylight=box(8,.02,4,0,4.9,z,m.glass);skylight.castShadow=false;for(const dz of [-2,2])box(8,.16,.1,0,4.75,z+dz,m.white);for(const x of [-2,0,2])box(.075,.13,4,x,4.78,z,m.white);}
 // Outside is a real garden volume, visible through the windows instead of a flat photo.
 const foliage=canvasTexture(512,512,(c,w,h)=>{c.fillStyle='#53683a';c.fillRect(0,0,w,h);for(let i=0;i<4400;i++){const x=rand()*w,y=rand()*h,r=2+rand()*5;c.fillStyle=['#53753c','#708b4e','#8fa265','#405b30','#a0ad75','#637f49'][i%6];c.beginPath();c.ellipse(x,y,r,r*.47,rand()*Math.PI,0,Math.PI*2);c.fill();c.strokeStyle='#31432d35';c.lineWidth=.7;c.beginPath();c.moveTo(x-r,y);c.lineTo(x+r,y);c.stroke();}},[2,2]);const treeLeaf=mat('#c5d0a4',{map:foliage,bumpMap:foliage,bumpScale:.13,roughness:.92}),treeLight=mat('#d5d9aa',{map:foliage,bumpMap:foliage,bumpScale:.1,roughness:.9});
 const outside=new THREE.Group();scene.add(outside);const grassMat=mat('#a1ad80'),gardenMat=mat('#c1c5ac'),skyMat=new THREE.MeshBasicMaterial({color:'#e2eeed'});
 box(55,.12,90,40,-.2,0,grassMat,outside).castShadow=false;box(3,.06,38,15.7,-.025,0,m.stone,outside);box(.25,2.4,70,31,1.1,0,gardenMat,outside);
 for(let i=0;i<16;i++){const z=-35+i*4.5,x=24+rand()*5;rod([x,0,z],[x-.3,5+rand()*2,z],.17,m.oak,outside);for(let j=0;j<5;j++)sphere(1.5+rand(),x+(rand()-.5)*2,4+rand()*2,z+(rand()-.5)*2,j%2?treeLight:treeLeaf,outside,1,.9,1);}
 for(let i=0;i<24;i++){const z=-34+i*3;for(let j=0;j<3;j++)sphere(.8+rand()*.2,20.5+(j-1)*.48,.8+rand()*.35,z+(rand()-.5)*1.5,j%2?treeLight:treeLeaf,outside,1.25,1.2,1.2);}
 box(1,20,100,55,8,0,skyMat,outside).castShadow=false;bake(outside);
 scene.add(new THREE.HemisphereLight('#e5edf2','#9a8872',1.55));const sun=new THREE.DirectionalLight('#fff0d7',2.35);sun.position.set(26,19,5);sun.target.position.set(-4,0,-6);sun.castShadow=true;sun.shadow.mapSize.set(3072,3072);Object.assign(sun.shadow.camera,{left:-25,right:25,top:27,bottom:-27,near:.5,far:85});sun.shadow.bias=-.00013;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun,sun.target);const bounce=new THREE.DirectionalLight('#e2f0fa',.4);bounce.position.set(-10,8,14);scene.add(bounce);
 // Soft reflection environment for ceramics, metal fixtures, glass and water.
 const envScene=new THREE.Scene();envScene.background=new THREE.Color('#ced9d8');const envRoom=new THREE.Mesh(new THREE.BoxGeometry(30,20,30),new THREE.MeshBasicMaterial({color:'#d4cabc',side:THREE.BackSide}));envScene.add(envRoom);for(const [x,y,z,sx,sy,sz] of [[14,3,0,1,10,18],[-7,9,-3,11,1,10],[0,1,-14,12,9,1]]){const q=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshBasicMaterial({color:'#fff8e8'}));q.position.set(x,y,z);envScene.add(q);}const pmrem=new THREE.PMREMGenerator(renderer);const envTarget=pmrem.fromScene(envScene,.05);scene.environment=envTarget.texture;scene.environmentIntensity=.5;pmrem.dispose();envScene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});

 // Low-cost motivated bounce fills illuminate the room interiors behind closed wall partitions.
 for(const [x,z,color,power] of [[-8,4,'#f4ead9',13],[-8,14,'#f4ead9',9],[-9,-10,'#e8edef',11],[8,-9,'#ffefd9',10],[8,10,'#ebf1e6',9]]){const fill=new THREE.PointLight(color,power,17,1.8);fill.position.set(x,2.95,z);scene.add(fill);}
 // Leaf geometry has a folded centre vein and naturally tapered tips.
 const leafGeo=(()=>{const p=[],uv=[],idx=[];for(let i=0;i<=8;i++){const y=i/8,width=Math.sin(Math.PI*y)*.5;for(let j=0;j<3;j++){p.push((j-1)*width,y,Math.sin(Math.PI*y)*.13+(j===1?.045:0));uv.push(j/2,y);}if(i<8)for(let j=0;j<2;j++){const a=i*3+j;idx.push(a,a+3,a+1,a+1,a+3,a+4);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;})();
 function plant(parent,x=0,z=0,scale=1,style=0){const p=new THREE.Group();p.position.set(x,0,z);p.scale.setScalar(scale);parent.add(p);cyl(.255,.2,.43,0,.225,0,style?m.white:m.terracotta,p,24);torus(.255,.016,0,.44,0,style?m.white:m.terracotta,p).rotation.x=Math.PI/2;cyl(.235,.235,.018,0,.425,0,m.soil,p);for(let k=0;k<9;k++){const a=k*2.4,h=.48+(k%4)*.11,rad=.16+(k%3)*.035;rod([0,.44,0],[Math.cos(a)*rad,h+.22,Math.sin(a)*rad],.01,m.leafDark,p);const l=mesh(leafGeo,k%3===0?m.leafLight:m.leaf,p);l.position.set(Math.cos(a)*rad*.65,h+.02,Math.sin(a)*rad*.65);l.rotation.set(.45+(k%3)*.22,a,Math.sin(a)*.2);l.scale.set(.35+.03*(k%3),.42,1);const mid=mesh(leafGeo,m.leafLight,p);mid.position.set(Math.cos(a)*rad*.3,h-.04,Math.sin(a)*rad*.3);mid.rotation.set(-.6,a+Math.PI*.6,0);mid.scale.set(.22,.32,.7);}return p;}
 function book(x,y,z,w=.22,h=.32,d=.055,color=m.teal,parent=architecture,flat=false){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);box(w,h,d,0,0,0,color,g);box(w-.014,h-.018,d-.009,.002,0,.002,m.paper,g);box(.018,h+.002,d+.005,-w/2+.005,0,0,color,g);for(const s of [-1,1])box(w+.004,.012,d+.01,0,s*h/2,0,color,g);if(flat)g.rotation.z=Math.PI/2;return g;}
 function mug(x,y,z,color=m.white,parent=architecture){cyl(.065,.05,.13,x,y+.065,z,color,parent,16);cyl(.052,.052,.003,x,y+.132,z,m.soil,parent,16);torus(.047,.014,x+.07,y+.073,z,color,parent);}
 function vase(x,y,z,parent=architecture,color=m.white,size=1){const points=[[0,0],[.11,0],[.15,.04],[.165,.17],[.13,.28],[.073,.32],[.065,.43]].map(([a,b])=>new THREE.Vector2(a*size,b*size));const o=mesh(new THREE.LatheGeometry(points,20),color,parent);o.position.set(x,y,z);return o;}
 function lampShade(x,y,z,r=.32,parent=architecture){rod([x,3.4,z],[x,y+.25,z],.009,m.black,parent);cyl(r*.35,r,.32,x,y,z,m.white,parent,40);cyl(r*.83,r*.83,.008,x,y-.163,z,m.white,parent,20).castShadow=false;}
 function chair(x,z,angle=0,parent=architecture){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;parent.add(g);round(.62,.08,.62,.055,0,.48,0,m.oak,g);round(.62,.38,.07,.035,0,.79,.25,m.oak,g);for(const a of [-1,1])for(const b of [-1,1])rod([a*.25,.45,b*.24],[a*.31,.02,b*.29],.034,m.oak,g);contact(x,z,.85,.85,parent);return g;}
 function sofa(f,parent){const g=new THREE.Group();g.position.set(f.x,0,f.z);g.rotation.y=(f.angle||0)+(f.id==='sofa2'?Math.PI:0);parent.add(g);const color=f.id==='sofa1'?m.cream:m.terracotta;
 const {w,d}=f;for(const a of [-1,1])for(const b of [-1,1])cyl(.055,.04,.16,a*(w/2-.18),.08,b*(d/2-.2),m.oak,g);round(w,.28,d,.09,0,.29,0,color,g);round(w,.47,.26,.085,0,.68,d/2-.14,color,g);for(const side of [-1,1])round(.25,.44,d-.1,.09,side*(w/2-.13),.56,0,color,g);const count=w>4?3:2,cw=(w-.57)/count;for(let i=0;i<count;i++){round(cw-.022,.17,d-.36,.065,-w/2+.285+(i+.5)*cw,.495,-.09,color,g);const cushion=round(cw-.035,.35,.19,.072,-w/2+.285+(i+.5)*cw,.705,d/2-.34,color,g);cushion.rotation.x=.15;for(const side of [-1,1])rod([-w/2+.285+(i+.5)*cw+side*(cw/2-.09),.58,d/2-.45],[-w/2+.285+(i+.5)*cw+side*(cw/2-.09),.82,d/2-.40],.0035,color,g);const seam=box(cw-.12,.006,.008,-w/2+.285+(i+.5)*cw,.51,-d/2+.047,m.cream,g);seam.material=color;}contact(0,0,w+.5,d+.5,g);}
 // Independent furnishings are rendered only through the shared object inventory.
 function furnitureModel(f,g){const {w,d,h}=f;
 if(f.type==='sofa'){sofa({...f,x:0,z:0,angle:0,id:f.id==='sofa2'?'sun-sofa':f.id},g);return;}
 if(['coffee','dining','desk','potting','bench'].includes(f.type)){
  round(w,.08,d,.035,0,h-.04,0,m.oak,g);
  for(const x of [-1,1])for(const z of [-1,1])rod([x*(w/2-.14),.02,z*(d/2-.14)],[x*(w/2-.18),h-.08,z*(d/2-.18)],.045,m.oak,g);
 }
 if(['counter','island'].includes(f.type)){
  round(w,.9,d-.05,.025,0,.47,0,m.oak,g);box(w,.08,d,0,.97,0,m.stone,g);
  const n=Math.round(w/.75);for(let i=0;i<n;i++){const x=-w/2+(i+.5)*w/n;box(w/n-.025,.72,.026,x,.53,d/2-.015,m.oak,g);rod([x-.12,.79,d/2+.021],[x+.12,.79,d/2+.021],.012,m.brass,g);}box(w-.13,.1,.09,0,.07,d/2-.015,m.black,g);
 }
 if(f.type==='shelf'){
  box(.05,h,d,f.x<0?-w/2+.025:w/2-.025,h/2,0,m.oak,g);
  for(const sign of [-1,1])box(w,h,.05,0,h/2,sign*(d/2-.025),m.oak,g);
  for(let i=0;i<5;i++)box(w,.045,d,0,.15+i*(h-.16)/4,0,m.oak,g);
 }
 if(f.type==='game'){
  round(w,.18,d,.06,0,.7,0,m.oak,g);box(w-.19,.02,d-.19,0,.807,0,m.teal,g);
  for(const a of [-1,1])for(const b of [-1,1])rod([a*(w/2-.2),.67,b*(d/2-.2)],[a*(w/2-.14),.03,b*(d/2-.13)],.075,m.oak,g);
  for(let i=0;i<6;i++){const x=-1+i*.4;rod([x,.91,-d/2-.16],[x,.91,d/2+.16],.014,m.metal,g);for(let k=0;k<3;k++){cyl(.043,.055,.12,x,.88,-.45+k*.45,i%2?m.cream:m.terracotta,g,10);sphere(.035,x,.97,-.45+k*.45,m.black,g);}cyl(.043,.043,.18,x,.91,d/2+.15,m.black,g).rotation.x=Math.PI/2;}
 }
 if(f.type==='bed'){round(w,.28,d,.06,0,.34,0,m.oak,g);round(w-.14,.2,d-.16,.07,0,.6,0,m.cream,g);round(w-.2,.1,d-.3,.05,0,.72,-.12,m.cream,g);round(w,.9,.12,.05,0,.45,-d/2+.06,m.oak,g);for(const x of [-1,1])for(const z of [-1,1])cyl(.055,.05,.2,x*(w/2-.14),.1,z*(d/2-.14),m.oak,g);}
 if(f.type==='nightstand'){round(w,h-.09,d,.03,0,(h-.09)/2+.09,0,m.oak,g);round(w-.06,.16,d-.05,.02,0,h-.19,.015,m.white,g);rod([-.07,h-.19,d/2+.005],[.07,h-.19,d/2+.005],.011,m.brass,g);for(const x of [-1,1])for(const z of [-1,1])rod([x*(w/2-.06),.09,z*(d/2-.06)],[x*(w/2-.04),.01,z*(d/2-.04)],.018,m.oak,g);}
 if(f.type==='wardrobe'){box(w,h,d,0,h/2,0,m.oak,g);for(const sign of [-1,1]){box(.025,h-.16,d/2-.06,w/2+.005,h/2,sign*d/4,m.cream,g);rod([w/2+.02,h*.52,sign*d/4],[w/2+.02,h*.52-.16,sign*d/4],.016,m.brass,g);}}
 }
 function inventoryModel(type,g){const t=propTypes[type],model=t.model;
 if(model==='furniture'){furnitureModel(t.f,g);return;}
 if(model==='chair'){chair(0,0,0,g);return;}
 if(model==='officeChair'){round(.65,.1,.6,.05,0,.48,0,m.teal,g);round(.62,.58,.085,.05,0,.82,.25,m.teal,g);cyl(.045,.045,.42,0,.24,0,m.metal,g);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;rod([0,.13,0],[Math.cos(a)*.31,.07,Math.sin(a)*.31],.022,m.metal,g);sphere(.045,Math.cos(a)*.31,.045,Math.sin(a)*.31,m.black,g);}return;}
 if(model==='laptop'){round(.83,.035,.56,.02,0,.025,0,m.metal,g);round(.84,.54,.028,.013,0,.3,-.27,m.black,g).rotation.x=-.13;box(.77,.45,.004,0,.3,-.248,m.teal,g).rotation.x=-.13;for(let i=0;i<7;i++)for(let j=0;j<3;j++)box(.07,.003,.045,-.28+i*.09,.045,-.1+j*.07,m.black,g);return;}
 if(['plate','placemat','fruitBowl'].includes(model)){cyl(t.w/2,t.w*.46,t.height,0,t.height/2,0,model==='placemat'?m.rattan:m.white,g,32);return;}
 if(model==='glassCup'){cyl(.065,.052,.22,0,.11,0,m.glass,g,24);torus(.065,.006,0,.22,0,m.white,g).rotation.x=Math.PI/2;return;}
 if(model==='vase'||model==='flowerVase'){vase(0,0,0,g,m.terracotta);if(model==='flowerVase')for(let i=0;i<5;i++){rod([0,.3,0],[(i-2)*.08,.7+(i%2)*.07,(i%2)*.12],.006,m.leaf,g);sphere(.055,(i-2)*.08,.7+(i%2)*.07,(i%2)*.12,i%2?m.orange:m.cream,g);}return;}
 if(model==='faucet'){rod([0,0,0],[0,.4,0],.025,m.metal,g);const curve=torus(.16,.025,0,.4,.16,m.metal,g,Math.PI);curve.rotation.y=Math.PI/2;return;}
 if(model==='sink'){round(1.1,.038,.76,.075,0,.022,0,m.metal,g);round(.96,.025,.63,.065,0,.045,0,m.black,g);round(.78,.021,.47,.055,0,.06,0,m.metal,g);return;}
 if(model==='stove'){box(1.5,.035,.8,0,.02,0,m.black,g);for(const x of [-1,1])for(const z of [-1,1])torus(.15,.008,x*.33,.045,z*.22,m.metal,g).rotation.x=Math.PI/2;return;}
 if(model==='coffeeMachine'){round(.58,.7,.4,.055,0,.36,0,m.white,g);round(.44,.39,.1,.025,0,.42,.2,m.black,g);return;}
 if(model==='fruit'){sphere(.115,0,.115,0,type==='orangeFruit'?m.orange:m.leafLight,g);return;}
 if(model==='cuttingBoard'||model==='knife'){round(t.w,t.height,t.d,.01,0,t.height/2,0,model==='knife'?m.metal:m.oak,g);return;}
 if(model==='smallPot'){cyl(.13,.095,.21,0,.105,0,m.terracotta,g,24);cyl(.115,.115,.015,0,.213,0,m.soil,g,24);return;}
 if(model==='tableLamp'){cyl(.07,.065,.02,0,.01,0,m.black,g);rod([0,0,0],[0,.24,0],.012,m.brass,g);cyl(.1,.14,.16,0,.31,0,m.cream,g,20);return;}
 if(model==='floorLamp'){cyl(.23,.26,.045,0,.025,0,m.black,g);rod([0,.04,0],[0,1.75,0],.021,m.brass,g);rod([0,1.75,0],[.33,1.83,0],.024,m.brass,g);cyl(.15,.29,.35,.33,1.67,0,m.cream,g);return;}
 if(model==='pendant'){rod([0,.8,0],[0,.32,0],.009,m.black,g);cyl(.18,.5,.32,0,.16,0,m.white,g,32);return;}
 if(model==='largePlant'){plant(g,0,0,2,1);return;}
 if(model==='book'){book(0,.16,0,.3,.32,.058,m.teal,g);return;}
 if(model==='flatBook'){box(.42,.075,.56,0,.0375,0,m.terracotta,g);box(.39,.055,.53,.01,.0375,.005,m.paper,g);return;}
 if(model==='seatPillow'||model==='bedPillow'){round(t.w,t.height,t.d,Math.min(.07,t.height*.4),0,t.height/2,0,model==='seatPillow'?m.teal:m.cream,g);return;}
 if(model==='blanket'||model==='throw'){round(t.w,t.height,t.d,.02,0,t.height/2,0,m.terracotta,g);return;}
 if(model==='wallArt'){box(t.w,t.height,.08,0,t.height/2,0,m.oak,g);box(t.w-.1,t.height-.1,.015,0,t.height/2,.047,m.cream,g);sphere(.5,-.3,1.4,.065,m.teal,g,1,1.4,.025);sphere(.48,.4,1.1,.075,m.terracotta,g,1,1.6,.025);return;}
 if(model==='wallShelf'){box(t.w,t.height,t.d,0,t.height/2,0,m.oak,g);return;}
 if(model==='rug'){box(t.w,t.height,t.d,0,t.height/2,0,m.rug,g);return;}
 if(model==='curtain'){for(let i=0;i<7;i++)cyl(.055,.055,t.height,Math.sin(i)*.045,t.height/2,-.23+i*.07,m.cream,g,12);return;}
 }
 // The entrance has a generous arch-like frame, a panelled oak door and small glazing.
 box(3.1,3.6,.13,0,1.8,17.78,m.oak);for(const side of [-1,1]){box(1.32,3.34,.08,side*.72,1.73,17.68,m.white);box(1.15,2.25,.045,side*.72,2.19,17.62,m.glass).castShadow=false;rod([side*.19,1.05,17.55],[side*.19,1.4,17.55],.021,m.brass);}
 bake(architecture);
 // Movable objects. Each is merged locally so 24 players can share a rich room.
 const modelCache=new Map();
 function propModel(type){if(modelCache.has(type))return cloneModel(modelCache.get(type));const g=new THREE.Group();g.userData.type=type;if(propTypes[type]?.model)inventoryModel(type,g);
 if(type==='plant')plant(g);
 if(type==='stool'){cyl(.33,.32,.095,0,.603,0,m.teal,g,28);cyl(.3,.31,.022,0,.653,0,m.teal,g,28);for(let k=0;k<4;k++){const a=Math.PI/4+k*Math.PI/2;rod([Math.cos(a)*.23,.57,Math.sin(a)*.23],[Math.cos(a)*.27,.035,Math.sin(a)*.27],.025,m.oak,g);}const r=torus(.255,.017,0,.21,0,m.oak,g);r.rotation.x=Math.PI/2;}
 if(type==='basket'){cyl(.355,.29,.45,0,.26,0,m.rattan,g,28);cyl(.324,.324,.012,0,.492,0,m.soil,g,28);for(const y of [.055,.472,.49])torus(y<.1?.29:.352,.016,0,y,0,m.rattan,g).rotation.x=Math.PI/2;for(const s of [-1,1]){const handle=torus(.075,.017,s*.32,.45,0,m.rattan,g,Math.PI*1.5);handle.rotation.y=Math.PI/2;}round(.32,.055,.37,.02,.035,.506,.015,m.cream,g).rotation.z=.16;round(.15,.14,.29,.02,.17,.465,.04,m.cream,g);}
 if(type==='ball'){for(let i=0;i<6;i++){const o=mesh(new THREE.SphereGeometry(.287,12,12,i*Math.PI/3,Math.PI/3),[m.orange,m.white,m.teal,m.white,m.terracotta,m.white][i],g);o.position.y=.29;}cyl(.018,.018,.006,0,.581,0,m.white,g,10);}
 if(type==='watering'){cyl(.2,.17,.3,0,.19,0,m.orange,g,24);torus(.195,.012,0,.343,0,m.orange,g).rotation.x=Math.PI/2;const handle=torus(.17,.025,-.13,.27,0,m.orange,g,Math.PI*1.7);handle.rotation.y=Math.PI/2;rod([.12,.15,0],[.34,.33,0],.027,m.orange,g);const spout=cyl(.048,.04,.038,.34,.345,0,m.orange,g,16);spout.rotation.z=-.8;for(let i=0;i<7;i++)sphere(.005,.35,.365+Math.sin(i)*.02,Math.cos(i)*.025,m.black,g);}
 if(type==='ottoman'){cyl(.46,.44,.42,0,.24,0,m.terracotta,g,32);cyl(.46,.46,.065,0,.45,0,m.terracotta,g,32);for(const y of [.1,.42,.48])torus(.459,.006,0,y,0,m.cream,g).rotation.x=Math.PI/2;for(let i=0;i<8;i++){const a=i*Math.PI/4;rod([Math.cos(a)*.456,.1,Math.sin(a)*.456],[Math.cos(a)*.456,.415,Math.sin(a)*.456],.004,m.cream,g);}cyl(.11,.12,.03,0,.026,0,m.oak,g);}
 if(type==='case'){round(.55,.65,.29,.06,0,.405,0,m.blue,g);for(const x of [-.205,.205])for(const z of [-.1,.1])sphere(.037,x,.048,z,m.black,g,1,1,.65);for(let i=0;i<6;i++)round(.028,.49,.017,.008,-.194+i*.077,.405,-.163,m.blue,g);rod([-.11,.69,0],[-.11,.79,0],.013,m.metal,g);rod([.11,.69,0],[.11,.79,0],.013,m.metal,g);round(.24,.045,.058,.018,0,.79,0,m.black,g);round(.012,.59,.011,.004,.259,.405,-.137,m.white,g);box(.034,.05,.016,.25,.61,-.154,m.metal,g);}
 if(type==='speaker'){round(.4,.55,.26,.055,0,.3,0,m.teal,g);round(.352,.49,.025,.045,0,.3,-.142,m.black,g);for(const y of [.21,.43]){const r=y<.3?.114:.065;const edge=torus(r,.011,0,y,-.163,m.black,g);const cone=cyl(r-.006,r-.006,.012,0,y,-.167,m.rubber,g,24);cone.rotation.x=Math.PI/2;sphere(r*.35,0,y,-.18,m.black,g,1,1,.4);}for(let j=0;j<3;j++)cyl(.012,.012,.01,-.09+j*.09,.585,0,m.cream,g,10);rod([-.12,.57,.01],[-.12,.63,.01],.016,m.oak,g);rod([.12,.57,.01],[.12,.63,.01],.016,m.oak,g);rod([-.12,.63,.01],[.12,.63,.01],.016,m.oak,g);}
 if(type==='mug')mug(0,0,0,m.teal,g);
 if(type==='bookstack'){box(.24,.045,.17,0,.023,0,m.terracotta,g);box(.22,.04,.155,.01,.065,-.008,m.blue,g);box(.2,.038,.14,-.008,.104,.01,m.cream,g);}
 if(type==='pillow'){round(.62,.17,.44,.085,0,.09,0,m.cream,g);round(.5,.1,.34,.06,0,.17,0,m.white,g);
 for(const s of [-1,1])rod([s*.29,.09,-.19],[s*.29,.09,.19],.012,m.white,g);}
 if(type==='logTable'){round(2,.09,1.1,.05,0,.73,0,m.oak,g);for(const sx of [-1,1])for(const sz of [-1,1])cyl(.09,.12,.7,sx*.82,.35,sz*.42,m.oak,g,10);for(const sx of [-1,1])rod([sx*.82,.55,-.4],[sx*.82,.55,.4],.035,m.oak,g);rod([-.82,.3,0],[.82,.3,0],.035,m.oak,g);}
 if(type==='painting'){const w=1,h=1.3;box(w+.1,h+.1,.07,0,h/2,0,m.oak,g);const t=canvasTexture(384,512,(c,W,H)=>{c.fillStyle='#eee5cf';c.fillRect(0,0,W,H);c.fillStyle='#80978a';c.beginPath();c.arc(W*.38,H*.4,W*.3,Math.PI,0);c.lineTo(W*.02,H*.85);c.lineTo(W*.7,H*.85);c.fill();c.fillStyle='#c98b65';c.beginPath();c.ellipse(W*.66,H*.55,W*.24,H*.3,-.2,0,Math.PI*2);c.fill();for(let i=0;i<8000;i++){c.fillStyle=rand()>.5?'#fff1':'#00000008';c.fillRect(rand()*W,rand()*H,1,2);}});const canvas=mesh(new THREE.PlaneGeometry(w-.08,h-.08),mat('#ffffff',{map:t,roughness:1}),g);canvas.position.set(0,h/2,.036);canvas.castShadow=false;rod([0,.03,-.03],[0,.03,.055],.024,m.black,g);}
 bake(g);modelCache.set(type,g);return cloneModel(g);}
 function cloneModel(template){const g=template.clone(true),materials=new Map();g.traverse(o=>{if(o.isMesh){if(!materials.has(o.material.id)){const c=o.material.clone();c.userData.base=c.color.clone();c.userData.baseRoughness=c.roughness;materials.set(o.material.id,c);}o.material=materials.get(o.material.id);}});g.userData.materials=[...materials.values()];return g;}
 const objectModels=new Map();function updateObjects(objects){const ids=new Set(objects.map(o=>o.id));for(const [id,g]of objectModels)if(!ids.has(id)){scene.remove(g);objectModels.delete(id);disposeModel(g);}for(const o of objects){let g=objectModels.get(o.id);if(g&&g.userData.type!==o.type){scene.remove(g);disposeModel(g);objectModels.delete(o.id);g=null;}if(!g){g=propModel(o.type);g.position.set(o.x,o.y||0,o.z);g.rotation.y=o.angle||0;g.userData.objectId=o.id;scene.add(g);objectModels.set(o.id,g);}g.userData.target=new THREE.Vector3(o.x,o.y||0,o.z);g.userData.angle=o.angle||0;g.userData.wet=o.wet||0;for(const material of g.userData.materials){const f=Math.min(1,(o.wet||0)/100);material.color.copy(material.userData.base).multiplyScalar(1-f*.17);material.roughness=Math.max(.18,(material.userData.baseRoughness??.68)-f*.4);}}}
 function disposeModel(g){g.userData.materials?.forEach(v=>v.dispose());}
 updateObjects(initialProps);
 // A tiny offscreen render of each disguise, so choosing one shows the actual object rather than a
 // typographic stand-in. Rendered once per type on demand and cached as a data URL.
 const previewCache=new Map();let previewRenderer=null,previewScene=null,previewCamera=null;
 function preview(type){
  if(previewCache.has(type))return previewCache.get(type);
  let url='';
  try{
   if(!previewRenderer){
    previewRenderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
    previewRenderer.setSize(132,132);previewRenderer.setPixelRatio(1);
    previewRenderer.outputColorSpace=THREE.SRGBColorSpace;previewRenderer.toneMapping=THREE.ACESFilmicToneMapping;previewRenderer.toneMappingExposure=1.05;
    previewScene=new THREE.Scene();previewScene.environment=scene.environment;
    previewScene.add(new THREE.HemisphereLight('#f2fbff','#8f8368',2.2));
    const key=new THREE.DirectionalLight('#fff6e2',2.3);key.position.set(2.4,3.4,2.8);previewScene.add(key);
    previewCamera=new THREE.PerspectiveCamera(32,1,.04,40);
   }
   const model=propModel(type);previewScene.add(model);model.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());
   const reach=Math.max(size.x,size.y,size.z,.2),distance=reach*2.3+.3;
   previewCamera.position.set(centre.x+distance*.72,centre.y+distance*.52,centre.z+distance*.74);
   previewCamera.lookAt(centre);previewCamera.updateProjectionMatrix();
   previewRenderer.render(previewScene,previewCamera);
   url=previewRenderer.domElement.toDataURL('image/png');
   previewScene.remove(model);disposeModel(model);
  }catch(error){url='';}
  previewCache.set(type,url);return url;
 }
 const people=new Map();function avatar(team){const g=new THREE.Group();const shirt=team==='hunter'?m.teal:m.terracotta;const skin=mat('#c59776'),pants=m.cream;const torso=mesh(new THREE.CapsuleGeometry(.2,.36,5,12),shirt,g);torso.position.set(0,1.12,0);torso.scale.set(1,.98,.7);sphere(.143,0,1.61,0,skin,g,.9,1.1,.95);sphere(.146,0,1.68,.023,m.oak,g,.91,.55,.94);const limbs=[];for(const s of [-1,1]){const leg=cyl(.09,.074,.67,s*.12,.44,0,pants,g);limbs.push(leg);round(.16,.115,.28,.038,s*.12,.092,-.05,m.white,g);const arm=cyl(.078,.065,.49,s*.265,1.1,0,shirt,g);limbs.push(arm);sphere(.06,s*.265,.827,0,skin,g,.9,1.15,.9);}g.userData.limbs=limbs;g.userData.team=team;contact(0,0,.9,.7,g);scene.add(g);return g;}
 const gun=new THREE.Group();camera.add(gun);gun.position.set(.32,-.31,-.53);
 const aqua=mat('#63c4c4',{roughness:.3}),navy=mat('#28484a',{roughness:.42}),coral=mat('#f4a252',{roughness:.37}),skin=mat('#d6a482',{roughness:.65});
 round(.18,.19,.4,.045,0,0,-.04,aqua,gun);round(.205,.075,.32,.026,0,.1,-.015,m.white,gun);const barrel=cyl(.053,.054,.13,0,.023,-.275,coral,gun,24);barrel.rotation.x=Math.PI/2;const muzzle=cyl(.023,.025,.014,0,.023,-.345,navy,gun,20);muzzle.rotation.x=Math.PI/2;const grip=round(.1,.23,.115,.025,0,-.17,.077,navy,gun);grip.rotation.x=-.26;for(let i=0;i<5;i++)round(.106,.009,.12,.003,0,-.11-i*.025,.066,coral,gun);const trigger=torus(.044,.008,0,-.097,-.015,m.white,gun,Math.PI*1.6);trigger.rotation.y=Math.PI/2;
 cyl(.082,.072,.2,0,.245,.063,m.glass,gun,24);sphere(.082,0,.345,.063,m.glass,gun,1,.52,1);const waterFill=cyl(.073,.066,.13,0,.213,.063,m.water,gun,24);cyl(.05,.05,.023,0,.398,.063,coral,gun,20);for(const s of [-1,1]){box(.006,.09,.11,s*.094,.0,.02,m.white,gun);for(let i=0;i<3;i++)box(.008,.013,.066,s*.098,.02-i*.023,.022,navy,gun);}round(.09,.095,.145,.03,.025,-.15,.12,skin,gun);const arm=mesh(new THREE.CapsuleGeometry(.068,.29,5,12),m.cream,gun);arm.position.set(.06,-.225,.3);arm.rotation.x=-1.2;gun.visible=false;
 const collisionMeshes=[];const collisionMaterial=new THREE.MeshBasicMaterial();for(const [x,z,w,d]of walls){const c=new THREE.Mesh(new THREE.BoxGeometry(w,4.8,d),collisionMaterial);c.position.set(x,2.4,z);c.updateMatrixWorld();collisionMeshes.push(c);}
 const raycaster=new THREE.Raycaster(),cameraRay=new THREE.Raycaster();let currentState=null,currentId=null,own=null,lastTime=performance.now(),wasPlaying=false,recoil=0;const shots=[],seenShots=new Set(),shootMat=new THREE.MeshBasicMaterial({color:'#a5edfa',transparent:true,opacity:.65,depthWrite:false});
 function addShot(shot){if(seenShots.has(shot.id))return;seenShots.add(shot.id);if(seenShots.size>300)seenShots.delete(seenShots.values().next().value);if(!shot.from||!shot.to)return;const a=new THREE.Vector3(shot.from.x,shot.from.y??1.5,shot.from.z),b=new THREE.Vector3(shot.to.x,shot.to.y??.5,shot.to.z),g=new THREE.Group();if(shot.shooter===currentId&&gun.visible){gun.updateWorldMatrix(true,false);a.copy(gun.localToWorld(new THREE.Vector3(0,.023,-.345)));}const delta=b.clone().sub(a);const length=delta.length();if(length<.01)return;const streak=new THREE.Mesh(new THREE.CylinderGeometry(.013,.025,length,6),shootMat.clone());streak.position.copy(a).add(b).multiplyScalar(.5);streak.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());g.add(streak);for(let i=0;i<9;i++){const p=sphere(.023,b.x,b.y,b.z,m.water,g,.8,1.4,.8);p.userData.velocity=new THREE.Vector3((rand()-.5)*1.8,rand()*1.6,(rand()-.5)*1.8);}scene.add(g);shots.push({g,start:performance.now(),streak});}
 const revealEffects=[],seenEffects=new Set(),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const shardGeometry=new THREE.OctahedronGeometry(.07),ringGeometry=new THREE.TorusGeometry(.6,.025,6,48);
 function addEffect(effect,age=0){
  if(seenEffects.has(effect.id))return;seenEffects.add(effect.id);if(seenEffects.size>256)seenEffects.delete(seenEffects.values().next().value);
  if(age>1500)return;
  const g=new THREE.Group();g.position.set(effect.x,effect.y||0,effect.z);scene.add(g);
  const material=new THREE.MeshStandardMaterial({color:effect.kind==='decoy'?'#a8ddd8':'#60cce6',transparent:true,opacity:.9,roughness:.23,metalness:.15});
  const ring=new THREE.Mesh(ringGeometry,material);ring.rotation.x=-Math.PI/2;ring.position.y=.08;g.add(ring);
  const pieces=[];
  for(let i=0;i<(reducedMotion?8:36);i++){const piece=new THREE.Mesh(shardGeometry,material);const angle=i*2.4;piece.position.set(Math.cos(angle)*.2,.45+(i%6)*.13,Math.sin(angle)*.2);piece.scale.set(.5+(i%3)*.35,1.6,1);piece.userData.start=piece.position.clone();piece.userData.velocity=new THREE.Vector3(Math.cos(angle)*(1+i%4*.3),1.5+i%5*.3,Math.sin(angle)*(1+i%4*.3));g.add(piece);pieces.push(piece);}
  let silhouette=null;
  if(effect.kind==='reveal'){
   silhouette=new THREE.Group();g.add(silhouette);
   const body=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.55,4,12),material);body.position.y=.86;silhouette.add(body);
   const head=new THREE.Mesh(new THREE.SphereGeometry(.16,16,12),material);head.position.y=1.43;silhouette.add(head);
  }
  revealEffects.push({g,ring,pieces,material,silhouette,start:performance.now()-Math.max(0,age)});
 }
 function clearEffect(fx){scene.remove(fx.g);fx.material.dispose();fx.silhouette?.children.forEach(o=>o.geometry.dispose());}
 function animateEffects(now){for(let i=revealEffects.length-1;i>=0;i--){const fx=revealEffects[i],age=(now-fx.start)/1000;if(age>=1.5){clearEffect(fx);revealEffects.splice(i,1);continue;}const k=age/1.5;fx.material.opacity=.9*(1-k);fx.ring.scale.setScalar(1+age*(reducedMotion?.5:2.2));for(const piece of fx.pieces){piece.position.copy(piece.userData.start).addScaledVector(piece.userData.velocity,reducedMotion?age*.15:age);piece.position.y=Math.max(.05,piece.position.y-age*age*1.8);piece.rotation.set(age*3,age*2,age);piece.scale.multiplyScalar(.994);}if(fx.silhouette){fx.silhouette.position.y=age*.25;fx.silhouette.scale.setScalar(1+Math.sin(Math.min(1,age*3)*Math.PI)*.12);}}}
 function sync(state,myId){currentState=state;currentId=myId;if(!state)return;for(const effect of state.effects||[])addEffect(effect,state.now-effect.at);updateObjects(state.objects||initialProps);const visibleIds=new Set();for(const p of state.players||[]){const team=p.role||p.team;if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||p.status==='found'||p.propId)continue;visibleIds.add(p.id);let g=people.get(p.id);if(g&&g.userData.team!==team){scene.remove(g);people.delete(p.id);g=null;}if(!g){g=avatar(team);g.position.set(p.x,p.y||0,p.z);people.set(p.id,g);}g.userData.target=new THREE.Vector3(p.x,p.y||0,p.z);g.userData.angle=p.yaw||0;g.visible=p.id!==myId;}for(const[id,g]of people)if(!visibleIds.has(id))g.visible=false;for(const shot of state.shots||[])addShot(shot);}
 const tempVec=new THREE.Vector3(),cameraTarget=new THREE.Vector3();
 function render(state,myId,yaw,pitch,active,entered,t=performance.now()){const dt=Math.min(.06,Math.max(.001,(t-lastTime)/1000));lastTime=t;currentState=state;currentId=myId;own=state?.players?.find(p=>p.id===myId)||null;
 const mix=1-Math.exp(-dt*17);for(const g of objectModels.values()){if(g.userData.target){g.position.lerp(g.userData.target,mix);g.rotation.y+=Math.atan2(Math.sin(g.userData.angle-g.rotation.y),Math.cos(g.userData.angle-g.rotation.y))*mix;}}
 for(const [id,g]of people){if(g.userData.target){const speed=g.position.distanceTo(g.userData.target);g.position.lerp(g.userData.target,mix);g.rotation.y=g.userData.angle;g.userData.limbs?.forEach((l,i)=>l.rotation.x=speed>.015?Math.sin(t*.009+(i%2)*Math.PI)*.38:0);g.visible=g.visible&&id!==myId;}}
 const playing=active&&own&&Number.isFinite(own.x)&&Number.isFinite(own.z);recoil=Math.max(0,recoil-dt*5.4);
 if(playing){const isHider=(own.role||own.team)==='hider';const myObject=own.propId?objectModels.get(own.propId):null;const pos=myObject?myObject.position:people.get(myId)?.position||new THREE.Vector3(own.x,own.y||0,own.z);if(isHider){const ph=myObject?(propTypes[myObject.userData.type]?.height||.8):1.7;cameraTarget.copy(pos).add(new THREE.Vector3(0,Math.min(1.25,ph*.64+.17),0));const size=myObject?dimensions({type:myObject.userData.type}):null;const distance=myObject?Math.max(2.5,Math.hypot(size.w,size.d)*.75,(size.h||0)*1.25):3.2;const direction=new THREE.Vector3(0,0,1).applyEuler(new THREE.Euler(Math.max(-.75,Math.min(.32,pitch))-.16,yaw,0,'YXZ'));const desired=cameraTarget.clone().addScaledVector(direction,distance);desired.y=Math.max(.55,Math.min(ROOM.height-.75,desired.y+.5));tempVec.copy(desired).sub(cameraTarget);const full=tempVec.length();cameraRay.set(cameraTarget,tempVec.normalize());cameraRay.far=full;const hit=cameraRay.intersectObjects([architecture,...collisionMeshes,...[...objectModels.values()].filter(g=>g!==myObject)],true).find(h=>h.object.material!==contactMat);if(hit)desired.copy(cameraTarget).addScaledVector(tempVec,Math.max(.16,hit.distance-.16));if(!wasPlaying)camera.position.copy(desired);else camera.position.lerp(desired,1-Math.exp(-dt*24));camera.lookAt(cameraTarget);const body=people.get(myId);if(body)body.visible=!myObject&&own.status!=='found';gun.visible=false;}
 else{const desired=pos.clone().add(new THREE.Vector3(0,1.64,0));if(!wasPlaying)camera.position.copy(desired);else camera.position.lerp(desired,1-Math.exp(-dt*27));camera.rotation.set(Math.max(-1.35,Math.min(1.35,pitch)),yaw,0,'YXZ');gun.visible=!!entered&&own.status!=='found';gun.position.set(.32,-.31+Math.sin(t*.002)*.003,-.53+recoil*.085);gun.rotation.set(recoil*.16,0,-recoil*.07);const fill=Math.max(.02,Math.min(1,(own.ammo??100)/100));waterFill.scale.y=fill;waterFill.position.y=.148+.065*fill;}}
 else{gun.visible=false;camera.position.set(-11.9,1.9,8.8);camera.lookAt(-5.5,.75,3.8);}
 wasPlaying=!!playing;for(let i=shots.length-1;i>=0;i--){const shot=shots[i],age=(performance.now()-shot.start)/1000;shot.streak.visible=age<.15;shot.streak.material.opacity=Math.max(0,.65-age*4);for(const p of shot.g.children){if(!p.userData.velocity)continue;p.position.addScaledVector(p.userData.velocity,dt);p.userData.velocity.y-=dt*4;p.scale.multiplyScalar(.97);}if(age>.5){scene.remove(shot.g);shot.streak.geometry.dispose();shot.streak.material.dispose();shots.splice(i,1);}}
 animateEffects(performance.now());renderer.render(scene,camera);
 }
 function pickObject(maxDistance=4.5){if(!own)return null;scene.updateMatrixWorld(true);raycaster.setFromCamera(new THREE.Vector2(0,0),camera);raycaster.far=12;const groups=[...objectModels.values()].filter(g=>g.userData.objectId!==own.propId);const intersections=raycaster.intersectObjects(groups,true);const wall=raycaster.intersectObjects(collisionMeshes,false)[0];for(const hit of intersections){if(wall&&wall.distance+.025<hit.distance)return null;let g=hit.object;while(g&&!g.userData.objectId)g=g.parent;if(!g)continue;const distance=objectDistance(own,{type:g.userData.type,x:g.position.x,z:g.position.z,angle:g.rotation.y});return distance<=maxDistance?g.userData.objectId:null;}return null;}
 function reset(){for(const fx of revealEffects)clearEffect(fx);revealEffects.length=0;seenEffects.clear();own=null;currentState=null;currentId=null;wasPlaying=false;for(const p of people.values())p.visible=false;updateObjects(initialProps);for(const shot of shots)scene.remove(shot.g);shots.length=0;seenShots.clear();}
 const resize=()=>{const width=container.clientWidth||innerWidth,height=container.clientHeight||innerHeight;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);};window.addEventListener('resize',resize);resize();
 return{renderer,camera,sync,render,reset,kick:()=>{recoil=1;},pickObject,preview};
}
