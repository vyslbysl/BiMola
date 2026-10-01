import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {io as client} from 'socket.io-client';
import {validatePuzzle, serializePuzzle, buildPrompt, example, normalize} from '../public/games/cengel-kapismasi/puzzle.js';
import {starter} from '../public/games/cengel-kapismasi/starter.js';
import {createRoom, addPlayer, removePlayer, ready, configure, place, confirm, upload, tick, view} from '../server/games/cengel-kapismasi/game.js';
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
function transfer(r, data, player = 'a', token = 'upload') {
  const text = typeof data === 'string' ? data : JSON.stringify(data), size = 800, total = Math.ceil(text.length / size);
  let result;
  for (let index = 0; index < total; index++) result = upload(r, player, {token, total, index, chunk: text.slice(index * size, (index + 1) * size)}, 1000);
  return result;
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
  assert.equal(r.phase,'play'); assert.equal(r.host,'a'); assert.equal(r.until,301200);
  assert.equal(r.revision,2); assert.ok(Object.values(r.players).every(p => p.rack.length === 5));
  const matchId=r.matchId; removePlayer(r,'b',1300);
  assert.equal(r.matchId,matchId); assert.equal(r.until,301200); assert.equal(r.revision,2);
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
  assert.equal(r.players.a.bonuses, 1); assert.equal(r.players.a.score, 14);
  assert.deepEqual(r.players.a.spent, Array(5).fill(false));
});
test('finishing a crossing scores both completed words, then freezes and records match', () => {
  const r = room(), crossing = r.puzzle.cells.find(c => c.row === 1 && c.col === 1);
  for (const cell of r.puzzle.cells.filter(c => c !== crossing)) put(r, 'a', cell);
  const otherPoints = r.puzzle.entries.filter(e => !crossing.entries.includes(e.id)).reduce((sum, e) => sum + e.answer.length, 0);
  assert.equal(r.players.a.score, otherPoints);
  const result = put(r, 'b', crossing);
  assert.equal(result.points, 14); assert.equal(r.players.b.words, 2); assert.equal(r.phase, 'end');
  assert.equal(r.scoreEvents.filter(e => e.completed).length, 2);
  assert.equal(view(r, 'a', 1200).entries[0].answer, 'KURABİYE');
  assert.ok(put(r, 'b', crossing).error); tick(r, 999999); assert.equal(r.scoreEvents.filter(e => e.completed).length, 2);
});
test('timeout rejects late placement and completes departed players only once', () => {
  const r = room(); put(r, 'b', r.puzzle.cells[0]); removePlayer(r, 'b');
  assert.ok(place(r, 'a', {}, r.until).error); assert.equal(tick(r, r.until), true);
  assert.equal(r.phase, 'end'); assert.equal(r.scoreEvents.filter(e => e.completed).length, 2);
  assert.equal(tick(r, r.until + 1), false);
});
test('upload is atomic, ordered, phase protected and resets readiness only on success', () => {
  const r = createRoom({code: '1234', host: 'a'}); addPlayer(r, {id: 'a', name: 'Ada'}); r.players.a.ready = true;
  assert.ok(transfer(r, '{').error); assert.equal(r.revision, 1); assert.equal(r.players.a.ready, true);
  assert.equal(transfer(r, example).installed, true); assert.equal(r.revision, 2); assert.equal(r.players.a.ready, false);
  assert.ok(upload(r, 'a', {token: 'bad', total: 2, index: 1, chunk: '{}'}, 1000).error);
  ready(r, 'a', true, 1000); assert.ok(transfer(r, example).error);
});
test('concurrent uploads cannot overwrite an intervening installed board', () => {
  const r = createRoom({code: '1234', host: 'a'}); addPlayer(r, {id: 'a', name: 'Ada'}); addPlayer(r, {id: 'b', name: 'Bora'});
  const text = JSON.stringify(example), total = Math.ceil(text.length / 800);
  assert.equal(upload(r, 'a', {token: 'first', total, index: 0, chunk: text.slice(0, 800)}, 1000).ok, true);
  assert.equal(transfer(r, example, 'b').installed, true);
  let result; for (let index = 1; index < total; index++) result = upload(r, 'a', {token: 'first', total, index, chunk: text.slice(index * 800, (index + 1) * 800)}, 1000);
  assert.match(result.error, /Başka/);
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
  await new Promise(resolve => setTimeout(resolve, 350)); assert.equal(r.phase, 'end');
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
  assert.ok(p.rack.every(Boolean)); assert.equal(p.correct, 5);
  assert.deepEqual(confirm(r, 'a', payload, 1200), result); assert.equal(p.correct, 5);
  assert.ok(confirm(r, 'a', {...payload,requestId:'stale'}, 1200).error);
});
test('mixed correct/wrong confirmation deducts exactly once and preserves wrong tiles', () => {
  const r = room(), [a,b] = r.puzzle.cells, p = r.players.a; p.rack[0] = a.letter; p.rack[1] = 'N';
  const payload = {requestId:'mixed',revision:r.revision,handVersion:0,placements:[{row:a.row,col:a.col,slot:0,letter:a.letter},{row:b.row,col:b.col,slot:1,letter:'N'}]};
  const result = confirm(r,'a',payload,1100); assert.equal(result.wrong,1); assert.equal(p.correct,1); assert.equal(p.score,-1);
  assert.equal(p.rack[1], 'N');
  assert.equal(Object.keys(r.filled).length,1); assert.equal(p.spent[1],false);
  confirm(r,'a',payload,1200); assert.equal(p.score,-1); assert.equal(p.answered,2);
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
  const finished=event(a,'state',p=>p.phase==='end'); room.until=Date.now()-1;
  await finished; assert.equal(room.phase,'end');
});

test('solo rooms get a ready bot; another human replaces it and the bot never hosts', () => {
  const r=createRoom({code:'1234',host:'a'}); addPlayer(r,{id:'a',name:'Ada'});
  const bot=Object.values(r.players).find(p=>p.isBot);
  assert.ok(bot?.ready); assert.equal(Object.values(r.players).length,2);
  configure(r,'a',{duration:180}); assert.equal(bot.ready,true); assert.equal(r.players.a.ready,false);
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

test('late-game hands shrink and repeated letters never outnumber remaining destinations', () => {
  const r=room(), kept=[];
  for(const cell of r.puzzle.cells) if(!kept.some(c=>c.letter===cell.letter) && kept.length<3) kept.push(cell);
  for(const cell of r.puzzle.cells) if(!kept.includes(cell)) r.filled[`${cell.row},${cell.col}`]={letter:cell.letter,by:'b'};
  r.players.a.rack=Array(5).fill(kept[0].letter); r.players.b.rack=Array(5).fill(kept[0].letter);
  const oldVersion=r.players.b.handVersion;
  assert.equal(confirm(r,'a',{requestId:'shrink',revision:r.revision,handVersion:r.players.a.handVersion,placements:[]},1100).ok,true);
  for(const p of Object.values(r.players)) {
    assert.equal(p.rack.filter(Boolean).length,3);
    assert.deepEqual(p.rack.filter(Boolean).sort(),kept.map(c=>c.letter).sort());
  }
  assert.ok(r.players.b.handVersion>oldVersion);
  assert.ok(confirm(r,'b',{requestId:'stale-hand',revision:r.revision,handVersion:oldVersion,placements:[]},1100).error);
  for(const cell of kept.slice(0,2)) put(r,'a',cell);
  for(const p of Object.values(r.players)) assert.deepEqual(p.rack.filter(Boolean),[kept[2].letter]);
  put(r,'a',kept[2]);
  assert.equal(r.phase,'end');
  assert.ok(Object.values(r.players).every(p=>p.rack.every(letter=>letter===null)));
});

test('user AI 9x9 set validates after the unescaped clue quotation is repaired', () => {
  const text=readFileSync(new URL('../public/games/cengel-kapismasi/sets/genel-kultur-9x9.json',import.meta.url),'utf8');
  const p=validatePuzzle(text);
  assert.equal(p.rows,9); assert.equal(p.cols,9); assert.equal(p.entries.length,27);
  assert.equal(p.cells.length+p.clueCells.length+p.blankCells.length,81);
  assert.throws(()=>validatePuzzle(text.replace('İşte, buldum anlamında ünlem','"İşte, buldum!" anlamında ünlem')),/çift tırnak/);
  assert.match(buildPrompt('Genel kültür',9,9),/clue değerinin içinde düz çift tırnak kullanma/);
});
