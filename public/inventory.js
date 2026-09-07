// Shared inventory: furniture and every independent decorative item.
export const furniture=[
 {id:'sofa1',type:'sofa',x:-8,z:8,w:4.4,d:1.7,h:.9,angle:0,color:'#b86d49'},
 {id:'sofa2',type:'sofa',x:-11.5,z:4,w:3.4,d:1.5,h:.9,angle:Math.PI/2,color:'#e5dac4'},
 {id:'coffee',type:'coffee',x:-8,z:4.2,w:2.5,d:1.5,h:.48},
 {id:'kitchen',type:'counter',x:8,z:-15,w:9.5,d:1.4,h:1},
 {id:'island',type:'island',x:8,z:-10,w:4.5,d:1.9,h:1},
 {id:'dining',type:'dining',x:7.5,z:1,w:4.2,d:2,h:.8,under:.7},
 {id:'shelf1',type:'shelf',x:-12.8,z:-11,w:1.5,d:6,h:2.6},
 {id:'sun-sofa',type:'sofa',x:9,z:15.6,w:3.5,d:1.6,h:.9},
 {id:'sun-table',type:'coffee',x:8.6,z:12.4,w:2.3,d:1.25,h:.48},
 {id:'potting',type:'potting',x:5.1,z:6,w:3.2,d:1.15,h:.9,under:.66},
 {id:'sun-bench',type:'bench',x:5,z:15.7,w:3.3,d:.8,h:.45,under:.33},
 {id:'shelf2',type:'shelf',x:12.8,z:10,w:1.2,d:6,h:2.3},
 {id:'game',type:'game',x:-.5,z:-11,w:2.7,d:1.65,h:.82,under:.64},
 {id:'bench',type:'bench',x:0,z:15.5,w:4,d:.8,h:.45,under:.33},
 {id:'desk',type:'desk',x:-9,z:-15.5,w:4,d:1.6,h:.8,under:.7},
 // Bedroom, north-west: a double bed between two nightstands, wardrobe along the west wall.
 {id:'bed',type:'bed',x:-8.5,z:15.4,w:2.15,d:2.2,h:.62},
 {id:'night1',type:'nightstand',x:-6.85,z:16.35,w:.52,d:.44,h:.55},
 {id:'night2',type:'nightstand',x:-10.15,z:16.35,w:.52,d:.44,h:.55},
 {id:'wardrobe',type:'wardrobe',x:-13.25,z:13,w:.9,d:3,h:2.3},
];
const names={sofa:'Koltuk',coffee:'Sehpa',counter:'Mutfak tezgâhı',island:'Mutfak adası',dining:'Yemek masası',shelf:'Kitaplık',game:'Langırt',bench:'Bank',desk:'Çalışma masası',bed:'Yatak',nightstand:'Komodin',wardrobe:'Gardırop',potting:'Bitki bakım masası'};
export const inventoryTypes={};
for(const f of furniture){
 const h=f.type==='bed'?.9:f.type==='game'?1.02:f.h;
 inventoryTypes['f_'+f.id]={name:names[f.type],model:'furniture',f:{...f},w:f.w,d:f.d,height:h,radius:Math.hypot(f.w,f.d)/2,under:f.under||(['coffee','desk','dining','potting','game'].includes(f.type)?Math.max(.1,f.h-.18):0),surface:f.type==='bed'?.77:f.h,icon:'▤',color:f.color||'#b99162',large:true};
}
const define=(id,name,model,w,h,d,extra={})=>{inventoryTypes[id]={name,model,w,d,height:h,radius:Math.hypot(w,d)/2,color:'#c7b69a',icon:'◈',...extra};};
define('diningChair','Yemek sandalyesi','chair',.66,.98,.68,{under:.42});
define('officeChair','Çalışma sandalyesi','officeChair',.7,1.12,.7,{under:.38});
define('laptop','Laptop','laptop',.84,.58,.6);
define('plate','Tabak','plate',.4,.025,.4);
define('placemat','Servis altlığı','placemat',.5,.012,.5);
define('glassCup','Bardak','glassCup',.14,.23,.14);
define('vase','Vazo','vase',.33,.44,.33);
define('flowerVase','Çiçekli vazo','flowerVase',.48,.82,.48);
define('faucet','Musluk','faucet',.34,.58,.38);
define('sink','Evye','sink',1.1,.07,.76);
define('stove','Ocak','stove',1.5,.05,.8);
define('coffeeMachine','Kahve makinesi','coffeeMachine',.58,.74,.46);
define('fruitBowl','Meyve kâsesi','fruitBowl',.96,.08,.8);
define('orangeFruit','Portakal','fruit',.23,.23,.23,{color:'#eca03f'});
define('appleFruit','Elma','fruit',.23,.23,.23,{color:'#8eaa59'});
define('cuttingBoard','Kesme tahtası','cuttingBoard',.66,.03,.43);
define('knife','Mutfak bıçağı','knife',.34,.03,.06);
define('smallPot','Küçük saksı','smallPot',.26,.23,.26);
define('tableLamp','Masa lambası','tableLamp',.29,.42,.29);
define('floorLamp','Lambader','floorLamp',.8,1.86,.58);
define('pendant','Sarkıt lamba','pendant',1.04,.8,1.04);
define('largePlant','Büyük saksı bitkisi','largePlant',1.35,2.35,1.35);
define('book','Kitap','book',.3,.32,.058);
define('flatBook','Masa kitabı','flatBook',.42,.075,.56);
define('seatPillow','Koltuk minderi','seatPillow',.49,.46,.2);
define('bedPillow','Yatak yastığı','bedPillow',.58,.18,.4);
define('throw','Koltuk şalı','throw',.55,.05,1.3);
define('blanket','Yatak örtüsü','blanket',1.95,.055,.9);
define('wallArt','Duvar tablosu','wallArt',2.3,2.6,.08);
define('wallShelf','Duvar rafı','wallShelf',7.5,.065,.36,{large:true});
define('rugLiving','Salon halısı','rug',7.25,.018,8.1,{large:true,flat:true});
define('rugGarden','Kış bahçesi halısı','rug',5.7,.018,5.4,{large:true,flat:true});
define('curtain','Perde','curtain',.24,2.72,.52,{large:true});
export const fixtures=[];
function add(id,type,x,y,z,parentId=null,angle=0,anchored=false){
 const parent=parentId?fixtures.find(o=>o.id===parentId):null;
 if(parent){const c=Math.cos(parent.angle),s=Math.sin(parent.angle);[x,z]=[parent.x+c*x+s*z,parent.z-s*x+c*z];y+=parent.y;angle+=parent.angle;}
 const o={id,type,x,y,z,angle,wet:0};if(parentId)o.supportId=parentId;if(anchored)o.anchored=true;fixtures.push(o);return o;
}
for(const f of furniture){
 const root=add(f.id,'f_'+f.id,f.x,0,f.z,null,(f.angle||0)+(f.id==='sofa2'?Math.PI:0));
 const put=(id,type,x,y,z,parent=f.id,angle=0)=>add(f.id+'-'+id,type,x,y,z,parent,angle);
 const h=f.h;
 if(f.type==='sofa'){for(const sign of [-1,1])put('pillow'+sign,'seatPillow',sign*(f.w/2-.64),.58,f.d/2-.48);put('throw','throw',f.w/2-.65,.61,0);}
 if(f.type==='coffee'){put('book1','flatBook',-.52,h,.1);put('book2','flatBook',0,.075,0,f.id+'-book1');put('mat','placemat',.56,h,.02);put('vase','vase',.57,h+.02,.08);put('mug','mug',.15,h,-.4);}
 if(f.type==='dining'){for(let i=0;i<3;i++){const x=-1.3+i*1.3;put('mat'+i,'placemat',x,h,.35);put('plate'+i,'plate',0,.012,0,f.id+'-mat'+i);put('mug'+i,'mug',x+.38,h,.35);put('glass'+i,'glassCup',x,h,-.35);}put('flowers','flowerVase',-.4,h,-.2);}
 if(f.type==='desk'){put('laptop','laptop',0,h,0);put('mug','mug',1.1,h,.16);put('book','flatBook',-1.1,h,0);}
 if(f.type==='counter'){put('sink','sink',-1.6,1.01,.02);put('faucet','faucet',-1.6,1.01,-.46);put('stove','stove',1.4,1.01,0);put('machine','coffeeMachine',-3.65,1.01,-.05);put('mug','mug',-2.85,1.01,.25);put('vase','flowerVase',3.9,1.01,.2);}
 if(f.type==='island'){put('bowl','fruitBowl',.8,1.01,.08);for(let i=0;i<6;i++)put('fruit'+i,i%2?'orangeFruit':'appleFruit',-.25+(i%3)*.23,.06+Math.floor(i/3)*.06,-.12+Math.floor(i/3)*.18,f.id+'-bowl');put('board','cuttingBoard',-1.12,1.01,.09);put('knife','knife',.07,.03,0,f.id+'-board');put('mug','mug',-.3,1.01,-.4);}
 if(f.type==='shelf'){for(let i=0;i<4;i++)for(let j=0;j<3;j++)for(let k=0;k<4;k++)put(`book-${i}-${j}-${k}`,'book',(f.x<0?1:-1)*(f.w/2-.18),.155+i*(h-.16)/4,-f.d/2+.75+j*(f.d-1.3)/3+k*.08,f.id,Math.PI/2);}
 if(f.type==='bed'){for(const sign of [-1,1])put('pillow'+sign,'bedPillow',sign*(f.w/2-.4),.78,-f.d/2+.3);put('blanket','blanket',0,.78,f.d*.24);}
 if(f.type==='nightstand')put('lamp','tableLamp',0,h,-.02);
 if(f.type==='potting'){for(let i=0;i<3;i++)put('pot'+i,'smallPot',-.85+i*.78,h,.07);put('book','flatBook',.85,h,-.3);}
 if(f.type==='bench'){put('pillow','bedPillow',-.7,h,0);put('book','flatBook',.9,h,.04);}
}
for(const [i,x,z,a] of [[0,6.2,-.35,Math.PI],[1,8.7,-.35,Math.PI],[2,6.25,2.35,0],[3,8.75,2.35,0]])add('dining-chair-'+i,'diningChair',x,0,z,null,a);
add('desk-chair','officeChair',-9,0,-14);
for(const [i,x,z] of [[0,8,-10],[1,7.5,1],[2,-8,4.2],[3,-.5,-11],[4,8.5,12]])add('ceiling-lamp-'+i,'pendant',x,2.54,z,null,0,true);
add('reading-lamp','floorLamp',-11.1,0,7.8);
for(const [i,x,z] of [[0,12.6,16.1],[1,11.7,-16.5],[2,-12.1,13.1],[3,-7.3,-.5],[4,11.3,6.1],[5,4.1,16.8]])add('big-plant-'+i,'largePlant',x,0,z);
for(const [i,x,y,z,a] of [[0,-13.75,.95,5,Math.PI/2],[1,-6.17,1.2,-6.4,-Math.PI/2],[2,6.17,1.1,-9,Math.PI/2],[3,-8.8,1.5,-17.74,0]])add('wall-art-'+i,'wallArt',x,y,z,null,a,true);
for(let level=0;level<2;level++){
 const shelf=add('kitchen-wall-shelf-'+level,'wallShelf',8,2.05+level*.73,-17.55,null,0,true);
 for(let i=0;i<9;i++){const x=-3.2+i*.73;if(i%3===0)add(`${shelf.id}-vase${i}`,'vase',x,.04,.02,shelf.id);else if(i%3===1){let parent=shelf.id;for(let k=0;k<4;k++){const o=add(`${shelf.id}-plate${i}-${k}`,'plate',k?0:x,k?.025:.04,k?0:.05,parent);parent=o.id;}}else add(`${shelf.id}-mug${i}`,'mug',x,.04,.05,shelf.id);}
}
add('living-rug','rugLiving',-8,.005,5);add('garden-rug','rugGarden',8.5,.005,12.7);
for(let i=0;i<6;i++)add('curtain-'+i,'curtain',13.58,.67,-17.43+i*6,null,0,true);
