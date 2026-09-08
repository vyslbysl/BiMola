// Shared, immutable level definitions. Each room carries its own map id; no process-wide active map.
export const mapTypes={};
function type(id,name,model,w,h,d,extra={}){mapTypes[id]={name,model,w,d,height:h,radius:Math.hypot(w,d)/2,color:'#b99162',icon:'◈',...extra};}
type('marketStall','Pazar tezgâhı','stall',3.4,2.8,1.65,{surface:.9});
type('crate','Ahşap kasa','crate',.7,.5,.5);
type('marketScale','Pazar terazisi','scale',.5,.65,.42);
type('fountain','Meydan çeşmesi','fountain',2.8,1.35,2.8);
type('planterBox','Bitki kasası','planterBox',2.7,1.2,1.2,{surface:.72});
type('seedTray','Fide tepsisi','seedTray',.65,.15,.4);
type('soilBag','Toprak torbası','soilBag',.55,.6,.32);
type('arcadeCabinet','Arcade makinesi','arcade',.92,1.95,.9);
type('pinball','Pinball masası','pinball',.8,1.6,1.65,{surface:.95,under:.65});
type('washer','Çamaşır makinesi','washer',1,1.12,.85);
type('laundryCart','Çamaşır arabası','cart',.95,.95,.65);
type('robot','Model robot','robot',.5,.72,.38);
type('planet','Gezegen modeli','planet',.5,.65,.5);
type('plasma','Plazma küresi','plasma',.42,.62,.42);
type('paintJar','Boya kavanozu','paintJar',.15,.18,.15);
type('orrery','Güneş sistemi sergisi','orrery',3,3,3);
type('luggageCart','Bagaj arabası','luggageCart',1.2,1.8,.8);
type('parasol','Güneş şemsiyesi','parasol',2.7,2.65,2.7,{under:2.25});
type('receptionBell','Resepsiyon zili','bell',.18,.13,.18);
type('exhibitShelf','Sergi kitaplığı','exhibitShelf',2.5,1.8,.65);
const boundary=(h=4.8)=>[[0,-18,28,.3,h],[0,18,28,.3,h],[-14,0,.3,36,h],[14,0,.3,36,h]];
const area=(id,name,xmin,xmax,zmin,zmax,types)=>({id,name,xmin,xmax,zmin,zmax,types,count:10});
const maps={};
function level(id,name,subtitle,color,wallList,zones,options={}){
 return maps[id]={id,name,subtitle,color,preview:`/maps/references/${id}.jpeg`,room:{width:28,depth:36,height:4.8},walls:wallList,zones,doors:[],fixtures:[],...options};
}
const market=level('market','Kıyı Pazarı','Tezgâh arkasından dolan, meydana karış.','#87b2b9',boundary(7),[
 area('produce','Manav',-13,-3,-16,0,['crate','orangeFruit','basket','marketScale']),area('fish','Balıkçı',3,13,-16,0,['crate','marketScale','basket']),area('cafe','Kahve terası',-13,-3,3,16,['mug','stool','diningChair']),area('store','Kasa deposu',3,13,3,16,['crate','basket','plant'])
],{room:{width:28,depth:36,height:7}});
const greenhouse=level('greenhouse','Çatı Serası','Camın ardından görün, diğer kapıdan kaybol.','#8da38b',[
 ...boundary(1.15),[-8,-4,.15,22,3.3,0,'glass'],[8,-7.5,.15,15,3.3,0,'glass'],[8,5,.15,4,3.3,0,'glass'],[-5,-15,6,.15,3.3,0,'glass'],[5,-15,6,.15,3.3,0,'glass'],[-5,7,6,.15,3.3,0,'glass'],[5,7,6,.15,3.3,0,'glass'],[-5,-4,6,.15,3.3,0,'glass'],[5,-4,6,.15,3.3,0,'glass']
],[area('nursery','Cam sera',-7,7,-14,-5,['smallPot','watering','soilBag']),area('workshop','Saksılama atölyesi',-7,7,-3,6,['seedTray','smallPot','watering']),area('terrace','Bitki terası',-13,13,9,16,['plant','watering','stool','soilBag'])],{doors:[[0,7,3,1],[0,-4,3,1],[0,-15,3,1],[8,1.5,1,3]]});
const arcade=level('arcade','Son Jeton','Aynı makinelerin arasında farklı bir oyun.','#df9075',[
 ...boundary(),[-7,-4,14,.25],[11,-4,6,.25],[3,-15,.25,6],[3,-6,.25,4],[-3,9,.25,6],[-3,-.5,.25,4.5]
],[area('machines','Oyun salonu',-13,1,-16,-6,['arcadeCabinet','pinball','stool']),area('laundry','Çamaşırhane',5,13,-16,-6,['basket','washer','laundryCart']),area('snack','Atıştırmalık köşesi',-1,13,-2,16,['mug','stool','coffeeMachine']),area('games','Langırt köşesi',-13,-5,-2,16,['ball','stool','speaker'])],{doors:[[3,-10,1,3],[2,-4,3,1],[-3,4,1,3],[-3,14,1,3]]});
const museum=level('museum','Minik Mucitler','Sergiler arasında kaybol, balkondan rota değiştir.','#b8a888',[
 ...boundary(8),[-5.75,-9,8.5,.25,3.2,3],[5.75,-9,8.5,.25,3.2,3],[-6,3,.25,6],[6,3,.25,6]
],[area('exhibits','Ana sergi',-7,7,-7,0,['planet','robot','plasma']),area('craft','Deney atölyesi',-13,-7,2,16,['paintJar','robot','stool']),area('shop','Müze dükkânı',7,13,2,16,['bookstack','planet','robot']),area('gallery','Üst galeri',-7,7,-16,-11,['planet','bookstack','stool'])],{room:{width:28,depth:36,height:8},doors:[[0,-9,3,1],[-6,8,1,3],[6,8,1,3]],raised:true});
const hotel=level('hotel','Bavul Molası','Avluyu geç, bagajların arasına karış.','#65a3a1',[
 ...boundary(6),[-6,-9,.25,12],[6,-9,.25,12],[-6,12,.25,8],[6,12,.25,8],[-10,2,8,.25],[10,2,8,.25]
],[area('reception','Resepsiyon',-13,-7,4,16,['case','luggageCart','receptionBell']),area('breakfast','Kahvaltı',7,13,4,16,['mug','plate','stool']),area('lounge','Oturma salonu',-13,-7,-16,0,['pillow','plant','bookstack']),area('luggage','Bagaj odası',7,13,-16,0,['case','luggageCart','basket']),area('courtyard','Avlu',-4,4,-16,16,['plant','diningChair','stool'])],{room:{width:28,depth:36,height:6},doors:[[-6,5,1,3],[6,5,1,3],[-6,-1,1,3],[6,-1,1,3]]});
export function terrainHeight(map,x,z){
 if(!map?.raised)return 0;
 if(z<=-9)return 3;
 if(Math.abs(x)>=9&&Math.abs(x)<=12.8&&z<5)return Math.max(0,Math.min(3,(5-z)*3/14));
 return 0;
}
function add(map,type,x,z,y=terrainHeight(map,x,z),angle=0,parent=null){const o={id:`${map.id}-${map.fixtures.length}`,mapId:map.id,type,x,y,z,angle,wet:0};if(parent)o.supportId=parent.id;map.fixtures.push(o);return o;}
function table(map,x,z,type='f_potting',items=['mug','smallPot','watering'],angle=0){const p=add(map,type,x,z,undefined,angle),height=type==='f_coffee'?.48:type==='f_dining'?.8:.9;items.forEach((t,i)=>{const dx=(i-(items.length-1)/2)*.65;add(map,t,x+Math.cos(angle)*dx,z-Math.sin(angle)*dx,p.y+height,angle,p);});return p;}
for(const [x,z]of [[-8,-11],[-8,-4],[8,-11],[8,-4]]){const p=add(market,'marketStall',x,z);for(let i=0;i<4;i++){const c=add(market,'crate',x-1.1+i*.72,z,.9,0,p);add(market,i%2?'appleFruit':'orangeFruit',c.x,c.z,c.y+.5,0,c);}}
add(market,'fountain',0,0);for(const x of [-10,-5]){table(market,x,10,'f_coffee',['mug','glassCup','plate']);for(const dz of [-1.3,1.3])add(market,'diningChair',x,10+dz,0,dz<0?0:Math.PI);}
for(const x of [6,8,10])for(const z of [7,10,13]){const c=add(market,'crate',x,z);if(z!==10)add(market,'crate',x,z,.5,0,c);}
for(const [x,z]of [[-12,-16],[12,-16],[-12,15],[12,15]])add(market,'largePlant',x,z);
for(const [x,z]of [[-4,-11],[4,-11],[-4,1],[4,1]])table(greenhouse,x,z,'f_potting',['smallPot','seedTray','watering']);
for(const x of [-11,11])for(const z of [-12,-6,0,7,13])add(greenhouse,'planterBox',x,z,0,Math.PI/2);
for(const x of [-5,5])add(greenhouse,'planterBox',x,12);table(greenhouse,0,15,'f_coffee',['mug','mug']);for(const x of [-1.7,1.7])add(greenhouse,'diningChair',x,15);
for(const [x,z]of [[-6,4],[6,4],[-6,-13],[6,-13]])add(greenhouse,'soilBag',x,z);
for(const x of [-11,-6,-1])for(const z of [-14,-11,-8])add(arcade,'arcadeCabinet',x,z,0,x===-1?-Math.PI/2:Math.PI/2);
for(const z of [-14,-11,-8])add(arcade,'washer',11.5,z,0,-Math.PI/2);for(const z of [-13,-8])add(arcade,'laundryCart',7,z);
for(const z of [3,11])add(arcade,'f_game',-9,z);for(const z of [0,5])add(arcade,'pinball',-5,z);
table(arcade,7,9,'f_dining',['coffeeMachine','mug','glassCup','plate']);for(const x of [4.5,7,9.5])add(arcade,'stool',x,11);table(arcade,8,-.2,'f_potting',['laptop','cuttingBoard','tableLamp']);
add(museum,'orrery',0,-3);for(const [x,z]of [[-10,8],[-10,12],[10,8],[10,12],[0,11]])table(museum,x,z,'f_potting',['robot','plasma','paintJar']);
for(const [x,z]of [[-4,3],[4,3],[-4,-14],[4,-14]]){add(museum,'exhibitShelf',x,z);table(museum,x,z+2,'f_coffee',['planet','robot']);}
for(const x of [-2,2])add(museum,'officeChair',x,5);for(const x of [-11,11])add(museum,'largePlant',x,16);
table(hotel,-10,10,'f_dining',['laptop','receptionBell','mug']);table(hotel,10,10,'f_dining',['coffeeMachine','plate','glassCup','mug']);
for(const z of [-12,-6]){add(hotel,'f_sun-sofa',-10,z,0,Math.PI/2);table(hotel,-8,z,'f_coffee',['mug','flatBook']);}
for(const x of [8,10,12])for(const z of [-13,-9,-5])add(hotel,'case',x,z);add(hotel,'luggageCart',8,-1);
for(const z of [-12,10]){add(hotel,'parasol',0,z);for(const x of [-2,2])add(hotel,'diningChair',x,z);}
for(const [x,z]of [[-4,-15],[4,-15],[-4,15],[4,15]])add(hotel,'largePlant',x,z);
// Extra objects on tables remain independently selectable and travel with their support.
for(const map of Object.values(maps)){for(const f of [...map.fixtures])if(['f_potting','f_dining'].includes(f.type))for(const side of [-1,1])add(map,'stool',f.x+side*1.2,f.z+1.35,terrainHeight(map,f.x,f.z+1.35));}
export const MAPS=Object.freeze(maps);
export const MAP_CHOICES=[{id:'loft',name:'Güneşli Ev',subtitle:'Tanıdık odalar, yüzlerce farklı kılık.',color:'#8c9c7c',preview:'/maps/references/loft.jpeg'},...Object.values(maps).map(({id,name,subtitle,color,preview})=>({id,name,subtitle,color,preview}))];
export const validMap=id=>id==='loft'||Object.hasOwn(MAPS,id);
