// Preserve the loft camera margin, but follow the bounds of the active map.
export function clampHiderCamera(desired,room){
 desired.y=Math.max(.55,Math.min(room.height-.75,desired.y));
 const xLimit=room.width/2+10,zLimit=room.depth/2+8;
 desired.x=Math.max(-xLimit,Math.min(xLimit,desired.x));desired.z=Math.max(-zLimit,Math.min(zLimit,desired.z));
 return desired;
}
