import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequestId} from '../public/games/cengel-kapismasi/request-id.js';
import {focusWindow, panWindow} from '../public/games/cengel-kapismasi/focus.js';
import {validatePuzzle} from '../public/games/cengel-kapismasi/puzzle.js';
import {starter} from '../public/games/cengel-kapismasi/starter.js';

test('HTTP pages without randomUUID still create server-compatible unique confirmation keys', () => {
  const ids=Array.from({length:1000},()=>createRequestId({}));
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(ids.every(id=>/^[a-zA-Z0-9-]{1,40}$/.test(id)));
  assert.match(createRequestId(null),/^[a-zA-Z0-9-]{1,40}$/);
  assert.match(createRequestId({randomUUID(){throw new Error('Unavailable')}}),/^[a-zA-Z0-9-]{1,40}$/);
  assert.equal(createRequestId({randomUUID:()=> '12345678-1234-1234-1234-123456789abc'}),'12345678-1234-1234-1234-123456789abc');
});
test('magnifier pages cover every starter word and stay within the board', () => {
  const puzzle=validatePuzzle(starter);
  for(const word of puzzle.entries) {
    const entry={...word,length:word.answer.length}, seen=new Set();
    const first=focusWindow(puzzle,entry);
    for(let page=0;page<first.pages;page++) {
      const area=focusWindow(puzzle,entry,page);
      assert.equal(area.page,page); assert.ok(area.row>=0 && area.col>=0);
      assert.ok(area.row+area.rows<=puzzle.rows && area.col+area.cols<=puzzle.cols);
      assert.ok(area.rows<=5 && area.cols<=5);
      for(const cell of puzzle.cells) if(cell.row>=area.row && cell.row<area.row+area.rows && cell.col>=area.col && cell.col<area.col+area.cols) seen.add(`${cell.row},${cell.col}`);
    }
    assert.ok(word.keys.every(key=>seen.has(key)),`Missing letters in ${word.answer}`);
    assert.equal(focusWindow(puzzle,entry,-1).page,0);
    assert.equal(focusWindow(puzzle,entry,999).page,first.pages-1);
  }
});
test('magnifier reaches the far end of long horizontal and vertical words without panning', () => {
  for(const direction of ['across','down']) {
    const board={rows:21,cols:21}, entry={length:20,startRow:direction==='down'?1:20,startCol:direction==='across'?1:20,direction};
    const visible=new Set(),pages=focusWindow(board,entry).pages;
    for(let page=0;page<pages;page++) {
      const a=focusWindow(board,entry,page);
      for(let step=0;step<entry.length;step++) {
        const row=entry.startRow+(direction==='down'?step:0),col=entry.startCol+(direction==='across'?step:0);
        if(row>=a.row && row<a.row+a.rows && col>=a.col && col<a.col+a.cols) visible.add(step);
      }
    }
    assert.equal(visible.size,20);
  }
});

test('drag panning reaches all corners and clamps to a scroll-free board', () => {
  const puzzle={rows:21,cols:13},start=focusWindow(puzzle,{length:8,startRow:1,startCol:1,direction:'down'});
  const bottomRight=panWindow(puzzle,start,100,100);
  assert.equal(bottomRight.row,16); assert.equal(bottomRight.col,8);
  const topLeft=panWindow(puzzle,bottomRight,-100,-100);
  assert.equal(topLeft.row,0); assert.equal(topLeft.col,0);
  assert.equal(topLeft.rows,5); assert.equal(topLeft.cols,5);
  assert.deepEqual(panWindow(puzzle,start,0,0),start);
});
