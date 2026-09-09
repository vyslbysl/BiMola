import test from 'node:test';
import assert from 'node:assert/strict';
import {SKINS,DEFAULT_SKIN,validSkin,skinFor,buildSkin} from '../public/skins.js';
import {player,start,view,syncBots,sanitizeSettings} from '../game.js';

// Kıyafet geometrisini üretim kurucusuyla, tarayıcı veya WebGL olmadan sınar: map-models.test.js
// bunu three.js saplamasıyla yapıyor, burada çizilen her parçayı kaydeden düz bir bağlam yeter.
// Ölçüler avatar() ile aynı eksende: y yerden yukarı metre, z ileri doğru negatif.
function context(){
 const parts=[],palette={},m=new Proxy(palette,{get:(store,key)=>store[key]||(store[key]={name:String(key)})});
 const g={id:'avatar'};
 const add=(kind,w,h,d,x,y,z,material,parent)=>{
  assert.ok(material&&material.name,`${kind}: her parça bir malzeme alır`);
  assert.equal(parent,g,`${kind}: parça avatar grubuna eklenmeli, varsayılan sahneye değil`);
  assert.ok([w,h,d,x,y,z].every(Number.isFinite),`${kind}: bütün ölçüler sonlu olmalı`);
  const part={kind,w,h,d,x,y,z,material:material.name,rotation:{x:0,y:0,z:0}};parts.push(part);return part;
 };
 return {m,g,parts,
  box:(w,h,d,x,y,z,mat,parent)=>add('box',w,h,d,x,y,z,mat,parent),
  round:(w,h,d,r,x,y,z,mat,parent)=>add('round',w,h,d,x,y,z,mat,parent),
  cyl:(rt,rb,h,x,y,z,mat,parent)=>add('cyl',Math.max(rt,rb)*2,h,Math.max(rt,rb)*2,x,y,z,mat,parent),
  sphere:(r,x,y,z,mat,parent,sx=1,sy=1,sz=1)=>add('sphere',r*2*sx,r*2*sy,r*2*sz,x,y,z,mat,parent),
  torus:(r,t,x,y,z,mat,parent)=>add('torus',(r+t)*2,t*2,(r+t)*2,x,y,z,mat,parent),
 };
}
const built=id=>{const c=context();return {style:buildSkin(c,id,c.g),parts:c.parts};};

test('katalog üç karakteri ad ve kıyafet tarifiyle tanımlar; sunucu tanımadığı adı kabul etmez',()=>{
 assert.equal(SKINS.length,3);
 assert.equal(new Set(SKINS.map(s=>s.id)).size,3);
 for(const entry of SKINS){assert.match(entry.id,/^[a-z]+$/);assert.ok(entry.name.trim().length,entry.id);assert.ok(entry.note.trim().length,entry.id);assert.ok(validSkin(entry.id));}
 assert.ok(validSkin(DEFAULT_SKIN));
 // skinFor'un sonucu doğrudan oyuncu durumuna yazılıyor: uydurma ad da, prototip adı da geçmez.
 for(const bad of ['','levi ','LEVI','__proto__','constructor','toString',null,undefined,0,42,{id:'levi'},['levi']]){
  assert.equal(validSkin(bad),false,`validSkin(${JSON.stringify(bad)})`);
  assert.equal(skinFor(bad),DEFAULT_SKIN,`skinFor(${JSON.stringify(bad)})`);
 }
 for(const entry of SKINS)assert.equal(skinFor(entry.id),entry.id);
});

test('her karakter insan ölçeğinde sonlu geometri kurar, tanınmayan ad hiç çizmez',()=>{
 for(const entry of SKINS){
  const {style,parts}=built(entry.id);
  assert.ok(style,entry.id);
  assert.ok(style.shirt?.name&&style.pants?.name,`${entry.id}: gövde ve pantolon malzemesi bildirmeli`);
  assert.ok(parts.length>=3,`${entry.id}: en az üç parça`);
  for(const part of parts){
   assert.ok(Math.abs(part.x)+part.w/2<=.45,`${entry.id}/${part.kind}: gövde genişliğini aşıyor`);
   assert.ok(Math.abs(part.z)+part.d/2<=.45,`${entry.id}/${part.kind}: gövde derinliğini aşıyor`);
   assert.ok(part.y-part.h/2>=0&&part.y+part.h/2<=2.1,`${entry.id}/${part.kind}: y ${part.y} oda dışına taşıyor`);
  }
 }
 const unknown=built('sahte');
 assert.equal(unknown.style,null);
 assert.equal(unknown.parts.length,0);
});

test('üç karakter birbirinden gerçekten ayrılır ve hepsi takım rengini taşır',()=>{
 const signatures=SKINS.map(entry=>{
  const {parts}=built(entry.id);
  // Takım rengi (teal) her karakterde bir aksesuar olarak durur: avcı uzaktan avcı gibi okunsun.
  assert.ok(parts.some(part=>part.material==='teal'),`${entry.id}: takım rengi aksesuarı yok`);
  return JSON.stringify(parts);
 });
 assert.equal(new Set(signatures).size,SKINS.length,'iki karakter aynı kıyafeti çizmemeli');
});

test('kıyafet katmanı yüz bölgesine hiç dokunmaz: baş ve yüz üç karakterde de aynı kalır',()=>{
 // avatar() gözleri 1.63 m'de, burnu 1.586 m'de, ağzı 1.55 m'de çizer ve bunları hiçbir karakter
 // için değiştirmez. Ayrım giyimden gelsin diye yüzün önü kıyafet katmanına kapalıdır; çeneyi
 // saran sakal 1.56 m'nin altında kalır. Buraya bir parça eklenirse bu test bilinçli düşmeli.
 for(const entry of SKINS)for(const part of built(entry.id).parts){
  const onTheFace=part.y>=1.56&&part.y<=1.72&&part.z<-.02&&Math.abs(part.x)<.13;
  assert.equal(onTheFace,false,`${entry.id}: ${part.kind} yüzün önüne yerleşmiş (y ${part.y}, z ${part.z})`);
 }
});

test('görünüm katılırken bir kez seçilir, geçersiz ad varsayılana düşer',()=>{
 assert.equal(player('a','Ada').skin,DEFAULT_SKIN);
 assert.equal(player('a','Ada',false,'hunter','yusuf').skin,'yusuf');
 for(const bad of ['sahte',null,undefined,42,{id:'levi'},['levi']])assert.equal(player('a','Ada',false,'hunter',bad).skin,DEFAULT_SKIN);
});

test('görünüm her pakette gider ve tur sıfırlaması ile takım değişimini atlatır',()=>{
 const r={code:'TEST',host:'a',phase:'lobby',settings:sanitizeSettings({teamSize:1,botMode:'off',swapTeams:true,mapRotate:false}),
  players:{a:player('a','Avcı',false,'hunter','marco'),b:player('b','Saklanan',false,'hider','yusuf')}};
 assert.ok(start(r,1000).ok);
 const packet=view(r,'a',2000);
 assert.equal(packet.players.find(p=>p.id==='a').skin,'marco');
 // Kozmetik bir alan: saklananın yeri hazırlıkta gizli kalırken görünümü ad gibi bilinebilir.
 const hider=packet.players.find(p=>p.id==='b');
 assert.equal(hider.skin,'yusuf');
 assert.equal(hider.x,undefined);
 // Tur 2: takımlar yer değiştirir, karakter oyuncuda kalır.
 r.phase='end';assert.ok(start(r,5000).ok);
 assert.equal(r.players.a.team,'hider');assert.equal(r.players.a.skin,'marco');
 assert.equal(r.players.b.team,'hunter');assert.equal(r.players.b.skin,'yusuf');
 assert.equal(view(r,'b',6000).players.find(p=>p.id==='b').skin,'yusuf');
});

test('dolu bir bot avcı takımı tek karakterin kopyası olmaz',()=>{
 const r={code:'TEST',host:'a',phase:'lobby',settings:sanitizeSettings({teamSize:3,botMode:'fill'}),players:{a:player('a','Ada',false,'hunter')}};
 syncBots(r);
 const bots=Object.values(r.players).filter(p=>p.bot);
 assert.ok(bots.length>=3);
 assert.ok(bots.every(p=>validSkin(p.skin)),'her bot geçerli bir karakter alır');
 assert.ok(new Set(bots.filter(p=>p.team==='hunter').map(p=>p.skin)).size>1,'aynı takımdaki botlar katalogda dolaşır');
});
