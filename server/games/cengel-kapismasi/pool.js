import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {randomInt} from 'node:crypto';
import {validatePuzzle} from '../../../public/games/cengel-kapismasi/puzzle.js';

// Build-time generation keeps the 180k-clue bank and the solver out of live games.
const source = JSON.parse(gunzipSync(readFileSync(new URL('./pools/boards.json.gz', import.meta.url))));
const puzzles = source.boards.map((board, index) => ({key:`${board.rows}:${index}`, puzzle:validatePuzzle(board)}));
const groups = new Map([9,11].map(size => [size,puzzles.filter(item=>item.puzzle.rows===size)]));
const bags = new Map();
export const poolInfo = Object.freeze({count:puzzles.length, sizes:Object.freeze(Object.fromEntries([...groups].map(([size,items])=>[size,items.length])))});

export function takePuzzle(size=9, recent=[]) {
  const candidates=groups.get(size);
  if(!candidates?.length)throw new Error('Bu boyutta hazırlanmış tahta yok.');
  let bag=bags.get(size);
  if(!bag?.length) {
    bag=[...candidates];
    for(let i=bag.length-1;i>0;i--){const j=randomInt(i+1);[bag[i],bag[j]]=[bag[j],bag[i]];}
    bags.set(size,bag);
  }
  let index=bag.findIndex(item=>!recent.includes(item.key));
  if(index<0) {
    // A room's recent history can straddle the end of the shared shuffled bag.
    const available=candidates.filter(item=>!recent.includes(item.key));
    const item=(available.length?available:candidates)[randomInt(available.length||candidates.length)];
    return {key:item.key,puzzle:structuredClone(item.puzzle)};
  }
  const [item]=bag.splice(index,1);
  return {key:item.key,puzzle:structuredClone(item.puzzle)};
}
