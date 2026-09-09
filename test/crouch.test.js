import test from 'node:test';
import assert from 'node:assert/strict';
import {player,start,tick,shoot,view,sanitizeSettings,HUNTER_SPEED,CROUCH_SPEED,JUMP_SPEED} from '../game.js';
import {EYE_HEIGHT,CROUCH_EYE_HEIGHT,eyeHeight,weaponPose} from '../public/weapon.js';
import {fixtures,free,propTypes,contains,BODY_HEIGHT} from '../public/world.js';

// Loft yemek masası: x 5.4–9.6, z 0–2, tabla .8 m, alt boşluk .7 m. Kupa tam ortasına konur ve
// avcı masanın ön kenarından ölçülü bir mesafede durur.
const table=fixtures.find(o=>o.id==='dining');
function room(standoff){
 const r={code:'TEST',host:'a',phase:'lobby',settings:sanitizeSettings({teamSize:1,botMode:'off',swapTeams:false,mapRotate:false}),
  players:{a:player('a','Avcı',false,'hunter'),b:player('b','Saklanan',false,'hider')}};
 assert.ok(start(r,1000).ok);
 r.phase='play';r.until=999999;
 const mug={id:'mug-under',type:'mug',x:table.x,y:0,z:table.z,angle:0,wet:0};
 r.objects=[...fixtures.map(o=>({...o})),mug];
 const h=r.players.a;h.x=table.x;h.z=table.z-1-standoff;h.y=0;h.inputAt=20000;h.lastShot=-Infinity;h.ammo=100;
 // Saklananı yoldan çekeriz: canlı gövdeler de suyu kesiyor.
 const p=r.players.b;p.x=-12;p.z=-16;p.inputAt=20000;
 return {r,h,p,mug};
}
// Nişan göz hizasından alınır, o yüzden eğilme nişan açısını da değiştirir.
function aim(h,target){
 const d=Math.hypot(target.x-h.x,target.z-h.z);
 h.yaw=Math.atan2(h.x-target.x,h.z-target.z);
 h.pitch=Math.atan2(target.y-(eyeHeight(h)+(h.y||0)),d);
}
function sprays(standoff,crouch){
 const {r,h,mug}=room(standoff);
 h.crouch=crouch;
 aim(h,{x:mug.x,y:propTypes.mug.height/2,z:mug.z});
 assert.equal(shoot(r,h,20000),true);
 return r.results.at(-1).data.objectName;
}

test('göz hizası tek yerde tanımlı: eğilen avcının gözü ve namlusu birlikte iner',()=>{
 assert.equal(eyeHeight({}),EYE_HEIGHT);
 assert.equal(eyeHeight({crouch:false}),EYE_HEIGHT);
 assert.equal(eyeHeight({crouch:true}),CROUCH_EYE_HEIGHT);
 assert.equal(eyeHeight(null),EYE_HEIGHT);
 const base={x:0,y:0,z:0,yaw:0,pitch:0};
 const up=weaponPose(base),down=weaponPose({...base,crouch:true});
 assert.equal(up.eye.y,EYE_HEIGHT);
 assert.equal(down.eye.y,CROUCH_EYE_HEIGHT);
 // Namlu gözle aynı miktarda iner: nişan çizgisi bozulmaz, yalnızca aşağı taşınır.
 assert.ok(Math.abs((up.muzzle.y-down.muzzle.y)-(EYE_HEIGHT-CROUCH_EYE_HEIGHT))<1e-9);
 assert.deepEqual(up.direction,down.direction);
 // Zemin yüksekliği eğilmeye eklenir, onun yerine geçmez.
 assert.equal(weaponPose({...base,y:1,crouch:true}).eye.y,1+CROUCH_EYE_HEIGHT);
});

test('eğilmenin kazandırdığı şey bu: masaya yaklaşınca altındaki kupa görünür kalır',()=>{
 // Uzaktan bakış çizgisi zaten yatay geçiyor, iki duruş da altını görür.
 assert.equal(sprays(3,false),'Kupa');
 assert.equal(sprays(3,true),'Kupa');
 // Yaklaşınca ayakta duran avcının atışını tabla kesiyor, eğilen avcı kupaya ulaşıyor.
 assert.equal(sprays(.8,false),'Yemek masası');
 assert.equal(sprays(.8,true),'Kupa');
 assert.equal(sprays(1.2,false),'Yemek masası');
 assert.equal(sprays(1.2,true),'Kupa');
});

test('eğilme basılı tutuldukça sürer, yalnızca avcıya işler ve bayat girdiyle doğrulur',()=>{
 const {r,h,p}=room(2);
 h.input={crouch:true};h.inputAt=20000;tick(r,20000,.025);
 assert.equal(h.crouch,true);
 // Tuş bırakılır: bir sonraki tick'te doğrulur.
 h.input={};h.inputAt=20050;tick(r,20050,.025);
 assert.equal(h.crouch,false);
 // Bağlantı kopar ya da sekme arkaya alınır: bayat girdi temizlenir, avcı doğrulur.
 h.input={crouch:true};h.inputAt=20100;tick(r,20100,.025);
 assert.equal(h.crouch,true);
 tick(r,21000,.025);
 assert.equal(h.crouch,false);
 // Saklanan eğilemez: aynı girdiyi göndermek onu etkilemez.
 p.input={crouch:true};p.inputAt=21000;tick(r,21050,.025);
 assert.equal(p.crouch,false);
});

test('eğilen avcı yavaşlar ve zıplayamaz',()=>{
 const walk=crouch=>{
  const {r,h}=room(6);
  h.input={x:0,z:1,crouch:crouch};h.inputAt=20000;
  const from=h.z;tick(r,20000,.1);return h.z-from;
 };
 const standing=walk(false),crouched=walk(true);
 assert.ok(Math.abs(standing-HUNTER_SPEED*.1)<.02,`ayakta ${standing}`);
 assert.ok(Math.abs(crouched-CROUCH_SPEED*.1)<.02,`eğilerek ${crouched}`);
 assert.ok(crouched<standing);
 // Eğilirken Boşluk çalışmaz; C bırakılınca yine zıplanır.
 const {r,h}=room(6);
 h.input={jump:true,crouch:true};h.inputAt=20000;tick(r,20000,.025);
 assert.equal(h.vy,0);assert.equal(h.grounded,true);
 h.input={jump:true};h.inputAt=20025;tick(r,20025,.025);
 assert.ok(h.vy>0&&h.vy<=JUMP_SPEED);
});

test('eğilmek yürüme çarpışmasını değiştirmez: avcı masanın altına sızamaz',()=>{
 const {r,h}=room(.8);
 // Masa altı boşluğu .7 m; hiçbir eğilme yüksekliği oraya sığmaz, kural bilerek böyle.
 assert.equal(free(table.x,table.z,.28,r.objects,null,0,BODY_HEIGHT),false);
 h.input={x:0,z:1,crouch:true};
 for(let i=0;i<200;i++){h.inputAt=20000+i*25;tick(r,20000+i*25,.025);}
 const top=r.objects.find(o=>o.id==='dining');
 assert.equal(contains(top,h.x,h.z),false,`avcı masanın altına girdi: ${h.x.toFixed(2)}, ${h.z.toFixed(2)}`);
 assert.ok(h.crouch,'eğilme boyunca eğilik kalır');
});

test('eğilme duruşu pakete konumla birlikte gider ve yeni tur onu sıfırlar',()=>{
 const {r,h}=room(2);
 h.input={crouch:true};h.inputAt=20000;tick(r,20000,.025);
 assert.equal(view(r,'a',20000).players.find(q=>q.id==='a').crouch,true);
 // Görülemeyen oyuncunun duruşu da konumu gibi gizli kalır.
 const hidden=view(r,'b',20000).players.find(q=>q.id==='a');
 assert.equal(hidden.visible,false);
 assert.equal(hidden.x,undefined);
 assert.equal(hidden.crouch,undefined);
 // Yeni tur: takımlar aynı kalsa da duruş sıfırlanır.
 r.phase='end';assert.ok(start(r,30000).ok);
 assert.equal(r.players.a.crouch,false);
});
