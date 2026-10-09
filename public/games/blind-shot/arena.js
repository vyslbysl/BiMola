export const ARENA = Object.freeze({halfWidth: 700, halfDepth: 550});
export const BODY_RADIUS = 14;
export function arenaVertices(arena=ARENA) {
  return arena.vertices||[{x:-arena.halfWidth,y:-arena.halfDepth},{x:arena.halfWidth,y:-arena.halfDepth},{x:arena.halfWidth,y:arena.halfDepth},{x:-arena.halfWidth,y:arena.halfDepth}];
}
export function boundaryPlanes(arena=ARENA) {
  const vertices=arenaVertices(arena);
  return vertices.map((v,i)=>{const next=vertices[(i+1)%vertices.length],dx=next.x-v.x,dy=next.y-v.y,length=Math.hypot(dx,dy),nx=dy/length,ny=-dx/length;return {nx,ny,limit:nx*v.x+ny*v.y};});
}
export function insideBoundary(x,y,arena=ARENA,padding=BODY_RADIUS) {
  return boundaryPlanes(arena).every(p=>p.nx*x+p.ny*y<=p.limit-padding+.01);
}
export function insideArena(x,y,arena=ARENA) {
  return insideBoundary(x,y,arena)&&!occupied(x,y,arena);
}
export function clampArena(x,y,arena=ARENA) {
  for(let pass=0;pass<24;pass++)for(const p of boundaryPlanes(arena)){
    const excess=p.nx*x+p.ny*y-p.limit+BODY_RADIUS;
    if(excess>0){x-=p.nx*excess;y-=p.ny*excess;}
  }
  return {x,y};
}
export function rayLength(x,y,angle,arena=ARENA) {
  const dx=Math.cos(angle),dy=Math.sin(angle);let distance=Infinity;
  for(const p of boundaryPlanes(arena)){
    const along=p.nx*dx+p.ny*dy;
    if(along>1e-9)distance=Math.min(distance,(p.limit-p.nx*x-p.ny*y)/along);
  }
  return Math.max(0,distance);
}
export function safePosition(x,y,arena=ARENA) {
  const point=clampArena(x,y,arena);if(insideArena(point.x,point.y,arena))return point;
  const candidates=[];
  for(const o of arena.obstacles||[]){
    const left=o.x-o.width/2-BODY_RADIUS-.1,right=o.x+o.width/2+BODY_RADIUS+.1,top=o.y-o.depth/2-BODY_RADIUS-.1,bottom=o.y+o.depth/2+BODY_RADIUS+.1;
    candidates.push({x:left,y:point.y},{x:right,y:point.y},{x:point.x,y:top},{x:point.x,y:bottom},...[[left,top],[left,bottom],[right,top],[right,bottom]].map(([x,y])=>({x,y})));
  }
  let valid=candidates.map(p=>clampArena(p.x,p.y,arena)).filter(p=>insideArena(p.x,p.y,arena));
  if(!valid.length)for(let i=-20;i<=20;i++)for(let j=-20;j<=20;j++){
    const p={x:i*arena.halfWidth/21,y:j*arena.halfDepth/21};if(insideArena(p.x,p.y,arena))valid.push(p);
  }
  valid.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
  return valid[0]||point;
}

export function occupied(x,y,arena=ARENA) {
  return (arena.obstacles||[]).some(o=>Math.abs(x-o.x)<o.width/2+BODY_RADIUS-.01&&Math.abs(y-o.y)<o.depth/2+BODY_RADIUS-.01);
}
// Slab intersection is shared by bullets and swept character movement.
export function boxEntry(x,y,dx,dy,o,padding=0) {
  let near=0,far=Infinity;
  for(const [position,direction,center,extent] of [[x,dx,o.x,o.width/2+padding],[y,dy,o.y,o.depth/2+padding]]) {
    if(Math.abs(direction)<1e-9){if(position<center-extent||position>center+extent)return Infinity;continue;}
    const a=(center-extent-position)/direction,b=(center+extent-position)/direction;
    near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    if(near>far)return Infinity;
  }
  return far>=0?near:Infinity;
}
export function bulletStop(x,y,angle,arena=ARENA) {
  let distance=rayLength(x,y,angle,arena),obstacleId=null;
  for(const o of arena.obstacles||[]){
    const entry=boxEntry(x,y,Math.cos(angle),Math.sin(angle),o);
    if(entry<distance){distance=entry;obstacleId=o.id;}
  }
  return {distance,obstacleId};
}
export function moveArena(from,x,y,arena=ARENA) {
  const target=clampArena(x,y,arena);let next={x:from.x,y:from.y};
  for(const axis of ['x','y']){
    const delta=target[axis]-next[axis];if(Math.abs(delta)<1e-9)continue;
    let fraction=1;
    for(const plane of boundaryPlanes(arena)){
      const along=(axis==='x'?plane.nx:plane.ny)*delta;
      if(along>1e-9)fraction=Math.min(fraction,Math.max(0,(plane.limit-BODY_RADIUS-plane.nx*next.x-plane.ny*next.y)/along));
    }
    for(const o of arena.obstacles||[]){
      const entry=boxEntry(next.x,next.y,axis==='x'?delta:0,axis==='y'?delta:0,o,BODY_RADIUS);
      if(entry<1){
        // Permit moving away from a face that the character already touches.
        const tiny={...next,[axis]:next[axis]+Math.sign(delta)*.1};
        if(entry===0&&!occupied(tiny.x,tiny.y,{...arena,obstacles:[o]}))continue;
        fraction=Math.min(fraction,Math.max(0,entry-.001/Math.abs(delta)));
      }
    }
    next[axis]+=delta*fraction;
  }
  return next;
}
