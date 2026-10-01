import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {validatePuzzle, normalize} from '../public/games/cengel-kapismasi/puzzle.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const count=Number(process.env.CENGEL_POOL_COUNT||512);
if(!Number.isInteger(count)||count<128||count>4096)throw new Error('Tahta sayısı 128–4096 arasında tam sayı olmalı.');
const base = JSON.parse(readFileSync(join(root, 'scripts/templates/cengel-9x9.json'), 'utf8'));
function template(size) {
  const questions = new Set(base.entries.map(e => `${e.row},${e.col}`));
  const type = (r,c) => !r && !c ? 'blank' : questions.has(`${Math.min(r,8)},${Math.min(c,8)}`) ? 'question' : 'letter';
  const entries = [];
  for (let row=0;row<size;row++) for (let col=0;col<size;col++) if (type(row,col)==='letter') for (const direction of ['across','down']) {
    const dr=direction==='down'?1:0, dc=1-dr;
    if (row-dr>=0 && col-dc>=0 && type(row-dr,col-dc)==='letter') continue;
    let length=0;
    while(row+dr*length<size && col+dc*length<size && type(row+dr*length,col+dc*length)==='letter') length++;
    if(length>1) {
      if(row-dr<0 || col-dc<0 || type(row-dr,col-dc)!=='question') throw new Error('Unclued template run');
      entries.push({clue:'Yeni ipucu',answer:'A'.repeat(length),row:row-dr,col:col-dc,direction});
    }
  }
  const used=new Set(entries.map(e=>`${e.row},${e.col}`));
  for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(type(r,c)==='question' && !used.has(`${r},${c}`))throw new Error('Unused question cell');
  return {...base,rows:size,cols:size,entries};
}
const transpose = board => ({...board, rows:board.cols, cols:board.rows, entries:board.entries.map(e=>({...e,row:e.col,col:e.row,direction:e.direction==='across'?'down':'across'}))});
const source = JSON.parse(readFileSync(join(root,'data/cengel/tac/tac-all.json'),'utf8'));
const bank = JSON.parse(readFileSync(join(root,'data/cengel/tac/clue-bank.json'),'utf8'));
const preferred = new Map();
for(const item of source) if(item.Source==='ht') {
  const answer=normalize(item.answer), clue=item.clue.trim();
  if(clue.length>=3 && clue.length<=70 && !/[<>\n\r\u0000-\u001f\u007f-\u009f]/u.test(clue)) {
    if(!preferred.has(answer))preferred.set(answer,new Set());
    preferred.get(answer).add(clue);
  }
}
const entries=[], seen=new Set();
for(const item of bank.entries) {
  if(item.answer.length<=5 && !preferred.has(item.answer))continue;
  const options=preferred.get(item.answer)||[item.clue];
  for(let clue of options) {
    clue=clue.replace(/\s+Nedir\??$/iu,'').trim();
    if(clue.length<3 || clue.length>70 || /[<>\n\r\u0000-\u001f\u007f-\u009f]/u.test(clue))continue;
    const key=JSON.stringify([item.answer,clue]);
    if(!seen.has(key)){seen.add(key);entries.push({answer:item.answer,clue});}
  }
}
const temporary=mkdtempSync(join(tmpdir(),'bimola-cengel-'));
try {
  const templates=[base,transpose(base),template(11),transpose(template(11))];
  writeFileSync(join(temporary,'bank.json'),JSON.stringify({entries}));
  writeFileSync(join(temporary,'templates.json'),JSON.stringify(templates));
  execFileSync(process.env.PYTHON||'python3',[join(root,'scripts/generate-cengel-pool.py'),'--bank',join(temporary,'bank.json'),'--templates',join(temporary,'templates.json'),'--output',join(temporary,'pool.json'),'--count',String(count),'--seed','20261001'],{maxBuffer:1024*1024});
  const pool=JSON.parse(readFileSync(join(temporary,'pool.json'),'utf8'));
  const signatures=new Set();
  for(const board of pool.boards) {
    validatePuzzle(board);
    const key=JSON.stringify(board.entries.map(({answer,row,col,direction})=>({answer,row,col,direction})));
    if(signatures.has(key))throw new Error('Duplicate generated board');
    signatures.add(key);
  }
  const sizes={};for(const board of pool.boards)sizes[board.rows]=(sizes[board.rows]||0)+1;
  if(!(sizes[9]>32) || !(sizes[11]>32))throw new Error('Each size needs more than 32 boards for repeat protection');
  pool.sourceUrl='https://huggingface.co/datasets/Kamyar-zeinalipour/TAC';
  const output=join(root,'server/games/cengel-kapismasi/pools');mkdirSync(output,{recursive:true});
  writeFileSync(join(output,'boards.json.gz'),gzipSync(JSON.stringify(pool)));
  writeFileSync(join(output,'manifest.json'),JSON.stringify({version:1,boards:pool.boards.length,sizes,source:pool.sourceUrl,preparedCluePairs:entries.length},null,2)+'\n');
  console.log(JSON.stringify({boards:pool.boards.length,sizes,preparedCluePairs:entries.length}));
} finally {rmSync(temporary,{recursive:true,force:true});}
