import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponPose} from '../public/weapon.js';
import {player,shoot,tick,sanitizeSettings} from '../game.js';
const room=()=>({phase:'play',until:999999,settings:sanitizeSettings({botMode:'off'}),players:{a:player('a','Avcı',false,'hunter'),b:player('b','Saklanan',false,'hider')},objects:[],shots:[],effects:[],events:[],results:[]});
test('water starts at the barrel below and to the side of the eyes and converges on the reticle',()=>{
 const r=room(),p=r.players.a;Object.assign(p,{x:0,y:0,z:7,yaw:0,pitch:0});r.objects=[{id:'target',mapId:'market',type:'washer',x:0,y:.8,z:3,angle:0,wet:0}];
 assert.ok(shoot(r,p,1000));const shot=r.shots[0],pose=weaponPose(p);assert.deepEqual(shot.from,pose.muzzle);assert.ok(shot.from.y<pose.eye.y);assert.ok(shot.from.x>pose.eye.x);assert.equal(r.objects[0].wet,100);
});
test('a clear eye ray cannot shoot through cover blocking the barrel',()=>{
 const r=room(),p=r.players.a;Object.assign(p,{x:0,y:0,z:7,yaw:0,pitch:0});
 r.objects=[{id:'cover',mapId:'market',type:'washer',x:.65,y:.4,z:6.5,angle:0,wet:0},{id:'target',mapId:'market',type:'washer',x:0,y:.8,z:3,angle:0,wet:0}];
 shoot(r,p,1000);assert.equal(r.objects[1].wet,0);
});
test('jumping characters cannot move their heads through the map ceiling',()=>{
 const r=room(),p=r.players.a;Object.assign(p,{x:0,y:3,z:10,grounded:true,input:{jump:true},inputAt:1000});r.objects=[{id:'floor',type:'f_dining',mapId:'arcade',x:0,y:2.2,z:10,angle:0}];
 for(let i=0;i<20;i++){p.inputAt=1000+i*25;tick(r,p.inputAt,.025);assert.ok(p.y+1.75<=4.8+.001);}
});
