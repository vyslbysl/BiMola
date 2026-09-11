import test from 'node:test';
import assert from 'node:assert/strict';
import {clampHiderCamera} from '../public/camera.js';
import {MAPS} from '../public/maps.js';
const loft={width:28,depth:36,height:4.8};
test('hider camera follows players beyond the old loft limits in every corner',()=>{
 for(const {room}of [MAPS.harbor,MAPS.techOffice])for(const sx of [-1,1])for(const sz of [-1,1]){
  const x=sx*(room.width/2-2),z=sz*(room.depth/2-2);
  const desired={x:x+3,y:2,z:z+3};
  assert.deepEqual(clampHiderCamera({...desired},room),desired);
 }
});
test('camera keeps the original loft framing and vertical limits',()=>{
 assert.deepEqual(clampHiderCamera({x:30,y:9,z:-30},loft),{x:24,y:4.05,z:-26});
 assert.deepEqual(clampHiderCamera({x:3,y:2,z:6},loft),{x:3,y:2,z:6});
});
