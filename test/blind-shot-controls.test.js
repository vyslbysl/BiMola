import test from 'node:test';
import assert from 'node:assert/strict';
import {walkDraft} from '../public/games/blind-shot/controls.js';
import {ARENA, insideArena, rayLength} from '../public/games/blind-shot/arena.js';

test('walking follows mouse aim and strafes perpendicular to it', () => {
  const draft={x:0,y:0,angle:Math.PI/2};
  const forward=walkDraft(draft,ARENA,1,0,.05);
  assert.ok(Math.abs(forward.x)<1e-8);assert.equal(forward.y,6.5);
  const right=walkDraft(draft,ARENA,0,1,.05);
  assert.equal(right.x,-6.5);assert.ok(Math.abs(right.y)<1e-8);
  assert.deepEqual(draft,{x:0,y:0,angle:Math.PI/2},'input remains unchanged');
});
test('diagonals have equal speed and stalled frames do not cause movement jumps', () => {
  const draft={x:0,y:0,angle:0};
  const diagonal=walkDraft(draft,ARENA,1,1,.05);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-6.5)<1e-8);
  assert.equal(walkDraft(draft,ARENA,1,0,2).x,6.5);
  assert.equal(walkDraft(draft,ARENA,1,0,-1).x,0);
});
test('continuous movement crosses the floor freely and stops at rectangular boundaries', () => {
  for(const angle of [0,.7,Math.PI,4.5]){
    let draft={x:0,y:0,angle};
    for(let i=0;i<900;i++){
      draft=walkDraft(draft,ARENA,1,1,.016);
      assert.ok(insideArena(draft.x,draft.y,ARENA));
    }
    assert.ok(Math.hypot(draft.x,draft.y)>500);
  }
});
test('missed shots stop at the first arena wall in each direction', () => {
  assert.equal(rayLength(0,0,0),700);
  assert.equal(rayLength(0,0,Math.PI/2),550);
  assert.equal(rayLength(0,0,Math.PI),700);
  assert.equal(rayLength(0,0,-Math.PI/2),550);
  for(const angle of [.7,2.1,3.8,5.7]){
    const length=rayLength(350,-200,angle);
    const x=350+Math.cos(angle)*length,y=-200+Math.sin(angle)*length;
    assert.ok(Math.abs(x)<=700+1e-8&&Math.abs(y)<=550+1e-8);
    assert.ok(Math.abs(Math.abs(x)-700)<1e-8||Math.abs(Math.abs(y)-550)<1e-8);
  }
});
