import {readName, saveName} from '/platform/profile.js';
import {createScene3D} from './scene3d.js';
import {walkDraft} from './controls.js';
import {standings} from './scoring.js';
import {DEFAULT_RULES,teamStandings,TEAMS,teamsReady,teamColor} from './rules.js';
import {MAPS, getMap} from './maps.js';
import {createAudio} from './audio.js';
import {createFullscreen} from './fullscreen.js';
import {describeShots} from './results.js';
import {moveArena} from './arena.js';
const $ = id => document.getElementById(id), canvas = $('arena');
let arenaScene, resultsKey = '', lastResults = [], replayStart=0, countdownKey='';
const audio=createAudio();
$('map-select').replaceChildren(...MAPS.map(map=>new Option(map.name,map.id)));
$('sound').onclick=async()=>{const enabled=await audio.toggle();$('sound').textContent=enabled?'♫ Ses: açık':'♫ Ses: kapalı';$('sound').setAttribute('aria-pressed',String(enabled));};
document.addEventListener('pointerdown',()=>audio.unlock());
$('replay').onclick=()=>{releaseMouse();replayStart=replayActive()?-1:performance.now();};
function replayActive(){return state&&['reveal','round-end','end'].includes(state.phase)&&replayStart>0&&performance.now()>=replayStart&&(performance.now()-replayStart)<4400;}

const socket = io('/games/blind-shot', {autoConnect: false, reconnection: false});
let finalDismissed=false, finalKey='', joinSelectedTeam=null;
const keys = new Set();
const fullscreen = createFullscreen($('game-view'), $('fullscreen'), {beforeChange: releaseMouse, onChange: () => arenaScene?.resize()});
let dragging = false, lastPointer = null, lastFrame = 0, pointerFallback = false;
let state, draft, mode = 'walk', offset = 0, frame = 0, noticeTimer, joining = false, pending = false, lastChoiceAt = 0;
$('name').value = readName(); $('code').value = new URLSearchParams(location.search).get('room') || '';
const mine = () => state?.players.find(p => p.id === state.me);
const editable = () => state?.phase === 'plan' && mine()?.alive && !mine().locked && !pending && Date.now() + offset < state.until;
function notice(message) { $('notice').textContent = message; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('notice').textContent = ''; }, 5000); }
function command(event, data = {}) {
  return new Promise(resolve => socket.timeout(6000).emit(event, data, (error, result) => {
    if (error) { notice('Sunucudan yanıt alınamadı. Bağlantını kontrol et.'); resolve(null); }
    else { if (result?.error) notice(result.error); resolve(result); }
  }));
}
$('join-form').addEventListener('submit', async event => {
  event.preventDefault(); if (joining) return;
  if (!arenaScene) {
    try { arenaScene = createScene3D(canvas); }
    catch { notice('3D arena açılamadı. WebGL destekleyen bir tarayıcıyla tekrar dene.'); return; }
  }
  joining = true; $('join-button').disabled = true;
  const join = async () => {
    const result = await command('join', {name: saveName($('name').value), code: $('code').value.trim() || undefined,...(!$('join-team-field').hidden&&joinSelectedTeam!==null?{team:joinSelectedTeam}:{})});
    if (result && !result.error) { $('home').hidden = true; $('room').hidden = false; history.replaceState(null, '', `?room=${result.code}`); }
    joining = false; $('join-button').disabled = false;
  };
  if (socket.connected) join(); else { socket.once('connect', join); socket.connect(); }
});
socket.on('connect_error', () => { socket.off('connect'); joining = false; $('join-button').disabled = false; notice('Bağlantı kurulamadı. Tekrar dene.'); });
function exit(message) {
  clearTimeout(settingsTimer);settingsPending=false;fullscreen.close();
  resultsKey = ''; lastResults = [];replayStart=0;finalDismissed=false;finalKey='';$('final-results').hidden=true;setMode('walk');
  releaseMouse(); keys.clear();
  state = null; draft = null; pending = false; joining = false; socket.off('connect');
  $('home').hidden = false; $('room').hidden = true; $('join-button').disabled = false;
  history.replaceState(null, '', location.pathname); if (message) notice(message);
}
socket.on('disconnect', reason => { if (state) exit('Bağlantın koptu. Odaya yeniden katılabilirsin.'); });
socket.on('room-error', result => exit(result.error));
socket.on('state', packet => {
  if (packet.gameId !== 'blind-shot' || packet.protocolVersion !== 1) return;
  const newStep = !state || packet.matchRound !== state.matchRound || packet.round !== state.round || packet.phase !== state.phase;
  const resetView=!state||packet.mapId!==state.mapId||(packet.phase==='plan'&&packet.round===1&&(state.phase!=='plan'||packet.matchRound!==state.matchRound));
  state = packet;
  if(resetView){setMode('walk');arenaScene?.resetView();}
  if(packet.phase!=='end'){finalDismissed=false;finalKey='';}else if(newStep){replayStart=-1;}
  offset = packet.serverNow - Date.now();
  const me = mine();
  if (newStep || me?.locked) draft = me ? {x: me.x, y: me.y, angle: me.angle,ability:me.ability||null} : null;
  if (newStep) {
    keys.clear();countdownKey='';
    if(packet.phase==='reveal'){
      replayStart=performance.now()+1600;audio.play('shot',packet.shots.length);
      if(packet.shots.some(s=>s.target))audio.play('hit');
      if(packet.shots.some(s=>s.obstacleId))audio.play('blocked');
    } else if(packet.phase==='plan'||packet.phase==='lobby')replayStart=0;
    if(packet.phase==='round-end'||packet.phase==='end')audio.play('round');
  }
  if (packet.phase !== 'plan' || me?.locked || !me?.alive) releaseMouse();
  render();
});
function render() {
  if (!state) return;
  $('room-code').textContent = `ODA ${state.code} / KÖR ATIŞ`;
  const survivors = state.players.filter(p => p.alive);
  $('round').textContent = `RAUND ${state.matchRound || 1}/${state.roundCount} · HAMLE ${state.round}/${state.rules.maxSteps} · ALAN %${Math.round((state.arena.scale||1)**2*100)}`; $('remaining').textContent = `${survivors.length} / ${state.players.length} hayatta`;
  const me = mine();
  let title = 'Arena hazır.', hint = 'Arkadaşlarını davet et veya bot ekleyerek tek başına oyna.';
  if (state.phase === 'plan') { title = me?.alive ? (me.locked ? 'Hamlen kilitlendi.' : 'Rakibin nerede?') : 'Bu maçta elendin.'; hint = me?.alive ? 'Konumunu seç, nişanını ayarla ve kilitle. Rakiplerin gizli.' : 'Sonraki atışları bekle. Gizli seçimler seyircilere de kapalı.'; }
  if (state.phase === 'reveal') { title = 'Atışlar açığa çıktı.'; hint = `Atışlar aynı anda gerçekleşti. Sonraki hamlede sınır %${Math.round(state.rules.shrink*100)} içeri çekilecek; dışarıda kalanlar güvenli zemine taşınacak.`; }
  if (state.phase === 'round-end') {
    const names=state.roundWinners.map(id=>state.players.find(p=>p.id===id)?.name).filter(Boolean);
    title=state.rules.mode==='teams'?`${[...new Set(state.players.filter(p=>state.roundWinners.includes(p.id)).map(p=>TEAMS[p.team].name))].join(' + ')||'Hiçbir'} takım raund sonucu`:names.length ? `${names.join(' · ')} raundu kazandı!` : 'Raund berabere!';
    hint=`${state.matchRound+1}. raund birazdan başlıyor. Herkes yeniden arenaya dönecek.`;
  }
  if (state.phase === 'end') {
    const names = state.winners.map(id => state.players.find(p => p.id === id)?.name).filter(Boolean);
    title = state.rules.mode==='teams'?teamResultTitle():names.length === 1 ? `${names[0]} kazandı!` : names.length ? 'Ortak galibiyet!' : 'Berabere!';
    hint = names.length > 1 ? names.join(' · ') : 'Yeni maç için oda sahibi yeniden başlatabilir.';
  }
  $('title').textContent = title; $('hint').textContent = hint;
  if (state.phase === 'lobby' || (state.phase === 'plan' && state.round === 1)) {
    resultsKey = ''; lastResults = []; $('shot-results').hidden = true;
  }
  const publicResult = ['reveal', 'round-end', 'end'].includes(state.phase);
  const nextResultsKey = `${state.code}:${state.matchRound}:${state.round}`;
  if (publicResult && state.shots.length && resultsKey !== nextResultsKey) {
    resultsKey = nextResultsKey; lastResults = describeShots(state.players, state.shots, state.me);
    $('results-title').textContent = `RAUND ${state.matchRound} / HAMLE ${state.round} · ATIŞLAR`;
    $('shot-feed').replaceChildren(...lastResults.map(result => {
      const row = document.createElement('li');
      row.className = result.hitMe ? 'hit-me' : result.ownShot ? 'own-shot' : result.victim ? 'hit' : 'miss';
      const shooter = document.createElement('strong'), outcome = document.createElement('span');
      shooter.textContent = `${result.shooter}${result.ownShot ? ' (sen)' : ''}`;
      outcome.textContent = result.victim ? `→ ${result.victim}${result.hitMe ? ' (sen)' : ''} · VURDU` : result.blocked ? '→ Sipere çarptı' : result.protected?`→ ${result.protected} · KALKAN`:result.ally?`→ ${result.ally} · TAKIM ARKADAŞI`:'→ Iskaladı';
      row.append(shooter, outcome); return row;
    }));
    $('shot-results').hidden = false;
  }
  const attackers = lastResults.filter(result => result.hitMe).map(result => result.shooter);
  const hits = lastResults.filter(result => result.ownShot && result.victim).map(result => result.victim);
  $('hit-banner').hidden = !publicResult || !lastResults.length;
  $('hit-banner').className = `hit-banner ${attackers.length ? 'eliminated' : hits.length ? 'confirmed' : ''}`;
  $('hit-banner').textContent = attackers.length
    ? `VURULDUN · ${attackers.join(' + ')} seni vurdu${hits.length ? ` · Senin isabetin: ${hits.join(', ')}` : ''}`
    : lastResults.some(r=>r.protectedMe)?'KALKAN! · Gelen isabetler engellendi.':hits.length ? `İSABET! · Vurduğun oyuncu: ${hits.join(', ')}` : 'ATIŞLAR AÇILDI · Sonuçlar sağdaki listede';

  $('players').replaceChildren(...state.players.map(p => {
    const row = document.createElement('li'), name = document.createElement('span'), status = document.createElement('span');
    name.textContent = `${p.name}${p.isBot ? ' (bot)' : ''}${p.id === state.me ? ' (sen)' : ''}${p.id === state.hostId ? ' ♛' : ''}`;
    markTeam(name,p);
    status.textContent = !p.alive ? 'Elendi' : state.phase === 'plan' ? p.locked ? 'Kilitli' : 'Seçiyor' : '●';
    status.style.color = p.alive ? '#c7f579' : '#ed987e'; row.append(name, status); return row;
  }));
  $('map-name').textContent=getMap(state.mapId).name.toLocaleUpperCase('tr');
  $('score-panel').hidden=!state.matchRound;
  $('scoreboard').replaceChildren(...standings(state.players,state.rules).map(p=>{
    const row=document.createElement('li'),name=document.createElement('strong'),score=document.createElement('span');
    name.textContent=`${p.rank}. ${p.name}`;markTeam(name,p);score.textContent=`${p.score} PUAN · Hayatta ${p.survived} · İsabet ${p.kills} · Raund ${p.wins}`;row.append(name,score);return row;
  }));
  renderTeamChoice();renderRuleControls();
  renderFinal();
  $('score-award').hidden=state.phase!=='reveal';
  const gain=me?.stepPoints||0;
  $('score-award').textContent=`BU ATIŞ +${gain} PUAN${me?.alive?` · Hayatta kalma +${state.rules.survival}`:''}${lastResults.some(r=>r.ownShot&&r.victim)?` · İsabet +${state.rules.hit}`:''}`;
  $('match-settings').hidden=!['lobby','end'].includes(state.phase);
  $('map-select').value=state.selectedMapId;$('round-count').value=String(state.roundCount);
  $('map-select').disabled=$('round-count').disabled=state.hostId!==state.me;
  $('replay').hidden=!publicResult||!state.shots.length;
  $('start').hidden = !['lobby', 'end'].includes(state.phase) || state.hostId !== state.me;
  $('start').disabled = settingsPending||state.players.length < 2||(state.rules.mode==='teams'&&!teamsReady(state.players,state.rules)); $('start').textContent = state.phase === 'end' ? 'Yeniden oyna' : 'Maçı başlat';
  const setup = ['lobby', 'end'].includes(state.phase);
  const humanCount = state.players.filter(p => !p.isBot).length, botCount = state.players.length - humanCount;
  $('bot-settings').hidden = !setup;
  $('bot-count').replaceChildren(...Array.from({length: (state.rules.mode==='teams'?state.rules.teamCount*state.rules.teamSize:8)+1 - humanCount}, (_, count) => new Option(String(count), String(count))));
  $('bot-count').value = String(botCount); $('bot-count').disabled = state.hostId !== state.me;
  $('bot-hint').textContent = state.rules.mode==='teams'&&!teamsReady(state.players,state.rules)?`${state.rules.teamCount} takım × ${state.rules.teamSize} oyuncu gerekli. Eksikleri botlarla tamamla veya takımını değiştir.`:state.hostId === state.me ? `Toplam ${state.rules.mode==='teams'?state.rules.teamCount*state.rules.teamSize:8} koltuk. Arkadaşın gelince gerekirse bir bot çıkar.` : 'Bot sayısını oda sahibi ayarlar.';
  $('controls').hidden = state.phase !== 'plan' || !me?.alive;
  for (const id of ['walk-mode', 'move-mode', 'aim-mode', 'angle', 'lock']) $(id).disabled = !editable();
  $('ability-controls').hidden=!state.rules.abilities||state.phase!=='plan'||!me?.alive;
  for(const ability of ['shield','cover']){const used=me?.usedAbilities.includes(ability),selected=draft?.ability===ability;const button=$('ability-'+ability);button.disabled=!editable()||used;button.setAttribute('aria-pressed',String(selected));$(ability+'-status').textContent=used?'Kullanıldı · 0/1':selected?'Seçili · 1/1':'Hazır · 1/1';}
  $('ability-hint').textContent=draft?.ability==='shield'?'Bu atışta bütün isabetlerden korunursun.':draft?.ability==='cover'?'Nişanın 70 birim önüne siper kurulur. Kendi atışını da engeller.':'Seçmek / iptal etmek için tıkla · Her biri maçta bir kez.';
  $('lock').textContent = me?.locked ? 'Hamlen kilitli ✓' : 'Hamleyi kilitle ↗';
  if (draft) { const degrees = Math.round(draft.angle * 180 / Math.PI); $('angle').value = degrees; $('angle-value').textContent = `${degrees}°`; }
}
function teamCards(container,teams,size,selected,onSelect,readOnly=false){
  const key=teams.map(t=>t.team).join(',');
  if(container.dataset.teams!==key){
    container.dataset.teams=key;
    container.replaceChildren(...teams.map(t=>{const button=document.createElement('button');button.type='button';button.className='team-card';button.dataset.team=t.team;button.style.setProperty('--team-color',teamColor(t.team));button.onclick=()=>onSelect(t.team);return button;}));
  }
  for(const button of container.children){const team=Number(button.dataset.team),info=teams.find(t=>t.team===team),isSelected=selected===team,full=info.humans>=size;
    button.onclick=()=>{if(!readOnly)onSelect(team);};button.disabled=readOnly||(full&&!isSelected);button.classList.toggle('read-only',readOnly);button.setAttribute('aria-pressed',String(isSelected));button.setAttribute('aria-label',`${TEAMS[team].name} takımını seç`);
    const title=document.createElement('strong'),count=document.createElement('span');title.textContent=TEAMS[team].name;const status=isSelected?'Senin takımın':readOnly?'':full?'Dolu':'Katıl';count.textContent=`${info.players??info.humans}/${size} ${info.players!==undefined?'oyuncu':'insan'}${status?' · '+status:''}`;
    button.replaceChildren(title);if(info.score!==undefined){const score=document.createElement('b');score.className='card-points';score.textContent=`${info.score} PUAN`;button.append(score);}button.append(count);
  }
}
function renderTeamChoice(){
  const setup=['lobby','end'].includes(state.phase);$('team-choice-field').hidden=state.rules.mode!=='teams';
  if(state.rules.mode!=='teams')return;
  const teams=Array.from({length:state.rules.teamCount},(_,team)=>({team,humans:state.players.filter(p=>p.team===team&&!p.isBot).length,players:state.players.filter(p=>p.team===team).length,score:state.players.filter(p=>p.team===team).reduce((sum,p)=>sum+p.score,0)}));
  teamCards($('team-choice-cards'),teams,state.rules.teamSize,mine()?.team,async team=>{await command('select_team',{team});render();},!setup);
  $('team-choice-hint').textContent=setup?'Takım kartına tıklayarak katıl. Botlar boş yerleri doldurur.':'Takım puanları · Maç sırasında takım değiştirilemez.';
}
let joinLookup=0;
async function lookupJoinTeams(){
 const lookup=++joinLookup,code=$('code').value.trim();$('join-team-field').hidden=true;joinSelectedTeam=null;$('join-team-auto').setAttribute('aria-pressed','true');
 if(!/^\d{4}$/.test(code))return;
 try{const response=await fetch('/api/rooms?gameId=blind-shot');const rooms=await response.json();if(lookup!==joinLookup)return;const room=rooms.find(r=>r.code===code);
 if(!room?.teamCount)return;
 const teams=room.teams.slice(0,room.teamCount);
 const update=()=>{teamCards($('join-team-cards'),teams,room.teamSize,joinSelectedTeam,team=>{joinSelectedTeam=team;update();});$('join-team-auto').setAttribute('aria-pressed',String(joinSelectedTeam===null));};
 $('join-team-auto').onclick=()=>{joinSelectedTeam=null;update();};update();
 $('join-team-hint').textContent=`${room.teamCount} takım · Her takım ${room.teamSize} oyuncu`;$('join-team-field').hidden=false;
 }catch{/* Oda bağlantısı ve lobi seçimi yine kullanılabilir. */}
}
$('code').addEventListener('input',lookupJoinTeams);lookupJoinTeams();
function markTeam(element,p){if(state.rules.mode!=='teams'||!TEAMS[p.team])return;const dot=document.createElement('span');dot.className='team-dot';dot.style.backgroundColor=teamColor(p.team);dot.setAttribute('role','img');dot.setAttribute('aria-label',TEAMS[p.team].name+' takım');element.prepend(dot);}
function teamResultTitle(){return state.winnerTeams.length===1?`${TEAMS[state.winnerTeams[0]].name} takım kazandı!`:state.winnerTeams.length?'Takımlar berabere!':'Berabere!';}
function renderTeamScores(container){
  container.hidden=state.rules.mode!=='teams';
  container.replaceChildren(...teamStandings(state.players,state.rules.teamCount).map(team=>{const item=document.createElement('div');item.className='team-score';item.style.setProperty('--team-color',teamColor(team.team));item.textContent=`${team.name} · ${team.score} PUAN`;return item;}));
}
function renderRuleControls(){
  for(const key of Object.keys(DEFAULT_RULES)){$('rule-'+key).value=String(state.rules[key]);$('rule-'+key).disabled=state.hostId!==state.me;}
  const r=state.rules;
  for(const option of $('rule-teamSize').options){const size=Number(option.value);option.disabled=size*r.teamCount>8;option.textContent=`${size} oyuncu · ${Array(r.teamCount).fill(size).join('v')}`;}
  $('rule-teamCount').disabled=$('rule-teamSize').disabled=state.hostId!==state.me||r.mode!=='teams';
  $('scoring-hint').textContent=`Hayatta kal +${r.survival} · İsabet +${r.hit} · Raund kazan +${r.roundWin}`;
  for(const [key,unit] of [['survival','atış'],['hit','kişi'],['roundWin','galibiyet']])$('points-'+key).textContent=`+${r[key]} / ${unit}`;
  $('room-rules').textContent=`${r.mode==='teams'?Array(r.teamCount).fill(r.teamSize).join('v')+' · '+r.teamCount+' takım':'Herkes tek'} · Hamle ${r.planSeconds} sn · Daralma %${Math.round(r.shrink*100)} · En fazla ${r.maxSteps} atış. Hayatta +${r.survival}, isabet +${r.hit}, raund +${r.roundWin}.`;
}
function renderStats(){
  $('stats-rows').replaceChildren(...standings(state.players,state.rules).map(p=>{
    const top=Object.values(p.stats.hitTargets).sort((a,b)=>b.count-a.count)[0];
    const row=document.createElement('tr');
    for(const text of [p.name,`${p.stats.shots} / ${p.kills}`,p.stats.shots?`%${Math.round(p.kills/p.stats.shots*100)}`:'—',`${p.stats.bestStreak} atış`,`${p.stats.deaths} / ${p.stats.absorbed}`,top?`${top.name} (${top.count})`:'—']){const cell=document.createElement('td');cell.textContent=text;if(!row.children.length)markTeam(cell,p);row.append(cell);}
    return row;
  }));
  $('round-history').replaceChildren(...state.history.map(round=>{const item=document.createElement('li');const winners=round.players.filter(p=>round.winners.includes(p.id));const names=state.rules.mode==='teams'?[...new Set(winners.map(p=>TEAMS[p.team].name))]:winners.map(p=>p.name);item.textContent=`Raund ${round.round} · ${getMap(round.mapId).name} · ${names.join(' + ')||'Berabere'} · ${round.players.map(p=>`${p.name}: +${p.points}`).join(' / ')}`;return item;}));
}
function renderFinal(){
  const ending=state.phase==='end';$('final-open').hidden=!ending;
  const wasHidden=$('final-results').hidden;$('final-results').hidden=!ending||finalDismissed;
  if(!ending)return;
  const key=JSON.stringify([state.matchRound,state.players.map(p=>[p.id,p.name,p.score,p.survived,p.kills,p.wins]),state.winners,state.rules,state.history,state.players.map(p=>p.stats)]);
  if(key!==finalKey){
    finalKey=key;
    const winners=state.winners.map(id=>state.players.find(p=>p.id===id)?.name).filter(Boolean);
    $('final-title').textContent=state.rules.mode==='teams'?teamResultTitle():winners.length===1?`${winners[0]} kazandı!`:winners.length?'Ortak galibiyet!':'Berabere!';
    $('final-subtitle').textContent=`${state.matchRound} raund tamamlandı · Bütün raundların toplam puanları`;
    $('final-rows').replaceChildren(...standings(state.players,state.rules).map(p=>{
      const row=document.createElement('tr');row.classList.toggle('winner',state.winners.includes(p.id));
      for(const value of [`${p.rank}. ${p.name}${p.id===state.me?' (sen)':''}`,`${p.survived} atış · ${p.points.survival} puan`,`${p.kills} isabet · ${p.points.hits} puan`,`${p.wins} galibiyet · ${p.points.wins} puan`,`${p.score}`]){
        const cell=document.createElement('td');cell.textContent=value;if(!row.children.length)markTeam(cell,p);row.append(cell);
      }
      return row;
    }));
    renderTeamScores($('final-teams'));renderStats();
  }
  $('final-restart').hidden=state.hostId!==state.me;$('final-restart').disabled=settingsPending||state.players.length<2||(state.rules.mode==='teams'&&!teamsReady(state.players,state.rules));
  if(wasHidden&&!$('final-results').hidden){releaseMouse();replayStart=-1;$('final-close').focus();}
}
$('final-close').onclick=()=>{finalDismissed=true;$('final-results').hidden=true;$('final-open').focus();};
$('final-open').onclick=()=>{finalDismissed=false;renderFinal();};
$('final-restart').onclick=()=>command('start');
function releaseMouse() {
  keys.clear(); dragging = false; lastPointer = null;
  if (document.pointerLockElement === canvas) document.exitPointerLock();
}
function setMode(next) {
  releaseMouse(); mode = next;
  for (const value of ['walk', 'move', 'aim']) $(`${value}-mode`).setAttribute('aria-pressed', String(mode === value));
  $('crosshair').hidden = mode !== 'walk';
}
$('walk-mode').onclick = () => setMode('walk');

$('move-mode').onclick = () => setMode('move'); $('aim-mode').onclick = () => setMode('aim');
function position(x, y) {
  Object.assign(draft, moveArena(draft, x, y, state.arena));
}
canvas.addEventListener('pointerdown', event => {
  if (!editable()) return;
  canvas.focus();
  if (mode === 'walk') {
    dragging = true; lastPointer = {x: event.clientX, y: event.clientY};
    if (event.pointerType === 'touch') { canvas.setPointerCapture(event.pointerId); return; }
    if (!pointerFallback) try { const lock = canvas.requestPointerLock?.(); lock?.catch(() => { pointerFallback = true; notice('Fareyi basılı tutup sürükleyerek de bakabilirsin.'); }); } catch { pointerFallback = true; notice('Fareyi basılı tutup sürükleyerek bak.'); }
    return;
  }
  const point = arenaScene?.pick(event.clientX, event.clientY);
  if (!point) return;
  const {x, y} = point;
  if (mode === 'move') position(x, y); else draft.angle = Math.atan2(y - draft.y, x - draft.x);
  render();
});
window.addEventListener('pointermove', event => {
  if (mode !== 'walk' || !editable() || (!dragging && document.pointerLockElement !== canvas)) return;
  const dx = document.pointerLockElement === canvas ? event.movementX : event.clientX - (lastPointer?.x ?? event.clientX);
  const dy = document.pointerLockElement === canvas ? event.movementY : event.clientY - (lastPointer?.y ?? event.clientY);
  lastPointer = {x: event.clientX, y: event.clientY};
  draft.angle = Math.atan2(Math.sin(draft.angle + dx * .003), Math.cos(draft.angle + dx * .003));
  arenaScene?.look(dy * .003); render();
});
window.addEventListener('pointerup', () => { dragging = false; lastPointer = null; });
window.addEventListener('pointercancel', releaseMouse);
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== canvas) { keys.clear(); dragging = false; } });
window.addEventListener('blur', releaseMouse);
$('angle').oninput = () => { if (editable()) { draft.angle = Number($('angle').value) * Math.PI / 180; render(); } };
async function sendChoice(lock) {
  if (!editable() || !draft) return;
  pending = true; render();
  // A lock immediately after an automatic draft must not hit the server's rate limit.
  const wait = Math.max(0, 100 - (Date.now() - lastChoiceAt));
  if (wait) await new Promise(resolve => setTimeout(resolve, wait));
  if (!state || state.phase !== 'plan' || !draft) { pending = false; render(); return; }
  lastChoiceAt = Date.now();
  const result = await command('choose', {...draft, lock}); pending = false;
  if(lock&&result?.ok)audio.play('lock');
  if (result?.error && mine()) { draft = {x: mine().x, y: mine().y, angle: mine().angle,ability:mine().ability||null}; }
  render();
}
$('lock').onclick = () => sendChoice(true);
// Preview changes remain private; periodically submit the latest draft so timeout uses it.
const inputTimer = setInterval(() => {
  if (!editable() || !draft || document.hidden) return;
  const p = mine(); if (p.x !== draft.x || p.y !== draft.y || p.angle !== draft.angle || p.ability!==draft.ability) sendChoice(false);
}, 250);
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') { releaseMouse(); if(!$('final-results').hidden)$('final-close').click(); return; }
  if(!$('final-results').hidden){if(event.key==='Tab'){event.preventDefault();const buttons=[$('final-close'),$('final-restart')].filter(b=>!b.hidden&&!b.disabled);const index=buttons.indexOf(document.activeElement);buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}return;}
  if (event.target.matches('input, select, textarea') || document.querySelector('dialog[open]') || !editable()) return;
  const key = event.key.toLowerCase();
  if(key==='q'||key==='e'){event.preventDefault();toggleAbility(key==='q'?'shield':'cover');return;}
  if(event.target.closest('.ability-hud,.team-cards')&&(key===' '||key==='enter'))return;
  if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','enter','1','2','3'].includes(key)) event.preventDefault();
  if (key === ' ' || key === 'enter') { sendChoice(true); return; }
  if (['1','2','3'].includes(key)) { setMode({1:'walk',2:'move',3:'aim'}[key]); return; }
  if (mode === 'walk') keys.add(key);
  else {
    const x = draft.x + (key === 'arrowright' ? 8 : key === 'arrowleft' ? -8 : 0), y = draft.y + (key === 'arrowdown' ? 8 : key === 'arrowup' ? -8 : 0);
    if (key.startsWith('arrow')) position(x, y);
    if (key === 'a') draft.angle -= Math.PI / 36;
    if (key === 'd') draft.angle += Math.PI / 36;
    draft.angle = Math.atan2(Math.sin(draft.angle), Math.cos(draft.angle)); render();
  }
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
for (const button of document.querySelectorAll('[data-walk]')) {
  button.addEventListener('pointerdown', event => { if (!editable()) return; event.preventDefault(); button.setPointerCapture(event.pointerId); keys.add(button.dataset.walk); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, () => keys.delete(button.dataset.walk));
}
$('bot-count').onchange = () => command('set_bot_count', {count: Number($('bot-count').value)});
let settingsTimer,settingsPending=false;
for(const id of ['map-select','round-count',...Object.keys(DEFAULT_RULES).map(k=>'rule-'+k)])$(id).onchange=()=>{
  if(Number($('rule-teamCount').value)*Number($('rule-teamSize').value)>8)$('rule-teamSize').value=String(Math.floor(8/Number($('rule-teamCount').value)));
  const rules=Object.fromEntries(Object.keys(DEFAULT_RULES).map(k=>{const value=$('rule-'+k).value;return [k,['mode','cover'].includes(k)?value:k==='abilities'?value==='true':Number(value)];}));
  const data={mapId:$('map-select').value,roundCount:Number($('round-count').value),rules};clearTimeout(settingsTimer);settingsPending=true;$('start').disabled=true;settingsTimer=setTimeout(async()=>{await command('set_settings',data);settingsPending=false;render();},300);
};
function toggleAbility(ability){if(!editable()||mine().usedAbilities.includes(ability)||!state.rules.abilities)return;draft.ability=draft.ability===ability?null:ability;render();}
for(const ability of ['shield','cover'])$('ability-'+ability).onclick=()=>{releaseMouse();toggleAbility(ability);};
$('start').onclick = () => command('start');
$('leave').onclick = () => { socket.emit('leave'); exit(); };
$('invite').onclick = async () => { try { await navigator.clipboard.writeText(location.href); notice('Davet bağlantısı kopyalandı.'); } catch { notice(`Oda kodun: ${state?.code}`); } };
$('rules-open').onclick = () => { releaseMouse(); $('rules').showModal(); };
function draw(time = performance.now()) {
  frame = 0; if (document.hidden) return;
  const seconds = Math.min(.05, Math.max(0, (time - (lastFrame || time)) / 1000)); lastFrame = time;
  if (state && !$('room').hidden) {
    if (mode === 'walk' && editable() && !document.querySelector('dialog[open]')) {
      const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
      const right = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
      if (forward || right) draft = walkDraft(draft, state.arena, forward, right, seconds);
    }
    const replay=replayActive();
    arenaScene?.draw(state, draft, {follow: mode === 'walk' && state.phase === 'plan',...(replay?{replayAge:(performance.now()-replayStart)/1000*.25}:{})});
    $('replay-label').hidden=!replay;$('replay').textContent=replay?'↺ Tekrarı atla':'↺ Ağır çekim';
    const left=Math.max(0,Math.ceil((state.until-Date.now()-offset)/1000));
    const beat=`${state.matchRound}:${state.round}:${left}`;
    if(state.phase==='plan'&&left>0&&left<=3&&beat!==countdownKey){countdownKey=beat;audio.play('countdown');}
    $('crosshair').hidden = mode !== 'walk' || state.phase !== 'plan' || !mine()?.alive;
    $('camera-hint').textContent = ['reveal', 'round-end', 'end'].includes(state.phase) ? 'Renkli atış izleri ateş edeni, turuncu patlamalar vurulanları gösterir.' : mode === 'walk' ? (document.pointerLockElement === canvas ? 'WASD: yürü · Fare: bak / nişan · Space: kilitle · Esc: fareyi bırak' : pointerFallback ? 'Fareyi basılı tutup sürükle: bak / nişan · WASD: yürü · Space: kilitle' : 'Arenaya tıkla: fareyle bak · WASD: yürü · Space: kilitle') : 'Zemine dokunarak konum veya nişan seç.';
    $('clock').textContent = state.until ? `${Math.max(0,Math.ceil((state.until-Date.now()-offset)/1000))} sn` : '';
  }
  frame = requestAnimationFrame(draw);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { releaseMouse(); lastFrame = 0; cancelAnimationFrame(frame); frame=0; } else if (!frame) draw(); });
window.addEventListener('pagehide', () => { fullscreen.dispose(); audio.dispose(); releaseMouse(); clearInterval(inputTimer);clearTimeout(settingsTimer); clearTimeout(noticeTimer); cancelAnimationFrame(frame); arenaScene?.dispose(); socket.disconnect(); });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
draw();
