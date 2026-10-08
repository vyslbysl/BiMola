export const SCORING=Object.freeze({survival:1,hit:3,roundWin:5});
export function scoreParts(player,rules=SCORING) {
  return {survival:(player.survived||0)*rules.survival,hits:(player.kills||0)*rules.hit,wins:(player.wins||0)*rules.roundWin};
}
export function standings(players,rules=SCORING) {
  const sorted=[...players].sort((a,b)=>(b.score||0)-(a.score||0));
  let rank=1;
  return sorted.map((player,index)=>{if(index&&player.score!==sorted[index-1].score)rank=index+1;return {...player,rank,points:scoreParts(player,rules)};});
}
