import {propTypes,dimensions,contains,free,blocksDoor} from './world.js';

export function supportedBy(child,parent){
 if(child.id===parent.id||child.decoyOf===parent.id)return false;
 if(child.supportId===parent.id)return true;
 const t=propTypes[parent.type];if(t.flat)return false;
 const top=(parent.y||0)+(t.surface??t.height);
 return Math.abs((child.y||0)-top)<.09&&contains(parent,child.x,child.z,-.035);
}
export function assembly(objects,root){
 const result=[root],ids=new Set([root.id]);
 for(let i=0;i<result.length;i++)for(const o of objects)if(!ids.has(o.id)&&!o.decoyOf&&supportedBy(o,result[i])){ids.add(o.id);result.push(o);}
 return result;
}
export function moveAssembly(room,root,next,{check=true}={}){
 const items=assembly(room.objects,root),ids=new Set(items.map(o=>o.id));
 for(const o of room.objects)if(ids.has(o.decoyOf))ids.add(o.id);
 const delta=(next.angle??root.angle??0)-(root.angle||0),c=Math.cos(delta),s=Math.sin(delta),dy=(next.y??root.y??0)-(root.y||0);
 const candidates=items.map(o=>{const x=o.x-root.x,z=o.z-root.z;return {...o,x:next.x+c*x+s*z,z:next.z-s*x+c*z,y:(o.y||0)+dy,angle:(o.angle||0)+delta};});
 if(check&&candidates.some(o=>{
  const t=propTypes[o.type];return blocksDoor(o)||!free(o.x,o.z,t.radius,room.objects,o.id,o.y,t.height,o,ids);
 }))return false;
 const riders=Object.values(room.players).filter(p=>p.status==='alive'&&!ids.has(p.propId)&&items.some(o=>supportedBy({...p,id:'player-'+p.id},o)));
 const passengerMoves=riders.map(p=>{const x=p.x-root.x,z=p.z-root.z;return {p,x:next.x+c*x+s*z,z:next.z-s*x+c*z,y:(p.y||0)+dy};});
 if(check&&passengerMoves.some(q=>!free(q.x,q.z,.28,room.objects,q.p.propId,q.y,1.75,null,ids)))return false;
 for(let i=0;i<items.length;i++){Object.assign(items[i],{x:candidates[i].x,y:candidates[i].y,z:candidates[i].z,angle:candidates[i].angle});const p=room.players[items[i].owner];if(p){p.x=items[i].x;p.y=items[i].y;p.z=items[i].z;}}
 for(const q of passengerMoves)Object.assign(q.p,{x:q.x,y:q.y,z:q.z});
 return true;
}
export function detachChildren(objects,root){for(const o of objects)if(o.supportId===root.id){delete o.supportId;o.anchored=false;}}
export function settleObjects(room,dt){
 for(const o of room.objects){
  if(o.owner||o.anchored||o.decoyOf)continue;
  const parent=room.objects.find(p=>p.id===o.supportId);
  if(parent)continue;
  delete o.supportId;
  let ground=0,support=null;
  for(const other of room.objects){if(other===o||other.supportId===o.id||other.decoyOf===o.id)continue;const t=propTypes[other.type];if(t.flat)continue;const top=(other.y||0)+(t.surface??t.height);if(top<=(o.y||0)+.055&&top>ground&&contains(other,o.x,o.z,-.01)){ground=top;support=other;}}
  if((o.y||0)>ground+.005){o.fallSpeed=(o.fallSpeed||0)+18*dt;moveAssembly(room,o,{x:o.x,z:o.z,y:Math.max(ground,o.y-o.fallSpeed*dt),angle:o.angle},{check:false});}
  else {o.fallSpeed=0;if(support)o.supportId=support.id;}
 }
}
