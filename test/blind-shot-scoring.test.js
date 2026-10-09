import test from 'node:test';
import assert from 'node:assert/strict';
import {standings,scoreParts,SCORING} from '../public/games/blind-shot/scoring.js';
import {createRoom,start,resolve,tick,view} from '../server/games/blind-shot/game.js';
import {adapter} from '../server/games/blind-shot/adapter.js';

test('survival is awarded each shot only to survivors, without scoring again during reveal',()=>{
  const room=createRoom('1234','a');
  for(const id of ['a','b','c'])adapter.addPlayer(room,{id,name:id});
  start(room,0);room.arena.obstacles=[];
  Object.assign(room.players.a,{x:-200,y:0,angle:0});
  Object.assign(room.players.b,{x:200,y:0,angle:Math.PI/2});
  Object.assign(room.players.c,{x:0,y:200,angle:Math.PI/2});
  resolve(room,1);
  assert.equal(room.players.a.score,SCORING.hit+SCORING.survival);
  assert.equal(room.players.b.score,0);assert.equal(room.players.b.survived,0);
  assert.equal(room.players.c.score,1);
  resolve(room,2);assert.equal(room.players.a.score,4);
  tick(room,room.until);room.arena.obstacles=[];
  room.players.a.angle=-Math.PI/2;room.players.c.angle=Math.PI/2;
  resolve(room,room.until);
  assert.equal(room.players.a.score,5);assert.equal(room.players.a.survived,2);
  assert.equal(room.players.c.score,2);assert.equal(room.players.b.score,0);
  const packet=view(room,'a',room.until);
  assert.equal(packet.players[0].stepPoints,1);assert.equal(packet.players[0].survived,2);
});

test('final standings show accumulated categories and shared ranks without mutating players',()=>{
  const players=[{id:'a',score:1,survived:1,kills:0,wins:0},{id:'b',score:9,survived:1,kills:1,wins:1},{id:'c',score:9,survived:3,kills:2,wins:0}];
  const ranked=standings(players);
  assert.deepEqual(ranked.map(p=>[p.id,p.rank]),[['b',1],['c',1],['a',3]]);
  assert.deepEqual(scoreParts(players[1]),{survival:1,hits:3,wins:5});
  for(const player of ranked)assert.equal(Object.values(player.points).reduce((a,b)=>a+b,0),player.score);
  assert.deepEqual(players.map(p=>p.id),['a','b','c']);
});

test('eliminated shooters keep their hit points but have no award on the next shot',()=>{
  const room=createRoom('1234','a');
  for(const id of ['a','b','c','d'])adapter.addPlayer(room,{id,name:id});
  start(room,0);room.arena.obstacles=[];
  Object.assign(room.players.a,{x:-200,y:0,angle:0});
  Object.assign(room.players.b,{x:200,y:0,angle:Math.PI});
  Object.assign(room.players.c,{x:0,y:200,angle:Math.PI/2});
  Object.assign(room.players.d,{x:0,y:-200,angle:-Math.PI/2});
  resolve(room,1);assert.equal(room.players.a.stepPoints,3);
  tick(room,room.until);assert.equal(room.phase,'plan');
  assert.equal(room.players.a.stepPoints,0);assert.equal(room.players.a.score,3);
  resolve(room,room.until);assert.equal(room.players.a.score,3);
});
