import test from 'node:test';
import assert from 'node:assert/strict';
import {io as client} from 'socket.io-client';
import {createGameServer} from '../server.js';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const wait=(s,event)=>new Promise(resolve=>s.once(event,resolve));
async function setup(){const g=createGameServer();try{await new Promise((resolve,reject)=>{g.http.once('error',reject);g.http.listen(0,'127.0.0.1',resolve);});return {g,url:'http://127.0.0.1:'+g.http.address().port};}catch(error){g.close();throw error;}}
async function connect(url){const s=client(url,{transports:['websocket']});await wait(s,'connect');return s;}
test('two clients: configurable lobby, permissions, chosen props, water shots, host transfer and cleanup',{timeout:12000},async()=>{
 const {g,url}=await setup();let a,b;
 try{
  a=await connect(url);b=await connect(url);
  const first=await a.emitWithAck('join',{name:'Ada',role:'hunter',settings:{teamSize:1,botMode:'off',swapTeams:false}});
  const second=await b.emitWithAck('join',{name:'Bora',role:'hider',code:first.code});assert.equal(first.code,second.code);
  assert.match(first.code,/^\d{4}$/,'oda kodu 4 haneli sayıdır');
  await delay(400);assert.equal((await b.emitWithAck('join',{name:'Bora',role:'hider',code:' '+first.code+' '})).code,first.code,'boşluklu kod da bulunur');const r=g.rooms.get(first.code);
  assert.ok((await b.emitWithAck('settings',{teamSize:6})).error);assert.ok((await b.emitWithAck('start')).error);assert.equal(r.phase,'lobby');
  assert.ok((await a.emitWithAck('settings',{hideSeconds:15,roundSeconds:120})).ok);assert.ok((await a.emitWithAck('start')).ok);assert.equal(r.phase,'prep');
  const p=r.players[b.id],h=r.players[a.id];r.objects=[{id:'test-object',type:'basket',x:0,z:7,angle:0,wet:0}];p.x=0;p.z=8;h.x=0;h.z=10;
  assert.ok((await b.emitWithAck('action',{kind:'possess',objectId:'test-object'})).ok);assert.equal(p.changes,3);const before=p.x;b.emit('input',{x:1,z:0,yaw:0,pitch:0});await delay(130);assert.ok(p.x>before);assert.equal(r.objects[0].x,p.x);
  const prep=await wait(a,'state');assert.equal(prep.players.find(q=>q.id===b.id).x,undefined);assert.equal(prep.players.find(q=>q.id===b.id).propId,undefined);
  await delay(100);assert.ok((await b.emitWithAck('action',{kind:'shuffle'})).ok);assert.equal(p.changes,2);assert.ok((await b.emitWithAck('settings',{teamSize:2})).error);
  // Aim through the actual network input path at a dry transformed object.
  r.phase='play';r.until=Date.now()+10000;p.input={};p.locked=true;p.x=0;p.z=7;r.objects[0].x=0;r.objects[0].z=7;r.objects[0].type='basket';h.x=0;h.z=10;
  const hitPromise=wait(a,'hit');a.emit('input',{x:0,z:0,yaw:0,pitch:Math.atan2(.28-1.62,3),fire:true});const hit=await hitPromise;assert.equal(hit.found,false);assert.equal(hit.wet,34,'üç isabetlik varsayılanda her atış yüzde otuz dört doldurur');assert.equal(p.status,'alive');
  a.emit('input',{x:0,z:0,yaw:0,pitch:0,fire:false});const live=await wait(a,'state');assert.ok(live.shots.length);assert.equal(live.players.find(q=>q.id===b.id).x,undefined);assert.ok(live.objects.every(o=>!('owner'in o)));assert.ok(h.ammo<100);
  a.disconnect();await delay(120);assert.equal(r.host,b.id);assert.equal(r.phase,'end');assert.equal(r.winner,'hider');
  assert.equal((await fetch(url+'/health')).status,200);assert.equal((await fetch(url+'/scene.js')).status,200);assert.equal((await fetch(url+'/vendor/three.module.js')).status,200);
  b.disconnect();await delay(100);assert.equal(g.rooms.size,0);
 }finally{a?.disconnect();b?.disconnect();g.close();}
});
test('practice brief has no timer until ready and six versus six has visible replaceable bot slots',{timeout:12000},async()=>{
 const {g,url}=await setup();let a,b;
 try{
  a=await connect(url);b=await connect(url);
  const first=await a.emitWithAck('join',{name:'Ada',role:'hider',settings:{teamSize:6,botMode:'fill'}});const r=g.rooms.get(first.code);assert.equal(Object.keys(r.players).length,12);assert.equal(Object.values(r.players).filter(p=>p.bot).length,11);
  await b.emitWithAck('join',{name:'Bora',role:'hunter',code:first.code});assert.equal(Object.keys(r.players).length,12);assert.equal(Object.values(r.players).filter(p=>p.bot).length,10);assert.equal(r.players[b.id].team,'hunter');
  assert.ok((await a.emitWithAck('move-team',{playerId:b.id,team:'hider'})).ok);assert.equal(r.players[b.id].team,'hider');assert.ok((await b.emitWithAck('move-team',{playerId:a.id,team:'hunter'})).error);
  const packet=await wait(a,'state');assert.equal(packet.settings.teamSize,6);assert.equal(packet.players.filter(p=>p.team==='hider').length,6);assert.equal(packet.players.filter(p=>p.team==='hunter').length,6);
  await delay(400);const practice=await a.emitWithAck('join',{name:'Ada',practice:true,role:'hunter'});const pr=g.rooms.get(practice.code);assert.equal(pr.phase,'brief');assert.equal(pr.until,0);await delay(100);assert.equal(pr.phase,'brief');assert.ok((await a.emitWithAck('ready')).ok);assert.equal(pr.phase,'prep');assert.ok(pr.until>Date.now());
 }finally{a?.disconnect();b?.disconnect();g.close();}
});
test('different map rooms keep their own packets and serve all map assets',{timeout:12000},async()=>{
 const {g,url}=await setup();let a,b;
 try{
  a=await connect(url);b=await connect(url);
  const pa=wait(a,'state'),pb=wait(b,'state');
  const first=await a.emitWithAck('join',{name:'Pazar',practice:true,settings:{mapId:'market'}});
  const second=await b.emitWithAck('join',{name:'Sera',practice:true,settings:{mapId:'greenhouse'}});
  const [sa,sb]=await Promise.all([pa,pb]);assert.equal(sa.settings.mapId,'market');assert.equal(sb.settings.mapId,'greenhouse');assert.notEqual(first.code,second.code);
  assert.ok(sa.objects.some(o=>o.type==='marketStall'));assert.ok(sb.objects.some(o=>o.type==='planterBox'));assert.ok(!sb.objects.some(o=>o.type==='marketStall'));
  for(const path of ['/maps.js','/map-models.js','/maps/references/market.jpeg','/maps/references/greenhouse.jpeg','/maps/references/arcade.jpeg','/maps/references/museum.jpeg','/maps/references/hotel.jpeg','/maps/references/loft.jpeg']){const response=await fetch(url+path,{method:'HEAD'});assert.equal(response.status,200,path);}
 }finally{a?.disconnect();b?.disconnect();g.close();}
});
test('active rooms are listed and a mid-round joiner waits for the next round',{timeout:12000},async()=>{
 const {g,url}=await setup();let host,player,late;
 try{
  host=await connect(url);player=await connect(url);late=await connect(url);
  const made=await host.emitWithAck('join',{name:'Kurucu',role:'hunter',settings:{teamSize:2,botMode:'off',swapTeams:false,mapRotate:false}});
  await player.emitWithAck('join',{name:'Oyuncu',role:'hider',code:made.code});assert.ok((await host.emitWithAck('start')).ok);
  const listed=await (await fetch(url+'/api/rooms')).json(),summary=listed.find(r=>r.code===made.code);assert.ok(summary);assert.equal(summary.phase,'prep');assert.equal(summary.players,2);
  await delay(400);const waitingState=wait(late,'state'),joined=await late.emitWithAck('join',{name:'Sonradan',role:'hider',code:made.code});assert.equal(joined.waiting,true);const r=g.rooms.get(made.code);assert.equal(r.players[late.id].status,'waiting');
  const waiting=await waitingState;assert.equal(waiting.phase,'waiting');assert.equal(waiting.currentPhase,'prep');assert.equal(waiting.objects,undefined);
  const playing=await wait(host,'state');assert.equal(playing.players.some(p=>p.id===late.id),false,'sıradaki oyuncu devam eden turdan gizlenir');
  r.phase='end';const admittedState=wait(late,'state');assert.ok((await host.emitWithAck('start')).ok);assert.equal(r.players[late.id].waiting,false);assert.equal(r.players[late.id].status,'alive');
  const admitted=await admittedState;assert.equal(admitted.phase,'prep');assert.ok(Number.isFinite(admitted.players.find(p=>p.id===late.id).x));
 }finally{host?.disconnect();player?.disconnect();late?.disconnect();g.close();}
});
