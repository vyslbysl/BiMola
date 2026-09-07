import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures,propTypes,generateProps,free,nearestHit,reachable,blocksDoor} from '../public/world.js';
import {assembly,moveAssembly,settleObjects} from '../public/physics.js';
import {player,possess,action,shoot,tick,start,view,sanitizeSettings} from '../game.js';
function room(){return {code:'ITEMS',host:'a',phase:'play',until:999999,settings:sanitizeSettings({teamSize:1,botMode:'off',swapTeams:false}),players:{a:player('a','Avcı',false,'hunter'),b:player('b','Saklanan',false,'hider')},objects:fixtures.map(o=>({...o})),shots:[],effects:[],results:[],events:[]};}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('all independent room contents exist once and reference an available visual model',()=>{
 const all=generateProps(),ids=new Set(all.map(o=>o.id));assert.equal(ids.size,all.length);assert.ok(fixtures.length>200);
 for(const o of fixtures){assert.ok(propTypes[o.type],o.type);assert.equal(all.filter(q=>q.id===o.id).length,1);if(o.supportId)assert.ok(ids.has(o.supportId));}
 for(const type of ['f_game','f_dining','diningChair','officeChair','laptop','plate','faucet','stove','bedPillow','largePlant','glassCup','f_coffee'])assert.ok(all.some(o=>o.type===type),type);
});
test('large furniture is reachable from its near edge and furniture occludes selection correctly',()=>{
 const r=room(),p=r.players.b,table=r.objects.find(o=>o.id==='dining');p.x=3.1;p.z=1;assert.ok(Math.hypot(p.x-table.x,p.z-table.z)>4);assert.ok(reachable(p,table,r.objects));assert.ok(possess(r,p,table.id).ok);assert.equal(p.propId,'dining');
 const h=r.players.a;h.x=1;h.z=1;assert.equal(reachable(h,table,r.objects),false,'hallway wall occludes');
});
test('moving and rotating a table carries its plates, stacked items and another disguised player',()=>{
 const r=room(),table=r.objects.find(o=>o.id==='dining'),plate=r.objects.find(o=>o.id==='dining-plate0'),before={...plate};
 r.players.b.propId=plate.id;plate.owner='b';Object.assign(r.players.b,{x:plate.x,y:plate.y,z:plate.z});
 assert.ok(moveAssembly(r,table,{x:table.x+.15,z:table.z,y:0,angle:table.angle}));near(plate.x,before.x+.15);near(r.players.b.x,plate.x);
 const oldRoot={...table},oldPlate={...plate};assert.ok(moveAssembly(r,table,{x:table.x,z:table.z,y:0,angle:.1},{check:false}));
 near(plate.x,oldRoot.x+Math.cos(.1)*(oldPlate.x-oldRoot.x)+Math.sin(.1)*(oldPlate.z-oldRoot.z));near(plate.y,oldPlate.y);
});
test('a bare player standing on a moving bed rides with it',()=>{
 const r=room(),bed=r.objects.find(o=>o.id==='bed'),p=r.players.b;p.x=bed.x;p.z=bed.z;p.y=.77;
 assert.ok(moveAssembly(r,bed,{x:bed.x+.2,z:bed.z,y:0,angle:0}));near(p.x,bed.x);near(p.y,.77);
});
test('furniture leaves no invisible static collision or static water target behind',()=>{
 const table={id:'dining',type:'f_dining',x:8,y:0,z:-6,angle:0,wet:0};const r={objects:[table],players:{}};
 assert.equal(free(8,-6,.28,r.objects),false);assert.ok(moveAssembly(r,table,{x:11,z:-6,y:0,angle:0},{check:false}));assert.equal(free(8,-6,.28,r.objects),true);
 const hit=nearestHit({x:8,y:.78,z:-3},{x:0,y:0,z:-1},r.objects);assert.notEqual(hit.id,'dining');
});
test('oriented large footprints stop at walls and copies cannot seal a doorway',()=>{
 const r=room(),table={id:'big',type:'f_dining',x:0,y:0,z:4,angle:0,wet:0};r.objects=[table];
 assert.equal(moveAssembly(r,table,{x:2,z:4,y:0,angle:0}),false);
 table.x=-2.4;table.z=8;assert.ok(blocksDoor(table));r.players.b.propId=table.id;table.owner='b';assert.equal(action(r,r.players.b,{kind:'decoy'}).ok,false);assert.equal(r.players.b.decoys,3);
});
test('a furniture copy includes its contents; hitting any copied plate dissolves the whole copy',()=>{
 const r=room(),p=r.players.b,table=r.objects.find(o=>o.id==='dining');p.x=5;p.z=1;assert.ok(possess(r,p,table.id).ok);
 const count=assembly(r.objects,table).length;assert.ok(action(r,p,{kind:'decoy'},2000).ok);const copies=r.objects.filter(o=>o.decoyOf);assert.equal(copies.length,count);assert.ok(count>10);
 const plate=copies.find(o=>o.type==='plate'),h=r.players.a;const rootId=plate.decoyRoot;
 r.objects=r.objects.filter(o=>o.decoyRoot===rootId);h.x=plate.x;h.z=plate.z-.3;h.y=1;h.yaw=Math.PI;h.pitch=Math.atan2(plate.y+.012-2.62,.3);
 // The very steep angle is beyond the weapon clamp, so put the shot at a normal reachable slope.
 h.z=plate.z-1;h.y=0;h.pitch=Math.atan2(plate.y+.012-1.62,1);
 assert.ok(shoot(r,h,3000));assert.equal(r.objects.length,0);assert.equal(r.effects.at(-1).kind,'decoy');assert.equal(p.status,'alive');assert.equal(p.water,0);
});
test('independent contents settle after their support disappears and the round rebuilds the house',()=>{
 const r=room(),plate={id:'loose',type:'plate',x:0,y:.8,z:6,angle:0,wet:0,supportId:'gone'};r.objects=[plate];
 for(let i=0;i<20;i++)settleObjects(r,.05);near(plate.y,0);assert.ok(start(r,1000).ok);assert.ok(r.objects.some(o=>o.id==='dining'));assert.equal(r.players.b.decoys,3);
});
test('dynamic inventory, including fixtures, is sanitized in hunter packets',()=>{
 const r=room(),p=r.players.b;p.x=5;p.z=1;assert.ok(possess(r,p,'dining').ok);assert.ok(action(r,p,{kind:'decoy'},1000).ok);
 const packet=view(r,'a',1000);for(const o of packet.objects)for(const key of ['owner','supportId','decoyOf','decoyRoot'])assert.ok(!(key in o),key);
});
