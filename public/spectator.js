// Free flight is local to the spectator; never feed these coordinates into player input.
export function moveSpectator(position,yaw,keys,dt,room){
 const forward=Number(!!keys.w)-Number(!!keys.s),side=Number(!!keys.d)-Number(!!keys.a);
 const x=-Math.sin(yaw)*forward+Math.cos(yaw)*side,z=-Math.cos(yaw)*forward-Math.sin(yaw)*side,y=Number(!!keys[' '])-Number(!!keys.c);
 const length=Math.hypot(x,y,z)||1,step=Math.max(0,Math.min(.06,dt))*(keys.shift?12:5)/length;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 return {x:clamp(position.x+x*step,-room.width/2+.2,room.width/2-.2),y:clamp(position.y+y*step,.25,room.height-.2),z:clamp(position.z+z*step,-room.depth/2+.2,room.depth/2-.2)};
}
