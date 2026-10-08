import {insideBoundary} from './arena.js';
const obstacle = (id,x,y,width,depth,height,kind='crate') => ({id,x,y,width,depth,height,kind});
export const MAPS = [
  {id:'foundry',name:'Dökümhane',subtitle:'Metal kasalar ve kolonlar',floor:0x304345,wall:0x253849,accent:0xdb8438,
    obstacles:[obstacle('f1',-240,-180,130,100,64),obstacle('f2',240,180,130,100,64),obstacle('f3',240,-180,100,130,64),obstacle('f4',-240,180,100,130,64),obstacle('f5',-430,-310,65,65,145,'pillar'),obstacle('f6',430,310,65,65,145,'pillar')]},
  {id:'courtyard',name:'Avlu',subtitle:'Taş duvarlar ve açık geçitler',floor:0x787568,wall:0x64726d,accent:0x779354,
    obstacles:[obstacle('a1',0,-210,360,45,90,'wall'),obstacle('a2',0,210,360,45,90,'wall'),obstacle('a3',-320,0,45,270,90,'wall'),obstacle('a4',320,0,45,270,90,'wall'),obstacle('a5',-470,-330,85,85,70),obstacle('a6',470,330,85,85,70)]},
  {id:'warehouse',name:'Depo',subtitle:'Konteyner sıraları ve dar koridorlar',floor:0x35455b,wall:0x293448,accent:0x427dbe,
    obstacles:[obstacle('d1',-260,-220,230,120,105,'container'),obstacle('d2',260,220,230,120,105,'container'),obstacle('d3',-260,180,120,210,105,'container'),obstacle('d4',260,-180,120,210,105,'container'),obstacle('d5',0,0,110,110,65)]},
  {id:'hexagon',name:'Altıgen Kale',sides:6,subtitle:'Altı köşeli arena ve çapraz siperler',floor:0x3d4a50,wall:0x334550,accent:0x9c6adb,
    obstacles:[obstacle('h1',-230,-150,120,70,85),obstacle('h2',230,150,120,70,85),obstacle('h3',0,-290,75,75,140,'pillar'),obstacle('h4',0,290,75,75,140,'pillar')]},
  {id:'octagon',name:'Sekizgen İstasyon',sides:8,subtitle:'Sekiz köşeli arena ve dört siper adası',floor:0x304e51,wall:0x29434a,accent:0x3fbfa9,
    obstacles:[obstacle('o1',-250,-170,130,90,85),obstacle('o2',250,170,130,90,85),obstacle('o3',250,-170,90,130,85),obstacle('o4',-250,170,90,130,85)]},
];
export const getMap = id => MAPS.find(map=>map.id===id) || MAPS[0];
export function mapArena(id,scale=1) {
  const map=getMap(id),sides=map.sides||4;
  const vertices=sides===4?[{x:-700,y:-550},{x:700,y:-550},{x:700,y:550},{x:-700,y:550}]:Array.from({length:sides},(_,i)=>({x:Math.cos(i*Math.PI*2/sides)*700,y:Math.sin(i*Math.PI*2/sides)*550}));
  const arena={halfWidth:700*scale,halfDepth:550*scale,mapId:map.id,sides,scale,vertices:vertices.map(p=>({x:p.x*scale,y:p.y*scale})),obstacles:[]};
  arena.obstacles=map.obstacles.filter(o=>[-1,1].every(dx=>[-1,1].every(dy=>insideBoundary(o.x+dx*o.width/2,o.y+dy*o.depth/2,arena,0)))).map(o=>({...o}));
  return arena;
}

// Shuffle a match's map rotation; the chosen opening map stays first.
export function mapRotation(first,random=Math.random){
  const rest=MAPS.map(map=>map.id).filter(id=>id!==first);
  for(let i=rest.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]];}
  return [first,...rest];
}
