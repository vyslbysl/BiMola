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
export const furniture=[
 {id:'sofa1',type:'sofa',x:-8,z:8,w:4.4,d:1.7,h:.9,angle:0,color:'#b86d49'},
 {id:'sofa2',type:'sofa',x:-11.5,z:4,w:3.4,d:1.5,h:.9,angle:Math.PI/2,color:'#e5dac4'},
 {id:'coffee',type:'coffee',x:-8,z:4.2,w:2.5,d:1.5,h:.48},
 {id:'kitchen',type:'counter',x:8,z:-15,w:9.5,d:1.4,h:1},
 {id:'island',type:'island',x:8,z:-10,w:4.5,d:1.9,h:1},
 {id:'dining',type:'dining',x:7.5,z:1,w:4.2,d:2,h:.8,under:.7},
 {id:'shelf1',type:'shelf',x:-12.8,z:-11,w:1.5,d:6,h:2.6},
 {id:'shelf2',type:'shelf',x:12.8,z:10,w:1.2,d:6,h:2.3},
 {id:'game',type:'game',x:-.5,z:-11,w:2.7,d:1.65,h:.82,under:.64},
 {id:'bench',type:'bench',x:0,z:15.5,w:4,d:.8,h:.45,under:.33},
 {id:'desk',type:'desk',x:-9,z:-15.5,w:4,d:1.6,h:.8,under:.7},
 // Bedroom, north-west: a double bed between two nightstands, wardrobe along the west wall.
 {id:'bed',type:'bed',x:-8.5,z:15.4,w:2.15,d:2.2,h:.62},
 {id:'night1',type:'nightstand',x:-6.85,z:16.35,w:.52,d:.44,h:.55},
 {id:'night2',type:'nightstand',x:-10.15,z:16.35,w:.52,d:.44,h:.55},
 {id:'wardrobe',type:'wardrobe',x:-13.25,z:13,w:.9,d:3,h:2.3},
];
export const propTypes={
 plant:{name:'Saksı bitkisi',radius:.4,height:1.25,color:'#dba57b',icon:'✿'},
 stool:{name:'Tabure',radius:.36,height:.65,color:'#519798',icon:'▤',under:.5},
 basket:{name:'Çamaşır sepeti',radius:.4,height:.56,color:'#c89b65',icon:'▧'},
 ball:{name:'Plaj topu',radius:.29,height:.58,color:'#e8a949',icon:'◒'},
 watering:{name:'Sulama kabı',radius:.35,height:.48,color:'#e5b24e',icon:'◔'},
 ottoman:{name:'Puf',radius:.5,height:.5,color:'#dfa178',icon:'▰'},
 case:{name:'Valiz',radius:.4,height:.83,color:'#75a0b0',icon:'▣'},
 speaker:{name:'Hoparlör',radius:.27,height:.58,color:'#667674',icon:'▥'},
 mug:{name:'Kupa',radius:.15,height:.16,color:'#eee9df',icon:'◉'},
 bookstack:{name:'Kitap yığını',radius:.16,height:.13,color:'#c1805e',icon:'▦'},
 logTable:{name:'Kütük masa',radius:1,height:.78,color:'#8a6339',icon:'⊞',under:.62},
 painting:{name:'Tablo',radius:.55,height:1.3,color:'#5c4530',icon:'◫'},
 pillow:{name:'Yastık',radius:.33,height:.2,color:'#e8dfcc',icon:'▱'},
};
// Walls and furniture never move, so the collision footprints are built once and reused. Each
// entry carries its height: anything shorter than the mover's feet can be stood on, not bumped into.
let obstacles=null;
export function staticObstacles(){
 if(!obstacles)obstacles=[
  ...walls.map(([x,z,w,d])=>[x,z,w,d,ROOM.height,0]),
  ...furniture.map(f=>[f.x,f.z,Math.abs(Math.cos(f.angle||0))*f.w+Math.abs(Math.sin(f.angle||0))*f.d,Math.abs(Math.sin(f.angle||0))*f.w+Math.abs(Math.cos(f.angle||0))*f.d,f.h,f.under||0]),
 ];
 return obstacles;
}
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
 {id:'entry',name:'Giriş / vitrin',xmin:2.4,xmax:13.85,zmin:3.6,zmax:17.85,types:['case','plant','ball','watering'],count:10},
];
// Which room (if any) a point belongs to. Drives both a round's layout and Q's random change,
// which stays on-theme for the room the object is currently standing in.
export function zoneAt(x,z){return zones.find(zone=>x>=zone.xmin&&x<=zone.xmax&&z>=zone.zmin&&z<=zone.zmax)||null;}
// Out in the hallway no room theme applies, so any everyday type is fair game there. Signature
// pieces (the painting, the log table) are deliberately excluded: they exist exactly once a round.
export const commonTypes=[...new Set(zones.flatMap(zone=>zone.types))];
// Room settings can dial the total object count up or down; each room keeps its share of the total.
export const DEFAULT_PROP_COUNT=zones.reduce((sum,zone)=>sum+zone.count,0);
export const MIN_PROP_COUNT=20,MAX_PROP_COUNT=90;
// Anything at or below this height can be jumped on and stood upon; taller pieces (shelves,
// wardrobe) stay pure obstacles.
export const STAND_MAX_HEIGHT=1.05,STAND_MIN_RADIUS=.34,BODY_HEIGHT=1.75;
// What is underfoot at this spot: the tallest thing short enough to climb. Furniture counts, and so
// do the broader props — a pouf, a suitcase, a laundry basket or the log table are all wide enough
// to perch on, while a mug or a stack of books is not.
export function surfaceHeight(x,z,maxHeight=STAND_MAX_HEIGHT,objects=[],ignoreId=null){
 let best=0;
 for(const f of furniture){
  if(f.h>maxHeight||f.h<=best)continue;
  const angle=f.angle||0,w=Math.abs(Math.cos(angle))*f.w+Math.abs(Math.sin(angle))*f.d,d=Math.abs(Math.sin(angle))*f.w+Math.abs(Math.cos(angle))*f.d;
  if(Math.abs(x-f.x)<w/2&&Math.abs(z-f.z)<d/2)best=f.h;
 }
 for(const o of objects){
  if(o.id===ignoreId)continue;
  const t=propTypes[o.type];if(!t||t.radius<STAND_MIN_RADIUS)continue;
  const top=(o.y||0)+t.height;
  if(top>maxHeight||top<=best)continue;
  if(Math.hypot(x-o.x,z-o.z)<t.radius*.85)best=top;
 }
 return best;
}
function spot(zone,radius,placed){
 const x=zone.xmin+PLACEMENT_PAD+Math.random()*Math.max(.2,zone.xmax-zone.xmin-2*PLACEMENT_PAD);
 const z=zone.zmin+PLACEMENT_PAD+Math.random()*Math.max(.2,zone.zmax-zone.zmin-2*PLACEMENT_PAD);
 // Counters, tables and benches are valid shelves for small clutter, so a mug can start up on the
 // island — but a stool or a plant pot always begins the round on the floor where it belongs.
 const y=radius<=.35?surfaceHeight(x,z):0;
 return free(x,z,radius,placed,null,y)?{x,y,z}:null;
}
export function generateProps(total=DEFAULT_PROP_COUNT){
 total=Math.max(MIN_PROP_COUNT,Math.min(MAX_PROP_COUNT,Math.round(total)||DEFAULT_PROP_COUNT));
 const placed=[];
 for(const zone of zones){
  const target=Math.max(2,Math.round(zone.count/DEFAULT_PROP_COUNT*total));
  // A room's `signature` piece always exists, exactly once, and eats one slot from the regular
  // random fill so the total stays on the budget the host chose.
  const regularTarget=zone.signature?Math.max(1,target-1):target;
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
export const props=generateProps();
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// `y` is the mover's feet, `height` how tall the mover is. Anything shorter than the feet is being
// stood on, and anything with enough clearance underneath (a table, a stool) can be crawled under by
// a short enough disguise — which is why a mug slips under the dining table and a person does not.
export function free(x,z,radius=.28,objects=[],ignoreId=null,y=0,height=BODY_HEIGHT){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>13.6-radius||Math.abs(z)>17.6-radius)return false;
 const clear=y+.06,top=y+height;
 if(staticObstacles().some(([a,b,w,d,h,under])=>h>clear&&!(under>0&&top<=under)&&Math.abs(x-a)<w/2+radius&&Math.abs(z-b)<d/2+radius))return false;
 return !objects.some(o=>{
  if(o.id===ignoreId)return false;
  const t=propTypes[o.type];
  return (o.y||0)+(t?.height||.5)>clear&&!(t?.under>0&&top<=(o.y||0)+t.under)&&Math.hypot(x-o.x,z-o.z)<radius+(t?.radius||.3)*.7;
 });
}
// Sampled densely enough that a 25 cm interior wall can never slip between two samples — that gap
// used to let a hider claim an object on the far side of a wall and teleport straight through it.
export function sight(a,b){
 const y=Math.min(a.y||0,b.y||0),n=Math.max(2,Math.ceil(dist(a,b)*16));
 for(let i=1;i<n;i++){const t=i/n;if(!free(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,.06,[],null,y))return false;}
 return true;
}
export function rayBox(origin,direction,bounds){let lo=0,hi=30;for(const axis of ['x','y','z']){const d=direction[axis],v=origin[axis];if(Math.abs(d)<1e-8){if(v<bounds.min[axis]||v>bounds.max[axis])return null;}else{let a=(bounds.min[axis]-v)/d,b=(bounds.max[axis]-v)/d;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return null;}}return lo;}
export function nearestHit(origin,direction,objects,players=[]){let hit={distance:28,kind:'miss',point:{x:origin.x+direction.x*28,y:origin.y+direction.y*28,z:origin.z+direction.z*28}};function check(bounds,kind,id){const d=rayBox(origin,direction,bounds);if(d!==null&&d<hit.distance)hit={distance:d,kind,id,point:{x:origin.x+direction.x*d,y:origin.y+direction.y*d,z:origin.z+direction.z*d}};}
 for(const [x,z,w,d] of walls)check({min:{x:x-w/2,y:0,z:z-d/2},max:{x:x+w/2,y:ROOM.height,z:z+d/2}},'wall');
 for(const f of furniture){const angle=f.angle||0,w=Math.abs(Math.cos(angle))*f.w+Math.abs(Math.sin(angle))*f.d,d=Math.abs(Math.sin(angle))*f.w+Math.abs(Math.cos(angle))*f.d;check({min:{x:f.x-w/2,y:0,z:f.z-d/2},max:{x:f.x+w/2,y:f.h,z:f.z+d/2}},'wall');}
 for(const o of objects){const t=propTypes[o.type],base=o.y||0;check({min:{x:o.x-t.radius,y:base,z:o.z-t.radius},max:{x:o.x+t.radius,y:base+t.height,z:o.z+t.radius}},'object',o.id);}
 for(const p of players){const base=p.y||0;check({min:{x:p.x-.28,y:base,z:p.z-.28},max:{x:p.x+.28,y:base+1.75,z:p.z+.28}},'player',p.id);}
 return hit;
}
export function pathTo(from,to){const key=(x,z)=>x+','+z,sx=Math.round(from.x),sz=Math.round(from.z),queue=[[sx,sz]],parent=new Map([[key(sx,sz),null]]);let end;for(let i=0;i<queue.length;i++){const [x,z]=queue[i];if(Math.hypot(x-to.x,z-to.z)<1.6){end=[x,z];break;}for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!parent.has(k)&&free(nx,nz,.3)){parent.set(k,[x,z]);queue.push([nx,nz]);}}}if(!end)return[];const result=[];while(end&&(end[0]!==sx||end[1]!==sz)){result.unshift({x:end[0],z:end[1]});end=parent.get(key(...end));}return result;}
