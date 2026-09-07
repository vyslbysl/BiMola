import {assembly,moveAssembly,detachChildren,settleObjects} from './public/physics.js';
import {randomUUID} from 'node:crypto';
import {free,sight,dist,propTypes,dimensions,objectDistance,reachable,blocksDoor,fixtures,nearestHit,pathTo,generateProps,zoneAt,zones,commonTypes,surfaceHeight,PLACEMENT_PAD,STAND_MAX_HEIGHT,BODY_HEIGHT,DEFAULT_PROP_COUNT,MIN_PROP_COUNT,MAX_PROP_COUNT} from './public/world.js';
export {dist};
export const PREP_MS=20000,ROUND_MS=180000,SHOT_MS=125,RELOAD_MS=2000,HUNTER_SPEED=4.3,ESCAPE_SPEED=HUNTER_SPEED*2;
// Hiders can hop onto counters, tables and beds: JUMP_SPEED clears the 1 m kitchen counter with
// a little room to spare (apex = JUMP_SPEED^2 / 2*GRAVITY ~ 1.21 m). SPIN_SPEED is how fast a
// disguise can be turned on the spot, in radians per second.
export const GRAVITY=18,JUMP_SPEED=6.6,SPIN_SPEED=2.4;
export const defaultSettings={teamSize:3,botMode:'fill',hunterBots:0,hiderBots:0,hideSeconds:20,roundSeconds:180,teamSelection:'choose',swapTeams:true,objectCount:DEFAULT_PROP_COUNT};
const teams=['hunter','hider'];
const integer=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.round(Number(v)))):fallback;
export function sanitizeSettings(input={},previous=defaultSettings){
 input=input&&typeof input==='object'?input:{};
 const settings={...defaultSettings,...previous};
 if('teamSize'in input)settings.teamSize=integer(input.teamSize,1,12,settings.teamSize);
 if(['off','fill','custom'].includes(input.botMode))settings.botMode=input.botMode;
 for(const key of ['hunterBots','hiderBots'])settings[key]=integer(input[key]??settings[key],0,settings.teamSize,0);
 if('hideSeconds'in input)settings.hideSeconds=integer(input.hideSeconds,10,60,20);
 if('roundSeconds'in input)settings.roundSeconds=integer(input.roundSeconds,60,600,180);
 if(['choose','auto'].includes(input.teamSelection))settings.teamSelection=input.teamSelection;
 if('objectCount'in input)settings.objectCount=integer(input.objectCount,MIN_PROP_COUNT,MAX_PROP_COUNT,settings.objectCount);
 if(typeof input.swapTeams==='boolean')settings.swapTeams=input.swapTeams;
 return settings;
}
export function player(id,name,bot=false,team='hider'){
 return {id,name,bot,team:teams.includes(team)?team:'hider',role:teams.includes(team)?team:'hider',x:0,y:0,z:11,vy:0,grounded:true,yaw:0,pitch:0,status:'alive',input:{},inputAt:0,propId:null,water:0,changes:3,decoys:3,locked:false,ammo:100,reloadUntil:0,lastShot:-Infinity,path:[],pathAt:0};
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
   r.players[id]=player(id,`${team==='hunter'?'Avcı':'Saklanan'} Bot ${i+1}`,true,team);
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
 if((r.round||0)>0&&r.settings.swapTeams){for(const p of Object.values(r.players))p.team=p.role=p.team==='hunter'?'hider':'hunter';[r.settings.hunterBots,r.settings.hiderBots]=[r.settings.hiderBots,r.settings.hunterBots];}
 r.round=(r.round||0)+1;r.phase='prep';r.until=now+r.settings.hideSeconds*1000;r.winner=null;r.reason=null;r.shots=[];r.effects=[];r.results=[];r.events=[];r.objects=generateProps(r.settings.objectCount);r.initialObjects=r.objects.map(o=>({...o}));
 let h=0,k=0;const spawned=[];
 for(const p of Object.values(r.players)){
  const i=p.team==='hunter'?h++:k++;let x=-3+(i%6)*1.2,z=p.team==='hunter'?-3-Math.floor(i/6)*1.1:10-Math.floor(i/6)*1.1;
  // Hiders start spread around the rooms, one room after another, so everybody opens the round with
  // something within reach. Hunters keep their huddle in the hallway, where they wait out the count.
  if(p.team==='hider'){
   const zone=zones[i%zones.length];
   for(let a=0;a<160;a++){
    const px=zone.xmin+PLACEMENT_PAD+Math.random()*Math.max(.2,zone.xmax-zone.xmin-2*PLACEMENT_PAD);
    const pz=zone.zmin+PLACEMENT_PAD+Math.random()*Math.max(.2,zone.zmax-zone.zmin-2*PLACEMENT_PAD);
    if(free(px,pz,.28,r.objects)&&!spawned.some(q=>dist({x:px,z:pz},q)<.9)){x=px;z=pz;break;}
   }
  }
  if(!free(x,z,.28,r.objects)||spawned.some(q=>dist({x,z},q)<.65)){const base={x,z};search:for(let radius=.75;radius<6;radius+=.75)for(let j=0;j<16;j++){const px=base.x+Math.cos(j*Math.PI/8)*radius,pz=base.z+Math.sin(j*Math.PI/8)*radius;if(free(px,pz,.28,r.objects)&&!spawned.some(q=>dist({x:px,z:pz},q)<.65)){x=px;z=pz;break search;}}}spawned.push({x,z});
  Object.assign(p,{role:p.team,x,z,y:0,vy:0,grounded:true,yaw:p.team==='hunter'?Math.PI:0,pitch:0,status:'alive',input:{},inputAt:now,propId:null,water:0,changes:3,decoys:3,locked:false,ammo:100,reloadUntil:0,lastShot:-Infinity,path:[],pathAt:0,goal:null,botTarget:null,botTargetUntil:0,botScanned:new Set(),botBurstUntil:0,lastProgressAt:now,lastProgress:{x,z}});
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
 const zone=zoneAt(o.x,o.z);const pool=[...new Set([...(zone?.types||commonTypes),...fixtures.filter(q=>!zone||zoneAt(q.x,q.z)?.id===zone.id).map(q=>q.type)])];
 const attached=new Set(assembly(r.objects,o).map(q=>q.id));const candidates=pool.filter(type=>{const q={...o,type},t=propTypes[type];return type!==o.type&&!blocksDoor(q)&&free(o.x,o.z,t.radius,r.objects,o.id,o.y||0,t.height,q,attached);});
 if(!candidates.length)return {ok:false,error:'Burada başka bir nesneye yer yok. Biraz açık alana geç.'};
 detachChildren(r.objects,o);delete o.supportId;o.anchored=false;o.type=candidates[Math.floor(Math.random()*candidates.length)];p.changes--;return {ok:true,type:o.type,changes:p.changes};
}
export function decoy(r,p,now=Date.now()){
 if(!p||r.phase!=='play'||p.team!=='hider'||p.status!=='alive'||!p.propId)return {ok:false,error:'Kopyayı av başladıktan sonra, bir nesneyken bırakabilirsin.'};
 if(p.decoys<=0)return {ok:false,error:'Bu turdaki üç kopyanı kullandın.'};
 const source=r.objects.find(o=>o.id===p.propId&&o.owner===p.id);
 if(!source||!p.grounded)return {ok:false,error:'Kopyayı yere bastığında bırak.'};
 if(blocksDoor(source))return {ok:false,error:'Kopyayı kapı geçişinden uzağa bırak.'};
 const group=assembly(r.objects,source),rootId=randomUUID(),ids=new Map(group.map(q=>[q.id,q===source?rootId:randomUUID()]));
 for(const q of group)r.objects.push({id:ids.get(q.id),type:q.type,x:q.x,y:q.y||0,z:q.z,angle:q.angle,wet:q.wet,decoyOf:source.id,decoyRoot:rootId,...(ids.has(q.supportId)?{supportId:ids.get(q.supportId)}:{})});
 p.decoys--;p.locked=false;
 return {ok:true,decoys:p.decoys};
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
 const pitch=Math.max(-1.35,Math.min(1.35,p.pitch||0));
 const direction={x:-Math.sin(p.yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(p.yaw)*Math.cos(pitch)},from={x:p.x,y:1.62+(p.y||0),z:p.z};
 const bodies=Object.values(r.players).filter(q=>q.id!==p.id&&q.status==='alive'&&!q.propId);
 const hit=nearestHit(from,direction,r.objects,bodies);
 r.shots.push({id:randomUUID(),from,to:hit.point,at:now,shooter:p.id});r.shots=r.shots.slice(-100);
 let target,o,wet,objectName;
 if(hit.kind==='object'){
  o=r.objects.find(o=>o.id===hit.id);target=o.owner?r.players[o.owner]:null;
  // A plain piece of decor is settled with a single spray — no point emptying the tank into it.
  // Only a disguised player soaks up ten percent at a time on the way to a hundred.
  o.wet=target?Math.min(100,o.wet+10):100;wet=o.wet;objectName=propTypes[o.type].name;
  if(target)target.water=wet;
 }else if(hit.kind==='player'){
  target=r.players[hit.id];if(target?.team!=='hider')target=null;
  if(target){target.water=Math.min(100,target.water+10);wet=target.water;objectName='Oyuncu';}
 }
 if(wet!==undefined){
  const found=!!target&&target.status==='alive'&&wet>=100;
  // A hit that lands on nobody's disguise is confirmed as a real object right away — no need to keep
  // emptying the tank into it to find out. A hit hider is unlocked immediately so they can run for it.
  const real=hit.kind==='object'&&!target&&!o?.decoyOf;
  if(o?.decoyOf){burst(r,o,now,'decoy');r.objects=r.objects.filter(q=>q.id!==o.id&&(!o.decoyRoot||q.decoyRoot!==o.decoyRoot));}
  if(found){burst(r,target,now);target.status='found';target.input={};target.locked=true;if(o)delete o.owner;notice(r,`${target.name} bulundu!`,now);}
  else if(target)target.locked=false;
  r.results.push({playerId:p.id,event:'hit',data:{wet,found,objectName,real,...(o?.decoyOf?{decoy:true}:{})}});
 }
 return true;
}
function autoHide(r,p){
 const choices=r.objects.filter(o=>!o.owner&&!o.decoyOf&&o.wet<100);
 if(!choices.length)return;
 const visible=choices.filter(o=>sight(p,o));visible.sort((a,b)=>dist(p,a)-dist(p,b));
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
  const nearby=candidates.filter(o=>sight(p,o)&&dist(p,o)<12);
  const pool=nearby.length?nearby:candidates;target=pool[Math.floor(Math.random()*pool.length)];p.botTarget=target.id;p.botTargetUntil=now+14000;p.pathAt=0;
 }
 const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz),y=(target.y||0)+propTypes[target.type].height*.5;
 p.yaw=Math.atan2(-dx,-dz);p.pitch=Math.atan2(y-(1.62+(p.y||0)),d);
 const direction={x:-Math.sin(p.yaw)*Math.cos(p.pitch),y:Math.sin(p.pitch),z:-Math.cos(p.yaw)*Math.cos(p.pitch)};
 const check=nearestHit({x:p.x,y:1.62+(p.y||0),z:p.z},direction,r.objects);
 if(d<10&&check.kind==='object'&&check.id===target.id){p.input={fire:true};if(p.ammo<4)reload(r,p,now);return;}
 if(now>p.pathAt||!p.path.length){p.path=pathTo(p,target,r.objects);p.pathAt=now+2000;}
 while(p.path.length&&dist(p,p.path[0])<.5)p.path.shift();const waypoint=p.path[0]||target;
 let x=waypoint.x-p.x,z=waypoint.z-p.z,len=Math.hypot(x,z);if(len>.1){x/=len;z/=len;}
 // A short local detour keeps static props from trapping a grid path follower.
 if(!free(p.x+x*.65,p.z+z*.65,.28,r.objects)){
  const alternatives=[{x:-z,z:x},{x:z,z:-x},{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}].filter(v=>free(p.x+v.x*.65,p.z+v.z*.65,.28,r.objects));
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
 const ps=Object.values(r.players);
 for(const p of ps){
  if(p.status!=='alive')continue;
  if(p.reloadUntil&&now>=p.reloadUntil){p.ammo=100;p.reloadUntil=0;}
  if(p.team==='hunter'&&r.phase==='prep')continue;
  if(p.bot)botInput(r,p,now);else if(now-p.inputAt>500)p.input={};
  const o=p.propId?r.objects.find(o=>o.id===p.propId):null,radius=o?propTypes[o.type].radius:.28;
  // The disguise decides what fits where: a mug can duck under the dining table, a wardrobe-sized
  // player cannot, and anything broad enough doubles as a step to jump on.
  const tall=o?propTypes[o.type].height:BODY_HEIGHT;
  let x=Number(p.input.x)||0,z=Number(p.input.z)||0,len=Math.hypot(x,z);
  const attempt=(nx,nz,ny=p.y,angle=o?.angle||0)=>{
   if(o){const moved=moveAssembly(r,o,{x:nx,z:nz,y:ny,angle});if(moved){p.x=o.x;p.z=o.z;p.y=o.y;}return moved;}
   if(!free(nx,nz,radius,r.objects,null,ny,tall))return false;p.x=nx;p.z=nz;p.y=ny;return true;
  };
  if(len&&!p.locked){
   x/=len;z/=len;const speed=p.team==='hunter'?HUNTER_SPEED:p.water>0?ESCAPE_SPEED:o?2.8:4;
   for(const [axis,amount]of [['x',x*speed*dt],['z',z*speed*dt]]){const steps=Math.max(1,Math.ceil(Math.abs(amount)/.1));for(let i=0;i<steps;i++){if(!attempt(p.x+(axis==='x'?amount/steps:0),p.z+(axis==='z'?amount/steps:0)))break;if(o){delete o.supportId;o.anchored=false;}}}
  }
  const spin=Math.max(-1,Math.min(1,Number(p.input.spin)||0));
  if(o&&spin){const turns=Math.max(1,Math.ceil(Math.abs(spin*SPIN_SPEED*dt)/.035));for(let i=0;i<turns;i++)if(!attempt(p.x,p.z,p.y,(o.angle||0)+spin*SPIN_SPEED*dt/turns))break;}
  if(p.team==='hider'&&!o?.anchored){
   const parent=r.objects.find(q=>q.id===o?.supportId);
   const ground=parent?(parent.y||0)+(propTypes[parent.type].surface??propTypes[parent.type].height):surfaceHeight(p.x,p.z,Math.max(STAND_MAX_HEIGHT,p.y+.08),r.objects,p.propId);
   if(p.input.jump&&p.grounded&&!p.locked){p.vy=JUMP_SPEED;if(o)delete o.supportId;}
   p.vy-=GRAVITY*dt;const ny=Math.max(ground,p.y+p.vy*dt);
   if(o){if(!attempt(p.x,p.z,ny))p.vy=0;}else p.y=ny;
   if(p.y<=ground+.005){p.vy=0;p.grounded=true;}else p.grounded=false;
  }
  if(o){o.x=p.x;o.y=p.y;o.z=p.z;}
  if(p.team==='hunter'&&p.input.fire)shoot(r,p,now);
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
 const inMatch=['prep','play','end','brief'].includes(r.phase),blind=me.team==='hunter'&&['prep','brief'].includes(r.phase);
 const spectator=me.status==='found'?Object.values(r.players).find(p=>p.team===me.team&&p.status==='alive'):null,eye=spectator||me;
 const objects=(blind?r.initialObjects:r.objects)||[];
 const packet={code:r.code,host:r.host,phase:r.phase,until:r.until||0,now,round:r.round||0,settings:r.settings,practice:!!r.practice,winner:r.winner,reason:r.reason,spectating:spectator?.id,
  players:Object.values(r.players).map(p=>{
   const own=p.id===id,teammate=p.team===me.team,transformed=!!p.propId;
   const visible=own||inMatch&&!blind&&(teammate||!transformed&&p.status==='alive'&&dist(eye,p)<35&&sight(eye,p));
   return {id:p.id,name:p.name,bot:p.bot,team:p.team,role:p.team,status:p.status,visible:!!visible,...(visible?{x:p.x,y:p.y||0,z:p.z,yaw:p.yaw,pitch:p.pitch}:{}),...((own||teammate)&&inMatch?{propId:p.propId}:{}),...(own?{water:p.water,changes:p.changes,decoys:p.decoys,locked:p.locked,ammo:p.ammo,reloadUntil:p.reloadUntil}:{} )};
  }),
  objects:inMatch?objects.map(({id,type,x,y,z,angle,wet})=>({id,type,x,y:y||0,z,angle,wet})):[],
  effects:blind?[]:(r.effects||[]).filter(e=>now-e.at<1800&&dist(eye,e)<35),
  shots:blind?[]:(r.shots||[]).filter(s=>now-s.at<650),events:blind?[]:(r.events||[]).filter(e=>now-e.at<4500)
 };
 if(me.team==='hider'&&!me.propId&&['prep','play'].includes(r.phase))packet.nearby=(r.objects||[]).filter(o=>accessibleObject(r,me,o.id)).map(o=>({id:o.id,type:o.type,y:o.y||0,distance:objectDistance(me,o)})).sort((a,b)=>a.distance-b.distance);
 return packet;
}
