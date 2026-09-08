export const EYE_HEIGHT=1.62;
export const GUN_POSITION={x:.30,y:-.43,z:-.70};
export const MUZZLE_LOCAL={x:0,y:.023,z:-.345};
export function weaponPose(player){
 const yaw=Number(player.yaw)||0,pitch=Math.max(-1.35,Math.min(1.35,Number(player.pitch)||0));
 const eye={x:player.x,y:(player.y||0)+EYE_HEIGHT,z:player.z};
 const x=GUN_POSITION.x,y=GUN_POSITION.y+MUZZLE_LOCAL.y,z=GUN_POSITION.z+MUZZLE_LOCAL.z;
 const py=y*Math.cos(pitch)-z*Math.sin(pitch),pz=y*Math.sin(pitch)+z*Math.cos(pitch);
 return {eye,muzzle:{x:eye.x+x*Math.cos(yaw)+pz*Math.sin(yaw),y:eye.y+py,z:eye.z-x*Math.sin(yaw)+pz*Math.cos(yaw)},direction:{x:-Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)}};
}
export function toward(from,to){const length=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z)||1;return {x:(to.x-from.x)/length,y:(to.y-from.y)/length,z:(to.z-from.z)/length};}
