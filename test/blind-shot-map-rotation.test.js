import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,mapRotation} from '../public/games/blind-shot/maps.js';
import {insideArena} from '../public/games/blind-shot/arena.js';
import {createRoom,start,resolve,tick,view} from '../server/games/blind-shot/game.js';
import {adapter} from '../server/games/blind-shot/adapter.js';

test('map rotations preserve the selected opener and shuffle the remaining unique maps',()=>{
 for(const map of MAPS){const order=mapRotation(map.id,()=>0);assert.equal(order[0],map.id);assert.equal(order.length,MAPS.length);assert.equal(new Set(order).size,MAPS.length);assert.deepEqual(new Set(order),new Set(MAPS.map(m=>m.id)));}
 assert.notDeepEqual(mapRotation('foundry',()=>0),mapRotation('foundry',()=>.999));
});
test('each round changes map, resets safe geometry and records history without resetting scores or abilities',()=>{
 const r=createRoom('1234','a');r.mapId='hexagon';r.roundCount=5;
 for(const id of ['a','b'])adapter.addPlayer(r,{id,name:id});start(r,0);
 const seen=[];r.players.a.usedAbilities.push('shield');
 for(let round=1;round<=5;round++){
  seen.push(r.mapId);assert.equal(r.arena.scale,1);assert.equal(r.arena.mapId,r.mapId);assert.ok(Object.values(r.players).every(p=>insideArena(p.x,p.y,r.arena)));
  assert.equal(view(r,'a',1).players[1].x,undefined);assert.deepEqual(r.players.a.usedAbilities,['shield']);
  r.arena.obstacles=[];Object.assign(r.players.a,{x:-200,y:0,angle:0});Object.assign(r.players.b,{x:200,y:0,angle:Math.PI/2});resolve(r,r.until);tick(r,r.until);
  assert.equal(r.history.at(-1).mapId,seen.at(-1));assert.equal(r.players.a.score,round*9);
  if(round<5){assert.equal(r.phase,'round-end');assert.equal(r.mapId,seen.at(-1),'replay retains the current map');tick(r,r.until);}
 }
 assert.equal(r.phase,'end');assert.equal(new Set(seen).size,5);assert.equal(seen[0],'hexagon');
 assert.ok(adapter.commands.set_bot_count.handle(r,'a',{count:0}).ok);assert.equal(r.mapId,'hexagon');
 start(r,1000000);assert.equal(r.mapId,'hexagon');assert.equal(r.history.length,0);assert.deepEqual(r.players.a.usedAbilities,[]);
});
