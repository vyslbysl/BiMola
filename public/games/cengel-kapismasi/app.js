import {buildPrompt, validatePuzzle, serializePuzzle} from './puzzle.js';
import {starter as example} from './starter.js';
import {readName, saveName} from '/platform/profile.js';
import {createRequestId} from './request-id.js';
import {focusWindow} from './focus.js';

const $ = id => document.getElementById(id);
const socket = io('/games/cengel-kapismasi', {autoConnect: false});
let state = null, selected = null, active = null, preview = null, validationError = '', noticeTimer, busy = false, pending = false, lastPhase, offset = 0;
const cellNodes = new Map(), draft = new Map(); let boardSignature = '', drag = null, ghost = null, confirmRequest = null, suppressPointerClick = false;
let magnified = false, focusPage = 0, focusSignature = "";
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
function notify(message) { $('notice').textContent = message; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('notice').textContent = ''; }, 4200); }
async function command(event, data) {
  if (!socket.connected) throw new Error('Bağlantı kesildi. Yeniden bağlanınca odaya tekrar gir.');
  const response = await socket.timeout(5000).emitWithAck(event, data);
  if (response?.error) throw new Error(response.error);
  return response;
}
function suggestSize(count) { return count <= 3 ? 9 : count <= 6 ? 11 : count <= 9 ? 13 : 15; }
function promptChanged() {
  const rows = Number($('rows').value), cols = Number($('cols').value);
  const valid = [rows, cols].every(n => Number.isInteger(n) && n >= 7 && n <= 21);
  $('copy-prompt').disabled = !valid;
  $('prompt').value = valid ? buildPrompt($('category').value, rows, cols) : 'Boyutlar 7–21 arasında tam sayı olmalı.';
}
function makeBoard(container, puzzle, showAnswers = false) {
  container.style.gridTemplateColumns = `repeat(${puzzle.cols}, var(--cell))`;
  const cells = new Map(puzzle.cells.map(c => [`${c.row},${c.col}`, c]));
  const clueCells = new Map(puzzle.clueCells.map(c => [`${c.row},${c.col}`, c]));
  const starts = new Map();
  puzzle.entries.forEach(e => { const key = `${e.startRow},${e.startCol}`; if (!starts.has(key)) starts.set(key, []); starts.get(key).push(e.id); });
  const children = [];
  for (let row = 0; row < puzzle.rows; row++) for (let col = 0; col < puzzle.cols; col++) {
    const key = `${row},${col}`, cell = cells.get(key), clueCell = clueCells.get(key), button = el(cell && !showAnswers ? 'button' : 'div', undefined, 'cell' + (cell ? '' : clueCell ? ' question' : ' blocked'));
    button.dataset.gridRow = row; button.dataset.gridCol = col;
    if (clueCell) {
      for (const id of clueCell.entries) {
        const entry = puzzle.entries.find(e => e.id === id);
        const clue = el(showAnswers ? 'div' : 'button', entry.clue, `clue-tile ${entry.direction}`);
        clue.dataset.entry = id;
        clue.title = entry.clue;
        if (!showAnswers) { clue.setAttribute('aria-label', `${entry.clue}, ${entry.direction === 'across' ? 'sağa' : 'aşağıya'}, ${entry.length} harf`); clue.onclick = () => selectClue(id); }
        button.append(clue);
      }
    }
    if (cell) {
      const number = starts.get(key)?.join('/'); if (number) button.append(el('span', number, 'number'));
      button.append(el('span', showAnswers ? cell.letter : '', 'letter'));
      if (!showAnswers) {
        button.setAttribute('aria-label', `Satır ${row + 1}, sütun ${col + 1}, boş kutu`);
        button.dataset.row = row; button.dataset.col = col; button.addEventListener('click', () => onCell(row, col)); button.addEventListener('pointerdown', event => { const tile = [...draft.values()].find(t => t.row === row && t.col === col); if (tile) beginDrag(event, tile.slot); }); cellNodes.set(key, button);
      }
    } else if (!clueCell) button.setAttribute('aria-hidden', 'true');
    children.push(button);
  }
  container.replaceChildren(...children);
}
function selectClue(id, position) {
  if (id !== active) {
    const entry = state.entries.find(e => e.id === id);
    focusPage = position && entry ? Math.floor((entry.direction === 'down' ? position.row - entry.startRow : position.col - entry.startCol) / 3) : 0;
  }
  active = id; renderClue(); updateCells(); applyFocus(); fitPlayArea();
  for (const button of $('clues').children) button.classList.toggle('active', button.dataset.id === id);
  
}
function renderClue() {
  const entry = state?.entries.find(e => e.id === active);
  $('active-clue').replaceChildren();
  $('clue-panel').querySelector('.clue-number').textContent = entry?.id || '?';
  if (!entry) { $('active-clue').textContent = 'Bir kutuya dokun, ipucunu gör.'; return; }
  $('active-clue').append(el('div', entry.clue), el('small', `${entry.direction === 'across' ? '→ Yatay' : '↓ Dikey'} · ${entry.length} harf${entry.completedBy ? ' · Tamamlandı' : ''}`));
  const crossed = state.entries.filter(e => e.id !== entry.id && e.row === entry.row && e.col === entry.col);
  for (const other of crossed) { const button = el('button', `${other.id}. ipucuna geç`, 'clue-choice'); button.onclick = () => selectClue(other.id); $('active-clue').append(button); }
}
function updateCells() {
  const entry = state.entries.find(e => e.id === active);
  for (const cell of state.cells) {
    const node = cellNodes.get(`${cell.row},${cell.col}`); if (!node) continue;
    node.classList.toggle('highlight', !!entry && cell.entries.includes(entry.id));
    node.classList.toggle('filled', !!cell.letter); node.classList.toggle('mine', cell.by === socket.id);
    node.classList.toggle('solution', !cell.letter && !!cell.solution);
    const tile = [...draft.values()].find(t => t.row === cell.row && t.col === cell.col);
    node.classList.toggle('draft', !!tile);
    node.querySelector('.letter').textContent = cell.letter || tile?.letter || cell.solution || '';
    node.setAttribute('aria-label', `Satır ${cell.row + 1}, sütun ${cell.col + 1}, ${cell.letter || tile?.letter || cell.solution || 'boş'}${tile ? ', taslak' : ''}${cell.entries.includes(active) ? ', seçili kelime' : ''}`);
  }
  for (const clue of $('board').querySelectorAll('.clue-tile')) clue.classList.toggle('active', clue.dataset.entry === active);
}
function stageTile(slot, row, col) {
  if (!state || state.phase !== 'play' || pending) return;
  const cell = state.cells.find(c => c.row === row && c.col === col), letter = state.me.rack[slot];
  if (!cell || cell.letter || !letter) return;
  for (const [other, tile] of draft) if (tile.row === row && tile.col === col && other !== slot) draft.delete(other);
  draft.set(slot, {slot, row, col, letter}); selected = null; confirmRequest = null;
  updateCells(); renderRack();
  const node = cellNodes.get(`${row},${col}`)?.querySelector('.letter');
  if (node && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) node.animate([{transform:'scale(.8)', opacity:.5}, {transform:'scale(1.08)', opacity:1}, {transform:'scale(1)', opacity:1}], {duration:180, easing:'ease-out'});
}
function onCell(row, col) {
  if (drag?.moved || pending) return;
  const cell = state.cells.find(c => c.row === row && c.col === col);
  if (!cell) return;
  const next = cell.entries.includes(active) ? selected !== null ? active : cell.entries[(cell.entries.indexOf(active) + 1) % cell.entries.length] : cell.entries[0];
  selectClue(next, {row,col});
  if (state.phase !== 'play' || cell.letter) return;
  if (selected !== null) stageTile(selected, row, col);
  else {
    const tile = [...draft.values()].find(t => t.row === row && t.col === col);
    if (tile) { draft.delete(tile.slot); confirmRequest = null; selected = tile.slot; updateCells(); renderRack(); }
  }
}
function clearDrag() {
  const pointerId = drag?.pointerId;
  drag = null;
  ghost?.remove(); ghost = null;
  document.querySelectorAll('.drag-source, .drop-target').forEach(node => node.classList.remove('drag-source', 'drop-target'));
  if (pointerId !== undefined && $('rack').hasPointerCapture(pointerId)) $('rack').releasePointerCapture(pointerId);
}
function beginDrag(event, slot) {
  if (event.button !== 0 || event.isPrimary === false || drag || pending || state?.phase !== 'play' || !state.me.rack[slot]) return;
  suppressPointerClick = false;
  drag = {slot, pointerId:event.pointerId, source:event.currentTarget, letter:state.me.rack[slot], x:event.clientX, y:event.clientY, moved:false};
  $('rack').setPointerCapture(event.pointerId);
}
document.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
  drag.moved = true; event.preventDefault();
  if (!ghost) {
    ghost = el('div', drag.letter, 'drag-ghost'); ghost.setAttribute('aria-hidden', 'true');
    ghost.style.setProperty('--drag-size', getComputedStyle($('board')).getPropertyValue('--cell'));
    document.body.append(ghost); drag.source.classList.add('drag-source');
  }
  ghost.style.left = event.clientX + 'px'; ghost.style.top = event.clientY + 'px';
  $('board').querySelector('.drop-target')?.classList.remove('drop-target');
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('#board .cell[data-row]');
  if (target && !target.classList.contains('filled')) target.classList.add('drop-target');
}, {passive:false});
document.addEventListener('pointerup', event => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const movement = drag;
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  clearDrag();
  // Consume only the synthetic click belonging to this pointer gesture; keyboard clicks still work.
  suppressPointerClick = true;
  if (movement.moved) {
    const target = hit?.closest('#board .cell[data-row]');
    if (state?.me?.rack[movement.slot] !== movement.letter) notify('Sürüklediğin harf yenilendi. Elinden yeniden seç.');
    else if (target) stageTile(movement.slot, Number(target.dataset.row), Number(target.dataset.col));
    else if (hit?.closest('#rack')) { draft.delete(movement.slot); confirmRequest = null; updateCells(); renderRack(); }
  } else {
    if (draft.has(movement.slot)) { draft.delete(movement.slot); confirmRequest = null; updateCells(); }
    selected = selected === movement.slot ? null : movement.slot; renderRack();
  }
});
document.addEventListener('click', event => {
  if (suppressPointerClick && event.detail > 0) {
    suppressPointerClick = false; event.preventDefault(); event.stopImmediatePropagation();
  }
}, true);
document.addEventListener('pointerdown', event => {
  if (!drag && event.isPrimary !== false) suppressPointerClick = false;
}, true);
document.addEventListener('pointercancel', event => { if (event.pointerId === drag?.pointerId) clearDrag(); });
$('rack').addEventListener('lostpointercapture', event => { if (event.pointerId === drag?.pointerId) clearDrag(); });
window.addEventListener('blur', clearDrag);
async function confirmDraft() {
  if (pending || state?.phase !== 'play') return;
  try {
    pending = true; renderRack();
    confirmRequest ||= {requestId: createRequestId(), revision: state.revision, handVersion: state.me.handVersion, placements: [...draft.values()]};
    const response = await command('confirm', confirmRequest);
    draft.clear(); selected = null; confirmRequest = null;
    for (const tile of response.results || []) if (tile.wrong) {
      const node = cellNodes.get(`${tile.row},${tile.col}`); node?.classList.add('bad'); setTimeout(() => node?.classList.remove('bad'), 350);
    }
    notify(response.message);
  } catch (error) { notify(error.message || 'Onay gönderilemedi; yeniden dene.'); }
  finally { pending = false; if (state) { updateCells(); renderRack(); } }
}
function renderRack() {
  const letters = state.me?.rack || [];
  if ($('rack').children.length !== letters.length) {
    $('rack').replaceChildren(...letters.map((_, slot) => {
      const button = el('button'); button.dataset.slot = slot;
      button.addEventListener('pointerdown', event => beginDrag(event, slot));
      button.onclick = () => {
        if (pending || drag) return;
        if (draft.has(slot)) { draft.delete(slot); confirmRequest = null; updateCells(); }
        selected = selected === slot ? null : slot; renderRack();
      };
      return button;
    }));
  }
  letters.forEach((letter, slot) => {
    const button = $('rack').children[slot];
    button.textContent = letter || '·';
    button.classList.toggle('selected', selected === slot);
    button.classList.toggle('spent', !!state.me.spent[slot]);
    button.classList.toggle('staged', draft.has(slot));
    button.disabled = !letter || state.phase !== 'play' || pending;
    button.setAttribute('aria-pressed', String(selected === slot));
    button.setAttribute('aria-label', `${slot + 1}. harf: ${letter || 'yok'}${state.me.spent[slot] ? ', bonus için kullanıldı' : ''}`);
  });
  const spent = state.me?.spent.filter(Boolean).length || 0;
  $('bonus-progress').textContent = `${spent}/5 · +5 bonus`;
  $('my-score').textContent = `${state.players.find(p => p.id === socket.id)?.score || 0} puan`;
  $('rack-hint').textContent = draft.size ? `${draft.size} harf hazır. Onaylamadan önce yerlerini değiştirebilirsin.` : 'Harfleri sürükle veya seçip kutuya dokun. Sonra onayla.';
  $('confirm').textContent = pending ? 'Onaylanıyor…' : draft.size ? `Onayla · ${draft.size} harf` : 'Onayla';
  $('confirm').disabled = pending || state.phase !== 'play'; $('undo-draft').disabled = pending || !draft.size;
}
function renderPlayers() {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  $('score-strip').replaceChildren(...sorted.map(p => {
    const chip = el('div', undefined, `score-chip${p.id === socket.id ? ' self' : ''}`);
    chip.dataset.playerId = p.id;
    chip.append(el('span', p.id === socket.id ? 'Sen' : p.isBot ? `${p.name} · Bot` : p.name), el('strong', String(p.score))); return chip;
  }));
  $('players').replaceChildren(...sorted.map(p => {
    const li = el('li', undefined, p.id === socket.id ? 'self' : '');
    const details = el('div', p.name + (p.isBot ? ' · bot' : p.id === socket.id ? ' · sen' : ''));
    details.append(el('small', state.phase === 'play' || state.phase === 'end' ? `${p.words} kelime · ${p.bonuses} bonus` : p.ready ? '✓ Hazır' : 'Hazırlanıyor'));
    li.append(details, el('strong', String(p.score))); return li;
  }));
  $('player-count').textContent = `${state.players.filter(p => !p.isBot).length}/12${state.players.some(p => p.isBot) ? ' + bot' : ''}`;
}
function render(packet) {
  const old = state; state = packet; offset = packet.now - Date.now();
  if (drag && (old?.code !== packet.code || old?.revision !== packet.revision || packet.phase !== 'play' || packet.me?.rack[drag.slot] !== drag.letter)) clearDrag();
  if (old?.code !== packet.code || old?.revision !== packet.revision) { clearFlights(); document.querySelector('.word-celebration')?.remove(); clearTimeout(celebrationTimer); }
  if (old?.revision !== packet.revision || old?.code !== packet.code || packet.phase !== 'play') { draft.clear(); confirmRequest = null; }
  for (const [slot, tile] of draft) if (packet.me?.rack[slot] !== tile.letter || packet.cells.some(c => c.row === tile.row && c.col === tile.col && c.letter)) { draft.delete(slot); confirmRequest = null; }
  if (selected !== null && (!packet.me?.rack[selected] || old?.me?.rack[selected] !== packet.me.rack[selected] || old?.revision !== packet.revision)) selected = null;
  $('home').hidden = true; $('room').hidden = false;
  document.body.classList.add('in-room');
  document.body.dataset.phase = state.phase;
  $('room-code').textContent = `ODA ${state.code} · ${state.rows} × ${state.cols}`;
  $('title').textContent = state.title;
  $('subtitle').textContent = state.phase === 'end' ? `${state.reason} ${winners()}` : state.phase === 'play' ? `${state.category} · Herkes aynı tahtada.` : `${state.category} · ${state.players.some(p => p.isBot) ? 'Tek başınasın; Mola Botu rakibin. Hazırım diyerek başla.' : 'Hazır olduğunda işaretle. Herkes hazırsa maç başlar.'}`;
  $('progress').textContent = `${state.filled}/${state.total} kutu · ${state.completed}/${state.entries.length} kelime`;
  const signature = `${state.code}:${state.revision}`;
  if (signature !== boardSignature) {
    boardSignature = signature; cellNodes.clear(); makeBoard($('board'), state); active = state.entries[0]?.id; focusPage = 0;
  }
  updateCells(); renderClue(); renderRack(); renderPlayers();
  $('clues').replaceChildren(...state.entries.map(entry => {
    const button = el('button', `${entry.id}. ${entry.direction === 'across' ? '→' : '↓'} ${entry.clue} (${entry.length})${entry.answer ? ' · ' + entry.answer : ''}`, `${entry.completedBy ? 'done ' : ''}${entry.id === active ? 'active' : ''}`);
    button.dataset.id = entry.id; button.onclick = () => selectClue(entry.id); return button;
  }));
  $('feed').replaceChildren(...state.feed.map(text => el('li', text)));
  $('rack-panel').hidden = state.phase !== 'play'; $('lobby-actions').hidden = state.phase === 'play';
  $('duration').value = state.duration; $('duration').disabled = state.host !== socket.id;
  $('ready').textContent = state.players.find(p => p.id === socket.id)?.ready ? '✓ Hazırım · Vazgeç' : state.phase === 'end' ? 'Yeniden hazırım' : 'Hazırım';
  if (state.phase === 'play' && $('upload-dialog').open) { $('upload-dialog').close(); notify('Maç başladı; yeni bulmacayı maçtan sonra yükleyebilirsin.'); }
  if (lastPhase !== 'end' && state.phase === 'end') { notify(`${state.reason} ${winners()}`); loadScores(); }
  lastPhase = state.phase; updateClock(); applyFocus(); fitPlayArea();
  if (old?.phase === 'play' && old.revision === packet.revision && old.code === packet.code) {
    const completed = packet.entries.filter(e => e.completedBy && !old.entries.find(prior => prior.id === e.id)?.completedBy);
    const bonus = (packet.players.find(p => p.id === socket.id)?.bonuses || 0) - (old.players.find(p => p.id === socket.id)?.bonuses || 0);
    if (completed.length || bonus > 0) celebrateWords(completed, Math.max(0, bonus) * 5);
    const previousCells = new Map(old.cells.map(c => [`${c.row},${c.col}`, c]));
    flyOpponentLetters(packet.cells.filter(c => c.letter && c.by !== socket.id && !previousCells.get(`${c.row},${c.col}`)?.letter));
  }
}
const flights = new Set();
function clearFlights() { for (const flight of [...flights]) flight.cleanup(); }
function flyOpponentLetters(cells) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  cells.forEach((cell, index) => {
    const target = cellNodes.get(`${cell.row},${cell.col}`);
    const source = [...$('score-strip').children].find(chip => chip.dataset.playerId === cell.by);
    if (!target || target.hidden || !source) return;
    const end = target.getBoundingClientRect(), start = source.getBoundingClientRect();
    if (!end.width || !end.height || !start.width) return;
    const tile = el('div', cell.letter, 'opponent-flight'); tile.setAttribute('aria-hidden', 'true');
    tile.style.width = `${end.width}px`; tile.style.height = `${end.height}px`;
    tile.style.fontSize = `${end.width * .58}px`;
    const x = Math.max(0, Math.min(innerWidth - end.width, start.left + start.width / 2 - end.width / 2));
    const y = start.top + start.height / 2 - end.height / 2;
    tile.style.left = `${x}px`; tile.style.top = `${y}px`;
    const dx = end.left - x, dy = end.top - y;
    target.classList.add('letter-arriving'); document.body.append(tile);
    const animation = tile.animate([
      {transform:'translate(0,0) scale(.65) rotate(-12deg)', opacity:.7},
      {transform:`translate(${dx * .55}px,${dy * .45 - 35}px) scale(1.08) rotate(5deg)`, opacity:1, offset:.55},
      {transform:`translate(${dx}px,${dy}px) scale(1) rotate(0deg)`, opacity:1}
    ], {duration:520, delay:Math.min(index, 9) * 65, easing:'cubic-bezier(.2,.65,.3,1)', fill:'both'});
    let timer;
    const flight = {cleanup() { clearTimeout(timer); flights.delete(flight); target.classList.remove('letter-arriving'); tile.remove(); animation.cancel(); }};
    flights.add(flight); animation.finished.then(flight.cleanup, flight.cleanup);
    timer = setTimeout(flight.cleanup, 1800);
  });
}
let celebrationTimer;
function celebrateWords(entries, bonus = 0) {
  const own = entries.filter(e => e.completedBy === socket.id);
  for (const entry of entries) {
    const cells = state.cells.filter(c => c.entries.includes(entry.id)).sort((a, b) => entry.direction === 'across' ? a.col - b.col : a.row - b.row);
    cells.forEach((cell, index) => {
      const node = cellNodes.get(`${cell.row},${cell.col}`);
      node.classList.remove('word-win'); node.style.setProperty('--wave-delay', `${index * 55}ms`);
      requestAnimationFrame(() => node.classList.add('word-win'));
      setTimeout(() => node.classList.remove('word-win'), 1100 + index * 55);
    });
  }
  if (!own.length && !bonus) return;
  const scroll = $('board').parentElement, stage = scroll.closest('.play-column');
  stage.querySelector('.word-celebration')?.remove(); clearTimeout(celebrationTimer);
  const celebration = el('div', undefined, 'word-celebration' + (bonus ? ' hand-celebration' : ''));
  celebration.setAttribute('role', 'status');
  const headline = el('strong', bonus ? 'BEŞTE BEŞ!' : own.length > 1 ? 'ÇİFTE KELİME!' : 'TAM İSABET!', 'win-headline');
  const words = own.map(entry => state.cells.filter(c => c.entries.includes(entry.id)).sort((a, b) => entry.direction === 'across' ? a.col - b.col : a.row - b.row).map(c => c.letter).join(''));
  const card = el('div', undefined, 'win-card');
  card.append(el('span', bonus ? '🔥' : '✦', 'win-star'), headline, el('span', words.length ? words.join(' + ') : 'Beş harfin de yerini buldu!', 'win-words'), el('strong', `+${own.reduce((sum, e) => sum + e.length, bonus)} PUAN`, 'win-points'));
  if (bonus) card.append(el('span', '+5 EL BONUSU', 'hand-bonus'));
  celebration.append(card);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) for (let index = 0; index < 16; index++) {
    const spark = el('i', undefined, 'win-spark'), angle = index * Math.PI / 8;
    spark.style.setProperty('--spark-x', `${Math.cos(angle) * (90 + index % 3 * 22)}px`);
    spark.style.setProperty('--spark-y', `${Math.sin(angle) * (80 + index % 4 * 17)}px`);
    spark.style.setProperty('--spark-rotate', `${index * 47}deg`);
    spark.style.setProperty('--spark-color', ['#5d9744', '#edc34a', '#a4ce74', '#ffffff'][index % 4]);
    celebration.append(spark);
  }
  // Keep the celebration above the board without covering the hand or controls.
  stage.style.position = 'relative';
  const box = scroll.getBoundingClientRect(), parent = stage.getBoundingClientRect();
  celebration.style.top = `${box.top - parent.top + box.height / 2}px`;
  stage.append(celebration);
  celebrationTimer = setTimeout(() => celebration.remove(), 1700);
}
function winners() {
  const max = Math.max(...state.players.map(p => p.score));
  return state.players.filter(p => p.score === max).map(p => p.name).join(' ve ') + ` · ${max} puan`;
}
function updateClock() {
  const seconds = state?.phase === 'play' ? Math.max(0, Math.ceil((state.until - Date.now() - offset) / 1000)) : 0;
  $('clock').textContent = state?.phase === 'play' ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : state?.phase === 'end' ? 'Tahta kapandı' : 'Hazırlık';
}
function applyFocus() {
  if (!state) return;
  const entry = state.entries.find(e => e.id === active), area = focusWindow(state, entry, focusPage);
  const signature = `${magnified}:${area.row}:${area.col}:${area.page}`;
  if (signature !== focusSignature) { clearFlights(); focusSignature = signature; }
  focusPage = area.page;
  $('magnify').textContent = magnified ? '↖ Tüm tahta' : '⌕ Büyüteç';
  $('magnify').setAttribute('aria-pressed', String(magnified));
  $('focus-navigation').hidden = !magnified;
  $('focus-prev').disabled = !area.page; $('focus-next').disabled = area.page >= area.pages - 1;
  $('focus-position').textContent = `${entry?.direction === 'down' ? '↓' : '→'} Kelime görünümü · ${area.page + 1}/${area.pages}`;
  $('board').classList.toggle('magnified', magnified);
  $('board').style.gridTemplateColumns = `repeat(${magnified ? area.cols : state.cols}, var(--cell))`;
  for (const node of $('board').children) {
    const row = Number(node.dataset.gridRow), col = Number(node.dataset.gridCol);
    node.hidden = magnified && (row < area.row || row >= area.row + area.rows || col < area.col || col >= area.col + area.cols);
    node.style.gridRow = magnified ? String(row - area.row + 1) : '';
    node.style.gridColumn = magnified ? String(col - area.col + 1) : '';
  }
}
$('magnify').onclick = () => { clearDrag(); magnified = !magnified; applyFocus(); fitPlayArea(); };
$('focus-prev').onclick = () => { clearDrag(); focusPage--; applyFocus(); fitPlayArea(); };
$('focus-next').onclick = () => { clearDrag(); focusPage++; applyFocus(); fitPlayArea(); };
function fitPlayArea() {
  if (!state) return;
  const column = document.querySelector('.play-column');
  const top = column.getBoundingClientRect().top + window.scrollY;
  column.style.setProperty('--play-height', `${Math.max(280, window.innerHeight - top - 14)}px`);
  const area = $('board').parentElement;
  const dimensions = magnified ? focusWindow(state, state.entries.find(e => e.id === active), focusPage) : state;
  const size = Math.max(1, Math.min(80, (area.clientWidth - dimensions.cols - 1) / dimensions.cols, (area.clientHeight - dimensions.rows - 1) / dimensions.rows));
  $('board').style.setProperty('--cell', `${Math.floor(size * 10) / 10}px`);
}
window.addEventListener('resize', () => { clearFlights(); clearDrag(); fitPlayArea(); });
function invalidatePreview() { preview = null; $('install').disabled = true; $('preview-scroll').hidden = true; $('preview-clues').replaceChildren(); $('validation').textContent = ''; $('copy-repair').hidden = true; }
function validate() {
  invalidatePreview();
  try {
    const next = validatePuzzle($('json').value);
    if (next.rows !== Number($('rows').value) || next.cols !== Number($('cols').value)) throw new Error(`İstenen boyut ${$('rows').value}×${$('cols').value}, gelen boyut ${next.rows}×${next.cols}. AI’dan doğru boyutta yanıt al veya boyut ayarını güncelle.`);
    preview = next; validationError = ''; $('validation').className = '';
    $('validation').textContent = `✓ Yerleşim geçerli · ${preview.entries.length} kelime · ${preview.cells.length} harf kutusu. Soruları ve cevapları aşağıda kontrol et.`;
    makeBoard($('preview'), preview, true); $('preview-scroll').hidden = false; $('install').disabled = false;
    $('preview-clues').replaceChildren(...preview.entries.map(entry => {
      const label = el('label', `${entry.id}. ${entry.answer} · ${entry.direction === 'across' ? '→' : '↓'}`), input = el('input');
      input.value = entry.clue; input.maxLength = 100; input.oninput = () => { entry.clue = input.value; makeBoard($('preview'), preview, true); }; label.append(input); return label;
    }));
  } catch (error) { validationError = error.message; $('validation').textContent = validationError; $('validation').className = 'error'; $('copy-repair').hidden = false; }
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); notify('Kopyalandı.'); }
  catch { notify('Otomatik kopyalanamadı. Metin alanını seçip kopyalayabilirsin.'); }
}
async function loadScores() {
  try {
    const response = await fetch('/api/games/cengel-kapismasi/scores', {cache: 'no-store'});
    if (!response.ok) throw new Error(); const data = await response.json();
    $('personal').textContent = `Toplam ${data.me.total} puan · En iyi ${data.me.best} · ${data.me.played} maç`;
    $('score-note').textContent = `${data.rank ? 'Senin sıran: ' + data.rank + ' · ' : ''}Toplamın: ${data.me.total} puan. Kayıtlar bu tarayıcıdaki oyuncu kimliğine bağlı.${data.durable ? '' : ' Bu sunucuda kalıcı kayıt kapalı.'}`;
    $('all-scores').replaceChildren(...data.rows.map(row => { const li = el('li', undefined, row.mine ? 'self' : ''); li.append(el('span', `${row.rank}. ${row.name}${row.mine ? ' · sen' : ''}`), el('strong', String(row.total))); return li; }));
    if (!data.rows.length) $('all-scores').append(el('li', 'İlk puanı sen yaz.'));
  } catch { $('score-note').textContent = 'Puanlar yüklenemedi. Biraz sonra yeniden aç.'; }
}
$('name').value = readName(); $('code').value = new URLSearchParams(location.search).get('room') || '';
$('join-form').onsubmit = async event => {
  event.preventDefault(); $('join-button').disabled = true;
  try { const name = saveName($('name').value); await command('join', {name, code: $('code').value.trim() || undefined}); }
  catch (error) { notify(error.message || 'Oda açılamadı.'); }
  finally { $('join-button').disabled = false; }
};
$('leave').onclick = () => { clearFlights(); clearDrag(); socket.emit('leave'); state = null; lastPhase = null; selected = null; boardSignature = ''; $('room').hidden = true; $('home').hidden = false; document.body.classList.remove('in-room'); loadScores(); };
$('invite').onclick = () => copy(`${location.origin}/games/cengel-kapismasi/?room=${state.code}`);
$('ready').onclick = async () => { try { await command('ready', !state.players.find(p => p.id === socket.id)?.ready); } catch (error) { notify(error.message); } };
$('duration').onchange = async () => { try { await command('configure', {duration: Number($('duration').value)}); } catch (error) { notify(error.message); $('duration').value = state.duration; } };
$('confirm').onclick = confirmDraft;
$('extras-toggle').onclick = () => { const open = document.body.classList.toggle('show-extras'); $('extras-toggle').setAttribute('aria-expanded', String(open)); $('extras-toggle').textContent = open ? 'Oyuncuları ve ipuçlarını gizle ↑' : 'Oyuncular ve tüm ipuçları ↓'; };
$('undo-draft').onclick = () => { draft.clear(); selected = null; confirmRequest = null; updateCells(); renderRack(); };

$('upload-open').onclick = () => {
  const size = suggestSize(state.players.length); $('rows').value = size; $('cols').value = size;
  $('size-note').textContent = `${state.players.length} kişi için öneri: ${size}×${size}. Boyutları 7–21 arasında değiştirebilirsin.`;
  promptChanged(); invalidatePreview(); $('upload-dialog').showModal();
};
for (const id of ['category', 'rows', 'cols']) $(id).oninput = () => { promptChanged(); invalidatePreview(); };
$('copy-prompt').onclick = () => copy($('prompt').value);
$('use-example').onclick = () => { $('rows').value = example.rows; $('cols').value = example.cols; $('category').value = example.category; promptChanged(); $('json').value = JSON.stringify(example, null, 2); validate(); };
$('json').oninput = invalidatePreview; $('validate').onclick = validate;
$('copy-repair').onclick = () => copy(`${$('prompt').value}\n\nÖNCEKİ JSON:\n${$('json').value.slice(0, 24000)}\n\nUygulamanın kontrolü şu hatayı buldu: ${validationError}\nBu hatayı düzelt, bütün kuralları yeniden kontrol et ve yalnızca düzeltilmiş JSON ver.`);
$('install').onclick = async () => {
  if (!preview || busy) return;
  const code = state?.code; busy = true; $('install').disabled = true; $('json').readOnly = true;
  try {
    const clean = serializePuzzle(validatePuzzle(serializePuzzle(preview))), text = JSON.stringify(clean), chunkSize = 800, total = Math.ceil(text.length / chunkSize), token = createRequestId();
    if (total > 30) throw new Error('Bulmaca çok büyük. Daha az soru kullan.');
    for (let index = 0; index < total; index++) {
      if (state?.code !== code || state.phase === 'play') throw new Error('Oda değişti veya maç başladı. Yeniden yükle.');
      await command('upload', {token, total, index, chunk: text.slice(index * chunkSize, (index + 1) * chunkSize)});
      if (index < total - 1) await new Promise(resolve => setTimeout(resolve, 35));
    }
    $('upload-dialog').close(); notify('Yeni tahta hazır. Herkes hazır olduğunda başlar.');
  } catch (error) { notify(error.message || 'Yükleme tamamlanamadı.'); }
  finally { busy = false; $('json').readOnly = false; $('install').disabled = !preview; }
};
$('rules-open').onclick = () => $('rules-dialog').showModal();
$('scores-open').onclick = () => { loadScores(); $('scores-dialog').showModal(); };
socket.on('state', render);
socket.on('disconnect', () => { clearFlights(); clearDrag(); state = null; selected = null; boardSignature = ''; lastPhase = null; $('room').hidden = true; $('home').hidden = false; document.body.classList.remove('in-room'); notify('Bağlantı kesildi. Bağlanınca oda kodunla tekrar gir.'); });
socket.on('room-error', data => { clearFlights(); clearDrag(); state = null; $('room').hidden = true; $('home').hidden = false; document.body.classList.remove('in-room'); notify(data.error); });
socket.on('connect_error', () => notify('Oyun sunucusuna bağlanılamadı. Yeniden deneniyor.'));
document.addEventListener('keydown', event => {
  if (event.target.closest('input,textarea,select,dialog') || !state || state.phase !== 'play') return;
  if (/^[1-5]$/.test(event.key)) { selected = Number(event.key) - 1; if (!state.me.rack[selected]) selected = null; renderRack(); }
  if (event.key === 'Escape') { selected = null; renderRack(); }
});
const clockTimer = setInterval(() => { if (!document.hidden) updateClock(); }, 500);
window.addEventListener('pagehide', () => { clearInterval(clockTimer); socket.disconnect(); });
promptChanged();
makeBoard($('poster-board'), validatePuzzle(example), true);
try { const response = await fetch('/api/player', {cache: 'no-store'}); if (!response.ok) notify('Oyuncu kaydı açılamadı; puanların kaydedilmeyebilir.'); }
catch { notify('Oyuncu kaydı açılamadı; bağlantını kontrol et.'); }
await loadScores(); socket.connect();
