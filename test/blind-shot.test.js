import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENA, insideArena} from '../public/games/blind-shot/arena.js';
import {io as client} from 'socket.io-client';
import {createGameServer} from '../server.js';
import {adapter} from '../server/games/blind-shot/adapter.js';
import {createRoom, start, choose, resolve, tick, view, PLAN_MS, REVEAL_MS} from '../server/games/blind-shot/game.js';
function room(count = 2) {
  const r = createRoom('1234', 'p0');r.roundCount=1;
  for (let i=0;i<count;i++) adapter.addPlayer(r,{id:`p${i}`,name:`Player ${i}`});
  return r;
}
test('only host starts with at least two players; capacity and active join rules', () => {
  const r=room(1); assert.ok(adapter.commands.start.handle(r,'p0',{},0).error);
  adapter.addPlayer(r,{id:'p1',name:'Second'});
  assert.ok(adapter.commands.start.handle(r,'p1',{},0).error);
  assert.ok(adapter.commands.start.handle(r,'p0',{},100).ok);
  assert.ok(adapter.canJoin(r).error); assert.ok(adapter.commands.start.handle(r,'p0',{},100).error);
  assert.ok(adapter.canJoin(room(8)).error); assert.equal(adapter.tickInterval(room()),0);
});
test('hidden plans exclude all enemy coordinates, angles, origins and prior shots, also for eliminated viewers', () => {
  const r=room(3); start(r,0); r.players.p2.alive=false;
  for (const id of ['p0','p2']) {
    const packet=view(r,id,1);
    for (const p of packet.players.filter(p=>p.id!==id)) for (const key of ['x','y','angle','originX','originY']) assert.equal(key in p,false);
    assert.deepEqual(packet.shots,[]);
  }
  resolve(r,PLAN_MS); assert.ok(view(r,'p2',PLAN_MS).players.every(p=>Number.isFinite(p.x)));
});
test('server rejects malformed, late, excessive and locked choices', () => {
  const r=room();start(r,100);const p=r.players.p0;
  for (const data of [null, {x:NaN,y:0,angle:0,lock:false},{x:'1',y:0,angle:0,lock:false},{x:0,y:550,angle:0,lock:false},{x:1000,y:0,angle:0,lock:false}]) assert.ok(choose(r,'p0',data,101).error);
  const valid={x:p.x,y:p.y,angle:0,lock:true};
  assert.ok(choose(r,'missing',valid,101).error);assert.ok(choose(r,'p0',valid,100+PLAN_MS).error);
  assert.ok(choose(r,'p0',valid,101).ok);assert.ok(choose(r,'p0',valid,102).error);
});
test('shots resolve simultaneously: mutual elimination is a draw', () => {
  const r=room(); start(r,0); resolve(r,PLAN_MS);
  assert.ok(Object.values(r.players).every(p=>!p.alive));
  assert.deepEqual(r.shots.map(s=>s.target),['p1','p0']);
  tick(r,PLAN_MS+REVEAL_MS);assert.equal(r.phase,'end');assert.deepEqual(r.winners,[]);assert.equal(adapter.tickInterval(r),0);
});
test('one bullet stops at nearest player and misses behind shooter', () => {
  const r=room(4);start(r,0);
  Object.assign(r.players.p0,{x:-100,y:0,angle:0});
  Object.assign(r.players.p1,{x:0,y:0,angle:Math.PI/2});
  Object.assign(r.players.p2,{x:100,y:0,angle:Math.PI/2});
  Object.assign(r.players.p3,{x:-150,y:0,angle:Math.PI/2});
  resolve(r,100);assert.equal(r.shots[0].target,'p1');assert.equal(r.players.p2.alive,true);assert.equal(r.players.p3.alive,true);
});
test('deadline resolves unlocked players; arena shrinks between shots and match resets its bounds; match bounded at 12 steps', () => {
  const r=room();start(r,0);
  r.players.p0.angle=0;r.players.p1.angle=Math.PI;
  tick(r,PLAN_MS);assert.equal(r.phase,'reveal');tick(r,PLAN_MS+REVEAL_MS);
  assert.equal(r.arena.halfWidth,ARENA.halfWidth*.9);assert.equal(r.arena.halfDepth,ARENA.halfDepth*.9);assert.equal(r.players.p0.x,520);assert.equal(r.players.p1.x,-520);assert.equal(r.round,2);assert.equal(r.phase,'plan');assert.deepEqual(r.shots,[]);
  for (let round=2;round<=12;round++) {
    for (const p of Object.values(r.players)) p.angle=Math.atan2(p.y,p.x);
    tick(r,r.until);tick(r,r.until);
  }
  assert.equal(r.phase,'end');assert.equal(r.winners.length,2);
  start(r,1000000);assert.equal(r.arena.halfWidth,ARENA.halfWidth);assert.equal(r.arena.halfDepth,ARENA.halfDepth);assert.equal(r.round,1);assert.ok(Object.values(r.players).every(p=>p.alive&&!p.locked));
});
test('departure transfers host and ends a lone survivor match', () => {
  const r=room();start(r,0);adapter.removePlayer(r,'p0');assert.equal(r.host,'p1');assert.equal(r.phase,'end');assert.deepEqual(r.winners,['p1']);
});
function once(socket,name) {return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(name)),3000);socket.once(name,v=>{clearTimeout(timer);resolve(v);});});}
test('real sockets: catalog, static assets, private state, room isolation, capacity, cleanup and idle clocks', async t => {
  const server=createGameServer();await new Promise(resolve=>server.http.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());
  const url=`http://127.0.0.1:${server.http.address().port}`;
  const catalog=await (await fetch(url+'/api/games')).json();assert.ok(catalog.find(g=>g.id==='blind-shot'));
  for (const path of ['/games/blind-shot/','/games/blind-shot/app.js','/games/blind-shot/style.css','/games/blind-shot/cover.svg']) assert.equal((await fetch(url+path)).status,200);
  async function connect(game='blind-shot') {const s=client(url+'/games/'+game,{transports:['websocket'],reconnection:false});t.after(()=>s.disconnect());await once(s,'connect');return s;}
  const a=await connect(),b=await connect(),c=await connect(),d=await connect('snake');
  const made=await a.emitWithAck('join',{name:'Ada'});await b.emitWithAck('join',{code:made.code,name:'Bora'});
  const other=await c.emitWithAck('join',{name:'Cem'});const snake=await d.emitWithAck('join',{name:'Deniz'});
  assert.notEqual(other.code,made.code);assert.notEqual(snake.code,made.code);
  const before=server.metrics.ticks;await new Promise(r=>setTimeout(r,70)); // Snake has its own 160ms clock.
  assert.equal(server.rooms.get(made.code).phase,'lobby');assert.equal(server.metrics.ticks,before);
  assert.ok((await b.emitWithAck('start')).error);
  const stateA=once(a,'state');assert.ok((await a.emitWithAck('start')).ok);const packet=await stateA;
  assert.equal(packet.phase,'plan');assert.equal(packet.players.find(p=>p.id===b.id).x,undefined);
  assert.equal(server.rooms.get(other.code).phase,'lobby');assert.equal((await fetch(url+'/api/rooms/'+made.code)).status,404);
  assert.ok((await c.emitWithAck('join',{code:made.code})).error);assert.ok(server.rooms.get(other.code).players[c.id]);
  a.disconnect();b.disconnect();c.disconnect();d.disconnect();await new Promise(r=>setTimeout(r,50));assert.equal(server.rooms.size,0);
});

test('bot controls are host-only, integer bounded, idle, and support solo matches', () => {
  const r=room(1), set=adapter.commands.set_bot_count.handle;
  assert.ok(set(r,'p1',{count:1}).error);
  for (const count of [-1,8,1.5,'1',NaN]) assert.ok(set(r,'p0',{count}).error);
  assert.ok(set(r,'p0',{count:7}).ok);assert.equal(Object.keys(r.players).length,8);
  assert.deepEqual(adapter.members(r).map(p=>p.id),['p0']);assert.equal(adapter.summary(r).bots,7);
  assert.equal(adapter.tickInterval(r),0);assert.equal(adapter.canJoin(r).ok,true);
  assert.ok(adapter.commands.start.handle(r,'p0',{},0).ok);assert.equal(r.botPlans.length,7);
  assert.ok(set(r,'p0',{count:0}).error);
});
test('bots lock legal precomputed choices without inspecting subsequent hidden human moves', () => {
  const r=room(1);adapter.commands.set_bot_count.handle(r,'p0',{count:3});start(r,100);
  const planned=structuredClone(r.botPlans);
  assert.equal(planned.length,3);
  const human=r.players.p0;assert.ok(choose(r,'p0',{x:human.x-40,y:human.y+10,angle:0,lock:false},101).ok);
  tick(r,4101);
  for (const plan of planned) {
    const bot=r.players[plan.id];assert.equal(bot.locked,true);assert.equal(bot.x,plan.choice.x);assert.equal(bot.y,plan.choice.y);
    assert.ok(Math.hypot(bot.x-bot.originX,bot.y-bot.originY)<=220+.01);
    assert.ok(insideArena(bot.x,bot.y,r.arena));
  }
  assert.equal(r.phase,'plan','bots do not skip unlocked human decisions');
  const packet=view(r,'p0',4101);assert.equal(packet.botPlans,undefined);assert.equal(packet.lastReveal,undefined);
  for (const bot of packet.players.filter(p=>p.isBot)) {assert.equal(bot.x,undefined);assert.equal(bot.angle,undefined);}
  assert.ok(choose(r,'p0',{x:human.x,y:human.y,angle:0,lock:true},4200).ok);tick(r,4201);assert.equal(r.phase,'reveal');
});
test('bot movement stays valid within the rectangular arena and bots play complete matches', () => {
  const r=room(1);adapter.commands.set_bot_count.handle(r,'p0',{count:7});start(r,0);
  let steps=0;
  while(r.phase!=='end'&&steps++<30){
    if(r.phase==='plan'){
      const human=r.players.p0;if(human.alive)choose(r,'p0',{x:human.x,y:human.y,angle:human.angle,lock:true},r.until-7000);
      tick(r,r.until-6000);
      for(const p of Object.values(r.players).filter(p=>p.isBot&&p.alive)){
        assert.equal(p.locked,true);assert.ok(insideArena(p.x,p.y,r.arena));
        assert.ok(Math.hypot(p.x-p.originX,p.y-p.originY)<=220+.01);
      }
    }else tick(r,r.until);
  }
  assert.equal(r.phase,'end');assert.equal(adapter.tickInterval(r),0);
  assert.ok(adapter.commands.set_bot_count.handle(r,'p0',{count:0}).ok);
  assert.equal(r.phase,'lobby');assert.equal(Object.keys(r.players).length,1);assert.deepEqual(r.shots,[]);
});
test('human replaces a bot in a full waiting room; host transfers only to a human', () => {
  const r=room(1);adapter.commands.set_bot_count.handle(r,'p0',{count:7});
  adapter.addPlayer(r,{id:'p1',name:'Second'});assert.equal(Object.keys(r.players).length,8);
  assert.equal(adapter.summary(r).bots,6);assert.equal(adapter.summary(r).players,2);
  adapter.removePlayer(r,'p0');assert.equal(r.host,'p1');adapter.removePlayer(r,'p1');
  assert.deepEqual(adapter.members(r),[]);assert.equal(adapter.tickInterval(r),0);assert.equal(r.host,undefined);
});
test('network solo bots: private state, scoped settings, invitation priority and cleanup with bots remaining', async t => {
  const server=createGameServer();await new Promise(resolve=>server.http.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());
  const url=`http://127.0.0.1:${server.http.address().port}`;
  async function connect(){const s=client(url+'/games/blind-shot',{transports:['websocket'],reconnection:false});t.after(()=>s.disconnect());await once(s,'connect');return s;}
  const host=await connect(),other=await connect();const made=await host.emitWithAck('join',{name:'Solo'});
  const separate=await other.emitWithAck('join',{});
  assert.ok((await host.emitWithAck('set_bot_count',{count:7})).ok);assert.equal(server.rooms.get(separate.code).botPlans.length,0);
  assert.equal(adapter.summary(server.rooms.get(made.code)).bots,7);
  const invited=await connect();await invited.emitWithAck('join',{code:made.code});assert.equal(adapter.summary(server.rooms.get(made.code)).bots,6);
  assert.ok((await invited.emitWithAck('set_bot_count',{count:0})).error);
  const waiting=server.metrics.ticks;await new Promise(r=>setTimeout(r,70));assert.equal(server.metrics.ticks,waiting);
  const packetPromise=once(host,'state');assert.ok((await host.emitWithAck('start')).ok);const packet=await packetPromise;
  assert.equal(packet.players.filter(p=>p.isBot).length,6);assert.equal(packet.botPlans,undefined);
  assert.ok(packet.players.filter(p=>p.isBot).every(p=>p.x===undefined));
  host.disconnect();invited.disconnect();await new Promise(r=>setTimeout(r,40));assert.equal(server.rooms.has(made.code),false);assert.equal(server.rooms.has(separate.code),true);
});
test('a delayed tick applies bots scheduled before deadline, then resolves once', () => {
  const r=room(1);adapter.commands.set_bot_count.handle(r,'p0',{count:1});start(r,0);
  const plan=structuredClone(r.botPlans[0]);tick(r,PLAN_MS+1000);
  assert.equal(r.phase,'reveal');assert.equal(r.players[plan.id].locked,true);
  assert.equal(r.players[plan.id].x,plan.choice.x);assert.equal(r.players[plan.id].y,plan.choice.y);
  const shots=r.shots;tick(r,PLAN_MS+1100);assert.equal(r.shots,shots);
});

test('the entire rectangular floor is available, including corners beyond the old circle', () => {
  const r=room();start(r,0);
  assert.ok(choose(r,'p0',{x:-680,y:530,angle:Math.PI,lock:false},1).ok);
  assert.ok(choose(r,'p0',{x:686,y:-536,angle:0,lock:true},2).ok);
  for(const data of [{x:687,y:0},{x:0,y:-537}])assert.ok(choose(r,'p1',{...data,angle:0,lock:false},3).error);
  resolve(r,4);const shot=r.shots.find(s=>s.id==='p0');
  assert.equal(shot.target,null);assert.equal(shot.endX,700);assert.equal(shot.endY,-536);
});
