import test from 'node:test';
import assert from 'node:assert/strict';
import {player,start,tick,view,sanitizeSettings,defaultSettings} from '../game.js';
import {DRIP_STEP,DRIP_MS,BURST_MS,effectLife,effectFade,privateTrace} from '../public/effects.js';

function room(opts={}){
 const r={code:'T',host:'a',phase:'lobby',
  settings:sanitizeSettings({teamSize:2,botMode:'off',swapTeams:false,mapRotate:false,idleReveal:0,...opts}),
  players:{a:player('a','Avcı',false,'hunter'),b:player('b','Saklanan',false,'hider'),c:player('c','Saklanan 2',false,'hider')}};
 assert.equal(start(r,1000).ok,true);
 r.phase='play';r.until=9e9;
 for(const p of Object.values(r.players)){p.x=0;p.y=0;p.z=-6;p.locked=false;}
 return r;
}
// Açık alanda düz yürütür ve biriken damlaları döndürür.
function walk(r,p,steps,input={x:0,z:1}){
 let t=20000;
 for(let i=0;i<steps;i++){p.input=input;p.inputAt=t;tick(r,t,.025);t+=25;}
 return {drips:(r.effects||[]).filter(e=>e.kind==='drip'),at:t};
}

test('ıslanan saklanan yol aldıkça damlar, kuru olan hiç damlatmaz',()=>{
 const wet=room(),dry=room();
 wet.players.b.water=34;
 const a=walk(wet,wet.players.b,80);
 const travelled=Math.hypot(wet.players.b.x,wet.players.b.z+6);
 assert.ok(travelled>6,`yol alınmadı: ${travelled.toFixed(2)} m`);
 // İlk damla ancak bir adım atınca düşer, o yüzden mesafe/adım kadarından bir eksik olabilir.
 const expected=Math.floor(travelled/DRIP_STEP);
 assert.ok(a.drips.length>=expected-1&&a.drips.length<=expected,`${travelled.toFixed(2)} m için ${a.drips.length} damla`);
 assert.ok(a.drips.every(e=>e.owner==='b'&&e.kind==='drip'));
 // Kuru saklanan aynı yolu yürür, tek damla bırakmaz.
 assert.equal(dry.players.b.water,0);
 assert.equal(walk(dry,dry.players.b,80).drips.length,0);
});

test('olduğu yerde duran ıslak saklanan hiç damlatmaz: ilk damla bile bir adım ister',()=>{
 const r=room();r.players.b.water=100;
 // Hiç girdi yok: oyuncu kıpırdamıyor.
 assert.equal(walk(r,r.players.b,120,{}).drips.length,0);
 // Sonra yürümeye başlayınca iz başlar.
 assert.ok(walk(r,r.players.b,80).drips.length>0);
});

test('damla izini yalnızca avcılar ve damlayanın kendisi görür',()=>{
 const r=room();r.players.b.water=34;
 walk(r,r.players.b,80);
 const seen=id=>view(r,id,25000).effects.filter(e=>e.kind==='drip').length;
 assert.ok(seen('a')>0,'avcı izi görür');
 assert.ok(seen('b')>0,'damlayan kendi izini görür');
 assert.equal(seen('c'),0,'diğer saklanan takım arkadaşının izini görmez');
 assert.equal(privateTrace('drip'),true);
 assert.equal(privateTrace('reveal'),false);
});

test('avcı ıslansa da damlatmaz, hazırlık sırasında iz hiç çıkmaz',()=>{
 const hunter=room();hunter.players.a.water=50;
 assert.equal(walk(hunter,hunter.players.a,80).drips.length,0);
 const prep=room();prep.phase='prep';prep.players.b.water=50;
 assert.equal(walk(prep,prep.players.b,80).drips.length,0);
});

test('damla 5 saniye durur, patlama efektleri eskisi gibi 1.8 saniyede düşer',()=>{
 assert.equal(effectLife('drip'),DRIP_MS);
 assert.equal(DRIP_MS,5000);
 for(const kind of ['reveal','decoy','smash','idle'])assert.equal(effectLife(kind),BURST_MS);
 assert.equal(effectFade('reveal'),1500,'patlamanın istemcideki sönme süresi değişmedi');
 assert.equal(effectFade('drip'),DRIP_MS);
 const r=room();r.players.b.water=34;
 const {at}=walk(r,r.players.b,80);
 const born=Math.max(...r.effects.filter(e=>e.kind==='drip').map(e=>e.at));
 // Bir patlama efekti de ekle: ikisi farklı sürelerde düşmeli.
 r.effects.push({id:'burst',kind:'reveal',x:0,y:0,z:-6,at:born});
 const idle=t=>{for(const p of Object.values(r.players))p.input={};tick(r,t,.025);};
 idle(born+BURST_MS+50);
 assert.equal(r.effects.some(e=>e.kind==='reveal'),false,'patlama 1.8 sn sonra düştü');
 assert.ok(r.effects.some(e=>e.kind==='drip'),'damla hâlâ duruyor');
 idle(born+DRIP_MS+50);
 assert.equal(r.effects.some(e=>e.kind==='drip'),false,'damla 5 sn sonra düştü');
});

test('oda ayarı: varsayılan açık, kapatılınca hiç damla çıkmaz',()=>{
 assert.equal(defaultSettings.waterTrail,true);
 assert.equal(sanitizeSettings({}).waterTrail,true);
 assert.equal(sanitizeSettings({waterTrail:false}).waterTrail,false);
 // Kurucunun gönderdiği her şey boolean'a indirilir.
 for(const [input,want] of [[0,false],['',false],[null,false],[1,true],['0',true],[{},true]])
  assert.equal(sanitizeSettings({waterTrail:input}).waterTrail,want,JSON.stringify(input));
 // Ayar kapalıyken ıslak saklanan aynı yolu yürür, iz bırakmaz.
 const off=room({waterTrail:false});off.players.b.water=100;
 const a=walk(off,off.players.b,80);
 assert.equal(a.drips.length,0);
 assert.equal((off.effects||[]).length,0);
 // Kapalıyken oyuncunun kendisi de değişmez: iz görsel bir sonuç, kural değil.
 assert.equal(off.players.b.water,100);
});

test('yeni tur izi ve sayacı sıfırlar',()=>{
 const r=room();r.players.b.water=34;
 walk(r,r.players.b,80);
 assert.ok(r.effects.length>0);
 assert.ok(r.players.b.dripSpot);
 r.phase='end';assert.equal(start(r,60000).ok,true);
 assert.equal(r.effects.length,0);
 assert.equal(r.players.b.dripSpot,null);
 assert.equal(r.players.b.water,0);
});
