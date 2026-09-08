import {createScene} from './scene.js';
import {createAudio} from './audio.js';
import {propTypes} from './world.js';
const $=id=>document.getElementById(id),socket=io(),audio=createAudio();let world;
// Connection status must reflect the socket regardless of whether the 3D scene can start,
// so a WebGL failure never leaves the header stuck on "Bağlanıyor" with no explanation.
socket.on('connect',()=>{$('connection').innerHTML='<i></i> Çevrimiçi';});
socket.on('connect_error',error=>{$('connection').textContent='Sunucuya bağlanılamadı';console.error('socket connect_error:',error.message);});
try{world=createScene($('scene'));}catch(error){$('fatal').classList.remove('hidden');$('fatal').textContent='3D oda açılamadı. WebGL destekli güncel bir tarayıcıda donanım hızlandırmasını açıp tekrar dene.';console.error('createScene failed:',error);throw error;}
const defaults={teamSize:3,botMode:'fill',hunterBots:3,hiderBots:2,hideSeconds:20,roundSeconds:180,teamSelection:'choose',swapTeams:true,objectCount:51,decor:1,revealHits:3,escapeBoost:1.1};
let state=null,myId=null,active=false,entered=false,keys={},yaw=0,pitch=0,fire=false,dragging=false,dragDistance=0,mode='quick',selectedRole='hider',draft={...defaults},editSettings=false,lastRound=0,lastPhase='',teamSignature='',pickerSignature='',lastShotId='',toastTimer,hitTimer,pickerAuto=false,pickerHush='';
const coarse=matchMedia('(pointer:coarse)').matches,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const me=()=>state?.players.find(p=>p.id===myId);
// Görüntü kalitesi cihaza ait bir tercih, odaya ait değil: menüden seçilir, tarayıcıda saklanır.
const qualityNames={high:'Yüksek',medium:'Orta',low:'Düşük'};
function qualityUI(){if(!world?.quality)return;$('quality').value=world.quality();$('quality-note').textContent=(world.autoQuality()?'Ekran kartına göre seçildi':'Senin seçimin')+(world.gpu?.()?' · '+world.gpu().replace(/^ANGLE \(|\)$/g,'').slice(0,52):'');}
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',3200);}
function stopInput(){keys={};fire=false;dragging=false;}
function unlock(){stopInput();if(document.pointerLockElement)document.exitPointerLock();}
// While a round is running the mouse belongs to the game: it is captured for both roles, so nobody
// has to drag to look and the cursor never floats over the scene. Esc, the object picker and any
// dialog hand it back, and it stays back until the player clicks the scene or presses Oyuna dön.
let lockWanted=false;
function grabMouse(){
 if(coarse||!active||!entered||me()?.status!=='alive')return;
 if(document.querySelector('dialog[open]')||pickerHolds())return;
 lockWanted=true;
 if(document.pointerLockElement===world.renderer.domElement)return;
 try{const request=world.renderer.domElement.requestPointerLock?.();if(request&&request.catch)request.catch(()=>{lockWanted=false;toast('Fare kilidi reddedildi, bir saniye sonra ekrana tekrar tıkla.');});}catch{}
}
// Esc hands the mouse back and it stays back: nothing recaptures it until the player clicks the
// scene or presses Oyuna dön. Chrome swallows the Esc keypress itself while the pointer is locked,
// so the release is picked up from the pointer-lock change as well as from the key.
function releaseMouse(menu=false){
 lockWanted=false;stopInput();
 if(document.pointerLockElement)document.exitPointerLock();
 if(menu)showDialog('pause-dialog');
 else toast('Fare serbest. Oyuna dönmek için ekrana tıkla.');
}
document.addEventListener('pointerlockchange',()=>{
 document.body.classList.toggle('mouse-free',!document.pointerLockElement);
 if(document.pointerLockElement||!lockWanted||coarse)return;
 lockWanted=false;stopInput();
 if(!active||!entered||document.querySelector('dialog[open]')||pickerHolds())return;
 showDialog('pause-dialog');
});
function showDialog(id){lockWanted=false;unlock();if(id==='pause-dialog')qualityUI();if(!$(id).open)$(id).showModal();}
// Kendiliğinden açılan şerit fareyi istemez; yalnızca elle (E, düğme) açılan liste fareyi tutar.
const pickerOpen=()=>!$('picker').classList.contains('hidden');
const pickerHolds=()=>pickerOpen()&&!pickerAuto;
function closePicker(regrab=true){const held=pickerHolds();pickerAuto=false;pickerHush=state?.nearby?.[0]?.id||'';$('picker').classList.add('hidden');if(regrab&&held)grabMouse();}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
function setScreen(id){for(const el of ['home','lobby','hud','result'])$(el).classList.toggle('hidden',el!==id);active=id==='hud';document.body.classList.toggle('playing',active);if(!active){document.body.classList.remove('hunter-wait');entered=false;unlock();pickerAuto=false;pickerHush='';$('picker').classList.add('hidden');}}
function request(event,data,callback){socket.timeout(6000).emit(event,data,(err,res)=>callback(err?{error:'Sunucudan yanıt alınamadı. Tekrar dene.'}:res||{}));}
function soundUI(){$('sound').textContent=audio.enabled?'♪':'♫';$('sound').setAttribute('aria-label',audio.enabled?'Sesi kapat':'Sesi aç');$('pause-sound').textContent=audio.enabled?'Sesi kapat ♫':'Sesi aç ♪';}
async function toggleSound(){try{await audio.toggle();soundUI();}catch{toast('Ses bu tarayıcıda başlatılamadı.');}}
$('sound').onclick=$('pause-sound').onclick=toggleSound;
$('help').onclick=()=>showDialog('guide');
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
for(const d of document.querySelectorAll('dialog'))d.addEventListener('close',stopInput);
try{$('name').value=localStorage.getItem('mola-name')||'Misafir';}catch{}
function chooseRole(role){selectedRole=role;document.querySelectorAll('[data-role]').forEach(b=>{const yes=b.dataset.role===role;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',yes);});}
for(const b of document.querySelectorAll('[data-role]'))b.onclick=()=>chooseRole(b.dataset.role);
function openPlay(newMode){mode=newMode;$('play-error').textContent='';$('join-code-field').classList.toggle('hidden',mode!=='join');$('play-description').textContent=mode==='quick'?"3'e 3 hızlı oyun. Eksik yerleri botlar tamamlar.":mode==='create'?`${draft.teamSize}'e ${draft.teamSize} oda. Takımını seç, arkadaşlarını çağır.`:'Arkadaşının kodunu yaz ve takımını seç.';$('play-title').textContent=mode==='join'?'Arkadaşlarının yanına gel.':'Bugün kim olacaksın?';$('confirm-play').textContent=mode==='quick'?'Hızlı oyuna başla →':mode==='create'?'Odayı oluştur →':'Odaya katıl →';showDialog('play-dialog');}
$('quick').onclick=()=>openPlay('quick');$('join-open').onclick=()=>openPlay('join');
for(let i=1;i<=12;i++){const o=document.createElement('option');o.value=i;o.textContent=`${i} kişi · ${i}'e ${i}`;$('team-size').append(o);}
function showSettings(settings,editing){editSettings=editing;draft={...defaults,...settings};$('team-size').value=draft.teamSize;$('bot-mode').value=draft.botMode;$('hider-bots').value=draft.hiderBots;$('hunter-bots').value=draft.hunterBots;$('hide-seconds').value=draft.hideSeconds;$('round-seconds').value=draft.roundSeconds;$('object-count').value=draft.objectCount;$('decor').value=draft.decor;$('reveal-hits').value=draft.revealHits;$('escape-boost').value=draft.escapeBoost;$('team-selection').value=draft.teamSelection;$('settings-title').textContent=editing?'Odayı sen ayarla.':'Kendi odanı kur.';$('save-settings').textContent=editing?'Ayarları kaydet →':'Devam et →';$('settings-error').textContent='';updateSettings();showDialog('settings-dialog');}
function readSettings(){return{teamSize:Number($('team-size').value),botMode:$('bot-mode').value,hiderBots:Number($('hider-bots').value),hunterBots:Number($('hunter-bots').value),hideSeconds:Number($('hide-seconds').value),roundSeconds:Number($('round-seconds').value),objectCount:Number($('object-count').value),decor:Number($('decor').value),revealHits:Number($('reveal-hits').value),escapeBoost:Number($('escape-boost').value),teamSelection:$('team-selection').value,swapTeams:true};}
function updateSettings(){const s=readSettings(),custom=s.botMode==='custom';$('hider-bot-field').classList.toggle('hidden',!custom);$('hunter-bot-field').classList.toggle('hidden',!custom);$('hider-bots').max=$('hunter-bots').max=s.teamSize;$('settings-summary').textContent=`${s.teamSize*2} kişilik oda · ${s.hideSeconds} sn saklanma · ${s.roundSeconds/60} dk tur · ${s.objectCount} ek eşya · süs %${Math.round(s.decor*100)} · oyuncuyu açığa çıkarmak için ${s.revealHits} isabet · ıslanan ${s.escapeBoost}× hızla kaçar. ${s.botMode==='fill'?'Eksik yerler botlarla dolar.':s.botMode==='off'?'Tüm yerler gerçek oyuncular için.':'Bot sayılarını lobide de değiştirebilirsin.'}`;}
for(const id of ['team-size','bot-mode','hider-bots','hunter-bots','hide-seconds','round-seconds','object-count','decor','reveal-hits','escape-boost','team-selection'])$(id).onchange=updateSettings;
$('create').onclick=()=>showSettings(defaults,false);$('settings-open').onclick=()=>showSettings(state.settings,true);
$('save-settings').onclick=()=>{const s=readSettings();if(s.botMode==='custom'&&(s.hiderBots<0||s.hunterBots<0||s.hiderBots>s.teamSize||s.hunterBots>s.teamSize)){ $('settings-error').textContent='Bot sayısı 0 ile takım kapasitesi arasında olmalı.';return;}draft=s;if(editSettings){request('settings',s,r=>{if(r.error)$('settings-error').textContent=r.error;else $('settings-dialog').close();});}else{$('settings-dialog').close();openPlay('create');}};
$('confirm-play').onclick=async()=>{if(!socket.connected){$('play-error').textContent='Sunucuya bağlanılması bekleniyor.';return;}const code=mode==='join'?$('code').value.replace(/\D/g,''):'';if(mode==='join'&&code.length!==4){$('play-error').textContent='4 haneli oda kodunu yaz.';return;}$('confirm-play').disabled=true;try{localStorage.setItem('mola-name',$('name').value);}catch{}
 request('join',{name:$('name').value,role:selectedRole,practice:mode==='quick',code,settings:mode==='quick'?{...defaults,botMode:'fill'}:draft},r=>{$('confirm-play').disabled=false;if(r.error){$('play-error').textContent=r.error;return;}myId=r.id;lastRound=0;lastPhase='';teamSignature='';pickerHush='';pickerAuto=false;entered=false;closeDialogs();$('error').textContent='';});};
function leave(){releaseMouse();socket.emit('leave');closeDialogs();unlock();state=null;myId=null;lastPhase='';world.reset();setScreen('home');}
document.querySelectorAll('.exit').forEach(b=>b.onclick=leave);
async function copyInvite(){if(!state)return;try{await navigator.clipboard.writeText(location.origin+'/?room='+state.code);toast('Davet bağlantısı kopyalandı.');}catch{toast('Oda kodu: '+state.code);}}
$('copy').onclick=$('invite').onclick=copyInvite;
function startRound(){socket.timeout(6000).emit('start',(err,r)=>{if(err||r?.error){$('lobby-error').textContent=r?.error||'Tur başlatılamadı.';toast(r?.error||'Tekrar dene.');}});}
$('start').onclick=$('again').onclick=startRound;
for(const team of ['hider','hunter'])$('choose-'+team).onclick=()=>request('team',team,r=>{if(r.error)toast(r.error);});
for(const b of document.querySelectorAll('[data-bot]'))b.onclick=()=>{if(!state)return;const count=t=>state.players.filter(p=>p.bot&&p.team===t).length,s={...state.settings,botMode:'custom',hiderBots:count('hider'),hunterBots:count('hunter')};s[b.dataset.bot+'Bots']=Math.max(0,s[b.dataset.bot+'Bots']+Number(b.dataset.delta));request('settings',s,r=>{if(r.error)toast(r.error);});};
function renderLobby(s){$('copy').textContent=s.code;const host=s.host===myId;$('settings-open').disabled=!host;document.querySelectorAll('.bot-controls').forEach(x=>x.classList.toggle('hidden',!host));$('lobby-settings').textContent=`${s.settings.teamSize}'e ${s.settings.teamSize} · ${s.settings.roundSeconds/60} dk tur · ${s.settings.revealHits} isabet · ${s.settings.escapeBoost}× kaçış`;
 const signature=JSON.stringify([s.players.map(p=>[p.id,p.name,p.team,p.bot]),s.settings,s.host]);if(signature===teamSignature)return;teamSignature=signature;
 for(const team of ['hider','hunter']){const players=s.players.filter(p=>p.team===team);$(team+'-count').textContent=`${players.length} / ${s.settings.teamSize}`;const rows=players.map(p=>{const d=document.createElement('div'),av=document.createElement('span'),name=document.createElement('span'),meta=document.createElement('small');av.className='avatar';av.textContent=p.bot?'B':p.name.slice(0,2).toUpperCase();name.textContent=p.name+(p.id===myId?' · sen':'');meta.textContent=p.bot?'BOT':p.id===s.host?'KURUCU':'OYUNCU';d.append(av,name,meta);if(host&&!p.bot&&s.players.length>1){const select=document.createElement('select');select.setAttribute('aria-label',p.name+' için takım');for(const [v,t]of [['hider','Saklanan'],['hunter','Avcı']]){const o=document.createElement('option');o.value=v;o.textContent=t;select.append(o);}select.value=p.team;select.onchange=()=>request('move-team',{playerId:p.id,team:select.value},r=>{if(r.error){toast(r.error);select.value=p.team;}});d.append(select);}return d;});for(let i=players.length;i<s.settings.teamSize;i++){const d=document.createElement('div');d.className='empty';d.textContent='＋ Oyuncu bekleniyor';rows.push(d);}$(team+'-roster').replaceChildren(...rows);$('choose-'+team).disabled=me()?.team===team||s.settings.teamSelection==='auto'&&!host;}
 const counts=Object.fromEntries(['hider','hunter'].map(t=>[t,s.players.filter(p=>p.team===t).length]));
 const ready=counts.hider>=1&&counts.hunter>=1,full=counts.hider===s.settings.teamSize&&counts.hunter===s.settings.teamSize;
 $('start').disabled=!host||!ready;
 $('waiting').textContent=!host?'Oda kurucusu turu başlatacak.':!ready?'Her iki tarafta en az bir kişi olmalı.':full?'İki takım da dolu.':`${counts.hider} saklanan · ${counts.hunter} avcı ile başlayabilirsin.`;}
function perform(kind,objectId){if(!active||!entered||me()?.status!=='alive')return;request('action',{kind,objectId},r=>{if(!r.ok){if(r.error)toast(r.error);return;}if(kind==='possess'){closePicker();audio.effect('transform',.13);toast(`${propTypes[r.type]?.name||'Nesne'} oldun. Konumunu ayarla; F ile sabitle.`);}if(kind==='shuffle'){audio.effect('transform',.13);toast(`${propTypes[r.type]?.name} oldun · ${r.changes} değişim hakkın kaldı.`);}if(kind==='decoy')toast('Kopyan burada kalacak. Şimdi uzaklaş!');if(kind==='lock')toast(r.locked?'Konumun sabitlendi. F ile tekrar hareket edebilirsin.':'Artık hareket edebilirsin.');});}
function showPicker(auto=false){$('prop-search').value='';pickerSignature='';const p=me();if(!p||p.role!=='hider'||!entered)return;if(p.propId){if(!auto)toast('İlk nesneni seçtin. Q ile rastgele değiştirebilirsin.');return;}pickerAuto=auto;if(!auto)pickerHush='';$('picker').classList.remove('hidden');renderPicker();}
// Bir eşyanın yanına gelmek listeyi kendiliğinden açar; E'ye basmak şart değil. Uzaklaşınca kapanır,
// E veya × ile kapatılırsa o çevrede tekrar açılmaz, başka bir yere gidince yine açılır.
function autoPickerTick(s,p){
 const near=s.nearby||[];
 // Kapatılan liste, kapatıldığı andaki en yakın eşya menzilden çıkana kadar susar: aynı yerde
 // ısrar etmez ama başka bir eşyanın yanına gidince yine kendiliğinden açılır.
 if(pickerHush&&!near.some(q=>q.id===pickerHush))pickerHush='';
 const eligible=p.role==='hider'&&!p.propId&&p.status==='alive'&&entered&&near.length>0&&['prep','play'].includes(s.phase);
 if(eligible&&!pickerOpen()&&!pickerHush&&!document.querySelector('dialog[open]'))showPicker(true);
 else if(!eligible&&pickerOpen()&&pickerAuto){pickerAuto=false;$('picker').classList.add('hidden');}
}
// Aim first: whatever the crosshair is on is what E turns you into, so the choice is made by looking
// rather than by reading a list. The strip is only the fallback for when you are not aiming at
// anything reachable, and it never takes the mouse or covers the room.
const PICKER_LIMIT=8;
function nearbyList(){const query=$('prop-search').value.toLocaleLowerCase('tr').trim();return (state?.nearby||[]).filter(o=>propTypes[o.type].name.toLocaleLowerCase('tr').includes(query));}
function quickPossess(){
 const p=me();if(!p||p.role!=='hider'||!entered)return;
 if(p.propId){toast('İlk nesneni seçtin. Q ile rastgele değiştirebilirsin.');return;}
 const aimed=world.pickObject(4.5),list=state?.nearby||[];
 if(aimed&&list.some(o=>o.id===aimed)){if(pickerOpen())closePicker();perform('possess',aimed);return;}
 if(pickerOpen())closePicker();else showPicker();
}
$('decoy-button').onclick=()=>perform('decoy');$('prop-search').oninput=renderPicker;$('prop-search').onkeydown=e=>{if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();$('prop-search').blur();}};$('pick-button').onclick=showPicker;$('picker-close').onclick=closePicker;$('shuffle-button').onclick=()=>perform('shuffle');$('lock-button').onclick=()=>perform('lock');$('reload-button').onclick=()=>perform('reload');
function renderPicker(){if($('picker').classList.contains('hidden'))return;
 const query=$('prop-search').value.toLocaleLowerCase('tr').trim(),all=nearbyList(),list=all.slice(0,PICKER_LIMIT);
 const signature=query+list.map(o=>o.id+o.type+Math.round(o.distance)+Math.round(o.y*3)).join()+'/'+all.length;
 if(signature===pickerSignature)return;pickerSignature=signature;
 if(!list.length){const p=document.createElement('p');p.textContent=state?.phase==='brief'?'Tur başlayınca yakındaki eşyalar burada listelenir.':query?'Bu adla yakında bir eşya yok.':'Yakında erişilebilir eşya yok. Bir eşyaya yaklaş.';$('nearby-props').replaceChildren(p);return;}
 const tiles=list.map((o,i)=>{
  const b=document.createElement('button'),badge=document.createElement('i'),art=document.createElement('b'),label=document.createElement('span'),distance=document.createElement('small');
  badge.textContent=i+1;
  const shot=world.preview?.(o.type);
  if(shot){const img=document.createElement('img');img.src=shot;img.alt=propTypes[o.type].name;art.append(img);}
  else art.textContent=propTypes[o.type].icon;
  label.textContent=propTypes[o.type].name;distance.textContent=Math.round(o.distance*10)/10+' m'+(o.y>.3?' ↑':'');
  b.append(badge,art,label,distance);b.title=`${i+1} · ${propTypes[o.type].name}`;b.onclick=()=>perform('possess',o.id);return b;
 });
 $('picker-hint').textContent=(all.length>list.length?'1–'+list.length+' seç · +'+(all.length-list.length)+' daha':'1–'+list.length+' ile seç')+' · / ara · E kapat';
 $('nearby-props').replaceChildren(...tiles);}
function enter(){entered=true;if(state?.phase==='brief')socket.emit('ready');$('brief-card').classList.add('hidden');stopInput();grabMouse();
 if(me()?.role==='hider'&&!me()?.propId){pickerSignature='';toast('Yakındaki eşyalar aşağıda kendiliğinden listelenir: 1–8 ile seç. Ya da bir eşyaya bak ve E ile o eşya ol.');}}
$('quality').onchange=()=>{world.setQuality($('quality').value);qualityUI();toast(`Görüntü kalitesi: ${qualityNames[world.quality()]}. Kenar yumuşatma değişikliği için sayfayı yenile.`);};
world.onQuality=level=>{qualityUI();toast(`Oyun kasmasın diye görüntü kalitesi ${qualityNames[level].toLocaleLowerCase('tr')} kademeye alındı. Menüden (ESC) değiştirebilirsin.`);};
qualityUI();
$('enter').onclick=enter;$('pause').onclick=()=>showDialog('pause-dialog');$('resume').onclick=()=>{$('pause-dialog').close();enter();};
socket.on('disconnect',()=>{$('connection').textContent='Bağlantı kesildi';if(myId){leave();$('error').textContent='Bağlantı kesildi. Yeniden bağlanınca odana tekrar katıl.';}});
socket.on('hit',r=>{$('hit-feedback').textContent=r.found?'✦ BULDUN!':r.decoy?'◇ KOPYA DAĞILDI':`💧 %${Math.round(r.wet)}${r.real?' · Gerçek eşya':''}`;clearTimeout(hitTimer);hitTimer=setTimeout(()=>$('hit-feedback').textContent='',900);if(r.found)audio.effect('found',.15);});
function renderResult(s){$('winner').textContent=s.winner==='hunter'?'Avcılar kazandı!':'Saklananlar kazandı!';$('result-text').textContent=s.reason||'';$('again').disabled=s.host!==myId;$('result-roster').replaceChildren(...s.players.filter(p=>p.team==='hider').map(p=>{const d=document.createElement('div'),name=document.createElement('span'),status=document.createElement('small');name.textContent=p.name;status.textContent=p.status==='found'?'BULUNDU':'SAKLI KALDI';d.append(name,status);return d;}));}
socket.on('state',s=>{if(!myId)return;state=s;const p=me();if(!p)return;if(s.round!==lastRound&&['brief','prep'].includes(s.phase)){lastRound=s.round;entered=false;yaw=p.yaw||0;pitch=0;stopInput();pickerHush='';pickerAuto=false;pickerSignature='';$('picker').classList.add('hidden');}
 if(s.phase!==lastPhase){lastPhase=s.phase;if(s.phase==='end'){closeDialogs();releaseMouse();renderResult(s);const code=s.code,round=s.round;setTimeout(()=>{if(state?.code===code&&state.round===round&&state.phase==='end')setScreen('result');},1500);}else setScreen(s.phase==='lobby'?'lobby':'hud');}
 if(s.phase==='lobby')renderLobby(s);world.sync(s,myId);if(!active)return;
 const seconds=Math.max(0,Math.ceil((s.until-s.now)/1000));$('timer').textContent=s.phase==='brief'?'HAZIR':`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
 const hiders=s.players.filter(q=>q.team==='hider'),found=hiders.filter(q=>q.status==='found').length,hunting=p.role==='hunter';$('score').textContent=`${found} / ${hiders.length} BULUNDU`;$('phase').textContent=s.phase==='prep'?'SAKLANMA ZAMANI':hunting?'AVCI':'SAKLANAN';$('objective').textContent=hunting?'Şüpheli eşyaları ıslat.':p.propId?'Odaya karış. Islanma.':'Yaklaş, seç, nesneye dönüş.';$('mini-objective').textContent=hunting?'Bir oyuncuyu %100 suyla doldur ve açığa çıkar.':p.propId?'İlk seçim senindi. Sonraki 3 değişim rastgele.':'Yakındaki eşyalar aşağıda listeli: 1–8 ile seç ya da bakıp E.';
 $('controls-hider').classList.toggle('hidden',hunting);$('controls-hunter').classList.toggle('hidden',!hunting);$('touch-fire').classList.toggle('hidden',!hunting);$('touch-jump').classList.toggle('hidden',hunting);$('decoy-count').textContent=p.decoys??0;$('decoy-button').disabled=!p.propId||!p.decoys||p.status!=='alive'||!['prep','play'].includes(s.phase);$('change-count').textContent=p.changes;$('shuffle-button').disabled=!p.propId||p.changes<=0||p.status!=='alive';$('pick-button').disabled=!!p.propId||p.status!=='alive';$('lock-button').disabled=!p.propId||p.status!=='alive';$('lock-button').querySelector('span').textContent=p.locked?'Hareket et':'Sabitle';$('lock-button').classList.toggle('selected',p.locked);
 const meter=hunting?p.ammo:p.water;$('meter-label').textContent=hunting?'SU DEPOSU':'ISLANMA';$('meter-value').textContent='%'+Math.round(meter||0);$('meter-fill').style.width=(meter||0)+'%';$('meter-note').textContent=hunting?p.reloadUntil>s.now?`Doluyor · ${Math.ceil((p.reloadUntil-s.now)/1000)} sn`:p.ammo<4?'R ile depoyu doldur':'R ile doldur · 2 saniye':p.water>=100?'Tamamen ıslandın':p.propId?propTypes[s.objects.find(o=>o.id===p.propId)?.type]?.name||'Saklanıyorsun':'Henüz nesne seçmedin';$('reload-button').disabled=p.reloadUntil>s.now||p.ammo>=100;
 $('brief-card').classList.toggle('hidden',entered&&!(hunting&&s.phase==='prep')||p.status!=='alive');$('brief-label').textContent=hunting?'SU TABANCASI SENDE':'SAKLANAN SENSİN';$('brief-title').innerHTML=hunting&&s.phase==='prep'?'Gözlerini kapat.<br>Arkadaşların saklanıyor.':hunting?'Şüpheli nesneleri<br>bir güzel ıslat.':'Bir nesne ol.<br>Odaya karış.';$('brief-text').textContent=hunting?'Gerçek eşyaya bir atış yeter, oyuncu için %100 gerekir. Sol tıkla su sık, R ile depoyu doldur.':'Masadan tabağa, sandalyeden musluğa: gördüğün eşyalara yaklaş. E ile ara ve ilk nesneni seç. Boşluk ile zıplayıp tezgaha çıkabilir, Z/X ile yönünü ayarlayıp F ile sabitleyebilirsin.';const hits=s.settings?.revealHits||3,boost=s.settings?.escapeBoost||1.1;$('brief-rule').textContent=hunting?`Depo: 25 atış. İlk atışta gerçek eşyayı anlarsın; oyuncuysa %100 için ${hits} isabet gerekir.`:`Q: 3 rastgele değişim. C: 3 kalıcı sahte kopya bırak. Her biri tek isabette dağılır. ${hits>1?`${hits} isabete dayanırsın; ilk isabetten sonra avcının ${boost}× hızıyla kaçabilirsin.`:'Tek isabet seni açığa çıkarır, çok dikkatli ol.'}`;$('enter').classList.toggle('hidden',entered&&hunting&&s.phase==='prep');$('look-help').textContent=coarse?'Yön tuşlarıyla yürü · Ekranı sürükleyerek bak':hunting?'WASD hareket · Fare bakış · Sol tık / Boşluk su':'WASD hareket · Boşluk zıpla · Z/X çevir';
 // Hunters cannot inspect the room while others place props.
 document.body.classList.toggle('hunter-wait',hunting&&['prep','brief'].includes(s.phase));
 if(p.status==='found'){fire=false;pickerAuto=false;$('picker').classList.add('hidden');}$('found-card').classList.toggle('hidden',p.status!=='found');$('notification').textContent=s.events?.at(-1)?.text||'';
 $('team-status').replaceChildren(...s.players.filter(q=>q.team===p.team).map(q=>{const d=document.createElement('div');d.textContent=(q.status==='found'?'× ':'· ')+q.name+(q.id===myId?' · sen':'');d.className=q.status==='found'?'found':'';return d;}));autoPickerTick(s,p);renderPicker();audio.update(s,myId,yaw);
 const shot=(s.shots||[]).filter(q=>q.shooter===myId).at(-1);if(shot&&shot.id!==lastShotId){lastShotId=shot.id;world.kick();}
});
// Tekerlek ve PageUp/PageDown kılığı yükseltip indirir; ikisi de fareyi serbest bırakmaz.
let wheelLift=0,wheelAt=0;
window.addEventListener('wheel',e=>{
 if(!active||!entered||document.querySelector('dialog[open]')||me()?.role!=='hider'||!me()?.propId)return;
 e.preventDefault();wheelLift=e.deltaY<0?1:-1;wheelAt=performance.now();
},{passive:false});
const aliases={arrowup:'w',arrowdown:'s',arrowleft:'a',arrowright:'d'};
window.addEventListener('keydown',e=>{if(e.target.matches('input,select'))return;const key=aliases[e.key.toLowerCase()]||e.key.toLowerCase();if(key==='escape'&&active&&!document.querySelector('dialog[open]')){e.preventDefault();if(pickerHolds())closePicker(false);else releaseMouse(true);return;}if(!active||!entered||document.querySelector('dialog[open]')||me()?.status!=='alive')return;
 if(pickerOpen()&&!e.repeat){
  if(key==='/'){e.preventDefault();$('prop-search').focus();return;}
  if(/^[1-9]$/.test(key)){e.preventDefault();const pick=nearbyList()[Number(key)-1];if(pick)perform('possess',pick.id);return;}
 }
 if(['w','a','s','d','e','q','f','r','c','z','x','pageup','pagedown',' '].includes(key)){e.preventDefault();keys[key]=true;if(!e.repeat){if(key==='e')quickPossess();if(key==='q')perform('shuffle');if(key==='c')perform('decoy');if(key==='f')perform('lock');if(key==='r')perform('reload');}}});
window.addEventListener('keyup',e=>{keys[aliases[e.key.toLowerCase()]||e.key.toLowerCase()]=false;});window.addEventListener('blur',stopInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopInput();});
world.renderer.domElement.addEventListener('pointerdown',e=>{if(!active||!entered||me()?.status!=='alive')return;dragging=true;dragDistance=0;if(!document.pointerLockElement){grabMouse();try{world.renderer.domElement.setPointerCapture(e.pointerId);}catch{}}if(e.button===0&&me()?.role==='hunter')fire=true;});window.addEventListener('pointerup',()=>{dragging=false;fire=false;});window.addEventListener('pointercancel',()=>{dragging=false;fire=false;});window.addEventListener('mousemove',e=>{if(!active||!entered||document.querySelector('dialog[open]'))return;if(document.pointerLockElement||dragging){dragDistance+=Math.abs(e.movementX)+Math.abs(e.movementY);yaw-=e.movementX*.0022;pitch=Math.max(-1.25,Math.min(1.25,pitch-e.movementY*.0022));}});
let touchLast=null;world.renderer.domElement.addEventListener('touchstart',e=>{if(e.touches.length===1)touchLast={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});world.renderer.domElement.addEventListener('touchmove',e=>{if(!entered||!touchLast)return;const t=e.touches[0];yaw-=(t.clientX-touchLast.x)*.004;pitch=Math.max(-1.25,Math.min(1.25,pitch-(t.clientY-touchLast.y)*.004));touchLast={x:t.clientX,y:t.clientY};},{passive:true});
for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();keys[b.dataset.key]=true;b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=()=>keys[b.dataset.key]=false;}$('touch-fire').onpointerdown=e=>{e.preventDefault();fire=true;$('touch-fire').setPointerCapture(e.pointerId);};$('touch-fire').onpointerup=$('touch-fire').onpointercancel=()=>fire=false;
setInterval(()=>{if(!active||!socket.connected)return;const blocked=!entered||!!document.querySelector('dialog[open]')||me()?.status!=='alive',f=blocked?0:(keys.w?1:0)-(keys.s?1:0),side=blocked?0:(keys.d?1:0)-(keys.a?1:0);
 // Space is the hunter's backup trigger but the hider's jump; Z/X turn a disguise on the spot.
 const hiding=me()?.role==='hider';
 socket.emit('input',{x:-Math.sin(yaw)*f+Math.cos(yaw)*side,z:-Math.cos(yaw)*f-Math.sin(yaw)*side,yaw,pitch,fire:!blocked&&!hiding&&fire,jump:!blocked&&!!keys[' '],spin:blocked?0:(keys.x?1:0)-(keys.z?1:0),lift:blocked?0:((keys.pageup?1:0)-(keys.pagedown?1:0))||(performance.now()-wheelAt<140?wheelLift:0)});},50);
let aimAt=0;world.renderer.setAnimationLoop(t=>{world.render(state,myId,yaw,pitch,active,entered,t);if(t>aimAt&&active&&entered&&me()?.role==='hider'&&!me()?.propId&&!pickerHolds()){aimAt=t+150;const id=world.pickObject(4.5);const o=state.objects.find(o=>o.id===id);$('aim-label').textContent=o?`E · ${propTypes[o.type].name} ol`:'E · Yakındaki eşya listesi';}else if(!active||me()?.propId||me()?.role==='hunter')$('aim-label').textContent='';});
const invite=new URLSearchParams(location.search).get('room');if(invite){$('code').value=invite.replace(/\D/g,'').slice(0,4);openPlay('join');}
