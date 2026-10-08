import test from 'node:test';
import assert from 'node:assert/strict';
import {adapter} from '../server/games/blind-shot/adapter.js';
import {createRoom,view,resolve,tick} from '../server/games/blind-shot/game.js';
import {TEAMS,teamStandings} from '../public/games/blind-shot/rules.js';
function room(count=3,size=2){const r=createRoom('1234','a');r.rules.mode='teams';r.rules.teamCount=count;r.rules.teamSize=size;return r;}
function add(r,id,team){adapter.addPlayer(r,{id,name:id,data:{team}});}

test('players select their team at entry and bots fill remaining team seats',()=>{
 const r=room();add(r,'a',2);add(r,'b',2);add(r,'c',0);
 assert.equal(r.players.a.team,2);assert.equal(r.players.b.team,2);
 assert.ok(adapter.canJoin(r,{team:2}).error);assert.ok(adapter.canJoin(r,{team:3}).error);assert.ok(adapter.canJoin(r,{team:'1'}).error);assert.ok(adapter.canJoin(r,{team:1}).ok);
 adapter.commands.set_bot_count.handle(r,'a',{count:3});
 assert.ok(adapter.commands.start.handle(r,'a',{},0).ok);
 for(let team=0;team<3;team++)assert.equal(Object.values(r.players).filter(p=>p.team===team).length,2);
 assert.equal(r.players.a.team,2);assert.equal(r.players.b.team,2);
 const packet=view(r,'a',1);assert.ok(Number.isFinite(packet.players.find(p=>p.id==='b').x));assert.equal(packet.players.find(p=>p.id==='c').x,undefined);
 assert.equal(teamStandings(packet.players,3)[2].name,TEAMS[2].name+' takım');
});
test('lobby team changes preserve human choices, displace bots and reject full teams or active matches',()=>{
 const r=room(2,2);add(r,'a',0);add(r,'b',1);adapter.commands.set_bot_count.handle(r,'a',{count:2});
 const select=adapter.commands.select_team.handle;
 assert.ok(select(r,'a',{team:1}).ok);assert.equal(r.players.b.team,1);assert.ok(Object.values(r.players).filter(p=>p.isBot).every(p=>p.team===0));
 assert.ok(select(r,'missing',{team:0}).error);assert.ok(select(r,'b',{team:-1}).error);
 assert.ok(adapter.commands.start.handle(r,'a',{},0).ok);assert.ok(select(r,'b',{team:0}).error);
});
test('chosen sizes validate capacity and require every team to be filled equally',()=>{
 const r=room(2,4);add(r,'a',0);add(r,'b',1);assert.ok(adapter.commands.start.handle(r,'a',{},0).error);
 adapter.commands.set_bot_count.handle(r,'a',{count:6});assert.ok(adapter.commands.start.handle(r,'a',{},0).ok);
 const s=room(4,2);add(s,'a',3);const settings=adapter.commands.set_settings.handle;
 assert.ok(settings(s,'a',{mapId:'foundry',roundCount:1,rules:{teamCount:3,teamSize:3}}).error);
 assert.ok(settings(s,'a',{mapId:'foundry',roundCount:1,rules:{teamCount:2,teamSize:3}}).ok);assert.ok(s.players.a.team<2);
 assert.ok(adapter.commands.set_bot_count.handle(s,'a',{count:6}).error);
});
test('four-team scoreboards, victory and statistics retain team identity',()=>{
 const r=room(4,1);for(let i=0;i<4;i++)add(r,String(i),i);r.host='0';r.roundCount=1;
 assert.ok(adapter.commands.start.handle(r,'0',{},0).ok);r.arena.obstacles=[];
 for(let i=0;i<4;i++)Object.assign(r.players[String(i)],{x:-300+i*200,y:0,angle:Math.PI/2});
 r.players['3'].angle=Math.PI;resolve(r,1);
 assert.equal(r.players['3'].kills,1);assert.equal(r.players['2'].alive,false);
 r.players['0'].alive=false;r.players['1'].alive=false;tick(r,r.until);
 assert.equal(r.phase,'end');assert.deepEqual(r.winnerTeams,[3]);assert.deepEqual(r.winners,['3']);assert.equal(teamStandings(view(r,'3',1).players,4)[0].team,3);
});
