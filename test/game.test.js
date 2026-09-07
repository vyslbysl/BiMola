import test from 'node:test';
import assert from 'node:assert/strict';
import {player,start,tick,action,possess,shuffle,shoot,reload,view,sanitizeSettings,configureRoom,syncBots,setTeam,PREP_MS,ROUND_MS,SHOT_MS,RELOAD_MS,JUMP_SPEED} from '../game.js';
import {free,propTypes,nearestHit,generateProps,zoneAt,zones,surfaceHeight} from '../public/world.js';
function room(size=1,botMode='off'){
 const r={code:'TEST',host:'a',phase:'lobby',settings:sanitizeSettings({teamSize:size,botMode,swapTeams:false}),players:{a:player('a','Avcı',false,'hunter'),b:player('b','Saklanan',false,'hider')}};
 assert.equal(start(r,1000).ok,true);return r;
}
function play(r){r.phase='play';r.until=999999;for(const p of Object.values(r.players))p.inputAt=20000;return r;}
function scenario(type='basket',wet=0){
 const r=play(room());r.objects=[{id:'target',type,x:0,z:7,angle:0,wet}];const h=r.players.a,p=r.players.b;h.x=0;h.z=10;h.yaw=0;h.pitch=Math.atan2(propTypes[type].height*.5-1.62,3);p.x=0;p.z=8;return {r,h,p,o:r.objects[0]};
}
function aim(h,o){const d=Math.hypot(o.x-h.x,o.z-h.z);h.yaw=Math.atan2(h.x-o.x,h.z-o.z);h.pitch=Math.atan2(propTypes[o.type].height*.5-1.62,d);}
test('one-to-one has 20-second prep and 180-second play, with hunters frozen during prep',()=>{
 const r=room(),h=r.players.a,old={x:h.x,z:h.z};assert.equal(r.until,1000+PREP_MS);h.input={x:1};h.inputAt=2000;tick(r,2000,.1);assert.equal(h.x,old.x);tick(r,1000+PREP_MS,.025);assert.equal(r.phase,'play');assert.equal(r.until,1000+PREP_MS+ROUND_MS);assert.equal(r.players.b.propId,null,'human keeps the first-choice decision after prep');
});
test('six versus six and twelve versus twelve fill exact equal teams without overlapping spawn geometry',()=>{
 for(const size of [6,12]){const r=room(size,'fill');assert.equal(Object.keys(r.players).length,size*2);for(const t of ['hunter','hider'])assert.equal(Object.values(r.players).filter(p=>p.team===t).length,size);for(const p of Object.values(r.players))assert.ok(free(p.x,p.z,.28,r.objects),`${p.name} has a usable spawn`);}
});
test('host settings sanitize bounds, preserve humans and reject non-host mutations',()=>{
 const r=room(2,'fill');r.phase='lobby';const original={...r.settings};assert.ok(configureRoom(r,{teamSize:6},'b').error);assert.deepEqual(r.settings,original);
 assert.ok(configureRoom(r,{teamSize:6,hideSeconds:99,roundSeconds:5},'a').ok);assert.equal(r.settings.hideSeconds,60);assert.equal(r.settings.roundSeconds,60);assert.equal(Object.keys(r.players).length,12);
 r.players.c=player('c','İkinci avcı',false,'hunter');syncBots(r);assert.ok(configureRoom(r,{teamSize:1},'a').error);assert.ok(r.players.c);assert.equal(r.settings.teamSize,6);
 assert.equal(sanitizeSettings({teamSize:500}).teamSize,12);assert.equal(sanitizeSettings({teamSize:-2}).teamSize,1);
 r.phase='play';assert.ok(configureRoom(r,{roundSeconds:300},'a').error);
});
test('custom bots obey per-team counts and incomplete teams cannot start',()=>{
 const r=room();r.phase='lobby';assert.ok(configureRoom(r,{teamSize:3,botMode:'custom',hunterBots:1,hiderBots:2},'a').ok);
 assert.equal(Object.values(r.players).filter(p=>p.bot&&p.team==='hunter').length,1);assert.equal(Object.values(r.players).filter(p=>p.bot&&p.team==='hider').length,2);assert.ok(start(r,30000).error);
 assert.ok(configureRoom(r,{hunterBots:2},'a').ok);assert.ok(start(r,30000).ok);
 r.phase='end';assert.ok(configureRoom(r,{teamSize:1,botMode:'custom',hunterBots:1},'a').error);
});
test('human team changes replace fill bots, with host-only moves of another player',()=>{
 const r=room(3,'fill');r.phase='lobby';assert.ok(setTeam(r,'b','hunter','b').ok);assert.equal(r.players.b.team,'hunter');assert.equal(Object.keys(r.players).length,6);assert.ok(setTeam(r,'a','hider','b').error);assert.equal(r.players.a.team,'hunter');assert.ok(setTeam(r,'b','hider','a').ok);
 r.settings.teamSelection='auto';assert.ok(setTeam(r,'b','hunter','b').error);assert.ok(setTeam(r,'b','hunter','a').ok);
});
test('initial choice requires nearby unoccupied visible prop, costs no shuffle, and replaces the object',()=>{
 const {r,p,o}=scenario();p.x=8;assert.equal(possess(r,p,o.id).ok,false);p.x=0;assert.equal(possess(r,p,o.id).ok,true);assert.equal(p.changes,3);assert.equal(p.propId,o.id);assert.equal(o.owner,p.id);assert.equal(p.x,o.x);assert.equal(possess(r,p,o.id).ok,false);
 r.players.c=player('c','Diğer',false,'hider');r.players.c.x=0;r.players.c.z=8;assert.equal(possess(r,r.players.c,o.id).ok,false);
 const q=scenario();q.p.x=-1;q.p.z=-5;q.o.x=-3.4;q.o.z=-5;assert.equal(possess(q.r,q.p,q.o.id).ok,false,'cannot possess through a partition');
});
test('exactly three random different transformations preserve position, water and ownership',()=>{
 const {r,p,o}=scenario('basket',40);assert.ok(possess(r,p,o.id).ok);const xy={x:o.x,z:o.z};
 for(let i=0;i<3;i++){const before=o.type,result=shuffle(r,p);assert.ok(result.ok);assert.notEqual(o.type,before);assert.equal(p.changes,2-i);assert.equal(o.wet,40);assert.equal(p.water,40);assert.deepEqual({x:o.x,z:o.z},xy);assert.equal(o.owner,p.id);}
 const final=o.type;assert.equal(shuffle(r,p).ok,false);assert.equal(o.type,final);assert.equal(p.changes,0);
});
test('moving moves the possessed world prop and locking freezes it; stale input stops movement',()=>{
 const {r,p,o}=scenario();possess(r,p,o.id);p.input={x:1,z:0};p.inputAt=20000;tick(r,20000,.1);assert.ok(p.x>0);assert.equal(o.x,p.x);assert.equal(o.z,p.z);
 action(r,p,{kind:'lock'},20001);const x=p.x;tick(r,20050,.1);assert.equal(p.x,x);action(r,p,{kind:'lock'},20060);tick(r,21000,.1);assert.equal(p.x,x);
 p.propId=null;p.x=13.2;p.z=0;p.input={x:1};p.inputAt=22000;tick(r,22000,.1);assert.equal(p.x,13.2,'walls prevent escape');
});
test('one spray settles a real object; a hidden player still soaks ten at a time up to 100',()=>{
 const dummy=scenario();dummy.p.x=5;assert.ok(shoot(dummy.r,dummy.h,20000));assert.deepEqual(dummy.r.results.at(-1).data,{wet:100,found:false,objectName:'Çamaşır sepeti',real:true});
 const {r,h,p,o}=scenario();possess(r,p,o.id);for(let i=0;i<9;i++){assert.ok(shoot(r,h,20000+i*SHOT_MS));assert.equal(p.status,'alive');assert.equal(r.results.at(-1).data.found,false);assert.equal(r.results.at(-1).data.real,false);}
 assert.equal(p.water,90);assert.ok(shoot(r,h,20000+9*SHOT_MS));assert.equal(o.wet,100);assert.equal(p.status,'found');assert.equal(r.results.at(-1).data.found,true);tick(r,22000,.025);assert.equal(r.winner,'hunter');
});
test('water cannon rate, 25-shot tank, empty-tank refusal, and two-second reload are authoritative',()=>{
 const {r,h,p}=scenario();p.x=5;for(let i=0;i<25;i++){assert.ok(shoot(r,h,20000+i*SHOT_MS));assert.equal(shoot(r,h,20000+i*SHOT_MS+1),false);}assert.equal(h.ammo,0);assert.equal(shoot(r,h,24000),false);assert.ok(reload(r,h,24000).ok);assert.equal(h.reloadUntil,24000+RELOAD_MS);assert.equal(shoot(r,h,25000),false);tick(r,26000,.025);assert.equal(h.ammo,100);assert.equal(h.reloadUntil,0);assert.ok(shoot(r,h,26001));
 const prep=room();assert.equal(shoot(prep,prep.players.a,5000),false);
});
test('nearest prop, walls, furniture and pitch determine water hits',()=>{
 const {r,h,p,o}=scenario();possess(r,p,o.id);r.objects.unshift({id:'front',type:'plant',x:0,z:8.5,angle:0,wet:0});assert.ok(shoot(r,h,20000));assert.equal(r.objects[0].wet,100);assert.equal(o.wet,0);
 r.objects=[o];h.x=-1;h.z=-5;o.x=-3.4;o.z=-5;p.x=o.x;p.z=o.z;aim(h,o);shoot(r,h,20500);assert.equal(o.wet,0,'partition occludes');
 const m=scenario();m.h.pitch=1;shoot(m.r,m.h,20000);assert.equal(m.o.wet,0,'aiming above prop misses');
 const hit=nearestHit({x:-8,y:.7,z:11},{x:0,y:0,z:-1},[{id:'behind',type:'plant',x:-8,z:6,wet:0}]);assert.equal(hit.kind,'wall','sofa blocks low shots');
});
test('hunter prep and brief use pristine room and omit hider coordinates and all ownership',()=>{
 const r=room(),p=r.players.b;const o={id:'privacy-prop',type:'basket',x:0,y:0,z:7,angle:0,wet:0};r.objects=[o];r.initialObjects=[{...o}];p.x=0;p.z=8;assert.ok(possess(r,p,o.id).ok);p.input={x:1};p.inputAt=2000;tick(r,2000,.1);
 for(const phase of ['prep','brief']){r.phase=phase;const packet=view(r,'a',2000);assert.equal(packet.players.find(p=>p.id==='b').x,undefined);assert.equal(packet.players.find(p=>p.id==='b').propId,undefined);assert.deepEqual(packet.objects.find(q=>q.id===o.id),r.initialObjects.find(q=>q.id===o.id));assert.ok(packet.objects.every(q=>!('owner'in q)));}
 r.phase='play';const packet=view(r,'a',2000);assert.equal(packet.players.find(p=>p.id==='b').x,undefined);assert.equal(packet.players.find(p=>p.id==='b').propId,undefined);assert.equal(packet.objects.find(q=>q.id===o.id).x,o.x);assert.ok(!JSON.stringify(packet).includes('"owner"'));
 const own=view(r,'b',2000);assert.equal(own.players.find(p=>p.id==='b').propId,o.id);assert.equal(own.players.find(p=>p.id==='b').changes,3);
});
test('water and disguise mapping are private to their allowed viewers',()=>{
 const {r,p,o}=scenario();possess(r,p,o.id);r.players.c=player('c','Arkadaş',false,'hider');const own=view(r,p.id,20000),team=view(r,'c',20000),enemy=view(r,'a',20000);
 assert.equal(own.players.find(q=>q.id===p.id).water,0);assert.equal(team.players.find(q=>q.id===p.id).propId,o.id);assert.equal(team.players.find(q=>q.id===p.id).water,undefined);assert.equal(enemy.players.find(q=>q.id===p.id).propId,undefined);assert.equal(enemy.players.find(q=>q.id===p.id).x,undefined);
});
test('time expiry rewards surviving hiders and found hiders only spectate teammates',()=>{
 const r=play(room(2,'fill'));r.until=21000;tick(r,21001,.025);assert.equal(r.winner,'hider');assert.equal(r.phase,'end');r.phase='play';r.players.b.status='found';const spectator=view(r,'b',21001).spectating;assert.ok(spectator);assert.equal(r.players[spectator].team,'hider');
});
test('next round swaps teams once and resets props, water, ammo and changes',()=>{
 const {r,h,p,o}=scenario();r.settings.swapTeams=true;possess(r,p,o.id);shuffle(r,p);o.wet=80;h.ammo=12;r.phase='end';assert.ok(start(r,50000).ok);assert.equal(h.team,'hider');assert.equal(p.team,'hunter');assert.equal(h.changes,3);assert.equal(p.ammo,100);assert.ok(r.objects.every(o=>o.wet===0&&!o.owner));assert.equal(r.round,2);
});
test('bot target selection is unchanged by private prop ownership',()=>{
 const make=owner=>{const r=play(room(2,'fill'));for(const p of Object.values(r.players))if(p.bot&&p.team==='hider'){p.propId='other';p.locked=true;}const hunter=Object.values(r.players).find(p=>p.bot&&p.team==='hunter');hunter.x=0;hunter.z=10;r.objects=[{id:'one',type:'basket',x:0,z:7,angle:0,wet:0},{id:'two',type:'basket',x:3,z:7,angle:0,wet:0}];if(owner)r.objects[1].owner='b';return {r,hunter};};
 const a=make(false),b=make(true),original=Math.random;try{Math.random=()=>.25;tick(a.r,20000,.025);tick(b.r,20000,.025);}finally{Math.random=original;}assert.equal(a.hunter.botTarget,b.hunter.botTarget);assert.deepEqual(a.hunter.input,b.hunter.input);
});

test('first choice after prep preserves water already received by the human',()=>{const {r,p,o}=scenario('basket',10);p.water=70;assert.ok(possess(r,p,o.id).ok);assert.equal(p.water,70);assert.equal(o.wet,70);const q=scenario('basket',60);q.p.water=20;assert.ok(possess(q.r,q.p,q.o.id).ok);assert.equal(q.p.water,60);});

test('a hider jumps onto counter height, cannot jump while locked, and falls off an edge',()=>{
 const {r,p}=scenario();p.propId=null;p.locked=false;p.x=8;p.z=-11.7;p.y=0;p.vy=0;p.grounded=true;p.inputAt=20000;
 assert.equal(free(8,-10,.28),false,'the island is solid at floor level');
 assert.equal(surfaceHeight(8,-10),1,'and one metre tall to stand on');
 // One hop while walking forward puts the hider up on the island top.
 for(let t=20000;t<20700;t+=50){p.input={x:0,z:1,jump:t===20000};p.inputAt=t;tick(r,t,.05);}
 assert.equal(p.y,1,'ended the hop standing on the island');
 assert.equal(p.grounded,true);
 assert.ok(p.z>-11,'and moved in over the island footprint');
 // Standing still up there keeps the hider up there.
 for(let t=20700;t<21000;t+=50){p.input={x:0,z:0};p.inputAt=t;tick(r,t,.05);}
 assert.equal(p.y,1,'stays put on the surface');
 // Walking on past the far edge drops the hider back to the floor.
 for(let t=21000;t<22200;t+=50){p.input={x:0,z:1};p.inputAt=t;tick(r,t,.05);}
 assert.equal(p.y,0,'stepped off the edge and landed back on the floor');
 // A pinned-down disguise stays pinned: F means F.
 const pinned=scenario();pinned.p.locked=true;pinned.p.input={jump:true};pinned.p.inputAt=20000;
 tick(pinned.r,20000,.05);assert.equal(pinned.p.y,0);assert.equal(pinned.p.vy,0);
 assert.ok(JUMP_SPEED**2/36>1.05,'a jump clears counter height');
});
test('a disguise is aimed by hand with Z/X and no longer snaps to the player view',()=>{
 const {r,p,o}=scenario();assert.ok(possess(r,p,o.id).ok);o.angle=0;p.yaw=1.2;
 p.input={x:1,z:0};p.inputAt=20000;tick(r,20000,.1);
 assert.ok(p.x>0,'the hider still moves');assert.equal(o.angle,0,'moving no longer spins the disguise');
 p.input={x:0,z:0,spin:1};p.inputAt=20100;tick(r,20100,.1);const turned=o.angle;assert.ok(turned>0,'Z/X turns it');
 p.input={x:0,z:0,spin:-1};p.inputAt=20200;tick(r,20200,.1);assert.ok(o.angle<turned,'and back again');
});
test('escape speed still cannot cross a 25 cm interior wall',()=>{
 const {r,p}=scenario();p.propId=null;p.locked=false;p.water=50;p.x=-3.2;p.z=-.5;
 for(let t=20000;t<21000;t+=50){p.input={x:1,z:0};p.inputAt=t;tick(r,t,.05);}
 assert.ok(p.x<-2.7,`the west spine wall stopped the sprint at ${p.x.toFixed(2)}`);
});
test('every room spawns only what belongs in it and the host can dial the object count',()=>{
 for(const total of [24,51,90]){
  const props=generateProps(total);
  assert.ok(Math.abs(props.length-total)<=3,`asked for ${total}, laid out ${props.length}`);
  for(const o of props){
   const zone=zoneAt(o.x,o.z);
   assert.ok(zone,'nothing is dumped in the hallway');
   assert.ok(zone.types.includes(o.type)||zone.signature===o.type,`${o.type} does not belong in ${zone.id}`);
   assert.ok(o.y===0||o.y===surfaceHeight(o.x,o.z),'anything off the floor sits on a real surface');
  }
  assert.equal(props.filter(o=>o.type==='logTable').length,1,'exactly one log table');
  assert.equal(props.filter(o=>o.type==='painting').length,1,'exactly one painting');
 }
 assert.ok(zones.find(z=>z.id==='bedroom').types.includes('basket'),'the laundry basket lives in the bedroom');
 for(const id of ['kitchen','entry','living','office'])assert.ok(!zones.find(z=>z.id===id).types.includes('basket'),`no laundry basket in ${id}`);
});

test('size decides what can be climbed and what can be crawled under',()=>{
 const pouf={id:'pouf',type:'ottoman',x:6,z:12,y:0,angle:0,wet:0};
 assert.equal(surfaceHeight(6,12,undefined,[pouf]),propTypes.ottoman.height,'a pouf is wide enough to stand on');
 assert.equal(surfaceHeight(6,12,undefined,[{...pouf,type:'mug'}]),0,'a mug is not');
 assert.equal(surfaceHeight(6,12,undefined,[pouf],'pouf'),0,'and never your own disguise');
 // The dining table stands on legs, so a small disguise fits underneath and a person does not.
 assert.equal(free(7.5,1,propTypes.mug.radius,[],null,0,propTypes.mug.height),true,'a mug slips under the dining table');
 assert.equal(free(7.5,1,.28,[],null,0),false,'a player cannot follow it under there');
 const table={id:'t',type:'logTable',x:-6,z:5,y:0,angle:0,wet:0};
 assert.equal(free(-6,5,propTypes.mug.radius,[table],null,0,propTypes.mug.height),true,'the log table is open underneath too');
 assert.equal(free(-6,5,.28,[table],null,0),false,'but not to a player on foot');
 assert.equal(free(-6,5,propTypes.plant.radius,[table],null,0,propTypes.plant.height),false,'a tall plant pot does not fit under it');
});

test('three permanent decoys: authoritative limits, escape clearance, no ownership leak, round reset',()=>{
 const {r,p,o}=scenario();assert.ok(possess(r,p,o.id).ok);
 r.phase='prep';assert.equal(action(r,p,{kind:'decoy'},1000).ok,false);r.phase='play';
 assert.equal(action(r,r.players.a,{kind:'decoy'},1000).ok,false);
 for(let i=0;i<3;i++)assert.ok(action(r,p,{kind:'decoy'},2000+i).ok);
 assert.equal(p.decoys,0);assert.equal(action(r,p,{kind:'decoy'},2100).ok,false);
 const copies=r.objects.filter(q=>q.decoyOf);assert.equal(copies.length,3);
 assert.ok(free(p.x,p.z,propTypes[o.type].radius,r.objects,o.id));
 assert.equal(surfaceHeight(p.x,p.z,1.05,r.objects,o.id),0,'copies cannot lift their own creator');
 tick(r,50000,.025);assert.equal(r.objects.filter(q=>q.decoyOf).length,3,'no timeout');
 const packet=view(r,r.players.a.id,50000);assert.ok(packet.objects.every(q=>!('decoyOf' in q)&&!('owner' in q)));assert.equal(packet.players.find(q=>q.id===p.id).decoys,undefined);
 r.phase='end';assert.ok(start(r,60000).ok);assert.equal(p.decoys,3);assert.ok(r.objects.every(q=>!q.decoyOf));
});
test('one hit destroys only the copy and emits a visual effect without eliminating its creator',()=>{
 const {r,p,h,o}=scenario();assert.ok(possess(r,p,o.id).ok);assert.ok(action(r,p,{kind:'decoy'},2000).ok);
 const copy=r.objects.find(q=>q.decoyOf);p.z=o.z=4;
 aim(h,copy);assert.ok(shoot(r,h,3000));assert.ok(!r.objects.includes(copy));assert.equal(p.water,0);assert.equal(p.status,'alive');assert.equal(r.effects.at(-1).kind,'decoy');
 assert.equal(r.results.at(-1).data.found,false);assert.equal(r.results.at(-1).data.decoy,true);assert.equal(r.results.at(-1).data.real,false);
});
test('decoys cannot be possessed and cannot be placed while airborne or found',()=>{
 const {r,p,o}=scenario();assert.ok(possess(r,p,o.id).ok);p.grounded=false;assert.equal(action(r,p,{kind:'decoy'},2000).ok,false);p.grounded=true;assert.ok(action(r,p,{kind:'decoy'},2000).ok);
 const copy=r.objects.find(q=>q.decoyOf),q=player('c','Other',false,'hider');q.x=0;q.z=8;r.players.c=q;assert.equal(possess(r,q,copy.id).ok,false);
 p.status='found';assert.equal(action(r,p,{kind:'decoy'},2000).ok,false);
});
test('full soak emits one reveal animation, hidden during hunter preparation',()=>{
 const {r,p,h,o}=scenario('basket',90);assert.ok(possess(r,p,o.id).ok);assert.ok(shoot(r,h,3000));assert.equal(p.status,'found');assert.equal(r.effects.length,1);assert.equal(r.effects[0].kind,'reveal');assert.equal(view(r,h.id,3000).effects.length,1);
 r.phase='prep';assert.equal(view(r,h.id,3000).effects.length,0);
});
