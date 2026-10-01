import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {validatePuzzle} from '../public/games/cengel-kapismasi/puzzle.js';
import {takePuzzle,poolInfo} from '../server/games/cengel-kapismasi/pool.js';
import {createRoom,addPlayer,randomize,configure,ready,tick,view} from '../server/games/cengel-kapismasi/game.js';
import {adapter} from '../server/games/cengel-kapismasi/adapter.js';

test('all bundled random boards are unique, fully covered and geometrically valid',()=>{
  const pool=JSON.parse(gunzipSync(readFileSync(new URL('../server/games/cengel-kapismasi/pools/boards.json.gz',import.meta.url))));
  const manifest=JSON.parse(readFileSync(new URL('../server/games/cengel-kapismasi/pools/manifest.json',import.meta.url)));
  assert.equal(pool.boards.length,manifest.boards);
  const keys=new Set();
  for(const board of pool.boards){
    const puzzle=validatePuzzle(board);
    assert.equal(puzzle.cells.length+puzzle.clueCells.length+puzzle.blankCells.length,puzzle.rows*puzzle.cols);
    keys.add(JSON.stringify(board.entries.map(({answer,row,col,direction})=>({answer,row,col,direction}))));
  }
  assert.equal(keys.size,pool.boards.length);
  assert.ok(poolInfo.sizes[9]>32 && poolInfo.sizes[11]>32);
  assert.deepEqual(JSON.parse(JSON.stringify(pool)),pool);
});
test('random selection skips recent boards even across shuffled bag boundaries and isolates rooms',()=>{
  for(const size of [9,11]){
    const history=[];
    for(let i=0;i<poolInfo.sizes[size]+40;i++){
      const chosen=takePuzzle(size,history);
      assert.ok(!history.includes(chosen.key));
      assert.equal(chosen.puzzle.rows,size);
      history.push(chosen.key);if(history.length>32)history.shift();
      chosen.puzzle.entries[0].clue='Changed in this room';
    }
    assert.notEqual(takePuzzle(size).puzzle.entries[0].clue,'Changed in this room');
  }
});
test('reroll is host-only, resets readiness, rejects active games and rematches get fresh boards',()=>{
  const room=createRoom({code:'1234',host:'a'});addPlayer(room,{id:'a',name:'Ada'});addPlayer(room,{id:'b',name:'Bora'});
  const before=room.recentBoards.at(-1),revision=room.revision;
  ready(room,'b',true,1000);
  assert.ok(randomize(room,'b').error);assert.equal(room.revision,revision);
  assert.equal(randomize(room,'a').ok,true);assert.notEqual(room.recentBoards.at(-1),before);
  assert.equal(room.players.b.ready,false);
  ready(room,'a',true,1000);ready(room,'b',true,1000);
  const playing=room.recentBoards.at(-1),state=view(room,'a',1001);
  assert.ok(state.entries.every(e=>e.answer===undefined));assert.ok(state.cells.every(c=>c.solution===undefined && c.letter===undefined));
  assert.ok(randomize(room,'a').error);
  tick(room,room.until);ready(room,'a',true,room.until+1);ready(room,'b',true,room.until+1);
  assert.equal(room.phase,'play');assert.notEqual(room.recentBoards.at(-1),playing);
  assert.equal(room.players.a.score,0);assert.equal(Object.keys(room.filled).length,0);
});
test('automatic and manual sizes select prepared boards without live generation or uploads',()=>{
  const room=createRoom({code:'1234',host:'a'});
  for(const id of ['a','b','c','d','e'])addPlayer(room,{id,name:id});
  assert.equal(room.puzzle.rows,11);assert.equal(room.autoSize,true);
  assert.equal(configure(room,'a',{size:9}).ok,true);assert.equal(room.puzzle.rows,9);assert.equal(room.autoSize,false);
  const revision=room.revision;
  assert.ok(configure(room,'a',{size:21}).error);assert.equal(room.revision,revision);
  assert.ok(configure(room,'b',{size:11}).error);
  configure(room,'a',{size:'auto'});assert.equal(room.puzzle.rows,11);
  assert.equal(adapter.commands.upload,undefined);
  assert.ok(adapter.commands.randomize);
});
