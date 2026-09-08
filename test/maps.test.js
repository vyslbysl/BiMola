import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,MAP_CHOICES,mapTypes} from '../public/maps.js';
import {generateProps,free,groundAt,mapFor,propTypes,pathTo,nearestHit,sight} from '../public/world.js';
import {player,start,tick,view,sanitizeSettings,configureRoom} from '../game.js';
function make(mapId,teamSize=3){const r={host:'a',phase:'lobby',settings:sanitizeSettings({mapId,teamSize,botMode:'fill',swapTeams:false}),players:{a:player('a','Avcı',false,'hunter')}};assert.equal(start(r,1000).ok,true);return r;}
test('all six maps are selectable and each new map has its own valid, supported inventory',()=>{
 assert.equal(MAP_CHOICES.length,6);
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
