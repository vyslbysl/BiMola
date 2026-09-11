import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,MAP_CHOICES,mapTypes} from '../public/maps.js';
import {generateProps,free,groundAt,mapFor,propTypes,pathTo,nearestHit,sight} from '../public/world.js';
import {player,start,tick,view,sanitizeSettings,configureRoom,defaultSettings} from '../game.js';
function make(mapId,teamSize=3){const r={host:'a',phase:'lobby',settings:sanitizeSettings({mapId,teamSize,botMode:'fill',swapTeams:false}),players:{a:player('a','Avcı',false,'hunter')}};assert.equal(start(r,1000).ok,true);return r;}
test('all eight maps are selectable and each new map has its own valid, supported inventory',()=>{
 assert.equal(MAP_CHOICES.length,8);
 for(const map of Object.values(MAPS)){
  const objects=generateProps(0,1,map.id),ids=new Set(objects.map(o=>o.id));assert.equal(ids.size,objects.length);
  assert.ok(objects.length>25);
  for(const o of objects){assert.ok(propTypes[o.type],o.type);assert.equal(o.mapId,map.id);if(o.supportId)assert.ok(ids.has(o.supportId));assert.ok(o.y>=groundAt(o.x,o.z,objects));}
  assert.equal(mapFor(objects).id,map.id);assert.ok(generateProps(15,1,map.id).length>objects.length);
 }
});
test('each map supports 1v1, 6v6 and 12v12 clear, separated spawns',()=>{
 for(const id of Object.keys(MAPS))for(const count of [1,6,12]){
  const r=make(id,count),players=Object.values(r.players);assert.equal(players.length,count*2);
  for(const p of players){assert.ok(free(p.x,p.z,.28,r.objects,null,p.y),`${id}: ${p.id} blocked`);assert.ok(!players.some(q=>q!==p&&Math.hypot(q.x-p.x,q.z-p.z)<.64));}
 }
});
test('room map changes are host-only, locked during play and isolated between simultaneous rooms',()=>{
 const a=make('market'),b=make('greenhouse');
 assert.equal(mapFor(a.objects).id,'market');assert.equal(mapFor(b.objects).id,'greenhouse');
 assert.ok(configureRoom(a,{mapId:'arcade'},'a').error);
 a.phase='end';assert.ok(configureRoom(a,{mapId:'arcade'},'other').error);assert.ok(configureRoom(a,{mapId:'arcade'},'a').ok);start(a,30000);
 assert.equal(mapFor(a.objects).id,'arcade');assert.equal(mapFor(b.objects).id,'greenhouse');assert.equal(view(a,'a').settings.mapId,'arcade');
 assert.equal(sanitizeSettings({mapId:'../../invalid'}).mapId,'loft');
});
test('greenhouse glazing blocks water and movement but allows sight, with open exits',()=>{
 const objects=generateProps(0,1,'greenhouse');
 const from={x:-9,y:.3,z:-6},to={x:-7,y:.3,z:-6};
 assert.ok(sight(from,to,objects));assert.equal(free(-8,-6,.28,objects),false);
 assert.equal(nearestHit({x:-9,y:1.6,z:-6},{x:1,y:0,z:0},objects).kind,'wall');
 assert.ok(free(0,-15,.28,objects));assert.ok(free(8,1.5,.28,objects));
});
test('both museum ramps are walkable, navigable by bots, and cannot be bypassed through the raised floor',()=>{
 const r=make('museum'),p=r.players.a;
 for(const x of [-11,11]){
  const path=pathTo({x,z:6},{x,z:-13},r.objects);assert.ok(path.length>5,`route at ${x}`);
  Object.assign(p,{x,y:0,z:6,grounded:true,vy:0,input:{z:-1}});r.phase='play';r.until=999999;
  for(let i=0;i<180;i++){p.inputAt=30000+i*25;tick(r,p.inputAt,.025);}
  assert.ok(p.z<-10,`ramp progress ${p.z}`);assert.ok(Math.abs(p.y-3)<.05,`ramp elevation ${p.y}`);
 }
 // Zemin kutusunu tek başına sına: turun rastgele eşyaları galeriye de doğduğu için canlı
 // nesne listesiyle yapılan bu kontrol kararsızdı.
 const probe=MAPS.museum.fixtures.filter(o=>Math.hypot(o.x,o.z+12)>4);
 assert.equal(free(0,-12,.28,probe,null,0),false,'yükseltilmiş zeminin altından geçilemez');
 assert.ok(free(0,-12,.28,probe,null,3),'galeri katında yürünebilir');
});
test('preparation packets preserve hidden ownership on every map',()=>{
 for(const id of Object.keys(MAPS)){const r=make(id);const h=Object.values(r.players).find(p=>p.team==='hider');h.propId=r.objects[0].id;r.objects[0].owner=h.id;const packet=view(r,'a',2000);assert.equal(packet.players.find(p=>p.id===h.id).x,undefined);assert.ok(packet.objects.every(o=>!('owner'in o)&&!('mapId'in o)));}
});
test('teams swap and so does the venue: the map rotates each round unless the host pins or disables it',()=>{
 assert.equal(defaultSettings.mapRotate,true);
 // Varsayılan kurulum en seyrek yoğunlukta gelir.
 assert.equal(defaultSettings.objectCount,10);assert.equal(defaultSettings.decor,.25);
 const r=make('market');assert.equal(r.settings.mapId,'market');
 r.phase='end';assert.ok(start(r,30000).ok);
 assert.notEqual(r.settings.mapId,'market','yeni tur yeni mekân');
 assert.equal(mapFor(r.objects).id,r.settings.mapId,'nesneler yeni haritaya ait');
 assert.ok(r.events.some(e=>/Yeni mekân/.test(e.text)),'oyuncular haberdar edilir');
 const seen=new Set([r.settings.mapId]);
 for(let i=0;i<30;i++){const before=r.settings.mapId;r.phase='end';start(r,40000+i*1000);
  assert.notEqual(r.settings.mapId,before,'aynı harita üst üste gelmez');seen.add(r.settings.mapId);}
 assert.ok(seen.size>=4,`rastgele dolaşıyor: ${[...seen]}`);
 // Kurucu elle seçerse sıradaki tur onda başlar, rotasyon ondan sonra devralır.
 const pick=MAP_CHOICES.map(m=>m.id).find(id=>id!==r.settings.mapId);
 r.phase='end';assert.ok(configureRoom(r,{mapId:pick},'a').ok);start(r,90000);
 assert.equal(r.settings.mapId,pick,'kurucunun seçtiği harita korunur');assert.equal(mapFor(r.objects).id,pick);
 r.phase='end';start(r,95000);assert.notEqual(r.settings.mapId,pick,'sonraki turda rotasyon devralır');
 // Kapatılırsa mekân sabit kalır.
 r.phase='end';assert.ok(configureRoom(r,{mapRotate:false},'a').ok);const pinned=r.settings.mapId;
 for(let i=0;i<6;i++){r.phase='end';start(r,100000+i*1000);assert.equal(r.settings.mapId,pinned,'rotasyon kapalı');}
});

test('harbor is reduced to two thirds in each horizontal dimension with connected districts and solid outer boundaries',()=>{
 const map=MAPS.harbor;assert.ok(map,'harbor is registered');
 assert.equal(map.room.width*map.room.depth,56*72);
 const objects=generateProps(0,1,'harbor');
 assert.ok(map.zones.length>=5);assert.ok(objects.length<400,'bounded prop budget');
 for(const zone of map.zones){
  const target={x:(zone.xmin+zone.xmax)/2,z:(zone.zmin+zone.zmax)/2};
  const path=pathTo({x:0,z:0},target,objects);
  assert.ok(path.length>0,zone.name+' is reachable');
 }
 assert.equal(free(28,0,.28,objects),false);
 assert.equal(free(0,36,.28,objects),false);
 assert.ok(free(0,32,.28,objects));
 assert.equal(nearestHit({x:0,y:.6,z:34},{x:0,y:0,z:1},objects).kind,'wall');
});

test('harbor is an original cargo-port theme, not a collection of old map inventories',()=>{
 const map=MAPS.harbor;assert.ok(map);assert.equal(MAPS.campus,undefined);
 assert.ok(map.containers.length>=12);
 const types=new Set(map.fixtures.map(o=>o.type));
 for(const type of ['cargoDrum','trafficCone','cableReel','pallet','toolChest','mooringBollard','lifeBuoy','cargoBox'])assert.ok(types.has(type),type);
 for(const type of types)assert.ok(mapTypes[type]?.harborOnly,type+' belongs to the harbor');
 for(const zone of map.zones)for(const type of zone.types)assert.ok(mapTypes[type]?.harborOnly);
});

test('technology office has furnished, reachable departments and clear doorways',()=>{
 const map=MAPS.techOffice;assert.ok(map,'office registered');
 assert.deepEqual([map.room.width,map.room.depth],[44,48]);
 const objects=generateProps(0,1,map.id);
 const expected={manager:'award',backend:'codeMonitor',mobile:'phoneRack',analyst:'kanbanBoard',database:'storageArray',devops:'networkSwitch',design:'drawingTablet',qa:'testRig'};
 for(const [id,type]of Object.entries(expected)){
  const zone=map.zones.find(z=>z.id===id);assert.ok(zone,id);
  assert.ok(map.fixtures.some(o=>o.type===type&&o.x>zone.xmin&&o.x<zone.xmax&&o.z>zone.zmin&&o.z<zone.zmax),id+' themed props');
  const target={x:(zone.xmin+zone.xmax)/2,z:(zone.zmin+zone.zmax)/2};
  assert.ok(pathTo({x:0,z:0},target,objects).length,id+' accessible');
 }
 for(const [x,z]of map.doors)assert.ok(free(x,z,.3,objects),`door ${x},${z}`);
});
test('resized harbor keeps supported cargo separated at normal prop scale',()=>{
 const map=MAPS.harbor;
 assert.deepEqual([map.room.width,map.room.depth],[56,72]);
 for(const pallet of map.fixtures.filter(o=>o.type==='pallet')){
  const cargo=map.fixtures.filter(o=>o.supportId===pallet.id);
  if(cargo.length===2)assert.ok(Math.abs(cargo[0].x-cargo[1].x)>=.62-1e-8);
 }
});

test('manager office connects only to the main corridor, with a solid mobile-office divider',()=>{
 const objects=generateProps(0,1,'techOffice');
 assert.ok(free(-2.5,-18,.3,objects),'corridor entrance stays open');
 assert.equal(free(-14,-12,.3,objects),false,'former side doorway is closed');
 assert.ok(!MAPS.techOffice.doors.some(([x,z])=>x===-14&&z===-12));
 assert.equal(nearestHit({x:-14,y:1.6,z:-13},{x:0,y:0,z:1},objects).kind,'wall');
});
