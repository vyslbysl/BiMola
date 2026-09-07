import express from 'express';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {Server} from 'socket.io';
import {fileURLToPath} from 'node:url';
import {player,start,tick,action,view,sanitizeSettings,configureRoom,syncBots,setTeam} from './game.js';
export function createGameServer(){
 // cors:{origin:true} echoes back whatever Origin the browser sends (defensive — io() already
 // connects same-origin by default, but this rules out CORS if the client is ever loaded cross-origin,
 // e.g. through a reverse proxy on a different port).
 const app=express(),http=createServer(app),io=new Server(http,{maxHttpBufferSize:4096,cors:{origin:true}});const rooms=new Map();
 app.use(express.static(fileURLToPath(new URL('./public',import.meta.url))));
 app.use('/vendor',express.static(fileURLToPath(new URL('./node_modules/three/build',import.meta.url))));app.get('/health',(_,res)=>res.json({ok:true}));
 function publish(r){const now=Date.now();for(const p of Object.values(r.players))if(!p.bot)io.to(p.id).emit('state',view(r,p.id,now));}
 function leave(s){
  const r=rooms.get(s.data.code);if(!r)return;
  const p=r.players[s.id];if(p?.propId){const object=r.objects?.find(o=>o.id===p.propId);if(object)delete object.owner;}
  delete r.players[s.id];s.leave(r.code);s.data.code=null;
  const humans=Object.values(r.players).filter(p=>!p.bot);if(!humans.length)rooms.delete(r.code);else{if(r.host===s.id)r.host=humans[0].id;if(['lobby','end'].includes(r.phase))syncBots(r);publish(r);}
 }
 io.on('connection',s=>{
  let lastJoin=0,lastAction=0;
  s.on('join',(data={},ack)=>{
   if(typeof ack!=='function')return;const now=Date.now();if(now-lastJoin<350)return ack({error:'Bir saniye bekle.'});lastJoin=now;
   if(!data||typeof data!=='object'||Array.isArray(data))return ack({error:'Oda bilgisi geçersiz.'});
   const name=String(data.name||'Misafir').trim().slice(0,18)||'Misafir';let r;
   if(data.code){
    r=rooms.get(String(data.code).replace(/\D/g,''));if(!r)return ack({error:'Bu oda bulunamadı. Kodu kontrol et.'});
    if(r&&s.data.code===r.code)return ack({code:r.code,id:s.id});
    if(!['lobby','end'].includes(r.phase))return ack({error:'Tur devam ediyor. Tur bitince tekrar katıl.'});
    if(Object.values(r.players).filter(p=>!p.bot).length>=r.settings.teamSize*2)return ack({error:`Oda dolu (${r.settings.teamSize*2} kişi).`});
    if(r.practice)return ack({error:'Bu bir antrenman odası. Yeni oda oluştur.'});
   }
   leave(s);
   // Four digits: short enough to read out over the phone, and 9000 of them is plenty at once.
   if(!r){let code=null;for(let i=0;i<400&&!code;i++){const candidate=String(1000+Math.floor(Math.random()*9000));if(!rooms.has(candidate))code=candidate;}
    if(!code)return ack({error:'Şu anda yeni oda açılamıyor. Az sonra tekrar dene.'});
    r={code,host:s.id,players:{},phase:'lobby',until:0,round:0,practice:!!data.practice,settings:sanitizeSettings(data.settings)};rooms.set(code,r);}
   let team=data.role==='hunter'?'hunter':'hider';
   const humans=t=>Object.values(r.players).filter(p=>!p.bot&&p.team===t).length;
   if(r.settings.teamSelection==='auto')team=humans('hunter')<humans('hider')?'hunter':'hider';
   if(humans(team)>=r.settings.teamSize)team=team==='hunter'?'hider':'hunter';
   r.players[s.id]=player(s.id,name,false,team);s.data.code=r.code;s.join(r.code);syncBots(r);
   if(r.practice){r.settings.botMode='fill';syncBots(r);start(r);r.phase='brief';r.until=0;}
   ack({code:r.code,id:s.id});publish(r);
  });
  s.on('ready',ack=>{const r=rooms.get(s.data.code);if(r?.practice&&r.host===s.id&&r.phase==='brief'){r.phase='prep';r.until=Date.now()+r.settings.hideSeconds*1000;if(typeof ack==='function')ack({ok:true});publish(r);}else if(typeof ack==='function')ack({error:'Antrenman hazır değil.'});});
  s.on('settings',(data,ack)=>{const r=rooms.get(s.data.code),result=r?configureRoom(r,data,s.id):{error:'Oda bulunamadı.'};if(typeof ack==='function')ack(result);if(r&&result.ok)publish(r);});
  s.on('team',(team,ack)=>{const r=rooms.get(s.data.code),result=r?setTeam(r,s.id,team):{error:'Oda bulunamadı.'};if(typeof ack==='function')ack(result);if(r&&result.ok)publish(r);});
  s.on('move-team',(data,ack)=>{const r=rooms.get(s.data.code),result=r&&data&&typeof data==='object'?setTeam(r,data.playerId,data.team,s.id):{error:'Oyuncu bulunamadı.'};if(typeof ack==='function')ack(result);if(r&&result.ok)publish(r);});
  s.on('start',ack=>{const r=rooms.get(s.data.code);let result;
   if(!r)result={error:'Oda bulunamadı.'};else if(r.host!==s.id)result={error:'Turu yalnızca oda kurucusu başlatabilir.'};else if(!['lobby','end'].includes(r.phase))result={error:'Tur zaten başladı.'};else result=start(r);
   if(typeof ack==='function')ack(result);if(result.ok)publish(r);
  });
  s.on('input',(v={})=>{const r=rooms.get(s.data.code),p=r?.players[s.id];if(!p||!v||typeof v!=='object'||!['prep','play'].includes(r.phase))return;
   p.input={x:Number.isFinite(v.x)?Math.max(-1,Math.min(1,v.x)):0,z:Number.isFinite(v.z)?Math.max(-1,Math.min(1,v.z)):0,fire:!!v.fire,jump:!!v.jump,spin:Number.isFinite(v.spin)?Math.max(-1,Math.min(1,v.spin)):0,lift:Number.isFinite(v.lift)?Math.max(-1,Math.min(1,v.lift)):0};
   if(Number.isFinite(v.yaw))p.yaw=((v.yaw%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
   if(Number.isFinite(v.pitch))p.pitch=Math.max(-1.35,Math.min(1.35,v.pitch));p.inputAt=Date.now();
  });
  s.on('action',(data,ack)=>{const now=Date.now();if(now-lastAction<90){if(typeof ack==='function')ack({ok:false,error:'Bir an bekle.'});return;}lastAction=now;
   const r=rooms.get(s.data.code),p=r?.players[s.id];const result=p?action(r,p,data,now):{ok:false,error:'Oda bulunamadı.'};if(typeof ack==='function')ack(result);s.emit('action-result',result);
  });
  s.on('leave',()=>leave(s));s.on('disconnect',()=>leave(s));
 });
 let previous=Date.now(),lastBroadcast=0;const timer=setInterval(()=>{const now=Date.now(),dt=Math.min(.1,(now-previous)/1000);previous=now;for(const r of rooms.values()){tick(r,now,dt);for(const result of r.results||[])if(!r.players[result.playerId]?.bot)io.to(result.playerId).emit(result.event,result.data);r.results=[];if(now-lastBroadcast>=50)publish(r);}if(now-lastBroadcast>=50)lastBroadcast=now;},25);
 return {http,io,rooms,close:()=>{clearInterval(timer);io.close();if(http.listening)http.close();}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const {http}=createGameServer();http.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Nesne avı hazır: http://localhost:3000'));}
