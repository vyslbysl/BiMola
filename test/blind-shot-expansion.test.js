import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS} from '../public/games/blind-shot/maps.js';
import {insideArena,moveArena} from '../public/games/blind-shot/arena.js';
import {createRoom,start,choose,resolve,tick,view,finish} from '../server/games/blind-shot/game.js';
import {adapter} from '../server/games/blind-shot/adapter.js';
function room(){const r=createRoom('5678','a');adapter.addPlayer(r,{id:'a',name:'Ada'});adapter.addPlayer(r,{id:'b',name:'Bora'});return r;}
const obstacleArena={halfWidth:700,halfDepth:550,obstacles:[{id:'box',x:0,y:0,width:100,depth:100,height:80}]};
test('swept movement prevents tunnelling, slides along faces and permits retreat',()=>{
  const front=moveArena({x:-200,y:0},200,0,obstacleArena);
  assert.ok(front.x<=-64);assert.ok(front.x>-65);assert.ok(insideArena(front.x,front.y,obstacleArena));
  const slide=moveArena(front,200,150,obstacleArena);
  assert.ok(slide.x<=-64);assert.equal(slide.y,150);
  assert.equal(moveArena(front,-200,0,obstacleArena).x,-200);
  assert.equal(moveArena({x:-64,y:0},200,0,obstacleArena).x,-64,'touching a face cannot bypass collision');
  assert.equal(moveArena({x:-64,y:0},-200,0,obstacleArena).x,-200);
  assert.equal(insideArena(0,0,obstacleArena),false);
});
test('bullets stop at a siper before a player, and clear lanes still hit',()=>{
  const r=room();start(r,0);r.arena=obstacleArena;
  Object.assign(r.players.a,{x:-200,y:0,angle:0});Object.assign(r.players.b,{x:200,y:0,angle:Math.PI/2});
  resolve(r,1);assert.equal(r.shots[0].target,null);assert.equal(r.shots[0].obstacleId,'box');assert.equal(r.shots[0].endX,-50);assert.equal(r.players.b.alive,true);
  assert.equal(r.players.a.score,1);
  start(r,10);r.arena=obstacleArena;Object.assign(r.players.a,{x:-200,y:120,angle:0});Object.assign(r.players.b,{x:200,y:120,angle:Math.PI/2});
  resolve(r,11);assert.equal(r.shots[0].target,'b');assert.equal(r.players.a.score,4);
  resolve(r,12);assert.equal(r.players.a.score,4,'duplicate resolution cannot award points again');
});
test('server rejects moving inside or directly through cover',()=>{
  const r=room();start(r,0);r.arena=obstacleArena;Object.assign(r.players.a,{x:-200,y:0});
  assert.ok(choose(r,'a',{x:0,y:0,angle:0,lock:false},1).error);
  assert.ok(choose(r,'a',{x:200,y:0,angle:0,lock:false},1).error);
  assert.ok(choose(r,'a',{x:-200,y:200,angle:0,lock:false},1).ok);
  assert.ok(choose(r,'a',{x:200,y:200,angle:0,lock:true},2).ok);
});
test('every map has safe starts for 2–8 players and legal complete bot matches',()=>{
  for(const map of MAPS)for(let count=2;count<=8;count++){
    const r=room();r.mapId=map.id;r.roundCount=1;
    adapter.commands.set_bot_count.handle(r,'a',{count:count-2});start(r,0);
    for(const p of Object.values(r.players))assert.ok(insideArena(p.x,p.y,r.arena),`${map.id} spawn ${count} ${p.id}`);
    for(const plan of r.botPlans)assert.ok(insideArena(plan.choice.x,plan.choice.y,r.arena));
    for(let step=0;r.phase!=='end'&&step<30;step++){
      if(r.phase==='plan'){tick(r,r.until-7000);for(const p of Object.values(r.players).filter(p=>p.isBot&&p.alive))assert.equal(p.locked,true);tick(r,r.until);}
      else tick(r,r.until);
    }
    assert.equal(r.phase,'end');
  }
});
test('three rounds accumulate points once, respawn everyone and finish with total-score champion',()=>{
  const r=room();start(r,0);
  for(let round=1;round<=3;round++){
    assert.equal(r.matchRound,round);assert.ok(Object.values(r.players).every(p=>p.alive));
    r.arena.obstacles=[];Object.assign(r.players.a,{x:-200,y:0,angle:0});Object.assign(r.players.b,{x:200,y:0,angle:Math.PI/2});
    resolve(r,round*10000);tick(r,r.until);
    assert.equal(r.players.a.score,round*9);assert.equal(r.players.a.kills,round);assert.equal(r.players.a.wins,round);
    const points=r.players.a.score;finish(r,r.until);assert.equal(r.players.a.score,points);
    if(round<3){assert.equal(r.phase,'round-end');assert.equal(adapter.tickInterval(r),50);assert.ok(adapter.canJoin(r).error);
      assert.equal(view(r,'a',r.until-1).players[1].x,200);
      tick(r,r.until-1);assert.equal(r.phase,'round-end');tick(r,r.until);assert.equal(r.phase,'plan');
      const packet=view(r,'a',r.until-1);assert.equal(packet.players[1].x,undefined);assert.deepEqual(packet.shots,[]);
    }
  }
  assert.equal(r.phase,'end');assert.deepEqual(r.winners,['a']);assert.equal(adapter.tickInterval(r),0);
  start(r,100000);assert.equal(r.matchRound,1);assert.equal(r.players.a.score,0);
});
test('simultaneous mutual hits earn points to both and do not grant a survival bonus',()=>{
  const r=room();start(r,0);r.arena.obstacles=[];resolve(r,1);tick(r,r.until);
  assert.deepEqual(r.roundWinners,[]);assert.equal(r.players.a.score,3);assert.equal(r.players.b.score,3);assert.equal(r.phase,'round-end');
});
test('host settings validate maps and round counts, stay room scoped and reject changes during play',()=>{
  const r=room(),other=room(),set=adapter.commands.set_settings.handle;
  assert.ok(set(r,'b',{mapId:'warehouse',roundCount:5}).error);
  for(const settings of [{mapId:'invalid',roundCount:3},{mapId:'foundry',roundCount:2},{mapId:'foundry',roundCount:'3'},null])assert.ok(set(r,'a',settings).error);
  assert.ok(set(r,'a',{mapId:'warehouse',roundCount:5}).ok);assert.equal(r.arena.mapId,'warehouse');assert.equal(other.mapId,'foundry');
  start(r,0);assert.ok(set(r,'a',{mapId:'courtyard',roundCount:1}).error);
});
