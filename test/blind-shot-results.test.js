import test from 'node:test';
import assert from 'node:assert/strict';
import {describeShots} from '../public/games/blind-shot/results.js';

test('simultaneous results identify both attackers, victims and misses without coordinates', () => {
  const players=[{id:'a',name:'Ada'},{id:'b',name:'Bora'},{id:'c',name:'Cem'}];
  const shots=[{id:'a',target:'b',x:100,endX:200},{id:'b',target:'a'},{id:'c',target:null}];
  assert.deepEqual(describeShots(players,shots,'a'),[
    {shooter:'Ada',victim:'Bora',ownShot:true,blocked:false,hitMe:false},
    {shooter:'Bora',victim:'Ada',ownShot:false,blocked:false,hitMe:true},
    {shooter:'Cem',victim:null,ownShot:false,blocked:false,hitMe:false},
  ]);
});
test('each hit is listed even when multiple players hit one victim, and departures keep the result readable', () => {
  const players=[{id:'a',name:'Ada'},{id:'b',name:'Bora'}];
  const results=describeShots(players,[{id:'a',target:'b'},{id:'gone',target:'b'}],'b');
  assert.equal(results.filter(r=>r.hitMe).length,2);
  assert.equal(results[1].shooter,'Ayrılan oyuncu');
  assert.equal(describeShots(players,[{id:'a',target:'gone'}],'a')[0].victim,'Ayrılan oyuncu');
});
