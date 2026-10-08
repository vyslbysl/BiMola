import {CAPACITY, createRoom, start, choose, tick, view, finish,contenders,arenaFor} from './game.js';
import {MAPS} from '../../../public/games/blind-shot/maps.js';
import {validRules,teamSetup,teamsReady} from '../../../public/games/blind-shot/rules.js';
const players = room => Object.values(room.players);
const members = room => players(room).filter(p => !p.isBot);
const bots = room => players(room).filter(p => p.isBot);
const seats=room=>room.rules.mode==='teams'?room.rules.teamCount*room.rules.teamSize:CAPACITY;
function teamJoinError(room,data={}){
 if(room.rules.mode!=='teams')return null;
 if(data.team!==undefined&&(!Number.isInteger(data.team)||data.team<0||data.team>=room.rules.teamCount))return 'Takım seçimi geçersiz.';
 if(data.team!==undefined&&members(room).filter(p=>p.team===data.team).length>=room.rules.teamSize)return 'Seçtiğin takım dolu. Başka bir takım seç.';
 return null;
}
const joinable = room => ['lobby', 'end'].includes(room.phase) && members(room).length < seats(room);
const names = ['Pusula', 'Kıvılcım', 'Gölge', 'Radar', 'Çelik', 'Yankı', 'Kırağı'];
function setBots(room, count) {
  const existing = bots(room);
  for (const p of existing.slice(count)) delete room.players[p.id];
  for (let index = 0; bots(room).length < count && index < CAPACITY - 1; index++) {
    const id = `bot:${index}`;
    if (!room.players[id]) room.players[id] = {id, name: names[index], isBot: true, alive: true, x: 0, y: 0, angle: 0};
  }
  if(room.rules.mode==='teams')teamSetup(players(room),room.rules);
}
function resetLobby(room) {
  Object.assign(room,{phase:'lobby',round:0,matchRound:0,until:0,shots:[],winners:[],roundWinners:[],roundScored:false,lastReveal:[],botPlans:[],history:[],covers:[],winnerTeams:[]});
  for(const p of players(room))Object.assign(p,{alive:true,locked:false,x:0,y:0,angle:0,score:0,kills:0,wins:0,survived:0,stepPoints:0,ability:null,usedAbilities:[],shots:0,blocked:0,deaths:0,absorbed:0,bestStreak:0,hitTargets:{}});
  room.mapId=room.selectedMapId||room.mapId;room.mapQueue=[];room.arena=arenaFor(room);
}
export const adapter = {
  snapshotInterval: 200,
  create: ({code, host}) => createRoom(code, host),
  members,
  canJoin(room,data={}){if(!joinable(room))return {error:'Oda dolu veya maç sürüyor. Maç bitince katılabilirsin.'};const error=teamJoinError(room,data);return error?{error}:{ok:true};},
  addPlayer(room, {id, name,data={}}) {
    // Human invitations take priority over a bot seat in a full waiting room.
    if (players(room).length >= seats(room) && bots(room).length) setBots(room, bots(room).length - 1);
    room.players[id] = {id, name,team:room.rules.mode==='teams'?(data.team??null):null, isBot: false, alive: true, x: 0, y: 0, angle: 0};if(room.rules.mode==='teams')teamSetup(players(room),room.rules); return {};
  },
  removePlayer(room, id) {
    delete room.players[id];
    if(['lobby','end'].includes(room.phase)&&room.rules.mode==='teams')teamSetup(players(room),room.rules);
    if (room.host === id) room.host = members(room)[0]?.id;
    if (['plan','reveal'].includes(room.phase) && contenders(room)<=1) finish(room);
    if (room.phase==='round-end' && players(room).length<=1) {room.phase='end';room.until=0;room.winners=players(room).map(p=>p.id);}
  },
  summary: room => ({players: members(room).length, bots: bots(room).length, capacity: seats(room),teamCount:room.rules.mode==='teams'?room.rules.teamCount:0,teamSize:room.rules.teamSize,teams:Array.from({length:room.rules.teamCount},(_,team)=>({team,humans:members(room).filter(p=>p.team===team).length})),
    phase: ['plan', 'reveal', 'round-end'].includes(room.phase) ? 'play' : room.phase, joinable: joinable(room)}),
  view, tick,
  tickInterval: room => members(room).length && ['plan', 'reveal', 'round-end'].includes(room.phase) ? 50 : 0,
  commands: {
    set_bot_count: {interval: 250, publish: true, handle(room, id, data) {
      if (id !== room.host) return {error: 'Bot sayısını yalnız oda sahibi değiştirebilir.'};
      if (!['lobby', 'end'].includes(room.phase)) return {error: 'Bot sayısı maç sırasında değiştirilemez.'};
      const count = data?.count;
      if (!Number.isInteger(count) || count < 0 || count > seats(room) - members(room).length) return {error: 'Bot sayısı boş koltuk sayısını aşamaz.'};
      setBots(room, count);
      if (room.phase === 'end') resetLobby(room);
      return {ok: true};
    }},
    set_settings: {interval:250,publish:true,handle(room,id,data) {
      if(id!==room.host)return {error:'Ayarları yalnız oda sahibi değiştirebilir.'};
      if(!['lobby','end'].includes(room.phase))return {error:'Maç sırasında ayarlar değiştirilemez.'};
      if(!MAPS.some(m=>m.id===data?.mapId)||![1,3,5].includes(data?.roundCount))return {error:'Harita veya raund sayısı geçersiz.'};
      const rules={...room.rules,...data.rules};if(!validRules(rules))return {error:'Özel oda kuralları geçersiz.'};
      if(rules.mode==='teams'&&(members(room).length>rules.teamCount*rules.teamSize||Array.from({length:rules.teamCount},(_,team)=>members(room).filter(p=>p.team===team).length).some(n=>n>rules.teamSize)))return {error:'Mevcut oyuncular bu takım düzenine sığmıyor. Önce takımları düzenle.'};
      room.rules=rules;if(rules.mode==='teams')setBots(room,Math.min(bots(room).length,seats(room)-members(room).length));
      room.mapId=data.mapId;room.selectedMapId=data.mapId;room.roundCount=data.roundCount;room.arena=arenaFor(room);
      if(room.phase==='end')resetLobby(room);
      return {ok:true};
    }},
    start: {interval: 500, publish: true, handle(room, id, _, now) {
      if (id !== room.host) return {error: 'Maçı yalnız oda sahibi başlatabilir.'};
      if (!['lobby', 'end'].includes(room.phase)) return {error: 'Maç zaten sürüyor.'};
      if (players(room).length < 2) return {error: 'En az iki oyuncu gerekli. Arkadaşını davet et veya bot ekle.'};
      if(room.rules.mode==='teams'&&!teamsReady(players(room),room.rules))return {error:`${room.rules.teamCount} takımın her birinde ${room.rules.teamSize} oyuncu olmalı. Eksikleri botlarla tamamlayabilirsin.`};
      start(room, now); return {ok: true};
    }},
    select_team:{interval:250,publish:true,handle(room,id,data){
      if(!['lobby','end'].includes(room.phase)||room.rules.mode!=='teams')return {error:'Takım yalnız maç öncesinde seçilebilir.'};
      const player=room.players[id];if(!player||player.isBot)return {error:'Oyuncu bulunamadı.'};
      if(!Number.isInteger(data?.team)||data.team<0||data.team>=room.rules.teamCount)return {error:'Takım seçimi geçersiz.'};
      if(player.team!==data.team&&members(room).filter(p=>p.team===data.team).length>=room.rules.teamSize)return {error:'Bu takım dolu.'};
      player.team=data.team;teamSetup(players(room),room.rules);if(room.phase==='end')resetLobby(room);return {ok:true};
    }},
    choose: {interval: 80, publish: true, handle: choose},
  },
};
