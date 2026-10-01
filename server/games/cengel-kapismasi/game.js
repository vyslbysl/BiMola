import {randomInt, randomUUID} from 'node:crypto';
import {takePuzzle} from './pool.js';

export const MAX_PLAYERS = 12;
const BOT_ID = 'bot:cengel';
const humans = room => Object.values(room.players).filter(p => !p.isBot);
function playerState(id, name, profileId, isBot = false) {
  return {id, name, profileId, isBot, score:0, correct:0, answered:0, words:0, bonuses:0, ready:isBot, rack:[], spent:[], handVersion:0, confirmedRound:0, roundCorrect:0, confirmations:new Map()};
}
function syncSoloBot(room) {
  const count = humans(room).length;
  if (!count || (room.phase !== 'play' && count > 1)) delete room.players[BOT_ID];
  else if (room.phase !== 'play' && count === 1 && !room.players[BOT_ID]) room.players[BOT_ID] = playerState(BOT_ID, 'Mola Botu', undefined, true);
}
export function createRoom({code, host}) {
  const chosen=takePuzzle(9);
  return {code, host, phase: 'lobby', players: {}, puzzle: chosen.puzzle, boardSize:9, autoSize:true, recentBoards:[chosen.key], revision: 1, filled: {}, completed: {}, feed: [],
    until: 0, duration: 30, round:0, matchId: null, sequence: 0, scoreEvents: [], archives: []};
}
export function addPlayer(room, {id, name, profileId}) {
  room.players[id] = playerState(id, name, profileId);
  syncSoloBot(room);
  if(room.phase==='lobby' && room.autoSize && humans(room).length>=5 && room.boardSize!==11) resetPuzzle(room,11);
}
function resetPuzzle(room,size=room.boardSize) {
  const chosen=takePuzzle(size,room.recentBoards);
  room.puzzle=chosen.puzzle; room.boardSize=size;
  room.recentBoards.push(chosen.key); room.recentBoards=room.recentBoards.slice(-32);
  room.revision++; room.phase='lobby'; room.filled={}; room.completed={}; room.feed=[]; room.reason='';
  for(const p of Object.values(room.players)) Object.assign(p,{ready:!!p.isBot,rack:[],spent:[],score:0,correct:0,answered:0,words:0,bonuses:0});
}
export function randomize(room,id) {
  if(id!==room.host)return {error:'Yeni tahtayı oda sahibi seçebilir.'};
  if(room.phase==='play')return {error:'Maç sürerken tahta değişmez.'};
  resetPuzzle(room,room.autoSize?(humans(room).length>=5?11:9):room.boardSize);
  notice(room,'Yeni rastgele tahta hazır. Herkes Hazırım dediğinde başlar.');
  return {ok:true};
}
export function removePlayer(room, id, now = Date.now()) {
  const player = room.players[id];
  if (!player) return;
  if (room.phase === 'play' && player) room.archives.push(player);
  delete room.players[id];
  if (room.host === id) room.host = humans(room)[0]?.id;
  syncSoloBot(room);
  if (room.phase === 'play' && humans(room).length && humans(room).every(p => p.confirmedRound === room.round)) advanceRound(room, now);
  startIfReady(room, now);
}
function record(room, player, points, correct = 0, answered = 0, completed = false) {
  if (!room.matchId || player.isBot) return;
  room.scoreEvents.push({profileId: player.profileId, name: player.name, matchId: room.matchId, round: ++room.sequence,
    points, score: player.score, streak: 0, correct, answered, completed});
}
function notice(room, message) { room.feed.unshift(message); room.feed.length = Math.min(room.feed.length, 6); }
function remaining(room) { return room.puzzle.cells.filter(cell => !room.filled[`${cell.row},${cell.col}`]); }
function validRack(letters, rack) {
  const available = [...letters];
  return rack.map(letter => {
    const index = available.indexOf(letter);
    if (index < 0) return null;
    return available.splice(index, 1)[0];
  });
}
function pruneRacks(room) {
  const letters = remaining(room).map(cell => cell.letter);
  for (const player of Object.values(room.players)) {
    player.rack = validRack(letters, player.rack);
    // Only retire impossible tiles. Valid slots stay unchanged, so concurrent
    // confirmations of those slots retain their hand version and remain valid.
  }
}
function fillRacks(room, actingId, roundEnd = false) {
  const letters = remaining(room).map(cell => cell.letter);
  for (const player of Object.values(room.players)) {
    if (roundEnd && !player.roundCorrect) continue;
    const previous = [...player.rack], available = [...letters], next = Array(5).fill(null);
    // Each held tile must have its own remaining destination, including repeated letters.
    for (let i = 0; i < 5; i++) {
      const index = available.indexOf(previous[i]);
      if (index >= 0) { next[i] = available.splice(index, 1)[0]; }
    }
    for (let i = 0; i < 5 && available.length; i++) if (!next[i]) next[i] = available.splice(randomInt(available.length), 1)[0];
    player.rack = validRack(letters, next);
    if (!roundEnd && previous.length && player.id !== actingId && next.some((letter, i) => letter !== previous[i])) player.handVersion++;
  }
}

function finish(room, reason) {
  if (room.phase !== 'play') return;
  room.phase = 'end'; room.reason = reason;
  pruneRacks(room);
  for (const player of [...Object.values(room.players), ...room.archives]) record(room, player, 0, 0, 0, true);
  notice(room, reason);
}
export function tick(room, now) {
  if (room.phase === 'play' && now >= room.until) {
    // A timeout is a pass, not an unconfirmed draft or a new hand.
    const bot = room.players[BOT_ID];
    if (bot && bot.confirmedRound !== room.round) playBotTurn(room, now, true);
    advanceRound(room, now); return true;
  }
  return false;
}
function advanceRound(room, now) {
  if (room.phase !== 'play') return;
  pruneRacks(room);
  fillRacks(room, undefined, true);
  room.round++; room.until = now + room.duration * 1000;
  for (const p of Object.values(room.players)) { p.handVersion++; p.roundCorrect = 0; }
  notice(room, `${room.round}. tur başladı · ${room.duration} saniye. Pas geçenler yeni harf almadı.`);
}
export function ready(room, id, value, now) {
  const player = room.players[id];
  if (!player || room.phase === 'play') return {error: 'Maç sürerken hazırlık değişmez.'};
  player.ready = value == null ? !player.ready : value === true;
  startIfReady(room, now);
  return {ok: true};
}
function startIfReady(room, now) {
  const players = Object.values(room.players);
  const members = players.filter(p => !p.isBot);
  if (room.phase === 'play' || !members.length || !members.every(p => p.ready)) return;
  if(room.phase==='end') {
    const chosen=takePuzzle(room.autoSize?(members.length>=5?11:9):room.boardSize,room.recentBoards);
    room.puzzle=chosen.puzzle; room.boardSize=chosen.puzzle.rows;
    room.recentBoards.push(chosen.key); room.recentBoards=room.recentBoards.slice(-32);
  }
  room.phase = 'play'; room.revision++; room.round = 1; room.until = now + room.duration * 1000; room.matchId = randomUUID(); room.sequence = 0;
  room.filled = {}; room.completed = {}; room.archives = []; room.feed = []; room.reason = '';
  for (const p of players) Object.assign(p, {score: 0, correct: 0, answered: 0, words: 0, bonuses: 0, ready: false, rack: [], spent: Array(5).fill(false), handVersion: 0, confirmedRound:0, roundCorrect:0, confirmations: new Map()});
  fillRacks(room); notice(room, 'Tahta açıldı. Harflerini sürükle, sonra onayla.');
}
export function configure(room, id, data) {
  if (id !== room.host) return {error: 'Süreyi oda sahibi ayarlayabilir.'};
  if (room.phase === 'play') return {error: 'Maç sürerken süre değişmez.'};
  if (!data || (data.duration===undefined && data.size===undefined)) return {error:'Geçersiz ayar.'};
  if(data.duration!==undefined && ![15,30,45,60].includes(data.duration))return {error:'Geçersiz tur süresi.'};
  if(data.size!==undefined && !['auto',9,11].includes(data.size))return {error:'Geçersiz tahta boyutu.'};
  if(data.duration!==undefined)room.duration=data.duration;
  if(data.size!==undefined) {
    room.autoSize=data.size==='auto';
    const size=room.autoSize?(humans(room).length>=5?11:9):data.size;
    if(size!==room.boardSize)resetPuzzle(room,size);
  }
  Object.values(room.players).forEach(p => { p.ready = !!p.isBot; }); return {ok: true};
}
export function place(room, id, data, now, deferRefill = false) {
  const player = room.players[id];
  if (room.phase !== 'play' || !player) return {error: 'Aktif bir maç yok.'};
  if (now >= room.until) return {error: 'Süre bitti.'};
  if (!data || ![data.row, data.col, data.slot, data.revision].every(Number.isInteger) || data.slot < 0 || data.slot >= 5) return {error: 'Harf veya kutu geçersiz.'};
  if (data.revision !== room.revision) return {error: 'Tahta değişti. Yeniden seç.'};
  const key = `${data.row},${data.col}`, cell = room.puzzle.cells.find(c => c.row === data.row && c.col === data.col);
  if (!cell || room.filled[key]) return {error: 'Bu kutu kapalı veya başka biri doldurdu. Puanın değişmedi.'};
  const letter = player.rack[data.slot];
  if (!letter || data.letter !== letter) return {error: 'Elindeki harf değişti. Yeniden seç.'};
  player.answered++;
  if (letter !== cell.letter) {
    player.score--; record(room, player, -1, 0, 1);
    return {ok: true, wrong: true, points: -1, message: 'Yanlış harf · −1 puan. Harf elinde kaldı.'};
  }
  room.filled[key] = {letter, by: id}; player.correct++; player.roundCorrect++;
  player.rack[data.slot] = null; player.spent[data.slot] = true;
  let points = 1;
  for (const entry of room.puzzle.entries) if (!room.completed[entry.id] && entry.keys.every(k => room.filled[k])) {
    room.completed[entry.id] = id; points += entry.answer.length; player.words++;
    notice(room, `${player.name}, ${entry.answer} kelimesini tamamladı · +${entry.answer.length}`);
  }
  if (player.spent.every(Boolean)) { points += 5; player.bonuses++; player.spent.fill(false); notice(room, `${player.name} elindeki beş harfi bitirdi · +5`); }
  player.score += points; record(room, player, points, 1, 1); if (!deferRefill) fillRacks(room, id);
  if (!remaining(room).length) finish(room, 'Bütün kelimeler tamamlandı!');
  return {ok: true, points, message: points ? `Doğru harf · +${points} puan` : 'Doğru harf!'};
}

export function confirm(room, id, data, now) {
  const player = room.players[id];
  if (!player || !data || typeof data.requestId !== 'string' || !/^[a-zA-Z0-9-]{1,40}$/.test(data.requestId)) return {error: 'Hamle bilgisi geçersiz.'};
  const previous = player.confirmations.get(data.requestId);
  if (previous) return previous;
  if (room.phase !== 'play' || now >= room.until) return {error: 'Aktif maç yok veya süre bitti.'};
  if (player.confirmedRound === room.round) return {error:'Bu turu onayladın. Diğer oyuncuları veya yeni turu bekle.'};
  if (data.round !== undefined && data.round !== room.round) return {error:'Tur değişti. Hamleni yeniden hazırla.'};
  if (data.revision !== room.revision || data.handVersion !== player.handVersion) return {error: 'Tahta veya el değişti. Hamleni yeniden kontrol et.'};
  if (!Array.isArray(data.placements) || data.placements.length > 5) return {error: 'Bir hamlede en fazla beş harf yerleştir.'};
  const slots = new Set(), targets = new Set();
  // Validate the entire draft before scoring any letter. Conflicts cost nothing.
  for (const tile of data.placements) {
    if (!tile || ![tile.row, tile.col, tile.slot].every(Number.isInteger) || tile.slot < 0 || tile.slot > 4) return {error: 'Harf veya kutu geçersiz.'};
    const key = `${tile.row},${tile.col}`;
    if (slots.has(tile.slot) || targets.has(key)) return {error: 'Bir harf veya kutu aynı hamlede iki kez kullanılamaz.'};
    if (!room.puzzle.cells.some(c => c.row === tile.row && c.col === tile.col) || room.filled[key]) return {error: 'Bir kutuyu başka oyuncu doldurdu veya kutu kapalı. Puanın değişmedi; hamleni düzenle.'};
    if (!player.rack[tile.slot] || tile.letter !== player.rack[tile.slot]) return {error: 'Elindeki harf değişti. Hamleni yeniden düzenle.'};
    slots.add(tile.slot); targets.add(key);
  }
  const results = data.placements.map(tile => ({...tile, ...place(room, id, {...tile, revision: room.revision}, now, true)}));
  player.confirmedRound = room.round; player.handVersion++;
  const wrong = results.filter(r => r.wrong).length, points = results.reduce((sum, r) => sum + r.points, 0);
  const bot = playBotTurn(room, now);
  pruneRacks(room);
  const response = {ok: true, results, wrong, points, bot, message: results.length ? `${results.length - wrong} doğru${wrong ? ` · ${wrong} yanlış` : ''} · ${points > 0 ? '+' : ''}${points} puan` : 'Pas geçtin. Yeni harf almadın.'};
  if (bot?.placed) response.message += ` · Bot ${bot.placed} harf yerleştirdi.`;
  player.confirmations.set(data.requestId, response);
  while (player.confirmations.size > 16) player.confirmations.delete(player.confirmations.keys().next().value);
  if (humans(room).every(p => p.confirmedRound === room.round)) advanceRound(room, now);
  return response;
}

// The bot takes one bounded turn after confirmation or at the round deadline.
function playBotTurn(room, now, timeout = false) {
  const bot = room.players[BOT_ID];
  if (!bot || room.phase !== 'play' || (!timeout && now >= room.until) || bot.confirmedRound === room.round) return null;
  // Execute the bot's timeout turn at the last valid instant of this round.
  if (timeout) now = room.until - 1;
  bot.confirmedRound = room.round;
  const slots = [0,1,2,3,4].sort((a,b) => Number(bot.spent[a]) - Number(bot.spent[b]));
  const limit = randomInt(1,3);
  let placed = 0, points = 0;
  for (const slot of slots) {
    if (placed >= limit || room.phase !== 'play') break;
    const letter = bot.rack[slot], options = remaining(room).filter(c => c.letter === letter);
    if (!options.length) continue;
    const cell = options[randomInt(options.length)];
    const result = place(room, bot.id, {row:cell.row,col:cell.col,slot,letter,revision:room.revision}, now, true);
    if (result.ok) { placed++; points += result.points; }
  }
  if (placed) notice(room, `Mola Botu ${placed} harf yerleştirdi.`);
  return {placed, points};
}

export function view(room, id, now) {
  const me = room.players[id];
  return {code: room.code, host: room.host, phase: room.phase, until: room.until, now, duration: room.duration, revision: room.revision,
    boardSize:room.boardSize, autoSize:room.autoSize, round:room.round,
    title: room.puzzle.title, category: room.puzzle.category, rows: room.puzzle.rows, cols: room.puzzle.cols,
    clueCells: room.puzzle.clueCells,
    cells: room.puzzle.cells.map(c => ({row: c.row, col: c.col, entries: c.entries, ...room.filled[`${c.row},${c.col}`], ...(room.phase === 'end' ? {solution: c.letter} : {})})),
    entries: room.puzzle.entries.map(e => ({id: e.id, clue: e.clue, row: e.row, col: e.col, startRow: e.startRow, startCol: e.startCol, direction: e.direction, length: e.answer.length, completedBy: room.completed[e.id], ...(room.phase === 'end' ? {answer: e.answer} : {})})),
    players: Object.values(room.players).map(({id, name, score, correct, words, bonuses, ready, isBot, confirmedRound}) => ({id, name, score, correct, words, bonuses, ready, isBot, confirmed:confirmedRound===room.round})),
    me: me ? {rack: validRack(remaining(room).map(c=>c.letter), me.rack), spent: me.spent, handVersion: me.handVersion, confirmed:me.confirmedRound===room.round} : null, feed: room.feed, reason: room.reason || '',
    filled: Object.keys(room.filled).length, total: room.puzzle.cells.length, completed: Object.keys(room.completed).length};
}
