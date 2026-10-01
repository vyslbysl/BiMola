import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {io as client} from 'socket.io-client';
import {validatePuzzle, serializePuzzle, buildPrompt, example, normalize} from '../public/games/cengel-kapismasi/puzzle.js';
import {starter} from '../public/games/cengel-kapismasi/starter.js';
import {createRoom, addPlayer, removePlayer, ready, configure, place, confirm, tick, view} from '../server/games/cengel-kapismasi/game.js';
import {createGameServer} from '../server.js';

const puzzle = () => structuredClone(example);
function room(players = 2) {
  const r = createRoom({code: '1234', host: 'a'});
  r.puzzle = validatePuzzle(example);
  addPlayer(r, {id: 'a', name: 'Ada'});
  if (players === 2) addPlayer(r, {id: 'b', name: 'Bora'});
  ready(r, 'a', true, 1000); if (players === 2) ready(r, 'b', true, 1000);
  return r;
}
function put(r, id, cell, slot = 0, letter = cell.letter) {
  r.players[id].rack[slot] = letter;
  return place(r, id, {row: cell.row, col: cell.col, slot, letter, revision: r.revision}, 1100);
}
test('shared puzzle contract derives closed cells and preserves Turkish I/İ', () => {
  const p = validatePuzzle(example);
  assert.equal(p.cells.length, 42); assert.equal(p.cells.find(c => c.row === 1 && c.col === 1).entries.length, 2);
  assert.deepEqual(serializePuzzle(p), example);
  assert.equal(normalize('ışık'), 'IŞIK'); assert.equal(normalize('iz'), 'İZ');
  assert.match(buildPrompt('Uzay', 13, 15), /13 satır × 15 sütun/);
  assert.match(buildPrompt('Uzay'), /"category":"Uzay"/);
});
test('embedded starter fills every cell with a clue or answer and supports split clues', () => {
  const p = validatePuzzle(starter); assert.equal(p.entries.length, 24); assert.equal(p.rows, 9); assert.equal(p.cells.length, 42);
  assert.equal(p.cells.length + p.clueCells.length + p.blankCells.length, p.rows * p.cols);
  assert.equal(p.clueCells.filter(c => c.entries.length === 2).length, 4);
});
test('null readiness transported by Socket.IO toggles readiness', () => {
  const r = createRoom({code: '1234', host: 'a'}); addPlayer(r, {id: 'a', name: 'Ada'});
  ready(r, 'a', null, 1000); assert.equal(r.phase, 'play');
});
test('validator rejects conflicts, overflow, parallel overlap and malformed payloads', () => {
  const bad = puzzle(); bad.entries[1].answer = 'ARMUT'; assert.throws(() => validatePuzzle(bad), /çakışması/);
  const overflow = puzzle(); overflow.entries[0].col = 8; assert.throws(() => validatePuzzle(overflow), /dışına/);
  const overlap = puzzle(); overlap.entries.push({...overlap.entries[0], answer: 'KURA'}); assert.throws(() => validatePuzzle(overlap), /aynı yönde/);
  assert.throws(() => validatePuzzle('{'), /Geçerli JSON/);
  assert.throws(() => validatePuzzle('x'.repeat(24001)), /çok büyük/);
  const size = puzzle(); size.rows = 22; assert.throws(() => validatePuzzle(size), /7–21/);
  const dir = puzzle(); dir.entries[0].direction = 'diagonal'; assert.throws(() => validatePuzzle(dir), /yönü/);
});
test('validator rejects sparse layouts, question-letter collisions and truncated runs', () => {
  const sparse = puzzle(); sparse.rows = 10; assert.throws(() => validatePuzzle(sparse), /boşta/);
  const collision = puzzle(); collision.entries[4].row = 1; collision.entries[4].col = 4; collision.entries[4].direction = 'across'; collision.entries.splice(6, 1);
  assert.throws(() => validatePuzzle(collision), /hem soru hem harf/);
  const truncated = puzzle(); truncated.entries[6].answer = 'KESİC'; assert.throws(() => validatePuzzle(truncated), /ipucusuz/);
});
test('all ready starts a fixed board; private hands and solutions never leak to peers', () => {
  const r = room(); assert.equal(r.phase, 'play'); assert.equal(r.players.a.rack.length, 5);
  const packet = view(r, 'a', 1000), json = JSON.stringify(packet);
  assert.equal(packet.players[1].rack, undefined); assert.equal(packet.entries[0].answer, undefined);
  assert.equal(packet.cells[0].letter, undefined); assert.doesNotMatch(json, /KALEM/);
  assert.ok(packet.me.rack.every(l => r.puzzle.cells.some(c => c.letter === l)));
});
test('leaving the last unready player starts the remaining ready players exactly once', () => {
  const r = createRoom({code:'1234',host:'c'});
  for (const id of ['a','b','c']) addPlayer(r, {id,name:id});
  ready(r,'a',true,1000); ready(r,'b',true,1000);
  assert.equal(r.phase,'lobby');
  removePlayer(r,'c',1200);
  assert.equal(r.phase,'play'); assert.equal(r.host,'a'); assert.equal(r.until,31200);
  assert.equal(r.revision,2); assert.ok(Object.values(r.players).every(p => p.rack.length === 5));
  const matchId=r.matchId; removePlayer(r,'b',1300);
  assert.equal(r.matchId,matchId); assert.equal(r.until,31200); assert.equal(r.revision,2);
  assert.equal(r.archives.length,1);
});
test('departure keeps unready rooms waiting and never starts an empty room', () => {
  const r=createRoom({code:'1234',host:'a'});
  for (const id of ['a','b','c']) addPlayer(r,{id,name:id});
  ready(r,'a',true,1000); removePlayer(r,'c',1100);
  assert.equal(r.phase,'lobby'); assert.equal(r.until,0);
  removePlayer(r,'a',1200); removePlayer(r,'b',1300);
  assert.equal(r.phase,'lobby'); assert.equal(r.matchId,null); assert.equal(r.revision,1);
});
test('wrong letters deduct one but preserve tile, empty cell, and bonus progress', () => {
  const r = room(), cell = r.puzzle.cells[0], result = put(r, 'a', cell, 0, 'Z');
  assert.equal(result.wrong, true); assert.equal(r.players.a.score, -1); assert.equal(r.players.a.rack[0], 'Z');
  assert.equal(Object.keys(r.filled).length, 0); assert.deepEqual(r.players.a.spent, Array(5).fill(false));
  assert.equal(r.scoreEvents[0].points, -1);
});
test('occupied or stale cell and spoofed rack do not penalize or consume a tile', () => {
  const r = room(), cell = r.puzzle.cells[0]; put(r, 'a', cell);
  assert.ok(put(r, 'b', cell).error); assert.equal(r.players.b.score, 0);
  assert.ok(place(r, 'a', {row: 2, col: 3, slot: 0, letter: r.players.a.rack[0] === 'Z' ? 'J' : 'Z', revision: r.revision}, 1100).error);
  assert.ok(place(r, 'a', {row: 2, col: 3, slot: 0, letter: r.players.a.rack[0], revision: r.revision - 1}, 1100).error);
  assert.equal(r.players.a.answered, 1);
});
test('five distinct hand slots earn bonus once; refilling a spent slot cannot farm bonuses', () => {
  const r = room();
  for (let i = 0; i < 4; i++) put(r, 'a', r.puzzle.cells[i], 0);
  assert.equal(r.players.a.bonuses, 0); assert.deepEqual(r.players.a.spent, [true, false, false, false, false]);
  for (let i = 0; i < 4; i++) put(r, 'a', r.puzzle.cells[i + 4], i + 1);
  assert.equal(r.players.a.bonuses, 1); assert.equal(r.players.a.score, 22);
  assert.deepEqual(r.players.a.spent, Array(5).fill(false));
});
test('finishing a crossing scores both completed words, then freezes and records match', () => {
  const r = room(), crossing = r.puzzle.cells.find(c => c.row === 1 && c.col === 1);
  for (const cell of r.puzzle.cells.filter(c => c !== crossing)) put(r, 'a', cell);
  const otherPoints = r.puzzle.entries.filter(e => !crossing.entries.includes(e.id)).reduce((sum, e) => sum + e.answer.length, 0);
  assert.equal(r.players.a.score, otherPoints + r.puzzle.cells.length - 1);
  const result = put(r, 'b', crossing);
  assert.equal(result.points, 15); assert.equal(r.players.b.words, 2); assert.equal(r.phase, 'end');
  assert.equal(r.scoreEvents.filter(e => e.completed).length, 2);
  assert.equal(view(r, 'a', 1200).entries[0].answer, 'KURABİYE');
  assert.ok(put(r, 'b', crossing).error); tick(r, 999999); assert.equal(r.scoreEvents.filter(e => e.completed).length, 2);
});
test('timeout opens a new round without ending the match or completing departed scores', () => {
  const r = room(); put(r, 'b', r.puzzle.cells[0]); removePlayer(r, 'b',1100);
  const deadline=r.until;
  assert.ok(place(r, 'a', {}, deadline).error); assert.equal(tick(r, deadline), true);
  assert.equal(r.phase, 'play'); assert.equal(r.round,2);
  assert.equal(r.scoreEvents.filter(e => e.completed).length, 0);
  assert.equal(tick(r, deadline + 1), false);
  const last=r.puzzle.cells.at(-1);
  for(const cell of r.puzzle.cells) if(cell!==last) r.filled[`${cell.row},${cell.col}`]={letter:cell.letter,by:'a'};
  put(r,'a',last); assert.equal(r.phase,'end');
  assert.equal(r.scoreEvents.filter(e=>e.completed).length,2);
});

function event(socket, name, match = () => true) { return new Promise((resolve, reject) => { const timer = setTimeout(() => { socket.off(name, receive); reject(new Error(`Timeout ${name}`)); }, 4000); function receive(data) { if (!match(data)) return; clearTimeout(timer); socket.off(name, receive); resolve(data); } socket.on(name, receive); }); }
test('real two-player game records every command, private hands, negative score and restart', async t => {
  const server = createGameServer(); await new Promise(resolve => server.http.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const url = `http://127.0.0.1:${server.http.address().port}`;
  const profile = await fetch(url + '/api/player'), cookie = profile.headers.get('set-cookie').split(';')[0];
  const a = client(url + '/games/cengel-kapismasi', {transports: ['websocket'], extraHeaders: {Cookie: cookie}, reconnection: false});
  const b = client(url + '/games/cengel-kapismasi', {transports: ['websocket'], reconnection: false});
  t.after(() => { a.disconnect(); b.disconnect(); }); await Promise.all([event(a, 'connect'), event(b, 'connect')]);
  const joined = await a.emitWithAck('join', {name: 'Ada'}); assert.ok(joined.code);
  await b.emitWithAck('join', {code: joined.code, name: 'Bora'});
  await a.emitWithAck('ready', true); const next = event(a, 'state', p => p.phase === 'play'); await b.emitWithAck('ready', true);
  const packet = await next; assert.equal(packet.phase, 'play'); assert.equal(packet.players[1].rack, undefined);
  const r = server.rooms.get(joined.code), wrong = r.puzzle.cells.find(c => c.letter !== packet.me.rack[0]);
  const result = await a.emitWithAck('confirm', {requestId: 'network-test', handVersion: packet.me.handVersion, revision: packet.revision, placements: [{row: wrong.row, col: wrong.col, slot: 0, letter: packet.me.rack[0]}]});
  assert.equal(result.wrong, 1);
  const scores = await (await fetch(url + '/api/games/cengel-kapismasi/scores', {headers: {Cookie: cookie}})).json(); assert.equal(scores.me.total, -1);
  r.until = Date.now() - 1;
  await new Promise(resolve => setTimeout(resolve, 350)); assert.equal(r.phase, 'play'); assert.equal(r.round,2);
  const last=r.puzzle.cells.at(-1);
  for(const cell of r.puzzle.cells) if(cell!==last)r.filled[`${cell.row},${cell.col}`]={letter:cell.letter,by:b.id};
  r.players[a.id].rack[0]=last.letter;
  await a.emitWithAck('confirm',{requestId:'finish',revision:r.revision,handVersion:r.players[a.id].handVersion,placements:[{...last,slot:0,letter:last.letter}]});
  assert.equal(r.phase,'end');
  const final = await (await fetch(url + '/api/games/cengel-kapismasi/scores', {headers: {Cookie: cookie}})).json(); assert.equal(final.me.played, 1);
  const catalog = await (await fetch(url + '/api/games')).json(); const game = catalog.find(g => g.id === 'cengel-kapismasi');
  assert.equal((await fetch(url + game.entry)).status, 200); assert.equal((await fetch(url + game.cover)).status, 200);
});

test('confirmed drafts validate atomically, score once, and refill only after all placements', () => {
  const r = room(), cells = r.puzzle.cells.slice(0, 5), p = r.players.a;
  p.rack = cells.map(c => c.letter);
  const payload = {requestId: 'five', revision: r.revision, handVersion: 0, placements: cells.map((c, slot) => ({row:c.row,col:c.col,slot,letter:c.letter}))};
  const result = confirm(r, 'a', payload, 1100);
  assert.equal(result.ok, true); assert.equal(result.results.length, 5); assert.equal(p.bonuses, 1); assert.equal(p.handVersion, 1);
  assert.ok(p.rack.every(l=>l===null)); assert.equal(p.correct, 5);
  confirm(r,'b',{requestId:'peer-pass',revision:r.revision,handVersion:r.players.b.handVersion,placements:[]},1150);
  assert.ok(p.rack.every(Boolean)); assert.equal(r.round,2);
  assert.deepEqual(confirm(r, 'a', payload, 1200), result); assert.equal(p.correct, 5);
  assert.ok(confirm(r, 'a', {...payload,requestId:'stale'}, 1200).error);
});
test('mixed correct/wrong confirmation deducts exactly once and preserves wrong tiles', () => {
  const r = room(), [a,b] = r.puzzle.cells, p = r.players.a; p.rack[0] = a.letter; p.rack[1] = 'N';
  const payload = {requestId:'mixed',revision:r.revision,handVersion:0,placements:[{row:a.row,col:a.col,slot:0,letter:a.letter},{row:b.row,col:b.col,slot:1,letter:'N'}]};
  const result = confirm(r,'a',payload,1100); assert.equal(result.wrong,1); assert.equal(p.correct,1); assert.equal(p.score,0);
  assert.equal(p.rack[1], 'N');
  assert.equal(Object.keys(r.filled).length,1); assert.equal(p.spent[1],false);
  confirm(r,'a',payload,1200); assert.equal(p.score,0); assert.equal(p.answered,2);
});
test('empty confirmation preserves hand/score; duplicate slots and racing cells mutate nothing', () => {
  const r = room(), p = r.players.a, before = [...p.rack];
  const pass = confirm(r,'a',{requestId:'empty',revision:r.revision,handVersion:0,placements:[]},1100);
  assert.equal(pass.ok,true); assert.deepEqual(p.rack,before); assert.equal(p.score,0); assert.equal(p.answered,0);
  const cell=r.puzzle.cells[0]; p.rack[0]=cell.letter;
  const tile={row:cell.row,col:cell.col,slot:0,letter:cell.letter};
  assert.ok(confirm(r,'a',{requestId:'duplicate',revision:r.revision,handVersion:1,placements:[tile,tile]},1200).error);
  assert.equal(Object.keys(r.filled).length,0);
  put(r,'b',cell);
  assert.ok(confirm(r,'a',{requestId:'race',revision:r.revision,handVersion:1,placements:[tile]},1200).error);
  assert.equal(p.score,0); assert.equal(p.answered,0);
});


test('disconnecting the unready host publishes play and schedules the remaining match', async t => {
  const server=createGameServer();
  await new Promise(resolve => server.http.listen(0,'127.0.0.1',resolve)); t.after(() => server.close());
  const url=`http://127.0.0.1:${server.http.address().port}`;
  const sockets=Array.from({length:3},()=>client(url+'/games/cengel-kapismasi',{transports:['websocket'],reconnection:false}));
  t.after(()=>sockets.forEach(s=>s.disconnect()));
  await Promise.all(sockets.map(s=>event(s,'connect')));
  const [host,a,b]=sockets, joined=await host.emitWithAck('join',{name:'Host'});
  await a.emitWithAck('join',{code:joined.code,name:'Ada'}); await b.emitWithAck('join',{code:joined.code,name:'Bora'});
  await a.emitWithAck('ready',true); await b.emitWithAck('ready',true);
  const room=server.rooms.get(joined.code); assert.equal(room.phase,'lobby');
  const started=Promise.all([event(a,'state',p=>p.phase==='play'),event(b,'state',p=>p.phase==='play')]);
  host.disconnect();
  const packets=await started;
  assert.ok(packets.every(p=>p.me.rack.length===5 && p.until>p.now));
  assert.equal(room.host,a.id);
  const advanced=event(a,'state',p=>p.round===2); room.until=Date.now()-1;
  await advanced; assert.equal(room.phase,'play'); assert.equal(room.round,2);
});

test('solo rooms get a ready bot; another human replaces it and the bot never hosts', () => {
  const r=createRoom({code:'1234',host:'a'}); addPlayer(r,{id:'a',name:'Ada'});
  const bot=Object.values(r.players).find(p=>p.isBot);
  assert.ok(bot?.ready); assert.equal(Object.values(r.players).length,2);
  configure(r,'a',{duration:30}); assert.equal(bot.ready,true); assert.equal(r.players.a.ready,false);
  addPlayer(r,{id:'b',name:'Bora'}); assert.equal(Object.values(r.players).filter(p=>p.isBot).length,0);
  removePlayer(r,'a',1000); assert.equal(r.host,'b'); assert.ok(Object.values(r.players).find(p=>p.isBot)?.ready);
  removePlayer(r,'b',1100); assert.equal(Object.keys(r.players).length,0); assert.equal(r.phase,'lobby');
});
test('each accepted solo confirmation gives the bot one bounded turn; retries and invalid moves do not', () => {
  const r=room(1), bot=Object.values(r.players).find(p=>p.isBot), player=r.players.a;
  assert.equal(bot.rack.length,5);
  const request={requestId:'solo-pass',revision:r.revision,handVersion:0,placements:[]};
  assert.ok(confirm(r,'a',{...request,revision:0},1100).error); assert.equal(bot.correct,0);
  tick(r,1100); assert.equal(bot.correct,0);
  const result=confirm(r,'a',request,1100);
  assert.ok(result.bot.placed>=1 && result.bot.placed<=2); assert.equal(bot.correct,result.bot.placed);
  assert.equal(Object.keys(r.filled).length,result.bot.placed); assert.equal(player.score,0);
  for(const [key,value] of Object.entries(r.filled)) {assert.equal(value.by,bot.id); assert.equal(value.letter,r.puzzle.cells.find(c=>`${c.row},${c.col}`===key).letter);}
  assert.equal(r.scoreEvents.length,0);
  const filled=Object.keys(r.filled).length, botVersion=bot.handVersion;
  assert.deepEqual(confirm(r,'a',request,1200),result); assert.equal(Object.keys(r.filled).length,filled); assert.equal(bot.handVersion,botVersion);
  const next=confirm(r,'a',{...request,requestId:'solo-next',handVersion:player.handVersion},1300);
  assert.ok(next.bot.placed>=1 && next.bot.placed<=2); assert.equal(bot.handVersion,botVersion+1);
});
test('the bot can finish the board and earn word points, without persistent score events', () => {
  const r=room(1), bot=Object.values(r.players).find(p=>p.isBot), last=r.puzzle.cells.find(c=>c.letter==='C');
  for(const cell of r.puzzle.cells) if(cell!==last) r.filled[`${cell.row},${cell.col}`]={letter:cell.letter,by:'a'};
  for(const entry of r.puzzle.entries) if(entry.keys.every(key=>r.filled[key])) r.completed[entry.id]='a';
  bot.rack=Array(5).fill('C');
  const result=confirm(r,'a',{requestId:'bot-finishes',revision:r.revision,handVersion:0,placements:[]},1100);
  assert.equal(result.bot.placed,1); assert.ok(bot.words>0); assert.ok(bot.score>0); assert.equal(r.phase,'end');
  assert.equal(r.scoreEvents.length,1); assert.equal(r.scoreEvents[0].name,'Ada'); assert.equal(r.scoreEvents[0].completed,true);
  assert.ok(view(r,'a',1200).players.some(p=>p.isBot && p.score===bot.score));
  const matchId=r.matchId; ready(r,'a',true,1300);
  assert.equal(r.phase,'play'); assert.notEqual(r.matchId,matchId); assert.equal(bot.score,0); assert.equal(bot.rack.length,5);
});
test('solo bot games publish turns over Socket.IO and disappear when the human leaves', async t => {
  const server=createGameServer(); await new Promise(resolve=>server.http.listen(0,'127.0.0.1',resolve)); t.after(()=>server.close());
  const url=`http://127.0.0.1:${server.http.address().port}`;
  const a=client(url+'/games/cengel-kapismasi',{transports:['websocket'],reconnection:false}); t.after(()=>a.disconnect()); await event(a,'connect');
  const lobby=event(a,'state',p=>p.phase==='lobby'),joined=await a.emitWithAck('join',{name:'Ada'});
  const initial=await lobby; assert.equal(initial.players.length,2); assert.ok(initial.players.some(p=>p.isBot && p.ready));
  const listed=await fetch(url+'/api/rooms?gameId=cengel-kapismasi').then(r=>r.json()); assert.equal(listed[0].players,1); assert.equal(listed[0].bots,1);
  const playing=event(a,'state',p=>p.phase==='play'); await a.emitWithAck('ready',true); const state=await playing;
  assert.ok(state.players.find(p=>p.isBot).rack===undefined); assert.equal(state.me.rack.length,5);
  const updated=event(a,'state',p=>p.filled>0),result=await a.emitWithAck('confirm',{requestId:'network-bot',revision:state.revision,handVersion:0,placements:[]});
  const packet=await updated; assert.equal(packet.filled,result.bot.placed); assert.equal(packet.players.length,2);
  a.emit('leave');
  for(let i=0;i<20 && server.rooms.size;i++) await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(server.rooms.size,0);
  a.disconnect();
});

test('late-game refill shrinks the acting hand and preserves the idle peer hand', () => {
  const r=room(),kept=[];
  for(const cell of r.puzzle.cells)if(!kept.some(c=>c.letter===cell.letter)&&kept.length<4)kept.push(cell);
  for(const cell of r.puzzle.cells)if(!kept.includes(cell))r.filled[`${cell.row},${cell.col}`]={letter:cell.letter,by:'b'};
  r.players.a.rack=[...kept.map(c=>c.letter),null];
  r.players.b.rack=[...kept.slice(1).map(c=>c.letter),null,null];
  const idle=[...r.players.b.rack];
  confirm(r,'b',{requestId:'idle',revision:r.revision,handVersion:0,placements:[]},1100);
  const cell=kept[0];
  confirm(r,'a',{requestId:'last-four',revision:r.revision,handVersion:0,placements:[{...cell,slot:0,letter:cell.letter}]},1200);
  assert.equal(r.round,2);
  assert.deepEqual(r.players.a.rack.filter(Boolean).sort(),kept.slice(1).map(c=>c.letter).sort());
  assert.deepEqual(r.players.b.rack,idle);
});

test('user AI 9x9 set validates after the unescaped clue quotation is repaired', () => {
  const text=readFileSync(new URL('./fixtures/cengel-9x9.json',import.meta.url),'utf8');
  const p=validatePuzzle(text);
  assert.equal(p.rows,9); assert.equal(p.cols,9); assert.equal(p.entries.length,27);
  assert.equal(p.cells.length+p.clueCells.length+p.blankCells.length,81);
  assert.throws(()=>validatePuzzle(text.replace('İşte, buldum anlamında ünlem','"İşte, buldum!" anlamında ünlem')),/çift tırnak/);
  assert.match(buildPrompt('Genel kültür',9,9),/clue değerinin içinde düz çift tırnak kullanma/);
});

test('one confirmation per round, peer hands stay stable, idle hands never redraw and stale rounds cannot score',()=>{
  const r=room(),a=r.players.a,b=r.players.b,cell=r.puzzle.cells[0];
  a.rack[0]=cell.letter;
  b.rack=r.puzzle.cells.filter(c=>c.letter!==cell.letter).slice(0,5).map(c=>c.letter);
  const idle=[...b.rack],version=b.handVersion;
  const move={requestId:'round-one',round:1,revision:r.revision,handVersion:0,placements:[{...cell,slot:0,letter:cell.letter}]};
  const result=confirm(r,'a',move,1100);
  assert.equal(result.points,1); assert.equal(a.score,1); assert.equal(r.round,1);
  assert.deepEqual(b.rack,idle); assert.equal(b.handVersion,version);
  assert.equal(view(r,'a',1100).me.confirmed,true);
  assert.ok(confirm(r,'a',{...move,requestId:'second',handVersion:a.handVersion},1200).error);
  confirm(r,'b',{requestId:'pass',round:1,revision:r.revision,handVersion:b.handVersion,placements:[]},1300);
  assert.equal(r.round,2); assert.equal(r.until,31300);assert.equal(r.phase,'play');
  assert.deepEqual(b.rack,idle); assert.ok(a.rack[0]);
  const score=a.score;
  assert.deepEqual(confirm(r,'a',move,1400),result); assert.equal(a.score,score);
  assert.ok(confirm(r,'a',{...move,requestId:'late-round',handVersion:a.handVersion},1400).error);
  const before=[...a.rack],deadline=r.until;
  assert.equal(tick(r,deadline),true);assert.equal(r.round,3);assert.equal(r.phase,'play');
  assert.deepEqual(a.rack,before);assert.deepEqual(b.rack,idle);
});

test('simultaneous socket confirmations cannot change peer hands or double-score a contested cell',async t=>{
  const server=createGameServer();await new Promise(resolve=>server.http.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());
  const url=`http://127.0.0.1:${server.http.address().port}`;
  const sockets=[client(url+'/games/cengel-kapismasi',{transports:['websocket'],reconnection:false}),client(url+'/games/cengel-kapismasi',{transports:['websocket'],reconnection:false})];
  t.after(()=>sockets.forEach(s=>s.disconnect()));await Promise.all(sockets.map(s=>event(s,'connect')));
  const [a,b]=sockets,joined=await a.emitWithAck('join',{name:'Ada'});
  await b.emitWithAck('join',{code:joined.code,name:'Bora'});await a.emitWithAck('ready',true);await b.emitWithAck('ready',true);
  const r=server.rooms.get(joined.code),cell=r.puzzle.cells[0];
  for(const s of sockets)r.players[s.id].rack[0]=cell.letter;
  const requests=sockets.map((s,i)=>({requestId:`race-${i}`,round:1,revision:r.revision,handVersion:0,placements:[{...cell,slot:0,letter:cell.letter}]}));
  const results=await Promise.all(sockets.map((s,i)=>s.emitWithAck('confirm',requests[i])));
  assert.equal(results.filter(x=>x.ok).length,1);assert.equal(results.filter(x=>x.error).length,1);
  assert.equal(Object.keys(r.filled).length,1);assert.equal(r.round,1);
  const loser=results.findIndex(x=>x.error),winner=1-loser;
  assert.equal(r.players[sockets[loser].id].score,0);assert.equal(r.players[sockets[loser].id].handVersion,0);
  assert.equal(r.players[sockets[winner].id].score,1);
  await new Promise(resolve=>setTimeout(resolve,270));
  assert.deepEqual(await sockets[winner].emitWithAck('confirm',requests[winner]),results[winner]);
  const passed=await sockets[loser].emitWithAck('confirm',{...requests[loser],requestId:'race-pass',placements:[]});
  assert.equal(passed.ok,true);assert.equal(r.round,2);assert.equal(Object.keys(r.filled).length,1);
  const cells=r.puzzle.cells.filter(c=>!r.filled[`${c.row},${c.col}`]).slice(0,2);
  const independent=sockets.map((s,i)=>{r.players[s.id].rack[0]=cells[i].letter;return {requestId:`independent-${i}`,round:2,revision:r.revision,handVersion:r.players[s.id].handVersion,placements:[{...cells[i],slot:0,letter:cells[i].letter}]};});
  await new Promise(resolve=>setTimeout(resolve,270));
  const accepted=await Promise.all(sockets.map((s,i)=>s.emitWithAck('confirm',independent[i])));
  assert.ok(accepted.every(x=>x.ok));assert.equal(r.round,3);assert.equal(Object.keys(r.filled).length,3);
  assert.ok(sockets.every(s=>r.players[s.id].score>0));
});


test('exhausted letters retire without redrawing idle hands or invalidating valid peer slots',()=>{
  const r=room(), a=r.players.a,b=r.players.b;
  const [last,other]=r.puzzle.cells.filter((c,i,all)=>i===all.findIndex(x=>x.letter===c.letter)).slice(0,2);
  for(const cell of r.puzzle.cells)if(cell!==last&&cell!==other)r.filled[`${cell.row},${cell.col}`]={letter:cell.letter,by:'a'};
  for(const entry of r.puzzle.entries)if(entry.keys.every(k=>r.filled[k]))r.completed[entry.id]='a';
  a.rack=[last.letter,null,null,null,null];b.rack=[last.letter,other.letter,last.letter,'H','H'];
  const result=confirm(r,'a',{requestId:'last-letter',round:1,revision:r.revision,handVersion:0,placements:[{...last,slot:0,letter:last.letter}]},1100);
  assert.equal(result.ok,true);assert.equal(r.phase,'play');
  assert.deepEqual(b.rack,[null,other.letter,null,null,null]);assert.equal(b.handVersion,0);
  const peer=confirm(r,'b',{requestId:'peer-valid',round:1,revision:r.revision,handVersion:0,placements:[{...other,slot:1,letter:other.letter}]},1200);
  assert.equal(peer.ok,true);assert.equal(r.phase,'end');
  assert.ok(Object.values(r.players).every(p=>p.rack.every(l=>l===null)));
});

test('passing with impossible letters never draws replacements, even while a peer finishes the board',()=>{
  const r=room(),last=r.puzzle.cells.find(c=>c.letter!=='H');
  for(const cell of r.puzzle.cells)if(cell!==last)r.filled[`${cell.row},${cell.col}`]={letter:cell.letter,by:'b'};
  r.players.a.rack=['H','H','H','H','H'];r.players.b.rack=[last.letter,null,null,null,null];
  assert.equal(confirm(r,'a',{requestId:'impossible-pass',round:1,revision:r.revision,handVersion:0,placements:[]},1100).ok,true);
  assert.ok(r.players.a.rack.every(l=>l===null));assert.equal(r.players.a.score,0);
  assert.equal(confirm(r,'b',{requestId:'finish-last',round:1,revision:r.revision,handVersion:0,placements:[{...last,slot:0,letter:last.letter}]},1200).ok,true);
  assert.equal(r.phase,'end');assert.ok(Object.values(r.players).every(p=>p.rack.every(l=>l===null)));
});
