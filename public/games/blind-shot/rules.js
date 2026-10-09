export const DEFAULT_RULES=Object.freeze({mode:'solo',teamCount:2,teamSize:2,planSeconds:12,shrink:.1,maxSteps:12,cover:'normal',abilities:true,survival:1,hit:3,roundWin:5});
export function validRules(r){
  return r&&Object.keys(r).every(k=>Object.hasOwn(DEFAULT_RULES,k))&&['solo','teams'].includes(r.mode)&&[2,3,4].includes(r.teamCount)&&Number.isInteger(r.teamSize)&&r.teamSize>=1&&r.teamSize<=4&&r.teamCount*r.teamSize<=8&&[8,12,20].includes(r.planSeconds)&&[.05,.1,.15].includes(r.shrink)&&[8,12,16].includes(r.maxSteps)&&['normal','sparse','none'].includes(r.cover)&&typeof r.abilities==='boolean'&&[['survival',1,5],['hit',1,10],['roundWin',0,10]].every(([k,min,max])=>Number.isInteger(r[k])&&r[k]>=min&&r[k]<=max);
}
export const TEAMS=[{name:'Turkuaz',icon:'🟦',color:0x3fbfa9},{name:'Turuncu',icon:'🟧',color:0xffa34b},{name:'Mor',icon:'🟪',color:0xa882ff},{name:'Pembe',icon:'🟥',color:0xf080b4}];
export function teamStandings(players,count=2){
  return Array.from({length:count},(_,i)=>i).map(team=>({team,name:TEAMS[team].name+' takım',score:players.filter(p=>p.team===team).reduce((sum,p)=>sum+p.score,0)})).sort((a,b)=>b.score-a.score);
}
export function abilityCover(p){
  const angle=p.angle,cover={id:`ability:${p.id}`,x:p.x+Math.cos(angle)*70,y:p.y+Math.sin(angle)*70,width:52,depth:52,height:75,kind:'wall',temporary:true};
  return cover;
}

export function teamSetup(players,rules){
  const counts=Array.from({length:rules.teamCount},()=>0);
  for(const p of players.filter(p=>!p.isBot))if(Number.isInteger(p.team)&&p.team>=0&&p.team<rules.teamCount)counts[p.team]++;
  for(const p of players.filter(p=>!p.isBot))if(!Number.isInteger(p.team)||p.team<0||p.team>=rules.teamCount){p.team=counts.indexOf(Math.min(...counts));counts[p.team]++;}
  for(const p of players.filter(p=>p.isBot)){p.team=counts.indexOf(Math.min(...counts));counts[p.team]++;}
  return counts;
}
export function teamsReady(players,rules){
  return players.length===rules.teamCount*rules.teamSize&&Array.from({length:rules.teamCount},(_,i)=>players.filter(p=>p.team===i).length).every(n=>n===rules.teamSize);
}

export const teamColor=team=>'#'+TEAMS[team].color.toString(16).padStart(6,'0');
