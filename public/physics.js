import {propTypes,dimensions,contains,free,blocksDoor,groundAt,floorCoverHeight} from './world.js';

export function supportedBy(child,parent){
 if(child.id===parent.id||child.decoyOf===parent.id)return false;
 if(child.supportId)return child.supportId===parent.id;
 const t=propTypes[parent.type];if(!t||t.flat||t.height<.06||child.anchored)return false;
 const top=(parent.y||0)+(t.surface??t.height),bottom=child.y||0;
 if(bottom<=(parent.y||0)+.035||Math.abs(bottom-top)>.035)return false;
 const base=dimensions(parent),size=propTypes[child.type]?dimensions(child):{w:.56,d:.56};
 // A small item can never become the inferred support of a larger piece of furniture.
 if(size.w*size.d>base.w*base.d*1.1)return false;
 return contains(parent,child.x,child.z,-.035);
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
  const t=propTypes[o.type];return blocksDoor(o,room.objects)||!free(o.x,o.z,t.radius,room.objects,o.id,o.y,t.height,o,ids);
 }))return false;
 const riders=Object.values(room.players).filter(p=>p.status==='alive'&&!p.propId&&items.some(o=>supportedBy({...p,id:'player-'+p.id},o)));
 const passengerMoves=riders.map(p=>{const x=p.x-root.x,z=p.z-root.z;return {p,x:next.x+c*x+s*z,z:next.z-s*x+c*z,y:(p.y||0)+dy};});
 if(check&&passengerMoves.some(q=>!free(q.x,q.z,.28,room.objects,q.p.propId,q.y,1.75,null,ids)))return false;
 for(let i=0;i<items.length;i++){Object.assign(items[i],{x:candidates[i].x,y:candidates[i].y,z:candidates[i].z,angle:candidates[i].angle});const p=room.players[items[i].owner];if(p){p.x=items[i].x;p.y=items[i].y;p.z=items[i].z;}}
 for(const q of passengerMoves)Object.assign(q.p,{x:q.x,y:q.y,z:q.z});
 return true;
}
export function detachChildren(objects,root){for(const o of objects)if(o.supportId===root.id){delete o.supportId;o.anchored=false;}}
export function settleObjects(room,dt){
 const objects=room.objects;
 // Kimlik indeksi: desteği aramak için her nesnede diziyi baştan taramak (find) tıklım tıklım bir
 // odada tur başına yüz binlerce karşılaştırma çıkarıyordu. find ilk eşleşmeyi döndürdüğü için
 // indeks de ilk göreni tutar.
 const byId=new Map();
 for(const o of objects)if(!byId.has(o.id))byId.set(o.id,o);
 // Kaba konum ızgarası. Destek adayı olmanın şartı contains(other, o.x, o.z): nokta o nesnenin
 // ayak izinin içinde olmalı. Yani yalnızca o noktayı kapsayan hücredeki nesneler aday olabilir,
 // geri kalan yüzlerce nesne hiç bakılmadan elenir. Her nesne ayak izi dairesinin değdiği bütün
 // hücrelere dizi sırasıyla yazılır; eşit yükseklikte iki destek çıkarsa yine ilk gelen kazanır.
 // x ve z bu fonksiyon boyunca sabittir — moveAssembly yalnızca y taşır, x/z/angle aynen geçilir —
 // bu yüzden ızgara bir kez kurulup bütün döngü boyunca geçerli kalır.
 const CELL=3,grid=new Map();
 for(const other of objects){
  const t=propTypes[other.type];if(!t||t.flat||t.height<.06)continue;
  const d=dimensions(other),reach=Math.hypot(d.w,d.d)/2;
  const cx1=Math.floor((other.x+reach)/CELL),cz1=Math.floor((other.z+reach)/CELL);
  for(let cx=Math.floor((other.x-reach)/CELL);cx<=cx1;cx++)for(let cz=Math.floor((other.z-reach)/CELL);cz<=cz1;cz++){
   const k=cx+','+cz,cell=grid.get(k);if(cell)cell.push(other);else grid.set(k,[other]);
  }
 }
 for(const o of objects){
  if(o.owner||o.anchored||o.decoyOf)continue;
  if(byId.get(o.supportId))continue;
  delete o.supportId;
  let ground=floorCoverHeight(o.x,o.z,objects,o.id,o),support=null;
  const self=dimensions(o),area=self.w*self.d;
  const cell=grid.get(Math.floor(o.x/CELL)+','+Math.floor(o.z/CELL));
  if(cell)for(const other of cell){
   if(other===o||other.supportId===o.id||other.decoyOf===o.id)continue;
   const t=propTypes[other.type],top=(other.y||0)+(t.surface??t.height),od=dimensions(other);
   if(area<=od.w*od.d*1.1&&top<=(o.y||0)+.025&&top>ground&&contains(other,o.x,o.z,-.01)){ground=top;support=other;}
  }
  if((o.y||0)>ground+.005){o.fallSpeed=(o.fallSpeed||0)+18*dt;moveAssembly(room,o,{x:o.x,z:o.z,y:Math.max(ground,o.y-o.fallSpeed*dt),angle:o.angle},{check:false});}
  else {o.fallSpeed=0;if((o.y||0)<ground-.002)moveAssembly(room,o,{x:o.x,z:o.z,y:ground,angle:o.angle},{check:false});if(support)o.supportId=support.id;}
 }
}
