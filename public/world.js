import {MAPS,mapTypes,terrainHeight} from './maps.js';
import {furniture,fixtures,inventoryTypes} from './inventory.js';
export {furniture,fixtures};
// Authoritative shared geometry for the sunny loft. Dimensions are in metres.
export const ROOM={width:28,depth:36,height:4.8};
export const walls=[
 [0,-18,28,.3],[0,18,28,.3],[-14,0,.3,36],[14,0,.3,36], // exterior envelope
 // Hallway spine (x -2.4..2.4) runs the full depth; every room opens onto it through a doorway gap.
 [-2.4,-13.8,.25,7.8],[-2.4,-.5,.25,15.2], // west spine — gaps: office door (~z-9), living door (~z8)
 [-2.4,11,.25,4.2],[-2.4,16.3,.25,2.8], // west spine, north half — gap: bedroom door (~z14)
 [2.4,-12.8,.25,9.8],[2.4,1.5,.25,15.2],[2.4,14.3,.25,6.8], // east spine — gaps: kitchen door (~z-7), entry door (~z10)
 [-11.35,-1.4,4.9,.25],[-4.75,-1.4,4.7,.25], // living/office divider — gap: door (~x-8)
 [4.75,3.6,4.7,.25],[11.35,3.6,4.9,.25], // entry/kitchen divider — gap: door (~x8)
 [-11.35,10.5,4.9,.25],[-4.75,10.5,4.7,.25], // living/bedroom divider — gap: door (~x-8)
];
const doors=[[-2.4,-9,.85,1.6],[-2.4,8,.85,1.6],[-2.4,14,.85,1.6],[2.4,-7,.85,1.6],[2.4,10,.85,1.6],[-8,-1.4,1.6,.85],[-8,10.5,1.6,.85],[8,3.6,1.6,.85]];
export const propTypes={
 ...inventoryTypes,...mapTypes,
 plant:{name:'Saksı bitkisi',radius:.4,height:1.25,color:'#dba57b',icon:'✿'},
 stool:{name:'Tabure',radius:.36,height:.65,color:'#519798',icon:'▤',under:.5},
 basket:{name:'Çamaşır sepeti',radius:.4,height:.56,color:'#c89b65',icon:'▧'},
 ball:{name:'Plaj topu',radius:.29,height:.58,color:'#e8a949',icon:'◒'},
 watering:{name:'Sulama kabı',radius:.35,height:.48,color:'#e5b24e',icon:'◔'},
 ottoman:{name:'Puf',radius:.5,height:.5,color:'#dfa178',icon:'▰'},
 case:{w:.55,d:.32,name:'Valiz',radius:.4,height:.83,color:'#75a0b0',icon:'▣'},
 speaker:{w:.4,d:.30,name:'Hoparlör',radius:.27,height:.58,color:'#667674',icon:'▥'},
 mug:{name:'Kupa',radius:.15,height:.16,color:'#eee9df',icon:'◉'},
 bookstack:{w:.24,d:.18,name:'Kitap yığını',radius:.16,height:.13,color:'#c1805e',icon:'▦'},
 logTable:{w:2,d:1.1,name:'Kütük masa',radius:1,height:.78,color:'#8a6339',icon:'⊞',under:.62},
 painting:{w:1.1,d:.1,name:'Tablo',radius:.55,height:1.3,color:'#5c4530',icon:'◫'},
 pillow:{w:.62,d:.44,name:'Yastık',radius:.33,height:.2,color:'#e8dfcc',icon:'▱'},
};
export function staticObstacles(){return walls.map(([x,z,w,d])=>[x,z,w,d,ROOM.height,0]);}
// Five themed rooms open onto the central hallway. Every round scrambles which object sits where
// (and what it is) inside its own room, so hiding spots are never the same twice while still
// belonging to the room they are in: laundry basket in the bedroom, mug in the kitchen.
// Bounds below are the room's full extent (used to tell which room a point is in); generated
// clutter is inset by PLACEMENT_PAD so nothing spawns hugging a doorway or the wrong side of a wall.
export const PLACEMENT_PAD=.8;
export const zones=[
 // Living room: plant, floor pouf, speaker, coffee-table books, plus one guaranteed large painting.
 {id:'living',name:'Oturma odası',xmin:-13.85,xmax:-2.4,zmin:-1.4,zmax:10.5,types:['plant','ottoman','speaker','bookstack'],count:10,signature:'painting'},
 // Bedroom: pillow, laundry basket, suitcase, a corner plant.
 {id:'bedroom',name:'Yatak odası',xmin:-13.85,xmax:-2.4,zmin:10.5,zmax:17.85,types:['pillow','basket','case','plant'],count:7},
 // Kitchen: only what belongs on a counter or island, plus one guaranteed big log dining table.
 {id:'kitchen',name:'Mutfak',xmin:2.4,xmax:13.85,zmin:-17.85,zmax:3.6,types:['mug','stool','plant'],count:12,signature:'logTable'},
 // Study / game corner: desk clutter plus a stray ball by the game table.
 {id:'office',name:'Çalışma köşesi',xmin:-13.85,xmax:-2.4,zmin:-17.85,zmax:-1.4,types:['case','stool','ball','speaker','bookstack'],count:12},
 // Entry / display shelf: suitcase, plant, ball, watering can — mudroom-style catch-all items.
 {id:'entry',name:'Kış bahçesi',xmin:2.4,xmax:13.85,zmin:3.6,zmax:17.85,types:['plant','watering','bookstack','stool'],count:10},
];
// Hangi haritada olduğumuzu nesne listesi söyler. Bu, çarpışma ve görüş hesabının en sıcak
// yolunda: loft için varsayılan harita bir kez kurulur (her çağrıda yeni nesne üretmek dizi
// taramasıyla birlikte tur başına milyonlarca gereksiz iş çıkarıyordu) ve sonuç diziye göre
// hatırlanır — bir turun nesne dizisi hep aynı haritaya aittir.
const LOFT_MAP={id:'loft',room:ROOM,walls,zones,fixtures,doors};
const mapMemo=new WeakMap();
export function mapFor(objectsOrId){
 if(typeof objectsOrId==='string')return MAPS[objectsOrId]||LOFT_MAP;
 if(!objectsOrId)return LOFT_MAP;
 const known=mapMemo.get(objectsOrId);if(known)return known;
 const map=MAPS[objectsOrId.find(o=>o.mapId)?.mapId]||LOFT_MAP;
 mapMemo.set(objectsOrId,map);return map;
}
export const groundAt=(x,z,objectsOrId)=>{const map=mapFor(objectsOrId);return map.raised?terrainHeight(map,x,z):0;};
// Halı gibi ince zemin parçaları katı duvar değildir; yine de küçük bir kılığın altına gömülmesine
// izin verilmez. Taşınan nesnenin gerçek taban alanıyla kesişen en yüksek örtüyü döndürür.
export function floorCoverHeight(x,z,objects=fixtures,ignoreId=null,shape=null){
 let floor=groundAt(x,z,objects),mover=shape?{...shape,x,z}:null,size=mover?dimensions(mover):null;
 for(const o of objects){const t=propTypes[o.type];if(o.id===ignoreId||!t?.flat)continue;const hit=mover?overlapSized(mover,size,o,dimensions(o)):contains(o,x,z,0);if(hit)floor=Math.max(floor,(o.y||0)+t.height);}
 return floor;
}
const wallCache=new Map(),terrainCache=new Map();
export function wallBoxes(objectsOrId){const map=mapFor(objectsOrId);if(wallCache.has(map.id))return wallCache.get(map.id);const boxes=map.walls.map(([x,z,w,d,h=map.room.height,y=0,material])=>({x,z,w,d,h,y,material}));wallCache.set(map.id,boxes);return boxes;}
export function terrainBoxes(objectsOrId){const map=mapFor(objectsOrId);if(!map.raised)return [];if(terrainCache.has(map.id))return terrainCache.get(map.id);const out=[{x:0,z:-13.5,w:28,d:9,h:3,y:0}];for(const x of [-10.9,10.9])for(let i=0;i<56;i++)out.push({x,z:4.875-i*.25,w:3.8,d:.25,h:(i+1)*3/56,y:0});terrainCache.set(map.id,out);return out;}
// Which room (if any) a point belongs to. Drives both a round's layout and Q's random change,
// which stays on-theme for the room the object is currently standing in.
export function zoneAt(x,z,objectsOrId='loft'){return mapFor(objectsOrId).zones.find(zone=>x>=zone.xmin&&x<=zone.xmax&&z>=zone.zmin&&z<=zone.zmax)||null;}
// Out in the hallway no room theme applies, so any everyday type is fair game there. Signature
// pieces (the painting, the log table) are deliberately excluded: they exist exactly once a round.
// Yazılı yerleşimden her tipin nerede durduğunu çıkarır: yerde mi, bir mobilyanın üstünde/içinde
// mi, yoksa duvara asılı mı. Q ile dönüşüm bunu kullanır; yerde duran bir oyuncu koltuk minderine
// veya tabağa dönüşmez, masadaki bir oyuncu da lambadere dönüşmez.
export const typeHomes=new Map();
for(const o of fixtures){
 const t=propTypes[o.type];if(!t)continue;
 const kind=t.mounted?'mounted':o.supportId?'support':'floor';
 if(!typeHomes.has(o.type))typeHomes.set(o.type,new Set());
 typeHomes.get(o.type).add(kind);
}
export const homeKind=o=>propTypes[o.type]?.mounted?'mounted':(o.supportId||(o.y||0)>.35)?'support':'floor';
export const fitsHome=(type,kind)=>{const homes=typeHomes.get(type);return !homes||homes.has(kind);};
export const commonTypes=[...new Set(zones.flatMap(zone=>zone.types))];
// Room settings can dial the total object count up or down; each room keeps its share of the total.
export const DEFAULT_PROP_COUNT=zones.reduce((sum,zone)=>sum+zone.count,0);
export const MIN_PROP_COUNT=0,MAX_PROP_COUNT=90;
// Süs eşyası yoğunluğu: yüzeylerde duran ve duvara asılı küçük eşyaların ne kadarı doğsun. Oda
// tıklım tıklımken hem avcının işi imkânsızdı hem de zayıf kartlar çizim sayısına yetişemiyordu.
// Yalnızca üstünde başka bir şey taşımayan "yaprak" eşyalar seyreltilir: mobilya, tezgah ve
// taşıyıcı parçalar her zaman yerinde kalır, odalar kimliğini kaybetmez.
export const DEFAULT_DECOR=1,MIN_DECOR=.25,MAX_DECOR=1;
const decorLeaves=fixtures.filter(f=>(f.supportId||propTypes[f.type]?.mounted)&&!fixtures.some(q=>q.supportId===f.id)).map(f=>f.id);
// Anything at or below this height can be jumped on and stood upon; taller pieces (shelves,
// wardrobe) stay pure obstacles.
export const STAND_MAX_HEIGHT=1.05,STAND_MIN_RADIUS=.34,BODY_HEIGHT=1.75;
// Eğilen avcının gövde yüksekliği. Yalnızca su atışının çarptığı kutuyu küçültür: eğilen bir
// avcının üstünden takım arkadaşının suyu geçebilsin. free() bilerek her zaman BODY_HEIGHT
// kullanır — eğilmek yürüme çarpışmasını değiştirmez, yoksa avcı dar boşluklara sızardı.
export const CROUCH_BODY_HEIGHT=1.1;
// What is underfoot at this spot: the tallest thing short enough to climb. Furniture counts, and so
// do the broader props — a pouf, a suitcase, a laundry basket or the log table are all wide enough
// to perch on, while a mug or a stack of books is not.
export function dimensions(o){const t=propTypes[o.type];return {w:t.w||t.radius*2,d:t.d||t.radius*2,h:t.height,under:t.under||0};}
export function localPoint(o,x,z){const a=o.angle||0,c=Math.cos(a),s=Math.sin(a),dx=x-o.x,dz=z-o.z;return {x:dx*c-dz*s,z:dx*s+dz*c};}
export function contains(o,x,z,pad=0){const p=localPoint(o,x,z),d=dimensions(o);return Math.abs(p.x)<d.w/2+pad&&Math.abs(p.z)<d.d/2+pad;}
export function objectDistance(p,o){const q=localPoint(o,p.x,p.z),d=dimensions(o);return Math.hypot(Math.max(0,Math.abs(q.x)-d.w/2),Math.max(0,Math.abs(q.z)-d.d/2));}
export function surfaceHeight(x,z,maxHeight=STAND_MAX_HEIGHT,objects=fixtures,ignoreId=null){
 let best=groundAt(x,z,objects);if(best>maxHeight+.08)best=0;for(const o of objects){if(o.id===ignoreId||o.decoyOf===ignoreId)continue;const t=propTypes[o.type];if(!t||t.flat||Math.min(t.w||t.radius*2,t.d||t.radius*2)<.34)continue;
 const top=(o.y||0)+(t.surface??t.height);if(top>maxHeight||top<=best)continue;if(contains(o,x,z,-.015))best=top;}return best;
}
function spot(zone,radius,placed){
 const x=zone.xmin+PLACEMENT_PAD+Math.random()*Math.max(.2,zone.xmax-zone.xmin-2*PLACEMENT_PAD);
 const z=zone.zmin+PLACEMENT_PAD+Math.random()*Math.max(.2,zone.zmax-zone.zmin-2*PLACEMENT_PAD);
 // Counters, tables and benches are valid shelves for small clutter, so a mug can start up on the
 // island — but a stool or a plant pot always begins the round on the floor where it belongs.
 const base=groundAt(x,z,placed),y=radius<=.35?surfaceHeight(x,z,base+STAND_MAX_HEIGHT,placed):base;
 return free(x,z,radius,placed,null,y)?{x,y,z}:null;
}
export function generateProps(total=DEFAULT_PROP_COUNT,decor=DEFAULT_DECOR,mapId='loft'){
 if(MAPS[mapId])return generateMapProps(total,decor,mapId);
 total=Number.isFinite(Number(total))?Math.max(MIN_PROP_COUNT,Math.min(MAX_PROP_COUNT,Math.round(Number(total)))):DEFAULT_PROP_COUNT;
 decor=Number.isFinite(Number(decor))?Math.max(MIN_DECOR,Math.min(MAX_DECOR,Number(decor))):DEFAULT_DECOR;
 const skip=new Set();
 if(decor<1){
  const pool=[...decorLeaves];
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  for(const id of pool.slice(Math.round(pool.length*decor)))skip.add(id);
 }
 const placed=fixtures.filter(o=>!skip.has(o.id)).map(o=>({...o}));
 for(const zone of zones){
  // Sıfır seçilirse oda yalnızca mobilyasıyla kalır; imza parçası (kütük masa, duvar tablosu) durur.
  const target=total<=0?0:Math.max(1,Math.round(zone.count/DEFAULT_PROP_COUNT*total));
  // A room's `signature` piece always exists, exactly once, and eats one slot from the regular
  // random fill so the total stays on the budget the host chose.
  const regularTarget=zone.signature?Math.max(0,target-1):target;
  let attempts=0,made=0;
  while(made<regularTarget&&attempts<regularTarget*60){
   attempts++;
   const type=zone.types[Math.floor(Math.random()*zone.types.length)],at=spot(zone,propTypes[type].radius,placed);
   if(!at)continue;
   placed.push({id:'o'+placed.length,...at,type,angle:Math.random()*Math.PI*2,wet:0});made++;
  }
  if(zone.signature){
   for(let a=0;a<200;a++){
    const at=spot(zone,propTypes[zone.signature].radius,placed);
    if(!at)continue;
    placed.push({id:'o'+placed.length,...at,type:zone.signature,angle:Math.random()*Math.PI*2,wet:0});
    break;
   }
  }
 }
 return placed;
}
function generateMapProps(total,decor,mapId){
 const map=MAPS[mapId],placed=map.fixtures.map(o=>({...o}));
 total=Math.max(0,Math.min(MAX_PROP_COUNT,Math.round(Number(total)||0)));decor=Math.max(MIN_DECOR,Math.min(1,Number(decor)||1));
 // Thin only terminal decorations, never a support with children.
 const leaves=placed.filter(o=>o.supportId&&!placed.some(q=>q.supportId===o.id));
 const skip=new Set(leaves.filter((_,i)=>i%Math.round(1/decor)!==0).map(o=>o.id));
 for(let i=placed.length-1;i>=0;i--)if(skip.has(placed[i].id))placed.splice(i,1);
 let made=0;
 for(let attempt=0;made<total&&attempt<total*80;attempt++){
  const zone=map.zones[made%map.zones.length],type=zone.types[Math.floor(Math.random()*zone.types.length)],t=propTypes[type];
  const at=spot(zone,t.radius,placed);if(!at)continue;
  const o={id:`${mapId}-extra-${made}`,mapId,type,...at,angle:0,wet:0};
  if(blocksDoor(o,placed)||!free(o.x,o.z,t.radius,placed,null,o.y,t.height,o))continue;
  // Reserve the two museum ramps and their landings for traffic.
  if(map.raised&&Math.abs(o.x)>8&&o.z>-11&&o.z<7)continue;
  placed.push(o);made++;
 }
 return placed;
}
export const props=generateProps();
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// `y` is the mover's feet, `height` how tall the mover is. Anything shorter than the feet is being
// stood on, and anything with enough clearance underneath (a table, a stool) can be crawled under by
// a short enough disguise — which is why a mug slips under the dining table and a person does not.
function overlaps(a,b){
 const A=dimensions(a),B=dimensions(b),angles=[a.angle||0,b.angle||0];
 for(const angle of angles)for(const offset of [0,Math.PI/2]){const x=Math.cos(angle+offset),z=-Math.sin(angle+offset),radius=(o,d)=>Math.abs(Math.cos(o.angle||0)*x-Math.sin(o.angle||0)*z)*d.w/2+Math.abs(Math.sin(o.angle||0)*x+Math.cos(o.angle||0)*z)*d.d/2;
 if(Math.abs((a.x-b.x)*x+(a.z-b.z)*z)>=radius(a,A)+radius(b,B)-.025)return false;}
 return true;
}
export function free(x,z,radius=.28,objects=fixtures,ignoreId=null,y=0,height=BODY_HEIGHT,shape=null,ignoreIds=new Set()){
 if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(y))return false;
 const mover=shape?{...shape,x,y,z}:{type:'__body',x,y,z,angle:0};
 const size=shape?dimensions(mover):{w:radius*2,d:radius*2,h:height};
 const a=mover.angle||0,ex=Math.abs(Math.cos(a))*size.w/2+Math.abs(Math.sin(a))*size.d/2,ez=Math.abs(Math.sin(a))*size.w/2+Math.abs(Math.cos(a))*size.d/2;
 const map=mapFor(objects);
 if(Math.abs(x)+ex>map.room.width/2-.15||Math.abs(z)+ez>map.room.depth/2-.15||y+height>map.room.height||y+.12<groundAt(x,z,objects))return false;
 const clear=y+.055,top=y+height;
 // Walls use the full oriented footprint, never only a large object's centre.
 for(const {x:wx,z:wz,w,d,h,y:base} of wallBoxes(objects)){if(y+height<=base+.02||y>=base+h-.02)continue;const wall={type:'__wall',x:wx,z:wz,angle:0};if(shape){if(overlapSized(mover,size,wall,{w,d}))return false;}else if(Math.abs(x-wx)<w/2+radius&&Math.abs(z-wz)<d/2+radius)return false;}
 return !objects.some(o=>{
  if(o.id===ignoreId||o.decoyOf===ignoreId||ignoreIds.has(o.id))return false;
  const t=propTypes[o.type];if(!t||t.flat)return false;
  const base=o.y||0;if(base+t.height<=clear||base>=top-.025)return false;
  return hitParts(o).some(part=>{
   if(base+part.y+part.h<=clear||base+part.y>=top-.025)return false;
   const a=o.angle||0,c=Math.cos(a),s=Math.sin(a),solid={x:o.x+c*part.x+s*part.z,z:o.z-s*part.x+c*part.z,angle:a};
   if(shape)return overlapSized(mover,size,solid,{w:part.w,d:part.d});
   const q=localPoint(solid,x,z),dx=Math.max(0,Math.abs(q.x)-part.w/2),dz=Math.max(0,Math.abs(q.z)-part.d/2);
   return dx*dx+dz*dz<radius*radius;
  });
 });
}
function overlapSized(a,A,b,B){
 for(const angle of [a.angle||0,b.angle||0])for(const offset of [0,Math.PI/2]){const x=Math.cos(angle+offset),z=-Math.sin(angle+offset),radius=(o,d)=>Math.abs(Math.cos(o.angle||0)*x-Math.sin(o.angle||0)*z)*d.w/2+Math.abs(Math.sin(o.angle||0)*x+Math.cos(o.angle||0)*z)*d.d/2;if(Math.abs((a.x-b.x)*x+(a.z-b.z)*z)>=radius(a,A)+radius(b,B)-.025)return false;}return true;
}
// Doorways retain enough clearance for a person even when a movable table or its copy is nearby.

export function blocksDoor(o,objectsOrId=o.mapId||'loft'){const d=dimensions(o);if(Math.max(d.w,d.d)<1.5||propTypes[o.type].flat)return false;return mapFor(objectsOrId).doors.some(([x,z,w,d])=>overlapSized(o,dimensions(o),{x,z,angle:0},{w,d}));}
// Sampled densely enough that a 25 cm interior wall can never slip between two samples — that gap
// used to let a hider claim an object on the far side of a wall and teleport straight through it.
export function sight(a,b,objects){
 const occluders=wallBoxes(objects),y=Math.min(a.y||0,b.y||0),n=Math.max(2,Math.ceil(dist(a,b)*16));
 for(let i=1;i<n;i++){const t=i/n;if(occluders.some(({x,z,w,d,h,y:base,material})=>material!=='glass'&&y+1.3>=base&&y+1.3<=base+h&&Math.abs(a.x+(b.x-a.x)*t-x)<w/2+.02&&Math.abs(a.z+(b.z-a.z)*t-z)<d/2+.02))return false;}
 return true;
}
export function rayBox(origin,direction,bounds){let lo=0,hi=30;for(const axis of ['x','y','z']){const d=direction[axis],v=origin[axis];if(Math.abs(d)<1e-8){if(v<bounds.min[axis]||v>bounds.max[axis])return null;}else{let a=(bounds.min[axis]-v)/d,b=(bounds.max[axis]-v)/d;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return null;}}return lo;}
export function nearestHit(origin,direction,objects,players=[]){let hit={distance:28,kind:'miss',point:{x:origin.x+direction.x*28,y:origin.y+direction.y*28,z:origin.z+direction.z*28}};function check(bounds,kind,id){const d=rayBox(origin,direction,bounds);if(d!==null&&d<hit.distance)hit={distance:d,kind,id,point:{x:origin.x+direction.x*d,y:origin.y+direction.y*d,z:origin.z+direction.z*d}};}
 for(const {x,z,w,d,h,y} of [...wallBoxes(objects),...terrainBoxes(objects)])check({min:{x:x-w/2,y,z:z-d/2},max:{x:x+w/2,y:y+h,z:z+d/2}},'wall');
 for(const o of objects){
  const size=dimensions(o),p=localPoint(o,origin.x,origin.z),a=o.angle||0,c=Math.cos(a),s=Math.sin(a);
  const localOrigin={x:p.x,y:origin.y-(o.y||0),z:p.z},localDirection={x:direction.x*c-direction.z*s,y:direction.y,z:direction.x*s+direction.z*c};
  for(const part of hitParts(o)){const d=rayBox(localOrigin,localDirection,{min:{x:part.x-part.w/2,y:part.y,z:part.z-part.d/2},max:{x:part.x+part.w/2,y:part.y+part.h,z:part.z+part.d/2}});if(d!==null&&d<hit.distance)hit={distance:d,kind:'object',id:o.id,point:{x:origin.x+direction.x*d,y:origin.y+direction.y*d,z:origin.z+direction.z*d}};}
 }
 for(const p of players){const base=p.y||0,tall=p.crouch?CROUCH_BODY_HEIGHT:BODY_HEIGHT;check({min:{x:p.x-.28,y:base,z:p.z-.28},max:{x:p.x+.28,y:base+tall,z:p.z+.28}},'player',p.id);}
 return hit;
}
export function pathTo(from,to,objects=fixtures){const map=mapFor(objects),level=map.raised?(x,z)=>terrainHeight(map,x,z):()=>0,key=(x,z)=>x+','+z,sx=Math.round(from.x),sz=Math.round(from.z),queue=[[sx,sz]],parent=new Map([[key(sx,sz),null]]);let end;for(let i=0;i<queue.length;i++){const [x,z]=queue[i];if(Math.hypot(x-to.x,z-to.z)<1.6&&Math.abs(level(x,z)-level(to.x,to.z))<.35){end=[x,z];break;}for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!parent.has(k)&&Math.abs(level(nx,nz)-level(x,z))<.35&&free(nx,nz,.3,objects,null,level(nx,nz))){parent.set(k,[x,z]);queue.push([nx,nz]);}}}if(!end)return[];const result=[];while(end&&(end[0]!==sx||end[1]!==sz)){result.unshift({x:end[0],z:end[1]});end=parent.get(key(...end));}return result;}

export function hitParts(o){
 const t=propTypes[o.type],d=dimensions(o),f=t.f;
 if(t.model==='chair')return [{x:0,y:.44,z:0,w:.62,h:.08,d:.62},{x:0,y:.6,z:.25,w:.62,h:.38,d:.07},...[-1,1].flatMap(x=>[-1,1].map(z=>({x:x*.28,y:0,z:z*.265,w:.09,h:.44,d:.09})))];
 if(t.model==='stall')return [{x:0,y:.77,z:0,w:d.w,h:.13,d:d.d},{x:0,y:2.55,z:0,w:d.w,h:.25,d:d.d},...[-1,1].flatMap(x=>[-1,1].map(z=>({x:x*1.625,y:0,z:z*.75,w:.07,h:2.7,d:.07}))),{x:0,y:0,z:.8,w:d.w,h:.75,d:.04}];
 if(t.model==='exhibitShelf')return [{x:0,y:0,z:-.305,w:2.5,h:1.8,d:.04},...[-1,1].map(x=>({x:x*1.22,y:0,z:0,w:.055,h:1.8,d:.65})),...[.12,.65,1.18,1.73].map(y=>({x:0,y:y-.0275,z:0,w:2.5,h:.055,d:.65}))];
 if(f?.type==='shelf')return [{x:f.x<0?-d.w/2+.025:d.w/2-.025,y:0,z:0,w:.05,h:d.h,d:d.d},...Array.from({length:5},(_,i)=>({x:0,y:.13+i*(d.h-.16)/4,z:0,w:d.w,h:.045,d:d.d})),...[-1,1].map(sign=>({x:0,y:0,z:sign*(d.d/2-.025),w:d.w,h:d.h,d:.05}))];
 if(d.under>0)return [{x:0,y:d.under,z:0,w:d.w,h:Math.max(.06,d.h-d.under),d:d.d},...[-1,1].flatMap(x=>[-1,1].map(z=>({x:x*(d.w/2-.1),y:0,z:z*(d.d/2-.1),w:.1,h:d.under,d:.1})))];
 return [{x:0,y:0,z:0,w:d.w,h:d.h,d:d.d}];
}
export function reachable(p,o,objects){
 if(objectDistance(p,o)>4.5)return false;
 const q=localPoint(o,p.x,p.z),d=dimensions(o),a=o.angle||0,c=Math.cos(a),s=Math.sin(a);
 const lx=Math.max(-d.w/2+.02,Math.min(d.w/2-.02,q.x)),lz=Math.max(-d.d/2+.02,Math.min(d.d/2-.02,q.z));
 const from={x:p.x,y:(p.y||0)+1.3,z:p.z},to={x:o.x+c*lx+s*lz,y:Math.max((o.y||0)+.01,Math.min((o.y||0)+d.h-.01,from.y)),z:o.z-s*lx+c*lz};
 const len=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z);if(len<.05)return true;
 const direction={x:(to.x-from.x)/len,y:(to.y-from.y)/len,z:(to.z-from.z)/len};
 const hit=nearestHit(from,direction,objects.filter(q=>q.id!==p.propId));return hit.id===o.id||hit.distance>=len-.035;
}
