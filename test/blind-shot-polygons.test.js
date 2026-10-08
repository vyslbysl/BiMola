import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,mapArena} from '../public/games/blind-shot/maps.js';
import {insideArena,insideBoundary,clampArena,moveArena,rayLength,boundaryPlanes,safePosition} from '../public/games/blind-shot/arena.js';
import {createRoom,start,tick,view} from '../server/games/blind-shot/game.js';
import {adapter} from '../server/games/blind-shot/adapter.js';

test('polygon corners reject points inside a bounding rectangle but outside the actual arena',()=>{
  for(const id of ['hexagon','octagon']){
    const arena=mapArena(id);assert.equal(arena.vertices.length,id==='hexagon'?6:8);
    assert.equal(insideBoundary(650,500,arena),false);
    const point=clampArena(650,500,arena);assert.ok(insideBoundary(point.x,point.y,arena));
    for(let i=0;i<64;i++){
      const angle=i*Math.PI/32,point=clampArena(Math.cos(angle)*1200,Math.sin(angle)*1200,arena);
      assert.ok(insideBoundary(point.x,point.y,arena));
      const length=rayLength(0,0,angle,arena),x=Math.cos(angle)*length,y=Math.sin(angle)*length;
      assert.ok(insideBoundary(x,y,arena,0));
      assert.ok(boundaryPlanes(arena).some(p=>Math.abs(p.nx*x+p.ny*y-p.limit)<1e-6));
    }
  }
});
test('walking cannot escape sloped polygon faces, even during diagonal movement',()=>{
  for(const id of ['hexagon','octagon'])for(const scale of [1,.6,.32]){
    const arena=mapArena(id,scale);
    for(let i=0;i<16;i++){
      let point=safePosition(0,0,arena);const angle=i*Math.PI/8;
      for(let step=0;step<80;step++){
        point=moveArena(point,point.x+Math.cos(angle)*25,point.y+Math.sin(angle)*25,arena);
        assert.ok(insideArena(point.x,point.y,arena),`${id} ${scale} ${angle}`);
      }
    }
  }
});
test('every continuing shot shrinks every map, relocates safely, hides positions and resets next match',()=>{
  for(const map of MAPS){
    const r=createRoom('1234','a');r.mapId=map.id;r.roundCount=1;
    adapter.addPlayer(r,{id:'a',name:'Ada'});adapter.addPlayer(r,{id:'b',name:'Bora'});start(r,0);
    for(let step=1;step<=12;step++){
      r.players.a.angle=0;r.players.b.angle=Math.PI;
      const scale=r.arena.scale;tick(r,r.until);assert.equal(r.phase,'reveal');assert.equal(r.arena.scale,scale,'replay preserves original shot geometry');
      tick(r,r.until);
      if(step<12){
        assert.equal(r.phase,'plan');assert.ok(Math.abs(r.arena.scale-Math.pow(.9,step))<1e-8);
        assert.ok(Object.values(r.players).every(p=>insideArena(p.x,p.y,r.arena)));
        assert.ok(r.arena.obstacles.every(o=>[-1,1].every(x=>[-1,1].every(y=>insideBoundary(o.x+x*o.width/2,o.y+y*o.depth/2,r.arena,0)))));
        const packet=view(r,'a',r.until-1);assert.equal(packet.players.find(p=>p.id==='b').x,undefined);assert.deepEqual(packet.shots,[]);
      }
    }
    assert.equal(r.phase,'end');start(r,1000000);assert.equal(r.arena.scale,1);assert.equal(r.arena.obstacles.length,mapArena(map.id).obstacles.length);
  }
});
