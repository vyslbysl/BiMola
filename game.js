import {weaponPose,toward,eyeHeight} from './public/weapon.js';
import {validMap,MAP_CHOICES} from './public/maps.js';
import {SKINS,DEFAULT_SKIN,skinFor} from './public/skins.js';
import {assembly,moveAssembly,detachChildren,settleObjects} from './public/physics.js';
import {randomUUID} from 'node:crypto';
import {mapFor,groundAt,floorCoverHeight,free,sight,dist,propTypes,dimensions,objectDistance,reachable,blocksDoor,fixtures,nearestHit,pathTo,generateProps,zoneAt,zones,commonTypes,surfaceHeight,PLACEMENT_PAD,STAND_MAX_HEIGHT,BODY_HEIGHT,DEFAULT_PROP_COUNT,MIN_PROP_COUNT,MAX_PROP_COUNT,DEFAULT_DECOR,MIN_DECOR,MAX_DECOR,contains,homeKind,fitsHome} from './public/world.js';
export {dist};
// Kaç isabetin bir saklananı ortaya çıkardığı ve ıslanan saklananın kaçış hızı artık oda
// ayarıdır; buradaki değerler yalnızca varsayılan.
export const PREP_MS=20000,ROUND_MS=180000,SHOT_MS=125,RELOAD_MS=2000,HUNTER_SPEED=4.3;
// Eğilen avcı yavaşlar: eğilmek bakmak içindir, kovalamak için değil. Islanan saklanan zaten
// HUNTER_SPEED'in katıyla kaçtığı için eğilerek takip etmek bir seçenek olmamalı.
export const CROUCH_SPEED=2.1;
export const LEAN_PROP_COUNT=10;
// Aynı gerçek eşyaya inatla su sıkan avcı sonunda onu dağıtır: oda boşalır, saklanacak yer azalır.
export const DEFAULT_SMASH=50,MIN_SMASH=5,MAX_SMASH=200;
export const DEFAULT_IDLE=30,MIN_IDLE=10,MAX_IDLE=120;
export const DEFAULT_HITS=3,MIN_HITS=1,MAX_HITS=10,DEFAULT_ESCAPE=1.1,MIN_ESCAPE=1,MAX_ESCAPE=2;
// Hiders can hop onto counters, tables and beds: JUMP_SPEED clears the 1 m kitchen counter with
// a little room to spare (apex = JUMP_SPEED^2 / 2*GRAVITY ~ 1.21 m). SPIN_SPEED is how fast a
// disguise can be turned on the spot, in radians per second.
// LIFT_SPEED, kılığı yukarı aşağı taşıma hızı; LIFT_MAX en yüksek rafın (2,6 m) üstüne
// bırakmaya yetecek kadar, tavana kadar değil.
// Sıradan bir kılık en fazla LIFT_MAX'e çıkar: zıplayan bir avcının göz hizası 2,8 m'ye ulaştığı
// için orada bırakılan nesne görülebilir kalır. Duvara asılı parçalar (tablo, perde, duvar rafı)
// LIFT_MAX_MOUNTED'e kadar çıkar; onlar duvarda durması beklenen, göz alıcı parçalar.
export const GRAVITY=18,JUMP_SPEED=6.6,SPIN_SPEED=2.4,LIFT_SPEED=1.4,LIFT_MAX=2.2,LIFT_MAX_MOUNTED=3.4;
export const defaultSettings={mapId:'loft',mapRotate:true,teamSize:3,botMode:'fill',hunterBots:0,hiderBots:0,hideSeconds:20,roundSeconds:180,teamSelection:'choose',swapTeams:true,objectCount:LEAN_PROP_COUNT,decor:MIN_DECOR,idleReveal:DEFAULT_IDLE,smashHits:DEFAULT_SMASH,revealHits:DEFAULT_HITS,escapeBoost:DEFAULT_ESCAPE};
const teams=['hunter','hider'];
const integer=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.round(Number(v)))):fallback;
const decimal=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.round(Number(v)*20)/20)):fallback;
export function sanitizeSettings(input={},previous=defaultSettings){
 input=input&&typeof input==='object'?input:{};
 const settings={...defaultSettings,...previous};
 if(validMap(input.mapId))settings.mapId=input.mapId;
 if('mapRotate'in input)settings.mapRotate=!!input.mapRotate;
 if('teamSize'in input)settings.teamSize=integer(input.teamSize,1,12,settings.teamSize);
 if(['off','fill','custom'].includes(input.botMode))settings.botMode=input.botMode;
 for(const key of ['hunterBots','hiderBots'])settings[key]=integer(input[key]??settings[key],0,settings.teamSize,0);
 if('hideSeconds'in input)settings.hideSeconds=integer(input.hideSeconds,10,60,20);
 if('roundSeconds'in input)settings.roundSeconds=integer(input.roundSeconds,60,600,180);
 if(['choose','auto'].includes(input.teamSelection))settings.teamSelection=input.teamSelection;
 if('objectCount'in input)settings.objectCount=integer(input.objectCount,MIN_PROP_COUNT,MAX_PROP_COUNT,settings.objectCount);
 if('decor'in input)settings.decor=decimal(input.decor,MIN_DECOR,MAX_DECOR,settings.decor);
 // Sıfır kapalı demek; onun dışında saniye değeri sınırlanır.
 if('idleReveal'in input)settings.idleReveal=Number(input.idleReveal)?integer(input.idleReveal,MIN_IDLE,MAX_IDLE,settings.idleReveal):0;
 // Sıfır kapalı demek: eşyalar hiç dağılmaz.
 if('smashHits'in input)settings.smashHits=Number(input.smashHits)?integer(input.smashHits,MIN_SMASH,MAX_SMASH,settings.smashHits):0;
 if('revealHits'in input)settings.revealHits=integer(input.revealHits,MIN_HITS,MAX_HITS,settings.revealHits);
 if('escapeBoost'in input)settings.escapeBoost=decimal(input.escapeBoost,MIN_ESCAPE,MAX_ESCAPE,settings.escapeBoost);
 if(typeof input.swapTeams==='boolean')settings.swapTeams=input.swapTeams;
 return settings;
}
// `skin` avcı görünümüdür ve oyuncuya aittir, odaya değil: katılırken bir kez seçilir, tur
// sıfırlamaları ve takım değişimleri onu bozmaz. Geçersiz bir ad varsayılana düşer.
export function player(id,name,bot=false,team='hider',skin=DEFAULT_SKIN){
 return {id,name,bot,team:teams.includes(team)?team:'hider',role:teams.includes(team)?team:'hider',skin:skinFor(skin),x:0,y:0,z:11,vy:0,grounded:true,crouch:false,yaw:0,pitch:0,status:'alive',input:{},inputAt:0,propId:null,water:0,changes:3,decoys:3,locked:false,ammo:100,reloadUntil:0,lastShot:-Infinity,path:[],pathAt:0};
}
const count=(r,team,humansOnly=false)=>Object.values(r.players).filter(p=>p.team===team&&(!humansOnly||!p.bot)).length;
export function syncBots(r){
 r.settings=sanitizeSettings(r.settings);
 for(const team of teams){
  const desired=r.settings.botMode==='fill'?Math.max(0,r.settings.teamSize-count(r,team,true)):r.settings.botMode==='custom'?Math.min(r.settings[team+'Bots'],r.settings.teamSize-count(r,team,true)):0;
  const existing=Object.values(r.players).filter(p=>p.bot&&p.team===team);
  while(existing.length>desired){const bot=existing.pop();delete r.players[bot.id];}
  for(let i=existing.length;i<desired;i++){
   const id='bot-'+randomUUID().slice(0,8);
   // Botlar katalogda sırayla dolaşır: dolu bir avcı takımı aynı karakterin kopyası olmaz.
   r.players[id]=player(id,`${team==='hunter'?'Avcı':'Saklanan'} Bot ${i+1}`,true,team,SKINS[i%SKINS.length].id);
  }
 }
}
export function configureRoom(r,changes={},actor){
 if(actor!==r.host)return {error:'Oda ayarlarını yalnızca kurucu değiştirebilir.'};
 if(!['lobby','end'].includes(r.phase))return {error:'Ayarlar tur bittikten sonra değiştirilebilir.'};
 const settings=sanitizeSettings(changes,r.settings);
 for(const team of teams){
  const humans=count(r,team,true);
  if(humans>settings.teamSize)return {error:'Bu takımda seçilen kapasiteden fazla oyuncu var. Önce oyuncuları diğer takıma taşı.'};
  if(settings.botMode==='custom'&&settings[team+'Bots']+humans>settings.teamSize)return {error:'Oyuncu ve bot sayısı takım kapasitesini aşıyor.'};
 }
 if(settings.mapId!==r.settings.mapId)r.mapPinned=true;
 r.settings=settings;syncBots(r);return {ok:true,settings:r.settings};
}
export function setTeam(r,id,team,actor=id){
 if(!teams.includes(team))return {error:'Geçersiz takım.'};
 if(!['lobby','end'].includes(r.phase))return {error:'Takım tur sırasında değiştirilemez.'};
 if(actor!==id&&actor!==r.host)return {error:'Diğer oyuncuları yalnızca oda kurucusu taşıyabilir.'};
 if(actor===id&&r.settings.teamSelection==='auto'&&actor!==r.host)return {error:'Bu odada takımlar otomatik dağıtılıyor.'};
 const p=r.players[id];if(!p)return {error:'Oyuncu bulunamadı.'};
 if(p.team===team)return {ok:true};
 if(count(r,team,true)>=r.settings.teamSize)return {error:'Bu takım dolu.'};
 // Bots are replaceable seats; moving a human never ejects another human.
 if(p.bot){const otherBots=count(r,team)-count(r,team,true);if(count(r,team)>=r.settings.teamSize)return {error:'Bu takım dolu.'};if(r.settings.botMode!=='custom')return {error:'Bot takımları doluluk ayarına göre belirleniyor.'};r.settings[p.team+'Bots']=Math.max(0,r.settings[p.team+'Bots']-1);r.settings[team+'Bots']=otherBots+1;}
 p.team=p.role=team;syncBots(r);return {ok:true};
}
export function start(r,now=Date.now()){
 r.settings=sanitizeSettings(r.settings);syncBots(r);
 // Takımların eşit olması gerekmiyor: her tarafta en az bir kişi varsa tur başlar.
 if(teams.some(team=>count(r,team)<1))return {error:'Başlamak için en az bir saklanan ve bir avcı olmalı. Takım seç veya bot ekle.'};
 for(const p of Object.values(r.players))p.waiting=false;
 if((r.round||0)>0&&r.settings.swapTeams){for(const p of Object.values(r.players))p.team=p.role=p.team==='hunter'?'hider':'hunter';[r.settings.hunterBots,r.settings.hiderBots]=[r.settings.hiderBots,r.settings.hunterBots];}
 // Takımlar yer değiştirirken mekân da değişir: aynı odayı ezberleyen taraf avantaj kazanmasın.
 // Kurucu isterse ayarı kapatıp tek haritada kalabilir.
 if((r.round||0)>0&&r.settings.mapRotate&&!r.mapPinned){
  const others=MAP_CHOICES.map(m=>m.id).filter(id=>id!==r.settings.mapId);
  if(others.length){r.settings.mapId=others[Math.floor(Math.random()*others.length)];r.mapChanged=true;}
 }else r.mapChanged=false;
 r.mapPinned=false;
 r.round=(r.round||0)+1;r.phase='prep';r.until=now+r.settings.hideSeconds*1000;r.winner=null;r.reason=null;r.shots=[];r.effects=[];r.results=[];r.events=[];r.objects=generateProps(r.settings.objectCount,r.settings.decor,r.settings.mapId);
 if(r.mapChanged){r.mapChanged=false;notice(r,`Yeni mekân: ${MAP_CHOICES.find(m=>m.id===r.settings.mapId)?.name||r.settings.mapId}`,now);}
 for(const p of Object.values(r.players)){p.stillSpot=null;p.stillAt=now;p.leakAt=0;p.exposedUntil=0;}r.initialObjects=r.objects.map(o=>({...o}));
 let h=0,k=0;const spawned=[];
 for(const p of Object.values(r.players)){
  const i=p.team==='hunter'?h++:k++;let x=(i%3-1)*.85,z=p.team==='hunter'?-3-Math.floor(i/3)*.95:10-Math.floor(i/6)*1.1;
  // Hiders start spread around the rooms, one room after another, so everybody opens the round with
  // something within reach. Hunters keep their huddle in the hallway, where they wait out the count.
  if(p.team==='hider'){
   const mapZones=mapFor(r.objects).zones,zone=mapZones[i%mapZones.length];
   for(let a=0;a<160;a++){
    const px=zone.xmin+PLACEMENT_PAD+Math.random()*Math.max(.2,zone.xmax-zone.xmin-2*PLACEMENT_PAD);
    const pz=zone.zmin+PLACEMENT_PAD+Math.random()*Math.max(.2,zone.zmax-zone.zmin-2*PLACEMENT_PAD);
    if(free(px,pz,.28,r.objects,null,groundAt(px,pz,r.objects))&&!spawned.some(q=>dist({x:px,z:pz},q)<.9)){x=px;z=pz;break;}
   }
  }
  if(!free(x,z,.28,r.objects,null,groundAt(x,z,r.objects))||spawned.some(q=>dist({x,z},q)<.65)){const base={x,z};search:for(let radius=.75;radius<6;radius+=.75)for(let j=0;j<16;j++){const px=base.x+Math.cos(j*Math.PI/8)*radius,pz=base.z+Math.sin(j*Math.PI/8)*radius;if(free(px,pz,.28,r.objects,null,groundAt(px,pz,r.objects))&&!spawned.some(q=>dist({x:px,z:pz},q)<.65)){x=px;z=pz;break search;}}}spawned.push({x,z});
  Object.assign(p,{role:p.team,x,z,y:groundAt(x,z,r.objects),vy:0,grounded:true,crouch:false,yaw:p.team==='hunter'?Math.PI:0,pitch:0,status:'alive',input:{},inputAt:now,propId:null,water:0,changes:3,decoys:3,locked:false,ammo:100,reloadUntil:0,lastShot:-Infinity,path:[],pathAt:0,goal:null,botTarget:null,botTargetUntil:0,botScanned:new Set(),botBurstUntil:0,lastProgressAt:now,lastProgress:{x,z}});
 }
 return {ok:true};
}
function notice(r,text,now){r.events.push({id:randomUUID(),text,at:now});r.events=r.events.slice(-5);}
function accessibleObject(r,p,id){const o=r.objects?.find(o=>o.id===id);return o&&!o.owner&&!o.decoyOf&&o.wet<100&&reachable(p,o,r.objects)?o:null;}
function bindProp(p,o){p.propId=o.id;o.owner=p.id;p.x=o.x;p.z=o.z;p.y=o.y||0;p.vy=0;p.grounded=true;o.wet=Math.max(o.wet,p.water);p.water=o.wet;p.locked=false;}
export function possess(r,p,objectId,now=Date.now()){
 if(!p||!['prep','play'].includes(r.phase)||p.team!=='hider'||p.status!=='alive')return {ok:false,error:'Şu anda nesne seçemezsin.'};
 if(p.propId)return {ok:false,error:'İlk nesneni seçtin. Q ile rastgele değiştirebilirsin.'};
 const o=accessibleObject(r,p,objectId);if(!o)return {ok:false,error:'Nesneye yaklaş. Bu nesne dolu veya erişilemiyor.'};
 bindProp(p,o);return {ok:true,type:o.type,changes:p.changes};
}
export function shuffle(r,p){
 if(!p||!['prep','play'].includes(r.phase)||p.team!=='hider'||p.status!=='alive'||!p.propId)return {ok:false,error:'Önce yakındaki bir nesneyi seç.'};
 if(p.changes<=0)return {ok:false,error:'Üç nesne değişim hakkını kullandın.'};
 const o=r.objects.find(o=>o.id===p.propId&&o.owner===p.id);if(!o)return {ok:false,error:'Nesne bulunamadı.'};
 // Stay on-theme for whatever room the object is currently in (a kitchen mug shouldn't turn into a
 // suitcase); out in the hallway, where no room theme applies, any type is still fair game.
 const zone=zoneAt(o.x,o.z,r.objects);const pool=[...new Set([...(zone?.types||mapFor(r.objects).zones.flatMap(z=>z.types)),...mapFor(r.objects).fixtures.filter(q=>!zone||zoneAt(q.x,q.z,r.objects)?.id===zone.id).map(q=>q.type)])];
 const attached=new Set(assembly(r.objects,o).map(q=>q.id));const candidates=pool.filter(type=>{const q={...o,type},t=propTypes[type];return type!==o.type&&!blocksDoor(q)&&free(o.x,o.z,t.radius,r.objects,o.id,o.y||0,t.height,q,attached);});
 if(!candidates.length)return {ok:false,error:'Burada başka bir nesneye yer yok. Biraz açık alana geç.'};
 // Bulunduğun yere yakışan tiplere daral: yerdeysen yerde duran eşyalara, bir yüzeyin üstündeysen
 // orada durabilecek eşyalara dönüşürsün. Uygun tip yoksa eski davranışa düşer.
 // Yakışan bir tip yoksa rastgele bir şeye dönüşmek yerine dönüşüm reddedilir: yerde duran bir
 // kılığın tabağa, tabaktan yastığa dönüşmesi oyunu saçmalaştırıyordu. Hak da harcanmaz.
 const kind=homeKind(o),pick=candidates.filter(type=>fitsHome(type,kind));
 if(!pick.length)return {ok:false,error:'Bulunduğun yere yakışan başka bir eşya yok. Biraz açık alana geç.'};
 detachChildren(r.objects,o);delete o.supportId;o.anchored=false;o.type=pick[Math.floor(Math.random()*pick.length)];p.changes--;return {ok:true,type:o.type,changes:p.changes};
}
export function decoy(r,p,now=Date.now()){
 if(!p||!['prep','play'].includes(r.phase)||p.team!=='hider'||p.status!=='alive'||!p.propId)return {ok:false,error:'Kopyayı bir nesneyken bırakabilirsin.'};
 if(p.decoys<=0)return {ok:false,error:'Bu turdaki üç kopyanı kullandın.'};
 const source=r.objects.find(o=>o.id===p.propId&&o.owner===p.id);
 if(!source||!p.grounded)return {ok:false,error:'Kopyayı yere bastığında bırak.'};
 if(blocksDoor(source))return {ok:false,error:'Kopyayı kapı geçişinden uzağa bırak.'};
 const group=assembly(r.objects,source),rootId=randomUUID(),ids=new Map(group.map(q=>[q.id,q===source?rootId:randomUUID()]));
 for(const q of group)r.objects.push({id:ids.get(q.id),mapId:r.settings.mapId,type:q.type,x:q.x,y:q.y||0,z:q.z,angle:q.angle,wet:q.wet,decoyOf:source.id,decoyRoot:rootId,...(ids.has(q.supportId)?{supportId:ids.get(q.supportId)}:{})});
 p.decoys--;p.locked=false;
 return {ok:true,decoys:p.decoys};
}
// Hiç kıpırdamadan aynı yerde bekleyen saklanan kendini ele verir: yerinin bir metre kadar
// çevresinde kısa bir iz belirir. Avcılar ve o saklananın kendisi görür, diğer saklananlar görmez.
// Süresi oda ayarıdır; sıfırlanması için kıpırdamak yeterli, yani kamp yapmak cezalı, oyun değil.
function leak(r,p,now){
 const angle=Math.random()*Math.PI*2,off=.55+Math.random()*.65;
 r.effects??=[];r.effects.push({id:randomUUID(),kind:'idle',owner:p.id,x:p.x+Math.cos(angle)*off,y:0,z:p.z+Math.sin(angle)*off,at:now});
 r.effects=r.effects.slice(-32);
}
function burst(r,p,now,kind='reveal'){
 r.effects??=[];r.effects.push({id:randomUUID(),kind,x:p.x,y:p.y||0,z:p.z,at:now});r.effects=r.effects.slice(-32);
}
export function reload(r,p,now=Date.now()){
 if(!p||!['prep','play'].includes(r.phase)||p.team!=='hunter'||p.status!=='alive'||p.reloadUntil>now||p.ammo>=100)return {ok:false};
 p.reloadUntil=now+RELOAD_MS;return {ok:true};
}
export function action(r,p,data,now=Date.now()){
 if(!data||typeof data!=='object')return {ok:false,error:'Geçersiz işlem.'};
 if(data.kind==='possess')return possess(r,p,data.objectId,now);
 if(data.kind==='decoy')return decoy(r,p,now);
 if(data.kind==='shuffle')return shuffle(r,p);
 if(data.kind==='reload')return reload(r,p,now);
 if(data.kind==='lock'&&p?.team==='hider'&&p.propId&&p.status==='alive'&&['prep','play'].includes(r.phase)){p.locked=!p.locked;return {ok:true,locked:p.locked};}
 return {ok:false};
}
export function shoot(r,p,now=Date.now()){
 if(!p||r.phase!=='play'||p.team!=='hunter'||p.status!=='alive'||p.reloadUntil>now||now-p.lastShot<SHOT_MS||p.ammo<4)return false;
 p.lastShot=now;p.ammo-=4;
 const pose=weaponPose(p),bodies=Object.values(r.players).filter(q=>q.id!==p.id&&q.status==='alive'&&!q.propId);
 const aim=nearestHit(pose.eye,pose.direction,r.objects,bodies);
 // The reticle picks the aim point; water must still travel from the physical barrel.
 const clearance=nearestHit(pose.eye,toward(pose.eye,pose.muzzle),r.objects,bodies);
 const span=Math.hypot(pose.muzzle.x-pose.eye.x,pose.muzzle.y-pose.eye.y,pose.muzzle.z-pose.eye.z);
 const obstructed=clearance.distance<span,from=obstructed?clearance.point:pose.muzzle;
 const hit=obstructed?clearance:nearestHit(from,toward(from,aim.point),r.objects,bodies);
 r.shots.push({id:randomUUID(),from,to:hit.point,at:now,shooter:p.id});r.shots=r.shots.slice(-100);
 let target,o,wet,objectName,shots,smashAt,smashed=false;
 if(hit.kind==='object'){
  o=r.objects.find(o=>o.id===hit.id);target=o.owner?r.players[o.owner]:null;
  // A plain piece of decor is settled with a single spray — no point emptying the tank into it.
  // A disguised player soaks the share the room's revealHits setting dictates; rounding up keeps the
  // percentages whole and makes the last needed hit land exactly on a hundred.
  const soak=Math.ceil(100/(r.settings?.revealHits||DEFAULT_HITS));
  o.wet=target?Math.min(100,o.wet+soak):100;wet=o.wet;objectName=propTypes[o.type].name;
  if(target)target.water=wet;
  // Sahibi olmayan gerçek bir eşya isabet sayar: oda ayarındaki sınıra gelince dağılıp yok olur.
  if(!target&&!o.decoyOf){o.shots=(o.shots||0)+1;shots=o.shots;smashAt=r.settings?.smashHits|0;smashed=!!smashAt&&o.shots>=smashAt;}
 }else if(hit.kind==='player'){
  target=r.players[hit.id];if(target?.team!=='hider')target=null;
  if(target){target.water=Math.min(100,target.water+Math.ceil(100/(r.settings?.revealHits||DEFAULT_HITS)));wet=target.water;objectName='Oyuncu';}
 }
 if(wet!==undefined){
  const found=!!target&&target.status==='alive'&&wet>=100;
  // A hit that lands on nobody's disguise is confirmed as a real object right away — no need to keep
  // emptying the tank into it to find out. A hit hider is unlocked immediately so they can run for it.
  const real=hit.kind==='object'&&!target&&!o?.decoyOf;
  if(o?.decoyOf){burst(r,o,now,'decoy');r.objects=r.objects.filter(q=>q.id!==o.id&&(!o.decoyRoot||q.decoyRoot!==o.decoyRoot));}
  // Dağılan eşyanın üstündeki küçük parçalar desteklerini kaybeder ve yerçekimine bırakılır;
  // kılığı o eşya olan biri yoktur, çünkü sahipli eşyalar bu sayacı hiç işletmez.
  else if(smashed&&o){burst(r,o,now,'smash');detachChildren(r.objects,o);r.objects=r.objects.filter(q=>q.id!==o.id);}
  if(found){burst(r,target,now);target.status='found';target.input={};target.locked=true;if(o)delete o.owner;notice(r,`${target.name} bulundu!`,now);}
  else if(target)target.locked=false;
  r.results.push({playerId:p.id,event:'hit',data:{wet,found,objectName,real,...(shots?{shots,smashAt}:{}),...(smashed?{smashed:true}:{}),...(o?.decoyOf?{decoy:true}:{})}});
 }
 return true;
}
function autoHide(r,p){
 const choices=r.objects.filter(o=>!o.owner&&!o.decoyOf&&o.wet<100);
 if(!choices.length)return;
 const visible=choices.filter(o=>sight(p,o,r.objects));visible.sort((a,b)=>dist(p,a)-dist(p,b));
 const o=p.bot?choices[Math.floor(Math.random()*choices.length)]:(visible[0]||choices.sort((a,b)=>dist(p,a)-dist(p,b))[0]);bindProp(p,o);p.locked=true;
}
function botInput(r,p,now){
 if(p.team==='hider'){if(!p.propId)autoHide(r,p);p.locked=true;p.input={};return;}
 if(r.phase!=='play')return;
 // Hunters inspect ordinary visible props. Ownership and hidden player positions are never used to choose targets.
 let target=r.objects.find(o=>o.id===p.botTarget);
 if(!target||target.wet>=100||now>p.botTargetUntil){
  if(target)p.botScanned.add(target.id);
  const candidates=r.objects.filter(o=>o.wet<100&&!p.botScanned.has(o.id));
  if(!candidates.length){p.botScanned.clear();p.botTarget=null;p.input={};return;}
  const nearby=candidates.filter(o=>sight(p,o,r.objects)&&dist(p,o)<12);
  const pool=nearby.length?nearby:candidates;target=pool[Math.floor(Math.random()*pool.length)];p.botTarget=target.id;p.botTargetUntil=now+14000;p.pathAt=0;
 }
 const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz),y=(target.y||0)+propTypes[target.type].height*.5;
 // Botlar eğilmez, ama göz hizası tek kaynaktan gelsin: eyeHeight onlar için hep EYE_HEIGHT döner.
 p.yaw=Math.atan2(-dx,-dz);p.pitch=Math.atan2(y-(eyeHeight(p)+(p.y||0)),d);
 const direction={x:-Math.sin(p.yaw)*Math.cos(p.pitch),y:Math.sin(p.pitch),z:-Math.cos(p.yaw)*Math.cos(p.pitch)};
 const check=nearestHit({x:p.x,y:eyeHeight(p)+(p.y||0),z:p.z},direction,r.objects);
 if(d<10&&check.kind==='object'&&check.id===target.id){p.input={fire:true};if(p.ammo<4)reload(r,p,now);return;}
 if(now>p.pathAt||!p.path.length){p.path=pathTo(p,target,r.objects);p.pathAt=now+2000;}
 while(p.path.length&&dist(p,p.path[0])<.5)p.path.shift();const waypoint=p.path[0]||target;
 let x=waypoint.x-p.x,z=waypoint.z-p.z,len=Math.hypot(x,z);if(len>.1){x/=len;z/=len;}
 // A short local detour keeps static props from trapping a grid path follower.
 if(!free(p.x+x*.65,p.z+z*.65,.28,r.objects,null,groundAt(p.x+x*.65,p.z+z*.65,r.objects))){
  const alternatives=[{x:-z,z:x},{x:z,z:-x},{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}].filter(v=>free(p.x+v.x*.65,p.z+v.z*.65,.28,r.objects,null,groundAt(p.x+v.x*.65,p.z+v.z*.65,r.objects)));
  alternatives.sort((a,b)=>dist({x:p.x+a.x,z:p.z+a.z},waypoint)-dist({x:p.x+b.x,z:p.z+b.z},waypoint));
  if(alternatives.length){x=alternatives[0].x;z=alternatives[0].z;}else{x=z=0;}
 }
 p.input={x,z};
 if(now-p.lastProgressAt>2500){if(dist(p,p.lastProgress)<.5){p.botTargetUntil=now-1;p.path=[];}p.lastProgress={x:p.x,z:p.z};p.lastProgressAt=now;}
}
export function tick(r,now,dt){
 if(r.phase==='prep'&&now>=r.until){for(const p of Object.values(r.players))if(p.bot&&p.team==='hider'&&p.status==='alive'&&!p.propId)autoHide(r,p);r.phase='play';r.until=now+r.settings.roundSeconds*1000;notice(r,'Su savaşı başladı. Saklananları bul!',now);}
 if(!['prep','play'].includes(r.phase))return;
 r.effects=(r.effects||[]).filter(e=>now-e.at<1800);
 dt=Math.max(0,Math.min(.1,dt));r.shots=r.shots.filter(s=>now-s.at<650);
 const ps=Object.values(r.players).filter(p=>!p.waiting);
 for(const p of ps){
  if(p.status!=='alive')continue;
  if(p.reloadUntil&&now>=p.reloadUntil){p.ammo=100;p.reloadUntil=0;}
  if(p.team==='hunter'&&r.phase==='prep')continue;
  if(p.bot)botInput(r,p,now);else if(now-p.inputAt>500)p.input={};
  // Eğilme yalnızca avcının ve basılı tutulduğu sürece: tuş bırakılınca doğrulur. Bayat girdi
  // yukarıda temizlendiği için sekme arkaya alınan ya da bağlantısı kopan avcı da doğrulur.
  p.crouch=p.team==='hunter'&&!!p.input.crouch;
  const o=p.propId?r.objects.find(o=>o.id===p.propId):null,radius=o?propTypes[o.type].radius:.28;
  // The disguise decides what fits where: a mug can duck under the dining table, a wardrobe-sized
  // player cannot, and anything broad enough doubles as a step to jump on.
  const tall=o?propTypes[o.type].height:BODY_HEIGHT;
  let x=Number(p.input.x)||0,z=Number(p.input.z)||0,len=Math.hypot(x,z);
  const attempt=(nx,nz,ny=p.y,angle=o?.angle||0)=>{
   const floor=groundAt(nx,nz,r.objects),oldFloor=groundAt(p.x,p.z,r.objects);
   if(p.grounded&&Math.abs(p.y-oldFloor)<.15&&Math.abs(floor-oldFloor)<.15)ny=Math.max(floor,ny+floor-oldFloor);
   if(o&&!propTypes[o.type].mounted)ny=Math.max(ny,floorCoverHeight(nx,nz,r.objects,o.id,{...o,angle}));
   if(o){const moved=moveAssembly(r,o,{x:nx,z:nz,y:ny,angle});if(moved){p.x=o.x;p.z=o.z;p.y=o.y;}return moved;}
   if(!free(nx,nz,radius,r.objects,null,ny,tall))return false;p.x=nx;p.z=nz;p.y=ny;return true;
  };
  if(len&&!p.locked){
   x/=len;z/=len;const speed=p.team==='hunter'?(p.crouch?CROUCH_SPEED:HUNTER_SPEED):p.water>0?HUNTER_SPEED*(r.settings?.escapeBoost||DEFAULT_ESCAPE):o?2.8:4;
   for(const [axis,amount]of [['x',x*speed*dt],['z',z*speed*dt]]){const steps=Math.max(1,Math.ceil(Math.abs(amount)/.05));for(let i=0;i<steps;i++){if(!attempt(p.x+(axis==='x'?amount/steps:0),p.z+(axis==='z'?amount/steps:0)))break;if(o){o.anchored=false;const host=r.objects.find(q=>q.id===o.supportId);if(host&&!contains(host,o.x,o.z,-.035))delete o.supportId;}}}
  }
  const spin=Math.max(-1,Math.min(1,Number(p.input.spin)||0));
  if(o&&spin){const turns=Math.max(1,Math.ceil(Math.abs(spin*SPIN_SPEED*dt)/.035));for(let i=0;i<turns;i++)if(!attempt(p.x,p.z,p.y,(o.angle||0)+spin*SPIN_SPEED*dt/turns))break;}
  // Kılığı yukarı aşağı taşımak: oyuncu ayarladığı sürece yerçekimi beklemede, böylece kupa
  // rafın üstüne kaldırılıp orada bırakılabilir. Tuş bırakılınca nesne desteğine oturur.
  // Kaldırmaya başlamak, halı gibi yerine sabitlenmiş bir kılığı da serbest bırakır.
  const lift=Math.max(-1,Math.min(1,Number(p.input.lift)||0));
  const mounted=!!(o&&propTypes[o.type]?.mounted);
  if(o&&lift&&!p.locked&&p.team==='hider'){o.anchored=false;delete o.supportId;}
  if(!o?.anchored){
   const parent=r.objects.find(q=>q.id===o?.supportId);
   const ground=parent?(parent.y||0)+(propTypes[parent.type].surface??propTypes[parent.type].height):surfaceHeight(p.x,p.z,Math.max(STAND_MAX_HEIGHT,p.y+.08),r.objects,p.propId);
   if(o&&lift&&!p.locked&&p.team==='hider'){
    const target=Math.max(mounted?0:ground,Math.min(groundAt(p.x,p.z,r.objects)+(mounted?LIFT_MAX_MOUNTED:LIFT_MAX),p.y+lift*LIFT_SPEED*dt));
    const delta=target-p.y,steps=Math.max(1,Math.ceil(Math.abs(delta)/.06)),inc=delta/steps;
    const ceiling=groundAt(p.x,p.z,r.objects)+(mounted?LIFT_MAX_MOUNTED:LIFT_MAX);
    for(let i=0;i<steps;i++){
     if(attempt(p.x,p.z,p.y+inc)){delete o.supportId;o.anchored=false;continue;}
     // Koltuğa gömülü bir minder aradaki yüksekliklere sığmaz; küçük adım engellenirse bir
     // sonraki boş yüksekliğe atlar, yani eşya yüzeyin üstüne çıkar.
     const ignored=new Set(assembly(r.objects,o).map(item=>item.id));
     if(free(p.x,p.z,radius,r.objects,o.id,p.y,tall,o,ignored))break;
     let hopped=false;
     for(let k=2;k<=12&&!hopped;k++)hopped=attempt(p.x,p.z,Math.max(0,Math.min(ceiling,p.y+inc*k)));
     if(!hopped)break;
     delete o.supportId;o.anchored=false;
    }
    p.vy=0;p.grounded=p.y<=ground+.005;
   }else if(mounted){
    // Asılı bir kılık duvarda kalır: yana kaydırılsa da düşmez.
    p.vy=0;p.grounded=true;
   }else{
    // Eğilirken zıplanmaz: C bırakılıp doğrulunca Boşluk yine çalışır.
    if(p.input.jump&&p.grounded&&!p.locked&&!p.crouch){p.vy=JUMP_SPEED;if(o)delete o.supportId;}
    // Koltuğun içine gömülü bir minder gibi, yerleşimi yüzeyin altında olan kılıklar yerinde
    // kalır: yerçekimi onları yukarı fırlatmaz, yalnızca yukarıdaysa aşağı çeker.
    const resting=Math.min(ground,p.y);
    p.vy-=GRAVITY*dt;const ny=Math.max(resting,p.y+p.vy*dt);
    if(!attempt(p.x,p.z,ny))p.vy=0;
    if(p.y<=resting+.005){p.vy=0;p.grounded=true;}else p.grounded=false;
   }
  }
  if(o){o.x=p.x;o.y=p.y;o.z=p.z;}
  if(p.team==='hunter'&&p.input.fire)shoot(r,p,now);
  // Yer değiştirmek sayacı sıfırlar; yarım metre oynamak "kıpırdadım" saymaz.
  if(!p.stillSpot||dist(p,p.stillSpot)>.5){p.stillSpot={x:p.x,z:p.z};p.stillAt=now;}
  const idle=r.settings?.idleReveal|0;
  if(idle&&r.phase==='play'&&p.team==='hider'&&p.propId&&now-(p.stillAt||now)>=idle*1000){
   p.exposedUntil=now+2200;
   if(now-(p.leakAt||0)>=3600){p.leakAt=now;leak(r,p,now);}
  }
 }
 settleObjects(r,dt);
 if(r.phase==='play'){
  const hiders=ps.filter(p=>p.team==='hider'),hunters=ps.filter(p=>p.team==='hunter');
  if(!hunters.length){r.phase='end';r.winner='hider';r.reason='Tüm avcılar odadan ayrıldı.';}
  else if(!hiders.some(p=>p.status==='alive')){r.phase='end';r.winner='hunter';r.reason='Bütün saklananlar bulundu.';}
  else if(now>=r.until){r.phase='end';r.winner='hider';r.reason=`Süre doldu. ${hiders.filter(p=>p.status==='alive').length} saklanan kurtuldu!`;}
 }
}
export function view(r,id,now=Date.now()){
 const me=r.players[id];if(!me)return null;
 if(me.waiting)return {code:r.code,host:r.host,phase:'waiting',currentPhase:r.phase,until:r.until||0,now,round:r.round||0,settings:r.settings,practice:false,players:Object.values(r.players).filter(p=>!p.bot&&p.waiting).map(p=>({id:p.id,name:p.name,team:p.team,waiting:true}))};
 const inMatch=['prep','play','end','brief'].includes(r.phase),blind=me.team==='hunter'&&['prep','brief'].includes(r.phase);
 const spectator=me.status==='found'?Object.values(r.players).find(p=>p.team===me.team&&p.status==='alive'):null,eye=spectator||me;
 const objects=(blind?r.initialObjects:r.objects)||[];
 const packet={code:r.code,host:r.host,phase:r.phase,until:r.until||0,now,round:r.round||0,settings:r.settings,practice:!!r.practice,winner:r.winner,reason:r.reason,spectating:spectator?.id,
  players:Object.values(r.players).filter(p=>!p.waiting).map(p=>{
   const own=p.id===id,teammate=p.team===me.team,transformed=!!p.propId;
   const visible=own||inMatch&&!blind&&(teammate||!transformed&&p.status==='alive'&&(me.status==='found'||dist(eye,p)<35&&sight(eye,p,r.objects)));
   // Görünüm ada benzer, gizli bir bilgi değil: her pakette gider, böylece takımlar yer
   // değiştirdiğinde de doğru karakter çizilir.
   return {id:p.id,name:p.name,bot:p.bot,team:p.team,role:p.team,skin:p.skin,status:p.status,visible:!!visible,...(visible?{x:p.x,y:p.y||0,z:p.z,yaw:p.yaw,pitch:p.pitch,crouch:!!p.crouch}:{}),...((own||teammate)&&inMatch?{propId:p.propId}:{}),...(own?{water:p.water,changes:p.changes,decoys:p.decoys,locked:p.locked,ammo:p.ammo,reloadUntil:p.reloadUntil,exposed:p.exposedUntil>now,stillFor:p.stillAt?Math.round((now-p.stillAt)/1000):0}:{} )};
  }),
  objects:inMatch?objects.map(({id,type,x,y,z,angle,wet})=>({id,type,x,y:y||0,z,angle,wet})):[],
  effects:blind?[]:(r.effects||[]).filter(e=>now-e.at<1800&&(me.status==='found'||dist(eye,e)<35)&&(e.kind!=='idle'||me.team==='hunter'||e.owner===id)),
  shots:blind?[]:(r.shots||[]).filter(s=>now-s.at<650),events:blind?[]:(r.events||[]).filter(e=>now-e.at<4500)
 };
 if(me.team==='hider'&&!me.propId&&['prep','play'].includes(r.phase))packet.nearby=(r.objects||[]).filter(o=>accessibleObject(r,me,o.id)).map(o=>({id:o.id,type:o.type,y:o.y||0,distance:objectDistance(me,o)})).sort((a,b)=>a.distance-b.distance);
 return packet;
}
