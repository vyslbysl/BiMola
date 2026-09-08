// Level-specific geometry shares the same prop factory for scenery, player disguises and copies.
export function buildMapProp(c,type,g){
 const {box,round,cyl,sphere,torus,rod,plant,m,THREE}=c;
 const materials=c.mapMaterials;
 const legs=(w,d,h,material=m.oak)=>{for(const x of [-1,1])for(const z of [-1,1])rod([x*w/2,.03,z*d/2],[x*w/2,h,z*d/2],.035,material,g);};
 const rim=(r,y,material=m.metal)=>{torus(r,.018,0,y,0,material,g).rotation.x=Math.PI/2;};
 if(type==='crate'){
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
 const floor=id==='greenhouse'?m.floor:m.stone;
 box(28.3,.2,36.3,0,-.11,0,floor,root);
 // Stone paving joints / timber deck rhythms give a readable physical scale.
 if(id==='market'||id==='hotel')for(let z=-17;z<18;z+=2)box(28,.004,.012,0,.002,z,m.clay,root);
 const wallMaterial=id==='arcade'?colors.cobalt:id==='greenhouse'?m.sage:m.wall;
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
   if((Math.abs(x)===14||Math.abs(z)===18)&&id!=='greenhouse'){
    const vertical=Math.abs(x)===14,length=vertical?d:w;
    for(let v=-length/2+3;v<length/2-1;v+=5){const px=vertical?x-Math.sign(x)*.17:v,pz=vertical?v:z-Math.sign(z)*.17;
     box(vertical?.025:2.5,2,vertical?2.5:.025,px,2.45,pz,colors.window,piece);
     for(const offset of [-1.3,0,1.3])box(vertical?.08:.07,2.15,vertical?.07:.08,px+(vertical?0:offset),2.45,pz+(vertical?offset:0),id==='market'?colors.awning:m.white,piece);
     for(const yy of [1.4,3.5])box(vertical?.08:2.7,.08,vertical?2.7:.08,px,yy,pz,m.white,piece);
    }
   }
  }
  bake(piece);
 }
 if(id==='greenhouse'){
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
