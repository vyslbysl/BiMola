// Level-specific geometry shares the same prop factory for scenery, player disguises and copies.
export function buildMapProp(c,type,g){
 const {box,round,cyl,sphere,torus,rod,plant,m,THREE}=c;
 const materials=c.mapMaterials;
 const legs=(w,d,h,material=m.oak)=>{for(const x of [-1,1])for(const z of [-1,1])rod([x*w/2,.03,z*d/2],[x*w/2,h,z*d/2],.035,material,g);};
 const rim=(r,y,material=m.metal)=>{torus(r,.018,0,y,0,material,g).rotation.x=Math.PI/2;};
 if(type==='techDesk'||type==='executiveDesk'){
  const executive=type==='executiveDesk',w=executive?3.2:2.6,d=executive?1.55:1.3,h=executive?.8:.78;
  round(w,.1,d,.025,0,h-.05,0,executive?m.oak:m.white,g);
  for(const x of [-w/2+.15,w/2-.15]){
   box(.09,h-.1,d-.2,x,(h-.1)/2,0,executive?m.oak:m.black,g);
   box(.5,.32,.55,x*.8,h-.28,-.25,executive?m.oak:m.metal,g);
  }
  box(w-.3,.08,.08,0,.3,-d/2+.14,m.metal,g);
 }else if(type==='codeMonitor'){
  box(.43,.035,.3,0,.018,0,m.black,g);box(.045,.22,.045,0,.13,-.03,m.metal,g);
  round(1.08,.48,.055,.018,0,.43,-.03,m.black,g);
  box(.99,.39,.009,0,.44,.003,materials.codeDisplay,g);
 }else if(type==='phoneRack'){
  box(.88,.07,.35,0,.035,0,m.white,g);
  for(const x of [-.29,0,.29]){
   round(.2,.35,.035,.02,x,.25,0,m.black,g);
   box(.166,.29,.008,x,.26,.021,materials.mobileDisplay,g);
   cyl(.012,.012,.005,x,.088,.022,m.metal,g,8).rotation.x=Math.PI/2;
  }
 }else if(type==='tabletStand'){
  box(.3,.03,.28,0,.015,0,m.metal,g);box(.045,.19,.05,0,.1,-.05,m.metal,g);
  round(.38,.3,.03,.015,0,.275,0,m.black,g);box(.33,.25,.008,0,.275,.02,materials.mobileDisplay,g);
 }else if(type==='kanbanBoard'||type==='diagramBoard'){
  for(const x of [-.85,.85]){box(.07,1.9,.07,x,.95,0,m.metal,g);box(.45,.05,.65,x,.03,0,m.black,g);}
  box(2.2,1.25,.075,0,1.3,0,m.white,g);
  box(2.05,1.1,.009,0,1.3,.043,type==='kanbanBoard'?materials.kanbanDisplay:materials.diagramDisplay,g);
 }else if(type==='binderStack'){
  for(let i=0;i<5;i++){
   const x=-.2+i*.1;box(.085,.34,.32,x,.17,0,i%2?m.teal:materials.cobalt,g);
   box(.055,.13,.008,x,.21,.165,m.white,g);cyl(.012,.012,.008,x,.06,.166,m.black,g,8).rotation.x=Math.PI/2;
  }
 }else if(type==='serverRack'){
  box(.85,2.15,.9,0,1.075,0,m.black,g);
  for(let i=0;i<10;i++){
   const y=.19+i*.193;box(.74,.16,.035,0,y,.465,m.metal,g);
   for(let j=0;j<5;j++)box(.05,.045,.012,-.29+j*.11,y,.49,m.black,g);
   box(.025,.025,.014,.3,y,.491,materials.statusLed,g);
  }
  for(const x of [-.41,.41])box(.025,2.1,.025,x,1.075,.465,m.metal,g);
 }else if(type==='storageArray'){
  round(.65,.45,.55,.018,0,.225,0,m.black,g);
  for(let i=0;i<4;i++){
   box(.12,.33,.02,-.23+i*.15,.24,.28,m.metal,g);
   box(.065,.013,.008,-.23+i*.15,.37,.294,materials.statusLed,g);
  }
 }else if(type==='networkSwitch'){
  box(.75,.18,.35,0,.09,0,m.metal,g);
  for(let i=0;i<8;i++){
   box(.062,.055,.01,-.3+i*.085,.1,.18,m.black,g);
   box(.02,.009,.012,-.3+i*.085,.15,.182,materials.statusLed,g);
  }
 }else if(type==='award'){
  box(.28,.065,.24,0,.033,0,m.black,g);cyl(.04,.08,.14,0,.14,0,m.brass,g);
  cyl(.12,.06,.2,0,.3,0,m.brass,g,16);sphere(.08,0,.42,0,m.brass,g);
 }else if(type==='drawingTablet'){
  round(.72,.09,.48,.018,0,.045,0,m.black,g);box(.59,.012,.37,0,.096,0,materials.designDisplay,g);
  rod([.27,.12,-.13],[.27,.12,.15],.008,m.metal,g);
 }else if(type==='testRig'){
  box(.72,.09,.45,0,.045,0,m.metal,g);box(.57,.025,.32,0,.105,0,m.teal,g);
  for(const x of [-.2,0,.2])box(.12,.07,.13,x,.15,0,m.black,g);
  rod([-.25,.13,-.13],[-.25,.37,-.13],.012,m.orange,g);
  rod([-.25,.37,-.13],[.25,.37,-.13],.012,m.orange,g);
  for(const x of [-.12,0,.12])box(.025,.025,.02,x,.18,.12,materials.statusLed,g);
 }else if(type==='cargoDrum'){
  cyl(.3,.3,.9,0,.46,0,materials.cobalt,g,20);
  for(const y of [.04,.25,.7,.91])rim(.31,y,m.metal);
  cyl(.045,.045,.018,.13,.93,.1,m.black,g,12);
  box(.25,.26,.012,0,.48,.303,materials.yellow,g);
 }else if(type==='trafficCone'){
  round(.48,.06,.48,.025,0,.03,0,m.rubber,g);
  cyl(.035,.2,.64,0,.39,0,m.orange,g,16);
  cyl(.10,.132,.13,0,.40,0,m.white,g,16);
 }else if(type==='cableReel'){
  cyl(.56,.56,.075,0,.05,0,m.oak,g,24);cyl(.56,.56,.075,0,.855,0,m.oak,g,24);
  cyl(.38,.38,.73,0,.45,0,m.black,g,24);
  for(let i=0;i<12;i++)torus(.38,.026,0,.13+i*.055,0,m.rubber,g).rotation.x=Math.PI/2;
  cyl(.1,.1,.018,0,.9,0,m.metal,g,12);
 }else if(type==='pallet'){
  for(const x of [-.55,0,.55])box(.16,.16,1.1,x,.08,0,m.oak,g);
  for(let i=0;i<6;i++)box(1.4,.06,.16,0,.19,-.46+i*.184,m.oak,g);
 }else if(type==='toolChest'){
  round(.85,.54,.5,.035,0,.3,0,m.teal,g);box(.86,.08,.51,0,.59,0,m.metal,g);
  for(const x of [-.25,.25])box(.055,.13,.025,x,.48,.26,m.brass,g);
  box(.25,.035,.08,0,.645,0,m.black,g);
 }else if(type==='mooringBollard'){
  box(.7,.1,.55,0,.05,0,m.black,g);cyl(.14,.19,.48,0,.32,0,m.metal,g,16);
  round(.61,.15,.24,.04,0,.54,0,m.black,g);
  for(const x of [-.26,.26])for(const z of [-.17,.17])cyl(.035,.035,.03,x,.115,z,m.metal,g,8);
 }else if(type==='lifeBuoy'){
  box(.34,.035,.24,0,.018,0,m.black,g);rod([0,.035,0],[0,.4,0],.022,m.metal,g);
  torus(.22,.07,0,.39,0,m.orange,g);
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
   const stripe=box(.12,.13,.145,Math.sin(a)*.22,.39+Math.cos(a)*.22,0,m.white,g);stripe.rotation.z=-a;
  }
 }else if(type==='cargoBox'){
  box(.62,.58,.5,0,.29,0,m.clay,g);box(.09,.006,.51,0,.584,0,m.cream,g);
  box(.09,.58,.006,0,.29,.254,m.cream,g);box(.19,.14,.008,-.15,.34,.255,m.white,g);
  for(const x of [-.21,-.17,-.13,-.09])box(.009,.075,.01,x,.34,.261,m.black,g);
 }else if(type==='crate'){
  box(.7,.04,.5,0,.03,0,m.oak,g);for(let i=0;i<3;i++){for(const z of [-.24,.24])box(.7,.12,.025,0,.13+i*.14,z,m.oak,g);for(const x of [-.337,.337])box(.025,.12,.5,x,.13+i*.14,0,m.oak,g);}for(const x of [-.32,.32])for(const z of [-.21,.21])box(.04,.5,.04,x,.25,z,m.oak,g);
 }else if(type==='stall'){
  legs(3.25,1.5,2.7);box(3.4,.13,1.65,0,.835,0,m.oak,g);for(let i=0;i<11;i++)box(.29,.67,.035,-1.5+i*.3,.4,.81,m.oak,g);
  for(let i=0;i<16;i++){const roof=box(3.4/16,.035,1.65,-1.7+(i+.5)*3.4/16,2.67,0,i%2?materials.awning:m.cream,g);roof.rotation.x=.08;box(3.4/16,.19,.025,-1.7+(i+.5)*3.4/16,2.58,.8,i%2?materials.awning:m.cream,g);}
 }else if(type==='scale'){
  round(.45,.09,.36,.025,0,.05,0,m.teal,g);cyl(.04,.06,.35,0,.23,0,m.metal,g);const dial=cyl(.16,.16,.055,0,.4,0,m.white,g,32);dial.rotation.x=Math.PI/2;rod([0,.4,.035],[.08,.48,.035],.006,m.black,g);cyl(.23,.15,.025,0,.63,0,m.metal,g,32);
 }else if(type==='fountain'){
  cyl(1.4,1.4,.32,0,.16,0,m.stone,g,48);cyl(1.21,1.21,.025,0,.325,0,m.water,g,48);rim(1.3,.33,m.stone);cyl(.2,.35,1,0,.82,0,m.stone,g,24);sphere(.25,0,1.25,0,m.stone,g,1,.4,1);for(const x of [-1,1])rod([x*.2,.9,0],[x*.38,.9,0],.025,m.brass,g);
 }else if(type==='planterBox'){
  box(2.7,.68,1.2,0,.34,0,m.oak,g);box(2.6,.02,1.1,0,.69,0,m.soil,g);for(const y of [.2,.42,.64])for(const z of [-.605,.605])box(2.7,.018,.012,0,y,z,m.black,g);
  for(const x of [-.85,0,.85]){const p=plant(g,x,0,.72);p.position.y=.38;}
 }else if(type==='seedTray'){
  box(.65,.06,.4,0,.03,0,m.black,g);for(let i=0;i<4;i++)for(let j=0;j<2;j++){cyl(.065,.05,.07,-.24+i*.16,.09,-.1+j*.2,m.soil,g,8);sphere(.035,-.24+i*.16,.14,-.1+j*.2,m.leaf,g,1,.45,1);}
 }else if(type==='soilBag'){round(.55,.6,.32,.06,0,.3,0,m.cream,g);box(.45,.3,.008,0,.32,.165,m.leaf,g);box(.3,.05,.009,0,.4,.17,m.white,g);
 }else if(type==='arcade'){
  round(.92,1.14,.8,.035,0,.57,0,m.black,g);box(.84,.6,.13,0,1.42,-.3,m.black,g);const screen=box(.69,.47,.015,0,1.44,-.22,materials.screen,g);screen.rotation.x=-.17;
  for(const x of [-.43,.43])box(.065,1.95,.88,x,.975,0,materials.cobalt,g);
  box(.8,.23,.88,0,1.81,0,m.black,g);box(.73,.12,.012,0,1.83,.45,materials.marquee,g);
  box(.84,.09,.5,0,1.13,.2,m.black,g);rod([-.2,1.17,.24],[-.2,1.29,.24],.012,m.metal,g);sphere(.034,-.2,1.3,.24,m.orange,g);for(let i=0;i<3;i++)cyl(.021,.021,.015,.04+i*.08,1.19,.23,i%2?m.teal:m.terracotta,g,10);box(.09,.13,.015,.13,.65,.41,m.metal,g);
 }else if(type==='pinball'){
  legs(.6,1.35,.85,m.metal);box(.8,.15,1.65,0,.88,0,m.oak,g);box(.68,.015,1.48,0,.97,0,materials.screen,g);box(.8,.6,.16,0,1.3,-.72,m.black,g);box(.7,.43,.02,0,1.32,-.625,materials.marquee,g);for(const x of [-.2,.2])for(const z of [-.3,.3])cyl(.07,.08,.04,x,1,z,m.orange,g);
 }else if(type==='washer'){
  round(1,1.12,.85,.025,0,.56,0,m.metal,g);box(.94,.18,.02,0,.98,.43,m.white,g);torus(.31,.036,0,.48,.435,m.metal,g);const door=cyl(.28,.28,.025,0,.48,.44,m.black,g,32);door.rotation.x=Math.PI/2;sphere(.23,0,.48,.46,m.glass,g,1,1,.12);box(.18,.07,.015,-.2,.98,.449,m.black,g);cyl(.035,.035,.025,.25,.98,.45,m.black,g).rotation.x=Math.PI/2;
 }else if(type==='cart'||type==='luggageCart'){
  const big=type==='luggageCart',w=big?1.1:.85,d=big?.7:.55,h=big?1.65:.85;box(w,.07,d,0,.15,0,big?m.terracotta:m.metal,g);for(const x of [-w/2,w/2])for(const z of [-d/2,d/2]){sphere(.065,x,.075,z,m.black,g);rod([x,.17,z],[x,h,z],.018,big?m.brass:m.metal,g);}for(const z of [-d/2,d/2])rod([-w/2,h,z],[w/2,h,z],.023,big?m.brass:m.metal,g);if(!big)for(let i=0;i<8;i++)for(const z of [-d/2,d/2])rod([-w/2+i*w/7,.2,z],[-w/2+i*w/7,h,z],.006,m.metal,g);
 }else if(type==='robot'){
  round(.24,.26,.19,.02,0,.4,0,m.brass,g);box(.27,.18,.23,0,.63,0,m.metal,g);for(const x of [-.07,.07])sphere(.037,x,.65,.12,m.black,g);for(const x of [-1,1]){rod([x*.07,.29,0],[x*.14,.07,.02],.036,m.metal,g);box(.13,.05,.2,x*.14,.025,.035,m.black,g);rod([x*.13,.48,0],[x*.23,.36,.03],.03,m.brass,g);}
 }else if(type==='planet'||type==='plasma'){
  cyl(.18,.21,.07,0,.035,0,m.black,g);rod([0,.07,0],[0,.35,0],.018,m.brass,g);sphere(.21,0,.42,0,type==='plasma'?m.glass:m.blue,g);if(type==='planet')torus(.235,.009,0,.42,0,m.brass,g).rotation.x=.9;else{sphere(.035,0,.42,0,materials.glow,g);for(let i=0;i<7;i++){const a=i*2.4;rod([0,.42,0],[Math.sin(a)*.16,.42+Math.cos(a)*.16,Math.sin(a*2)*.08],.004,materials.glow,g);}}
 }else if(type==='paintJar'){cyl(.07,.065,.15,0,.075,0,m.terracotta,g);cyl(.073,.073,.025,0,.165,0,m.white,g);
 }else if(type==='orrery'){
  cyl(1.4,1.5,.17,0,.085,0,m.oak,g,40);cyl(.12,.25,2.6,0,1.45,0,m.brass,g);for(let i=0;i<6;i++){const y=.9+i*.32,r=.55+i*.14;const orbit=torus(r,.012,0,y,0,m.brass,g);orbit.rotation.set(Math.PI/2,.1*i,0);const a=i*2.3;sphere(.1+(i%3)*.065,Math.cos(a)*r,y,Math.sin(a)*r,[m.blue,m.terracotta,m.cream][i%3],g);}sphere(.23,0,2.75,0,materials.glow,g);
 }else if(type==='parasol'){
  cyl(.3,.35,.09,0,.045,0,m.stone,g);rod([0,.05,0],[0,2.6,0],.03,m.oak,g);cyl(.06,1.35,.35,0,2.475,0,m.cream,g,12);rim(1.32,2.3,m.terracotta);
 }else if(type==='bell'){
  cyl(.085,.09,.025,0,.014,0,m.black,g);sphere(.075,0,.03,0,m.brass,g,1,.9,1);cyl(.014,.01,.025,0,.117,0,m.brass,g);
 }else if(type==='exhibitShelf'){
  for(const x of [-1.22,1.22])box(.055,1.8,.65,x,.9,0,m.oak,g);for(const y of [.12,.65,1.18,1.73])box(2.5,.055,.65,0,y,0,m.oak,g);box(2.5,1.8,.04,0,.9,-.305,m.oak,g);
 }else return false;
 return true;
}

export function buildMapArchitecture(c,map){
 const {THREE,box,cyl,rod,m,shellPiece,bake}=c,colors=c.mapMaterials;
 const root=new THREE.Group(),id=map.id;
 const floor=id==='harbor'?m.asphalt:id==='greenhouse'?m.floor:m.stone;
 box(map.room.width+.3,.2,map.room.depth+.3,0,-.11,0,floor,root);
 // Stone paving joints / timber deck rhythms give a readable physical scale.
 if(id==='market'||id==='hotel')for(let z=-17;z<18;z+=2)box(28,.004,.012,0,.002,z,m.clay,root);
 const wallMaterial=id==='harbor'?m.portConcrete:id==='arcade'?colors.cobalt:id==='greenhouse'?m.sage:m.wall;
 for(const [x,z,w,d,h=map.room.height,y=0,material]of map.walls){
  const piece=shellPiece();
  if(material==='glass'){
   const pane=box(w,h,d,x,y+h/2,z,m.glass,piece);pane.castShadow=false;
   const length=Math.max(w,d),horizontal=w>d;
   for(let i=0;i<=Math.ceil(length/2);i++){const v=-length/2+i*length/Math.ceil(length/2);box(.075,h,.075,x+(horizontal?v:0),y+h/2,z+(horizontal?0:v),m.sage,piece);}
   for(const yy of [y+.08,y+.75,y+h])box(w+.05,.065,d+.05,x,yy,z,m.sage,piece);
  }else{
   box(w,h,d,x,y+h/2,z,wallMaterial,piece);
   box(w+.025,.12,d+.025,x,y+.06,z,id==='arcade'?colors.yellow:m.stone,piece);
   // Large daylight windows are inset decorations on the solid map boundary.
   if((Math.abs(x)===map.room.width/2||Math.abs(z)===map.room.depth/2)&&!['greenhouse','harbor','techOffice'].includes(id)){
    const vertical=Math.abs(x)===map.room.width/2,length=vertical?d:w;
    for(let v=-length/2+3;v<length/2-1;v+=5){const px=vertical?x-Math.sign(x)*.17:v,pz=vertical?v:z-Math.sign(z)*.17;
     box(vertical?.025:2.5,2,vertical?2.5:.025,px,2.45,pz,colors.window,piece);
     for(const offset of [-1.3,0,1.3])box(vertical?.08:.07,2.15,vertical?.07:.08,px+(vertical?0:offset),2.45,pz+(vertical?offset:0),id==='market'?colors.awning:m.white,piece);
     for(const yy of [1.4,3.5])box(vertical?.08:2.7,.08,vertical?2.7:.08,px,yy,pz,m.white,piece);
    }
   }
  }
  bake(piece);
 }
 if(id==='harbor'){
  const palette=[colors.cobalt,m.teal,m.clay];
  // Corrugation and locking bars sit on the same solid boxes used by physics.
  for(const container of map.containers){
   const {x,z,w,d,h,color}=container,vertical=d>w;
   const piece=shellPiece(),material=palette[color];
   box(w+.015,h,d+.015,x,h/2,z,material,piece);
   const length=vertical?d:w;
   for(let v=-length/2+.25;v<length/2;v+=.6)for(const side of [-1,1]){
    box(vertical?.07:.09,h-.15,vertical?.09:.07,x+(vertical?side*(w/2+.03):v),h/2,z+(vertical?v:side*(d/2+.03)),material,piece);
   }
   for(const yy of [.08,3.12,...(h>4?[3.28,6.32]:[])])box(w+.06,.08,d+.06,x,yy,z,m.metal,piece);
   for(const offset of [-.85,.85]){
    box(vertical?.07:.06,h-.35,vertical?.06:.07,x+(vertical?offset:w/2+.04),h/2,z+(vertical?d/2+.04:offset),m.metal,piece);
   }
   box(vertical?1.4:.03,.55,vertical?.03:1.4,x+(vertical?0:w/2+.08),1.9,z+(vertical?d/2+.08:0),m.cream,piece);
   bake(piece);
  }
  const detailRoot=new THREE.Group();root.add(detailRoot);detailRoot.scale.set(map.layoutScale||1,1,map.layoutScale||1);
  // Freight shed roof and skylights form one removable camera-occlusion group.
  const roof=shellPiece();box(30.5,.18,28.5,25,5.6,-34,m.portRoof,roof);
  for(const x of [16,25,34])box(3,.025,22,x,5.71,-34,colors.window,roof);
  for(let z=-47;z<=-21;z+=4)box(30,.18,.14,25,5.45,z,m.metal,roof);bake(roof);roof.scale.set(map.layoutScale||1,1,map.layoutScale||1);
  // A continuous service lane, loading bays and quay-edge hazard markings.
  for(let z=-50;z<51;z+=5)box(.16,.012,2.5,6,.005,z,colors.yellow,detailRoot);
  for(const z of [-10,0,20,50])box(80,.012,.16,0,.005,z,m.white,detailRoot);
  for(const x of [19,31])for(const side of [-1,1])box(.12,.012,9,x+side*2.6,.006,-15,m.white,detailRoot);
  for(let z=-51;z<53;z+=2){box(1.5,.012,.7,40.8,.007,z,colors.yellow,detailRoot);}
  // Gantry crane sits beyond the quay boundary; no invisible in-play obstacles.
  for(const z of [-18,30]){
   const crane=new THREE.Group();detailRoot.add(crane);
   for(const x of [47,59]){
    box(.9,20,.9,x,10,z,m.crane,crane);
    rod([x,1,z],[x+(x===47?5:-5),18,z],.15,m.crane,crane);
   }
   box(30,1.1,1.2,57,20,z,m.crane,crane);
   for(let x=43;x<71;x+=3)rod([x,19.5,z],[x+3,20.5,z],.07,m.black,crane);
   box(2,1.5,1.8,55,18.7,z,m.crane,crane);
   rod([63,19,z],[63,8,z],.045,m.black,crane);
   cyl(.35,.25,.6,63,7.8,z,m.metal,crane,12);
  }
  box(110,.1,190,98,-.9,0,m.portSea,detailRoot);
  box(95,.1,70,0,-.9,90,m.portSea,detailRoot);
  // A moored cargo ship provides a recognisable skyline beyond the playable fence.
  box(12,3.5,55,75,1,-4,m.portHull,detailRoot);box(11,.25,54,75,2.85,-4,m.cream,detailRoot);
  for(const z of [-20,-6,8])for(const x of [72,78])box(5,3,11,x,4.5,z,palette[(z+20)/14%3],detailRoot);
  box(10,7,7,75,6.5,19,m.white,detailRoot);box(10.1,1,7.1,75,8.4,19,colors.window,detailRoot);
 }else if(id==='techOffice'){
  const floorColors=[m.officeWarm,m.officeBlue,m.officeMint,m.officeSand,m.officeSlate,m.officeBlue,m.officeRose,m.officeMint];
  box(4.7,.014,47.6,0,.003,0,m.stone,root);
  map.zones.forEach((zone,index)=>{
   const x=(zone.xmin+zone.xmax)/2,z=(zone.zmin+zone.zmax)/2,side=Math.sign(x);
   box(zone.xmax-zone.xmin+1.4,.012,11.6,x,.003,z,floorColors[index],root);
   // Door headers, ceiling tiles and light strips are removable camera occluders.
   const ceiling=shellPiece();box(19.3,.12,11.8,side*12.25,4.72,z,m.white,ceiling);
   for(const dz of [-3,3])for(const dx of [-4,4])box(3,.028,.35,x+dx,4.64,z+dz,colors.window,ceiling);
   for(let dz=-4.5;dz<=4.5;dz+=3)box(19,.025,.035,x,4.64,z+dz,m.metal,ceiling);
   bake(ceiling);
   const entry=shellPiece();
   for(const dz of [-1.62,1.62])box(.3,3.2,.1,side*2.5,1.6,z+dz,m.teal,entry);
   box(.3,.5,3.3,side*2.5,3.45,z,m.teal,entry);
   const doorLabel=zone.id==='manager'?'HD':zone.name;
   c.label?.(doorLabel,side*2.31,3.44,z,-side*Math.PI/2,2.85,.36,entry);
   c.label?.(doorLabel,side*2.69,3.44,z,side*Math.PI/2,2.85,.36,entry);
   bake(entry);
   // Exterior windows are inset into the solid envelope, keeping physics consistent.
   const windows=shellPiece();
   for(const dz of [-3,3]){
    box(.025,2.1,5,side*21.82,2.7,z+dz,colors.window,windows);
    for(const offset of [-2.55,0,2.55])box(.07,2.2,.07,side*21.76,2.7,z+dz+offset,m.metal,windows);
   }
   bake(windows);
  });
  const corridorRoof=shellPiece();box(5,.1,48,0,4.73,0,m.white,corridorRoof);
  for(const z of [-18,-6,6,18])box(.5,.025,7,0,4.65,z,colors.window,corridorRoof);bake(corridorRoof);
  c.label?.('SPRINT / TEKNOLOJİ OFİSİ',0,2.8,-23.8,0,4.6,.65,root);
 }else if(id==='greenhouse'){
  // Pitched glazing, with the entire deck outside the greenhouse kept open to the sky.
  for(const x of [-4,4]){const roof=box(8.3,.025,22,x,4,-4,m.glass,root);roof.rotation.z=x<0?.18:-.18;roof.castShadow=false;}
  for(let z=-15;z<=7;z+=2)for(const side of [-1,1])rod([side*8,3.3,z],[0,4.8,z],.035,m.sage,root);
  rod([0,4.8,-15],[0,4.8,7],.055,m.sage,root);
  for(let i=0;i<22;i++){const x=-45+i*4.3,h=8+(i%5)*3;box(3.4,h,6,x,h/2-5,-32-(i%3)*3,colors.skyline,root);for(let yy=0;yy<h-1;yy+=1.5)box(3,.09,.01,x,yy-4,-28.99-(i%3)*3,m.white,root);}
 }else if(id==='market'){
  // Terracotta roof edges and shutters reference the supplied Aegean market.
  for(const x of [-13.5,13.5]){for(let z=-16;z<18;z+=.35)cyl(.16,.16,.6,x,7,z,m.terracotta,root,10).rotation.x=Math.PI/2;}
  for(const x of [-1,1]){box(.7,4.1,.6,x*2.4,2.05,17.6,m.stone,root);}
  const arch=new THREE.Mesh(new THREE.TorusGeometry(2.4,.35,10,32,Math.PI),m.stone);arch.position.set(0,4.1,17.6);root.add(arch);
  // The sea is a vista beyond the boundary, not a playable escape route.
  box(100,.1,60,0,-1,53,colors.sea,root);
 }else if(id==='arcade'){
  const ceiling=shellPiece();box(28,.12,36,0,4.75,0,m.white,ceiling);
  for(let x=-14;x<=14;x+=2)box(.025,.02,36,x,4.67,0,m.metal,ceiling);for(let z=-18;z<=18;z+=2)box(28,.02,.025,0,4.67,z,m.metal,ceiling);
  for(const x of [-8,8])for(const z of [-12,0,12])box(1,.025,.45,x,4.62,z,colors.window,ceiling);bake(ceiling);
  box(7,.015,8,8,.015,10,colors.coral,root);box(8,.015,7,9,.016,-11,m.white,root);
 }else if(id==='museum'){
  box(28,3,9,0,1.5,-13.5,m.wall,root);
  for(const x of [-10.9,10.9])for(let i=0;i<56;i++){const h=(i+1)*3/56;box(3.8,h,.25,x,h/2,4.875-i*.25,m.stone,root);}
  // Two broad ramps connect the raised gallery; the inner edge is visually readable.
  for(const x of [-8.95,8.95])rod([x,.9,5],[x,3.9,-9],.035,m.brass,root);
  const skylight=shellPiece();box(28,.025,36,0,7.95,0,m.glass,skylight).castShadow=false;for(let x=-14;x<=14;x+=3)box(.06,.09,36,x,7.9,0,m.white,skylight);for(let z=-18;z<=18;z+=3)box(28,.09,.06,0,7.9,z,m.white,skylight);bake(skylight);
  for(const x of [-10,10]){box(3.5,2.1,.06,x,4.5,-17.8,colors.screen,root);}
 }else if(id==='hotel'){
  // A shallow flush decorative water court, traversable without a new swimming rule.
  box(4,.016,9,0,.014,-1,m.water,root);
  for(const x of [-2.15,2.15])box(.25,.06,9.5,x,.03,-1,m.stone,root);
  for(const z of [-5.65,3.65])box(4.55,.06,.25,0,.03,z,m.stone,root);
  for(const x of [-9.5,9.5]){const roof=shellPiece();box(9,.12,36,x,4.5,0,m.cream,roof);bake(roof);}
 }
 bake(root);return root;
}
