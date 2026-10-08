import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,start,resolve,tick,view,choose,beginRound} from '../server/games/blind-shot/game.js';
import {adapter} from '../server/games/blind-shot/adapter.js';
import {DEFAULT_RULES} from '../public/games/blind-shot/rules.js';
import {scoreParts} from '../public/games/blind-shot/scoring.js';
function make(count=4,rules={}){const r=createRoom('1234','a');for(const id of ['a','b','c','d'].slice(0,count))adapter.addPlayer(r,{id,name:id});r.rules={...DEFAULT_RULES,...rules};r.roundCount=1;start(r,0);r.arena.obstacles=[];return r;}
function place(r,id,x,y,angle){Object.assign(r.players[id],{x,y,angle});}
function select(r,id,ability){const p=r.players[id];return choose(r,id,{x:p.x,y:p.y,angle:p.angle,ability,lock:false},1);}

test('teams reveal only living teammate positions and never reveal secret enemy abilities',()=>{
 const r=make(4,{mode:'teams'});assert.deepEqual(Object.values(r.players).map(p=>p.team),[0,1,0,1]);
 assert.ok(select(r,'b','shield').ok);
 const p=view(r,'a',1).players;
 assert.ok(Number.isFinite(p[2].x));assert.equal(p[1].x,undefined);assert.equal(p[1].ability,undefined);assert.deepEqual(view(r,'a',1).shots,[]);
 r.players.a.alive=false;assert.equal(view(r,'a',2).players[2].x,undefined);
});
test('friendly fire stops at an ally without scoring or harming them',()=>{
 const r=make(4,{mode:'teams'});place(r,'a',-200,0,0);place(r,'c',0,0,Math.PI/2);place(r,'b',200,0,Math.PI/2);place(r,'d',0,-200,-Math.PI/2);
 resolve(r,1);assert.equal(r.shots[0].allyTarget,'c');assert.equal(r.shots[0].target,null);assert.ok(r.players.c.alive);assert.equal(r.players.a.kills,0);assert.equal(r.players.a.score,1);
});
test('last surviving team wins with bonuses for eliminated teammates and accurate history/statistics',()=>{
 const r=make(4,{mode:'teams'});place(r,'a',-300,0,0);place(r,'b',-100,0,Math.PI);place(r,'c',100,0,0);place(r,'d',300,0,Math.PI/2);
 resolve(r,1);tick(r,r.until);assert.equal(r.phase,'end');assert.deepEqual(r.winners,['a','c']);assert.deepEqual(r.winnerTeams,[0]);
 assert.equal(r.players.a.score,8);assert.equal(r.players.c.score,9);assert.equal(r.players.a.wins,1);assert.equal(r.players.a.deaths,1);assert.equal(r.players.c.shots,1);assert.equal(r.players.c.bestStreak,1);assert.equal(r.players.c.hitTargets.d.count,1);
 assert.equal(r.history[0].players.find(p=>p.id==='a').points,8);assert.deepEqual(scoreParts(r.players.c,r.rules),{survival:1,hits:3,wins:5});
});
test('shield consumes once, absorbs every simultaneous enemy hit, expires next step and persists across round respawn',()=>{
 const r=make(3);place(r,'a',0,0,Math.PI/2);place(r,'b',-200,0,0);place(r,'c',200,0,Math.PI);
 assert.ok(select(r,'a','shield').ok);assert.equal(view(r,'b',1).players[0].ability,undefined);
 resolve(r,1);assert.ok(r.players.a.alive);assert.equal(r.players.a.absorbed,2);assert.equal(r.players.b.kills,0);assert.equal(r.players.a.survived,1);assert.deepEqual(r.players.a.usedAbilities,['shield']);
 resolve(r,2);assert.equal(r.players.a.absorbed,2);tick(r,r.until);assert.equal(r.players.a.ability,null);assert.ok(select(r,'a','shield').error);
 beginRound(r,100000);assert.ok(select(r,'a','shield').error);start(r,200000);assert.deepEqual(r.players.a.usedAbilities,[]);
});
test('one-use cover blocks both directions, survives shrinking and clears at the next round',()=>{
 const r=make(2);place(r,'a',0,0,0);place(r,'b',200,0,Math.PI);assert.ok(select(r,'a','cover').ok);
 assert.equal(view(r,'b',1).arena.obstacles.length,0);
 resolve(r,1);assert.ok(Object.values(r.players).every(p=>p.alive));assert.equal(r.shots[0].obstacleId,'ability:a');assert.equal(r.players.a.blocked,1);
 tick(r,r.until);assert.ok(r.arena.obstacles.some(o=>o.id==='ability:a'));assert.ok(select(r,'a','cover').error);
 beginRound(r,100000);assert.equal(r.covers.length,0);assert.ok(select(r,'a','cover').error);
});
test('invalid cover placement and disabled abilities are rejected without consuming an ability',()=>{
 const r=make(2);place(r,'a',680,0,0);assert.ok(select(r,'a','cover').error);assert.deepEqual(r.players.a.usedAbilities,[]);
 r.rules.abilities=false;assert.ok(select(r,'a','shield').error);
});
test('custom rules are host-only, atomic, validated and locked while playing',()=>{
 const r=createRoom('1234','a');adapter.addPlayer(r,{id:'a',name:'a'});adapter.addPlayer(r,{id:'b',name:'b'});
 const settings=adapter.commands.set_settings.handle,data={mapId:'octagon',roundCount:3,rules:{planSeconds:20,shrink:.15,maxSteps:8,cover:'none',survival:2,hit:5,roundWin:10}};
 assert.ok(settings(r,'b',data).error);
 for(const rules of [{mode:'bad'},{planSeconds:0},{shrink:1},{maxSteps:999},{abilities:'yes'},{cover:'bad'},{survival:-1},{hit:1.5},{roundWin:11},{extra:true}])assert.ok(settings(r,'a',{...data,rules}).error);
 assert.equal(r.mapId,'foundry');assert.ok(settings(r,'a',data).ok);start(r,0);assert.equal(r.until,20000);assert.equal(r.arena.obstacles.length,0);
 assert.ok(settings(r,'a',data).error);
 for(let i=0;i<8;i++){for(const p of Object.values(r.players))p.angle=Math.atan2(p.y,p.x);resolve(r,r.until);tick(r,r.until);if(i===0)assert.ok(Math.abs(r.arena.scale-.85)<1e-9);}
 assert.equal(r.phase,'round-end');assert.equal(r.players.a.score,26);assert.equal(r.players.a.survived,8);assert.equal(r.players.a.wins,1);
});
test('team setup requires even numbers and supports bot matches',()=>{
 const r=createRoom('1234','a');adapter.addPlayer(r,{id:'a',name:'a'});r.rules.mode='teams';adapter.commands.set_bot_count.handle(r,'a',{count:2});
 assert.ok(adapter.commands.start.handle(r,'a',{},0).error);adapter.commands.set_bot_count.handle(r,'a',{count:3});
 assert.ok(adapter.commands.start.handle(r,'a',{},0).ok);assert.equal(new Set(Object.values(r.players).filter(p=>p.team===0).map(p=>p.id)).size,2);
 for(let step=0;r.phase!=='end'&&step<100;step++)tick(r,r.until);
 assert.equal(r.phase,'end');assert.equal(r.history.length,3);
});

test('custom scoring weights keep final statistics and points consistent',()=>{
 const r=make(2,{survival:2,hit:5,roundWin:10});place(r,'a',-200,0,0);place(r,'b',200,0,Math.PI/2);
 resolve(r,1);tick(r,r.until);assert.equal(r.players.a.score,17);assert.deepEqual(scoreParts(r.players.a,r.rules),{survival:2,hits:5,wins:10});
 const snapshot=view(r,'a',1);snapshot.history[0].players[0].points=-1;snapshot.players[0].stats.hitTargets.b.count=-1;
 assert.equal(r.history[0].players[0].points,17);assert.equal(r.players.a.hitTargets.b.count,1);
});
