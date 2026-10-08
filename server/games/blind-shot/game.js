import {BODY_RADIUS, insideArena, clampArena, safePosition, bulletStop, moveArena, insideBoundary} from '../../../public/games/blind-shot/arena.js';
import {mapArena,mapRotation} from '../../../public/games/blind-shot/maps.js';
import {DEFAULT_RULES,abilityCover,teamStandings,teamSetup} from '../../../public/games/blind-shot/rules.js';
export {BODY_RADIUS};
export const CAPACITY = 8;
export const PLAN_MS = 12000;
export const REVEAL_MS = 6200;
export const ROUND_BREAK_MS = 5000;
const BOT_MOVE_DISTANCE = 220;
export const contenders = room => room.rules.mode==='teams'?new Set(alive(room).map(p=>p.team)).size:alive(room).length;
export function arenaFor(room,scale=1){
  const arena=mapArena(room.mapId,scale);
  if(room.rules.cover==='none')arena.obstacles=[];
  if(room.rules.cover==='sparse')arena.obstacles=arena.obstacles.filter((_,i)=>i%2===0);
  arena.obstacles.push(...(room.covers||[]).filter(o=>[-1,1].every(dx=>[-1,1].every(dy=>insideBoundary(o.x+dx*o.width/2,o.y+dy*o.depth/2,arena,0)))));
  return arena;
}
const alive = room => Object.values(room.players).filter(p => p.alive);
export function createRoom(code, host) {
  return {rules:{...DEFAULT_RULES},history:[],mapQueue:[],selectedMapId:null,covers:[],winnerTeams:[],code, host, players: {}, phase: 'lobby', arena: mapArena('foundry'), mapId: 'foundry', roundCount: 3, matchRound: 0, roundWinners: [], roundScored: false, round: 0, until: 0, shots: [], winners: [], botPlans: [], lastReveal: []};
}
export function finish(room, now = Date.now()) {
  if (room.roundScored) return;
  room.roundScored = true; const livingTeams=new Set(alive(room).map(p=>p.team));
  room.roundWinners = Object.values(room.players).filter(p=>room.rules.mode==='teams'?livingTeams.has(p.team):p.alive).map(p=>p.id);
  for (const id of room.roundWinners) {room.players[id].score += room.rules.roundWin;room.players[id].wins++;}
  room.history.push({round:room.matchRound,mapId:room.mapId,winners:[...room.roundWinners],players:Object.values(room.players).map(p=>({id:p.id,name:p.name,team:p.team,points:p.score-p.roundStartScore}))});
  if (room.matchRound < room.roundCount && Object.keys(room.players).length > 1) {
    room.phase = 'round-end'; room.until = now + ROUND_BREAK_MS;
  } else {
    room.phase = 'end'; room.until = 0;
    const top = Math.max(...Object.values(room.players).map(p => p.score));
    if(room.rules.mode==='teams'){const teams=teamStandings(Object.values(room.players),room.rules.teamCount);room.winnerTeams=room.roundCount===1?[...livingTeams]:teams.filter(t=>t.score===teams[0].score).map(t=>t.team);room.winners=Object.values(room.players).filter(p=>room.winnerTeams.includes(p.team)).map(p=>p.id);return;}
    room.winners = room.roundCount === 1 ? [...room.roundWinners] : Object.values(room.players).filter(p => p.score === top).map(p => p.id);
  }
}
export function start(room, now) {
  room.selectedMapId=room.phase==='end'?(room.selectedMapId||room.mapId):room.mapId;
  room.mapQueue=mapRotation(room.selectedMapId);
  room.covers=[];room.history=[];room.winnerTeams=[];room.arena = arenaFor(room); room.matchRound = 0; room.winners = [];
  if(room.rules.mode==='teams')teamSetup(Object.values(room.players),room.rules);
  Object.values(room.players).forEach((p,i)=>Object.assign(p,{team:room.rules.mode==='teams'?p.team:null,score:0,kills:0,wins:0,survived:0,stepPoints:0,shots:0,blocked:0,deaths:0,absorbed:0,streak:0,bestStreak:0,hitTargets:{},usedAbilities:[],ability:null}));
  beginRound(room, now);
}
export function beginRound(room, now) {
  const players = Object.values(room.players);
  if(!room.mapQueue.length)room.mapQueue=mapRotation(room.mapId).slice(1);
  room.mapId=room.mapQueue.shift();
  room.covers=[];room.arena=arenaFor(room);
  room.matchRound++; room.round = 0; room.roundWinners = []; room.roundScored = false; room.lastReveal = [];
  players.forEach((p, i) => {
    const angle = i * Math.PI * 2 / players.length;
    const aim = Math.atan2(Math.sin(angle + Math.PI), Math.cos(angle + Math.PI));
    let point={x:Math.cos(angle)*520,y:Math.sin(angle)*390};
    for(let attempt=1;!insideArena(point.x,point.y,room.arena)&&attempt<=10;attempt++)point=clampArena(Math.cos(angle)*520*(1+attempt*.08),Math.sin(angle)*390*(1+attempt*.08),room.arena);
    Object.assign(p, {alive: true,ability:null,streak:0,roundStartScore:p.score, ...safePosition(point.x,point.y,room.arena), angle: aim});
  });
  beginPlan(room, now);
}
export function beginPlan(room, now) {
  room.round++; room.phase = 'plan'; room.until = now + room.rules.planSeconds*1000; room.shots = [];
  for(const p of Object.values(room.players))p.stepPoints=0;
  for (const p of alive(room)) {
    Object.assign(p, safePosition(p.x, p.y, room.arena));
    p.ability=null;
    p.originX = p.x; p.originY = p.y; p.locked = false;
  }
  // Plan from the previous public reveal only, before any hidden human choices.
  room.botPlans = alive(room).filter(p => p.isBot).map(p => ({id: p.id,
    at: now + 1500 + Math.random() * 2500,
    choice: planBot({self: {x: p.x, y: p.y}, arena: room.arena,
      opponents: room.lastReveal.filter(other => other.id !== p.id && room.players[other.id]?.alive&&(room.rules.mode!=='teams'||other.team!==p.team))})}));
}
export function planBot({self, arena, opponents}, random = Math.random) {
  const direction = random() * Math.PI * 2, distance = Math.sqrt(random()) * BOT_MOVE_DISTANCE;
  let x = self.x + Math.cos(direction) * distance, y = self.y + Math.sin(direction) * distance;
  ({x, y} = moveArena(self, x, y, arena));
  let targetX, targetY;
  if (opponents.length) {
    const target = opponents[Math.floor(random() * opponents.length)];
    // Guess where a previously seen opponent may have moved; never read their current plan.
    targetX = target.x + (random() - .5) * BOT_MOVE_DISTANCE;
    targetY = target.y + (random() - .5) * BOT_MOVE_DISTANCE;
  } else {
    targetX = (random() * 2 - 1) * arena.halfWidth; targetY = (random() * 2 - 1) * arena.halfDepth;
  }
  return {x, y, angle: Math.atan2(targetY - y, targetX - x), lock: true};
}
export function choose(room, id, data, now) {
  const p = room.players[id];
  if (room.phase !== 'plan' || now >= room.until || !p?.alive || p.locked) return {error: 'Bu adımda seçim yapamazsın.'};
  if (!data || !['x', 'y', 'angle'].every(key => typeof data[key] === 'number' && Number.isFinite(data[key])) || typeof data.lock !== 'boolean') return {error: 'Seçim geçersiz.'};
  if (!insideArena(data.x, data.y, room.arena)) return {error: 'Hareket alanının içinde bir konum seç.'};
  const reachable = moveArena(p, data.x, data.y, room.arena);
  if (Math.hypot(reachable.x-data.x,reachable.y-data.y)>.05) return {error: 'Siperin içinden geçemezsin.'};
  const ability=data.ability??null;
  if(ability!==null&&(!room.rules.abilities||!['shield','cover'].includes(ability)||p.usedAbilities.includes(ability)))return {error:'Bu yetenek kullanılamaz.'};
  if(ability==='cover'){const o=abilityCover(data,room.arena);if(![-1,1].every(dx=>[-1,1].every(dy=>insideBoundary(o.x+dx*o.width/2,o.y+dy*o.depth/2,room.arena,0)))||room.arena.obstacles.some(b=>Math.abs(b.x-o.x)<(b.width+o.width)/2&&Math.abs(b.y-o.y)<(b.depth+o.depth)/2))return {error:'Siper için önünde boş ve arena içinde kalan bir alan gerekli.'};}
  Object.assign(p, {ability,x: data.x, y: data.y, angle: Math.atan2(Math.sin(data.angle), Math.cos(data.angle)), locked: data.lock});
  return {ok: true};
}
export function resolve(room, now) {
  if (room.phase !== 'plan') return;
  const players = alive(room), victims = new Set();
  for(const p of players)if(p.ability){p.usedAbilities.push(p.ability);if(p.ability==='cover'){const o=abilityCover(p,room.arena);room.covers.push(o);room.arena.obstacles.push(o);}}
  for(const p of players)Object.assign(p,safePosition(p.x,p.y,room.arena));
  room.shots = players.map(p => {
    const dx = Math.cos(p.angle), dy = Math.sin(p.angle);
    const wall = bulletStop(p.x,p.y,p.angle,room.arena);
    let target = null, distance = wall.distance;
    for (const other of players) {
      if (other.id === p.id) continue;
      const rx = other.x - p.x, ry = other.y - p.y, along = rx * dx + ry * dy;
      const perpendicular2 = Math.max(0, rx * rx + ry * ry - along * along);
      if (perpendicular2 > BODY_RADIUS ** 2 || along < 0) continue;
      const entry = Math.max(0, along - Math.sqrt(BODY_RADIUS ** 2 - perpendicular2));
      if (entry < distance) { distance = entry; target = other.id; }
    }
    p.shots++;let protectedTarget=null,allyTarget=null;
    if(target&&room.rules.mode==='teams'&&room.players[target].team===p.team){allyTarget=target;target=null;}
    if(target&&room.players[target].ability==='shield'){protectedTarget=target;room.players[target].absorbed++;target=null;}
    if(wall.obstacleId&&!target&&!protectedTarget&&!allyTarget)p.blocked++;
    if (target) {victims.add(target);const previous=p.hitTargets[target]||{name:room.players[target].name,count:0};p.hitTargets[target]={...previous,count:previous.count+1};p.score+=room.rules.hit;p.stepPoints+=room.rules.hit;p.kills++;}
    return {protectedTarget,allyTarget,id: p.id,team:p.team, x: p.x, y: p.y, endX: p.x + dx * distance, endY: p.y + dy * distance, target, obstacleId: (target||protectedTarget||allyTarget) ? null : wall.obstacleId};
  });
  for (const id of victims) {room.players[id].alive = false;room.players[id].deaths++;room.players[id].streak=0;}
  for(const p of alive(room)){p.score+=room.rules.survival;p.stepPoints+=room.rules.survival;p.survived++;p.streak++;p.bestStreak=Math.max(p.bestStreak,p.streak);}
  room.lastReveal = alive(room).map(p => ({id: p.id,team:p.team, x: p.x, y: p.y}));
  room.phase = 'reveal'; room.until = now + REVEAL_MS;
}
export function tick(room, now) {
  let changed = false;
  if (room.phase === 'plan') for (const plan of room.botPlans) {
    const player = room.players[plan.id];
    if (now >= plan.at && player?.alive && !player.locked) {
      // A delayed server tick still applies the choice scheduled before the deadline.
      changed = !!choose(room, plan.id, plan.choice, plan.at).ok || changed;
    }
  }
  if (room.phase === 'plan' && (now >= room.until || alive(room).every(p => p.locked))) { resolve(room, now); return {changed: true}; }
  if (room.phase === 'round-end' && now >= room.until) {beginRound(room,now);return {changed:true};}
  if (room.phase === 'reveal' && now >= room.until) {
    if (contenders(room) <= 1 || room.round >= room.rules.maxSteps) finish(room, now);
    else {
      room.arena=arenaFor(room,(room.arena.scale||1)*(1-room.rules.shrink));
      beginPlan(room, now);
    }
    return {changed: true};
  }
  return {changed};
}
export function view(room, id, now) {
  const visible = ['reveal','round-end','end'].includes(room.phase);
  return {rules:{...room.rules},history:structuredClone(room.history),winnerTeams:[...room.winnerTeams],code: room.code, hostId: room.host, me: id, phase: room.phase, arena: {...room.arena, vertices:room.arena.vertices.map(p=>({...p})), obstacles: room.arena.obstacles.map(o=>({...o}))}, mapId: room.mapId,selectedMapId:room.selectedMapId||room.mapId, roundCount:room.roundCount, matchRound:room.matchRound, roundWinners:[...room.roundWinners], round: room.round,
    until: room.until, serverNow: now, winners: [...room.winners], shots: visible ? room.shots.map(s => ({...s})) : [],
    players: Object.values(room.players).map((p,index) => ({id: p.id,team:room.rules.mode==='teams'?p.team??null:null, name: p.name, isBot: !!p.isBot, score:p.score||0,kills:p.kills||0,wins:p.wins||0,survived:p.survived||0,stepPoints:p.stepPoints||0, stats:{shots:p.shots||0,blocked:p.blocked||0,deaths:p.deaths||0,absorbed:p.absorbed||0,bestStreak:p.bestStreak||0,hitTargets:structuredClone(p.hitTargets||{})},usedAbilities:[...(p.usedAbilities||[])],...(visible||p.id===id?{ability:p.ability||null}:{}),alive: p.alive, locked: !!p.locked,
      ...(visible || p.id === id || (room.rules.mode==='teams'&&room.players[id]?.alive&&p.team===room.players[id].team) ? {x: p.x, y: p.y, angle: p.angle, originX: p.originX, originY: p.originY} : {})}))};
}
