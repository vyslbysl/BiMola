import {bulletStop, boxEntry, arenaVertices, clampArena} from './arena.js';
import {getMap, mapArena} from './maps.js';
import {abilityCover,TEAMS,teamColor} from './rules.js';
import * as THREE from '/vendor/three.module.js';

// The game uses x/y on the server and x/z on the arena floor.
export function createScene3D(canvas) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = window.innerWidth > 600;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#111c27');
  scene.fog = new THREE.Fog('#111c27', 1100, 2400);
  const camera = new THREE.PerspectiveCamera(58,1,2,2500);
  const cameraTarget = new THREE.Vector3(), cameraGoal = new THREE.Vector3();
  let followReady = false, pitch = .48;
  camera.position.set(0,720,660); camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xddeff0,0x172723,2.4));
  const key = new THREE.DirectionalLight(0xffedcf,3.5); key.position.set(-240,600,250);
  key.castShadow = renderer.shadowMap.enabled; key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-800,right:800,top:650,bottom:-650,near:1,far:1800});
  key.shadow.bias = -.001; scene.add(key);
  const rimLight = new THREE.DirectionalLight(0xaedfff,2); rimLight.position.set(350,180,-320); scene.add(rimLight);
  const materials = {
    floor: new THREE.MeshStandardMaterial({color:0x304345,roughness:.65,metalness:.55}),
    base: new THREE.MeshStandardMaterial({color:0x182c31,roughness:.4,metalness:.7}),
    trim: new THREE.MeshStandardMaterial({color:0x687c79,roughness:.35,metalness:.8}),
    neon: new THREE.MeshStandardMaterial({color:0xc7f579,emissive:0xa7e85f,emissiveIntensity:1.6}),
    grid: new THREE.LineBasicMaterial({color:0x59716b,transparent:true,opacity:.35}),
    me: new THREE.MeshStandardMaterial({color:0xc7f579,roughness:.45,metalness:.25}),
    rival: new THREE.MeshStandardMaterial({color:0xb6ccd2,roughness:.45,metalness:.25}),
    dead: new THREE.MeshStandardMaterial({color:0xa16d60,roughness:.7}),
    dark: new THREE.MeshStandardMaterial({color:0x16272e,roughness:.4,metalness:.5}),
    visor: new THREE.MeshStandardMaterial({color:0x7bd4ee,emissive:0x38768b,emissiveIntensity:.8,roughness:.2,metalness:.6}),
    shot: new THREE.MeshBasicMaterial({color:0xe7ffc1,transparent:true,opacity:.9}),
    hit: new THREE.MeshBasicMaterial({color:0xff9276,transparent:true,opacity:.95}),
  };
  const resources = new Set(), textures = new Set();
  const geometry = value => {resources.add(value);return value;};
  function mesh(shape,material,parent,x=0,y=0,z=0) {
    const m = new THREE.Mesh(shape,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  const steelCanvas=document.createElement('canvas');steelCanvas.width=steelCanvas.height=512;
  const steelContext=steelCanvas.getContext('2d');steelContext.fillStyle='#b2b6b5';steelContext.fillRect(0,0,512,512);
  let seed=71;const noise=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<9000;i++){const value=Math.floor(90+noise()*110);steelContext.fillStyle=`rgba(${value},${value},${value},.18)`;steelContext.fillRect(noise()*512,noise()*512,1+noise()*3,1);}
  for(let i=0;i<180;i++){steelContext.strokeStyle='rgba(30,40,45,.1)';steelContext.beginPath();const x=noise()*512,y=noise()*512;steelContext.moveTo(x,y);steelContext.lineTo(x+noise()*24,y+noise()*3);steelContext.stroke();}
  const steelTexture=new THREE.CanvasTexture(steelCanvas);textures.add(steelTexture);steelTexture.wrapS=steelTexture.wrapT=THREE.RepeatWrapping;steelTexture.repeat.set(5,5);steelTexture.colorSpace=THREE.SRGBColorSpace;materials.floor.map=steelTexture;
  const platform = new THREE.Group(); scene.add(platform);
  mesh(geometry(new THREE.BoxGeometry(1460,24,1160)),materials.base,platform,0,-14);
  mesh(geometry(new THREE.BoxGeometry(1440,4,1140)),materials.floor,platform,0,-1);
  const concrete=new THREE.MeshStandardMaterial({color:0x56606a,roughness:.95});
  const orange=new THREE.MeshStandardMaterial({color:0xdb8438,roughness:.6,metalness:.3});
  const warning=new THREE.MeshStandardMaterial({color:0xe0af51,roughness:.7});
  const wall=new THREE.MeshStandardMaterial({color:0x253849,roughness:.8,metalness:.3});
  Object.assign(materials,{concrete,orange,warning,wall});
  const gridPositions=[];
  for(let x=-680;x<=680;x+=80)gridPositions.push(x,2,-550,x,2,550);
  for(let z=-520;z<=520;z+=80)gridPositions.push(-700,2,z,700,2,z);
  const gridGeometry=geometry(new THREE.BufferGeometry());gridGeometry.setAttribute('position',new THREE.Float32BufferAttribute(gridPositions,3));platform.add(new THREE.LineSegments(gridGeometry,materials.grid));
  const surroundings=new THREE.Group();scene.add(surroundings);
  const wallGeo=geometry(new THREE.BoxGeometry(140,145,18)),pillarGeo=geometry(new THREE.BoxGeometry(16,200,22));
  const railGeo=geometry(new THREE.BoxGeometry(140,5,5)),pipeGeo=geometry(new THREE.CylinderGeometry(4,4,140,10));
  const lampGeo=geometry(new THREE.BoxGeometry(28,6,8)),crateGeo=geometry(new THREE.BoxGeometry(30,34,30));
  const stripeGeo=geometry(new THREE.BoxGeometry(8,1,20));
  function wallSection(x,z,rotation,index,parent=surroundings){
    const section=new THREE.Group();section.position.set(x,0,z);section.rotation.y=rotation;parent.add(section);
    mesh(wallGeo,wall,section,0,65);mesh(pillarGeo,materials.trim,section,-70,85);
    mesh(railGeo,orange,section,0,120,-12);mesh(railGeo,materials.trim,section,0,165,-12);
    const pipe=mesh(pipeGeo,materials.trim,section,0,185,-8);pipe.rotation.z=Math.PI/2;
    mesh(lampGeo,materials.neon,section,0,103,-13);
    if(index%3===0){mesh(crateGeo,concrete,section,25,16,26);mesh(crateGeo,orange,section,-15,16,28);}
    for(let j=-5;j<=5;j++){const stripe=mesh(stripeGeo,j%2?materials.dark:warning,section,j*10,2,-12);stripe.rotation.y=-.35;}
  }
  for(let i=0;i<10;i++){wallSection(-630+i*140,580,0,i);wallSection(630-i*140,-580,Math.PI,i);}
  for(let i=0;i<8;i++){wallSection(730,490-i*140,Math.PI/2,i);wallSection(-730,-490+i*140,-Math.PI/2,i);}
  // Flush markings and equipment beyond the walls leave the entire floor traversable.
  const laneGeo=geometry(new THREE.BoxGeometry(5,.5,1080));
  mesh(laneGeo,warning,platform,-680,2);mesh(laneGeo,warning,platform,680,2);
  const endLaneGeo=geometry(new THREE.BoxGeometry(1360,.5,5));mesh(endLaneGeo,warning,platform,0,2,-530);mesh(endLaneGeo,warning,platform,0,2,530);
  const boltGeo=geometry(new THREE.CylinderGeometry(2,2,1,6));
  for(let x=-640;x<=640;x+=80)for(const z of [-520,520])mesh(boltGeo,materials.trim,platform,x,3,z);
  const center=mesh(geometry(new THREE.BoxGeometry(180,1,130)),materials.base,platform,0,1);center.castShadow=false;
  const screenCanvas=document.createElement('canvas');screenCanvas.width=1024;screenCanvas.height=256;
  const screenContext=screenCanvas.getContext('2d');screenContext.fillStyle='#101c28';screenContext.fillRect(0,0,1024,256);screenContext.fillStyle='#c7f579';screenContext.font='bold 88px system-ui';screenContext.textAlign='center';screenContext.fillText('KÖR ATIŞ',512,115);screenContext.fillStyle='#e0af51';screenContext.font='28px system-ui';screenContext.fillText('BİMOLA / DÖKÜMHANE ARENASI',512,185);
  const screenTexture=new THREE.CanvasTexture(screenCanvas);textures.add(screenTexture);materials.screen=new THREE.MeshBasicMaterial({map:screenTexture});
  mesh(geometry(new THREE.PlaneGeometry(280,70)),materials.screen,surroundings,0,140,-569);
  const coverGroup=new THREE.Group();scene.add(coverGroup);
  const coverCube=geometry(new THREE.BoxGeometry(1,1,1));let currentMap='',coverKey='';
  const polygonGroup=new THREE.Group();scene.add(polygonGroup);const polygonResources=new Set();
  const borderMaterial=new THREE.LineBasicMaterial({color:0xffba65});materials.boundary=borderMaterial;
  const borderGeometry=geometry(new THREE.BufferGeometry());const borderLine=new THREE.LineLoop(borderGeometry,borderMaterial);scene.add(borderLine);
  const stormMaterial=new THREE.MeshBasicMaterial({color:0xf18447,transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false});materials.storm=stormMaterial;
  let stormMesh,borderKey='';
  function floorShape(vertices){const shape=new THREE.Shape();vertices.forEach((p,i)=>i?shape.lineTo(p.x,-p.y):shape.moveTo(p.x,-p.y));shape.closePath();return shape;}
  function polyGeometry(value){polygonResources.add(value);return value;}
  function rebuildPolygon(arena){
    polygonGroup.clear();for(const geo of polygonResources)geo.dispose();polygonResources.clear();
    const vertices=arenaVertices(mapArena(arena.mapId));
    platform.visible=surroundings.visible=arena.sides===4;
    if(arena.sides===4)return;
    const shape=floorShape(vertices);
    const base=mesh(polyGeometry(new THREE.ExtrudeGeometry(shape,{depth:24,bevelEnabled:false})),materials.base,polygonGroup,0,-24);base.rotation.x=-Math.PI/2;
    const floor=mesh(polyGeometry(new THREE.ShapeGeometry(shape)),materials.floor,polygonGroup,0,2);floor.rotation.x=-Math.PI/2;
    const grid=[];
    for(const axis of ['x','y'])for(let value=-640;value<=640;value+=80){
      const intersections=[];
      for(let i=0;i<vertices.length;i++){
        const a=vertices[i],b=vertices[(i+1)%vertices.length],delta=b[axis]-a[axis];
        if(Math.abs(delta)<1e-9)continue;
        const t=(value-a[axis])/delta;if(t>=0&&t<=1)intersections.push(axis==='x'?a.y+(b.y-a.y)*t:a.x+(b.x-a.x)*t);
      }
      if(intersections.length>=2){const low=Math.min(...intersections),high=Math.max(...intersections);if(axis==='x')grid.push(value,3,low,value,3,high);else grid.push(low,3,value,high,3,value);}
    }
    const gridGeo=polyGeometry(new THREE.BufferGeometry());gridGeo.setAttribute('position',new THREE.Float32BufferAttribute(grid,3));polygonGroup.add(new THREE.LineSegments(gridGeo,materials.grid));
    for(let i=0;i<vertices.length;i++){
      const v=vertices[i],next=vertices[(i+1)%vertices.length],dx=next.x-v.x,dz=next.y-v.y,length=Math.hypot(dx,dz),segments=Math.ceil(length/140);
      for(let j=0;j<segments;j++){const t=(j+.5)/segments;wallSection(v.x+dx*t+dz/length*30,v.y+dz*t-dx/length*30,Math.PI-Math.atan2(dz,dx),j,polygonGroup);}
    }
  }
  function updateBoundary(arena){
    const key=`${arena.mapId}:${arena.scale}`;if(key===borderKey)return;borderKey=key;
    const vertices=arenaVertices(arena);borderGeometry.dispose();borderGeometry.deleteAttribute('position');borderGeometry.setFromPoints(vertices.map(p=>new THREE.Vector3(p.x,4,p.y)));borderGeometry.computeBoundingSphere();
    if(stormMesh){scene.remove(stormMesh);stormMesh.geometry.dispose();stormMesh=null;}
    if((arena.scale||1)<.999){
      const shape=floorShape(arenaVertices(mapArena(arena.mapId))),hole=floorShape([...vertices].reverse());shape.holes.push(hole);
      stormMesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),stormMaterial);stormMesh.rotation.x=-Math.PI/2;stormMesh.position.y=3;scene.add(stormMesh);
    }
  }
  function updateMap(arena){
    if(!arena)return;updateBoundary(arena);
    const key=`${arena.mapId}:${arena.obstacles.map(o=>o.id).join(',')}`;
    if(coverKey===key)return;coverKey=key;coverGroup.clear();
    if(currentMap!==arena.mapId){currentMap=arena.mapId;rebuildPolygon(arena);}
    const map=getMap(arena.mapId);materials.floor.color.setHex(map.floor);wall.color.setHex(map.wall);orange.color.setHex(map.accent);
    for(const o of arena.obstacles||[]){
      const material=o.kind==='wall'||o.kind==='pillar'?concrete:orange;
      const body=mesh(coverCube,material,coverGroup,o.x,o.height/2,o.y);body.scale.set(o.width,o.height,o.depth);
      const cap=mesh(coverCube,materials.trim,coverGroup,o.x,o.height+1,o.y);cap.scale.set(o.width+3,3,o.depth+3);
      if(o.kind==='container'||o.kind==='crate')for(const face of [-1,1])for(let j=-2;j<=2;j++){
        const rib=mesh(coverCube,materials.trim,coverGroup,o.x+j*o.width/5,o.height/2,o.y+face*(o.depth/2+1));rib.scale.set(3,o.height-6,2);
      }
    }
    screenContext.fillStyle='#101c28';screenContext.fillRect(0,135,1024,121);screenContext.fillStyle='#e0af51';screenContext.font='28px system-ui';screenContext.fillText(`BİMOLA / ${map.name.toLocaleUpperCase('tr')} ARENASI`,512,185);screenTexture.needsUpdate=true;
  }
  const aimGeometry=geometry(new THREE.BufferGeometry());aimGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
  const aimLine=new THREE.Line(aimGeometry,new THREE.LineDashedMaterial({color:0xc7f579,dashSize:9,gapSize:7,transparent:true,opacity:.8}));scene.add(aimLine);
  const aimArrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),42,0xc7f579,12,9);scene.add(aimArrow);
  const bodyGeometry=geometry(new THREE.CylinderGeometry(9,12,24,8)), headGeometry=geometry(new THREE.SphereGeometry(10,12,8));
  const legGeometry=geometry(new THREE.BoxGeometry(7,15,9)), armGeometry=geometry(new THREE.BoxGeometry(7,7,18));
  const gunGeometry=geometry(new THREE.BoxGeometry(6,7,25)), visorGeometry=geometry(new THREE.BoxGeometry(15,7,1));
  const markerRingGeometry=geometry(new THREE.TorusGeometry(17,1.2,6,32));
  const helmetGeometry=geometry(new THREE.SphereGeometry(11.5,12,6,0,Math.PI*2,0,Math.PI*.6)),bootGeometry=geometry(new THREE.BoxGeometry(8,6,13)),shoulderGeometry=geometry(new THREE.SphereGeometry(6,8,6));
  const vestGeometry=geometry(new THREE.BoxGeometry(17,19,5)),packGeometry=geometry(new THREE.BoxGeometry(15,20,8)),badgeGeometry=geometry(new THREE.BoxGeometry(4,5,2)),barrelGeometry=geometry(new THREE.CylinderGeometry(2,2,14,8));
  const shieldMaterial=new THREE.MeshBasicMaterial({color:0x70d5ff,transparent:true,opacity:.2,wireframe:true});materials.shield=shieldMaterial;
  const teamMaterials=TEAMS.map(team=>new THREE.MeshStandardMaterial({color:team.color}));teamMaterials.forEach((m,i)=>materials['team'+i]=m);
  const teamRings=TEAMS.map(t=>new THREE.MeshBasicMaterial({color:t.color}));teamRings.forEach((m,i)=>materials['teamRing'+i]=m);
  const shieldGeometry=geometry(new THREE.SphereGeometry(30,16,12));
  const abilityPreview=mesh(coverCube,shieldMaterial,scene,0,37.5,0);abilityPreview.scale.set(52,75,52);abilityPreview.visible=false;
  const avatars=new Map(), shotGroup=new THREE.Group();scene.add(shotGroup);
  const shotGeometry=geometry(new THREE.CylinderGeometry(.9,.9,1,6));
  const sparkGeometry=geometry(new THREE.SphereGeometry(3,6,4));
  const burstGeometry=geometry(new THREE.TorusGeometry(1,.08,6,40));
  const shotColors=[0xc7f579,0x70d5ff,0xffbe65,0xd5a0ff,0xff8cc2,0x81ffe3,0xffe980,0xa1b7ff];
  const shotMaterials=shotColors.map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));
  shotMaterials.forEach((mat,index)=>materials[`trail${index}`]=mat);
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastShotKey='', shotStarted=0, effects=[], disposed=false;
  const temporaryMaterials=new Set(), temporaryTextures=new Set();
  function clearShots(){
    shotGroup.clear();effects=[];
    for(const mat of temporaryMaterials)mat.dispose();temporaryMaterials.clear();
    for(const texture of temporaryTextures)texture.dispose();temporaryTextures.clear();
  }
  function effectLabel(text,color,x,y,z){
    const labelCanvas=document.createElement('canvas');labelCanvas.width=768;labelCanvas.height=128;
    const ctx=labelCanvas.getContext('2d');ctx.fillStyle='#0b1627ed';ctx.fillRect(0,0,768,128);
    ctx.strokeStyle=color;ctx.lineWidth=8;ctx.strokeRect(4,4,760,120);
    ctx.fillStyle=color;ctx.font='bold 38px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,64,735);
    const texture=new THREE.CanvasTexture(labelCanvas);texture.colorSpace=THREE.SRGBColorSpace;temporaryTextures.add(texture);
    const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});temporaryMaterials.add(material);
    const sprite=new THREE.Sprite(material);sprite.position.set(x,y,z);sprite.scale.set(235,39,1);sprite.renderOrder=5;shotGroup.add(sprite);return sprite;
  }

  const raycaster=new THREE.Raycaster(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),0),hitPoint=new THREE.Vector3();
  const up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
  function avatar(player,self){
    const group=new THREE.Group(),actor=new THREE.Group();group.add(actor);scene.add(group);const shield=mesh(shieldGeometry,shieldMaterial,group,0,30,0);shield.visible=false;
    const color=Number.isInteger(player.team)&&!!teamMaterials[player.team]?teamMaterials[player.team]:self?materials.me:materials.rival;
    mesh(bodyGeometry,color,actor,0,25,0);mesh(headGeometry,materials.dark,actor,0,46,0);
    mesh(helmetGeometry,color,actor,0,47,0);mesh(shoulderGeometry,color,actor,-13,32,0);mesh(shoulderGeometry,color,actor,13,32,0);
    mesh(vestGeometry,materials.dark,actor,0,26,9);
    mesh(packGeometry,materials.trim,actor,0,27,-11);
    mesh(badgeGeometry,materials.neon,actor,-4,32,12);
    mesh(barrelGeometry,materials.trim,actor,13,29,38).rotation.x=Math.PI/2;
    const legs=[mesh(legGeometry,materials.dark,actor,-6,8,0),mesh(legGeometry,materials.dark,actor,6,8,0)];
    mesh(bootGeometry,materials.trim,legs[0],0,-5,2);mesh(bootGeometry,materials.trim,legs[1],0,-5,2);
    mesh(armGeometry,color,actor,-13,29,6);mesh(armGeometry,color,actor,13,29,6);
    mesh(gunGeometry,materials.dark,actor,13,29,20);mesh(visorGeometry,materials.visor,actor,0,47,9.5);
    const ring=mesh(markerRingGeometry,teamRings[player.team]||(self?materials.neon:materials.trim),group,0,2);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
    const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=64;
    const context=labelCanvas.getContext('2d');context.fillStyle='#102024dd';context.fillRect(0,0,256,64);context.fillStyle=TEAMS[player.team]?teamColor(player.team):self?'#c7f579':'#dfebe4';context.font='bold 25px system-ui';context.textAlign='center';context.textBaseline='middle';context.fillText(player.name,128,32,242);
    const texture=new THREE.CanvasTexture(labelCanvas);textures.add(texture);
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));label.position.set(0,75,0);label.scale.set(75,19,1);group.add(label);
    return {group,actor,shield,label,ring,legs,previous:null};
  }
  function resize(){
    if(disposed)return;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();
  }
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function pick(clientX,clientY){
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return null;
    raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),camera);
    return raycaster.ray.intersectPlane(ground,hitPoint)?{x:hitPoint.x,y:hitPoint.z}:null;
  }
  function draw(state,draft, options = {}){
    if(disposed)return;
    updateMap(state?.arena);
    const planning=state?.phase==='plan',me=state?.players.find(p=>p.id===state.me);
    const shotKey=state&&['reveal','round-end','end'].includes(state.phase)?`${state.code}:${state.matchRound}:${state.round}:${state.shots.map(s=>s.id).join(',')}`:'';
    if(shotKey!==lastShotKey){
      clearShots();lastShotKey=shotKey;shotStarted=performance.now();
      const names=new Map((state?.players||[]).map(p=>[p.id,p.name]));
      for(const [index,shot] of (state?.shots||[]).entries()){
        const dx=shot.endX-shot.x,dz=shot.endY-shot.y,len=Math.hypot(dx,dz);if(!len)continue;
        const mat=shotMaterials[index%shotMaterials.length];
        const beam=mesh(shotGeometry,mat,shotGroup);beam.quaternion.setFromUnitVectors(up,direction.set(dx,0,dz).normalize());beam.castShadow=false;
        const muzzleMaterial=mat.clone();temporaryMaterials.add(muzzleMaterial);
        const muzzle=mesh(headGeometry,muzzleMaterial,shotGroup,shot.x,29,shot.y);muzzle.castShadow=false;
        const label=effectLabel(shot.target ? `${names.get(shot.id)||'Oyuncu'} → ${names.get(shot.target)||'Oyuncu'}` : `${names.get(shot.id)||'Oyuncu'} · ${shot.protectedTarget?'KALKAN':shot.allyTarget?'TAKIM ARKADAŞI':shot.obstacleId?'SİPERE ÇARPTI':'ISKALADI'}`, `#${mat.color.getHexString()}`, (shot.x+shot.endX)/2,90+index%2*35,(shot.y+shot.endY)/2);
        const effect={shot,dx,dz,len,beam,muzzle,label,sparks:[]};
        if(shot.target||shot.obstacleId){
          const victim=state.players.find(p=>p.id===shot.target);
          const x=victim?.x??shot.endX,z=victim?.y??shot.endY;
          const impactMaterial=new THREE.MeshBasicMaterial({color:0xff8054,transparent:true,opacity:1,depthWrite:false});temporaryMaterials.add(impactMaterial);
          effect.burst=mesh(burstGeometry,impactMaterial,shotGroup,x,4,z);effect.burst.rotation.x=-Math.PI/2;effect.burst.castShadow=false;
          effect.hitLabel=effectLabel(shot.target?'VURULDU':'SİPER', '#ff9276',x,95,z);
          for(let j=0;j<12;j++){
            const spark=mesh(sparkGeometry,impactMaterial,shotGroup,x,30,z);spark.castShadow=false;
            effect.sparks.push({spark,x,z,angle:j*Math.PI/6});
          }
        }
        effects.push(effect);
      }
    }
    const age=options.replayAge??(performance.now()-shotStarted)/1000;
    const newlyHit=new Set((state?.shots||[]).map(s=>s.target).filter(Boolean));
    const visible=new Set();
    for(const p of state?.players||[]){
      if(!Number.isFinite(p.x)||state.phase==='lobby'||(planning&&(!p.alive||(p.id!==state.me&&(state.rules.mode!=='teams'||!me?.alive||p.team!==me.team)))))continue;
      visible.add(p.id);let a=avatars.get(p.id);if(!a){a=avatar(p,p.id===state.me);avatars.set(p.id,a);}
      const point=planning&&p.id===state.me?draft||p:p;
      const moving = a.previous && Math.hypot(point.x-a.previous.x,point.y-a.previous.y)>.01;
      const stride = moving && p.alive ? Math.sin(performance.now()*.012)*.32 : 0;
      a.legs[0].rotation.x=stride;a.legs[1].rotation.x=-stride;a.previous={x:point.x,y:point.y};
      a.group.position.set(point.x,0,point.y);a.actor.rotation.y=Math.PI/2-point.angle;
      const fall=p.alive?0:!newlyHit.has(p.id)||reducedMotion?1:Math.max(0,Math.min(1,(age-.3)/.85));
      const eased=1-Math.pow(1-fall,3);
      a.actor.rotation.z=eased*Math.PI/2;a.actor.position.y=eased*9;a.ring.visible=p.alive;
      a.shield.visible=p.alive&&((planning&&p.id===state.me?draft?.ability:p.ability)==='shield');
      a.label.position.y=p.alive?75:40;
      a.label.visible = !(p.id === state.me && options.follow);
    }
    for(const [id,a] of avatars)if(!visible.has(id)){scene.remove(a.group);a.label.material.map.dispose();textures.delete(a.label.material.map);a.label.material.dispose();avatars.delete(id);}
    const canAim=planning&&me?.alive&&draft;
    abilityPreview.visible=!!(planning&&draft?.ability==='cover'&&me?.alive);
    if(abilityPreview.visible){const cover=abilityCover(draft,state.arena);abilityPreview.position.set(cover.x,37.5,cover.y);}
    aimLine.visible=aimArrow.visible=!!canAim;
    if(canAim){
      const dx=Math.cos(draft.angle),dz=Math.sin(draft.angle);
      const length=bulletStop(draft.x,draft.y,draft.angle,state.arena).distance;
      aimGeometry.attributes.position.array.set([draft.x,3,draft.y,draft.x+dx*length,3,draft.y+dz*length]);aimGeometry.attributes.position.needsUpdate=true;aimGeometry.computeBoundingSphere();aimLine.computeLineDistances();
      aimArrow.position.set(draft.x,5,draft.y);aimArrow.setDirection(direction.set(dx,0,dz));aimArrow.setLength(Math.min(42,length),Math.min(12,length/3),9);
    }
    for(const effect of effects){
      const {shot,dx,dz,len,beam,muzzle,label}=effect;
      const travel=reducedMotion?1:Math.min(1,age/.3),length=len*travel;
      beam.position.set(shot.x+dx*travel/2,29,shot.y+dz*travel/2);beam.scale.set(2.3,length,2.3);
      const muzzleSize=Math.max(0,1-age/.25)*1.1;
      muzzle.scale.setScalar(reducedMotion?0:muzzleSize);muzzle.visible=age<.25&&!reducedMotion;
      label.visible=age>=.3||reducedMotion;
      const impactAge=Math.max(0,age-.3),progress=Math.min(1,impactAge/1.2);
      if(effect.burst){
        effect.burst.visible=age>=.3&&impactAge<1.2&&!reducedMotion;
        effect.burst.scale.setScalar(15+progress*80);effect.burst.material.opacity=1-progress;
        effect.hitLabel.visible=age>=.3||reducedMotion;effect.hitLabel.position.y=95+(reducedMotion?0:Math.min(impactAge,1)*35);
        for(const {spark,x,z,angle} of effect.sparks){
          spark.visible=age>=.3&&impactAge<1.2&&!reducedMotion;
          spark.position.set(x+Math.cos(angle)*progress*85,30+Math.sin(progress*Math.PI)*65,z+Math.sin(angle)*progress*85);
          spark.scale.setScalar(2*(1-progress));
        }
      }
    }
    if (options.replayAge!==undefined && effects.length) {
      const focus=effects.find(e=>e.shot.target===state.me)||effects.find(e=>e.shot.target)||effects[0];
      const {shot,dx,dz,len}=focus,middleX=shot.x+dx*.5,middleZ=shot.y+dz*.5;
      const distance=Math.max(300,Math.min(1500,len*1.25+100));
      cameraGoal.set(middleX-Math.sin(Math.atan2(dz,dx))*distance*.8,Math.max(220,distance*.8),middleZ+Math.cos(Math.atan2(dz,dx))*distance*.8);
      camera.position.lerp(cameraGoal,reducedMotion?1:.1);camera.lookAt(middleX,25,middleZ);followReady=false;
    } else if (options.follow && me?.alive && draft) {
      const distance = 110, height = 35 + Math.sin(pitch) * 105;
      cameraGoal.set(draft.x - Math.cos(draft.angle) * distance - Math.sin(draft.angle) * 35, height, draft.y - Math.sin(draft.angle) * distance + Math.cos(draft.angle) * 35);
      const cameraBounds=clampArena(cameraGoal.x,cameraGoal.z,mapArena(state.mapId));
      cameraGoal.x=cameraBounds.x;cameraGoal.z=cameraBounds.y;
      const cx=cameraGoal.x-draft.x,cz=cameraGoal.z-draft.y;
      let cameraFraction=1;
      for(const o of state.arena.obstacles||[])if(o.height+8>=height)cameraFraction=Math.min(cameraFraction,Math.max(.05,boxEntry(draft.x,draft.y,cx,cz,o,8)-.02));
      if(cameraFraction<1){cameraGoal.x=draft.x+cx*cameraFraction;cameraGoal.z=draft.y+cz*cameraFraction;}
      cameraTarget.set(draft.x + Math.cos(draft.angle) * 140, 29, draft.y + Math.sin(draft.angle) * 140);
      if (!followReady) { camera.position.copy(cameraGoal); followReady = true; }
      else camera.position.lerp(cameraGoal,.22);
      camera.lookAt(cameraTarget);
    } else {
      followReady = false; cameraGoal.set(0,1040,1150);camera.position.lerp(cameraGoal,.12);camera.lookAt(0,0,0);
    }
    renderer.render(scene,camera);
  }
  function dispose(){
    if(disposed)return;disposed=true;observer.disconnect();clearShots();for(const geo of polygonResources)geo.dispose();polygonResources.clear();
    const geometries=new Set(resources),mats=new Set(Object.values(materials));scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const mat of Array.isArray(object.material)?object.material:[object.material])if(mat)mats.add(mat);});
    for(const texture of textures)texture.dispose();for(const geo of geometries)geo.dispose();for(const mat of mats)mat.dispose();renderer.dispose();renderer.forceContextLoss();scene.clear();avatars.clear();
  }
  return {draw,pick,resize,dispose,resetView(){pitch=.48;followReady=false;}, look(delta) { pitch = Math.max(.08,Math.min(1.1,pitch + delta)); }};
}
