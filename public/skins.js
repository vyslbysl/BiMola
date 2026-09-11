// Avcı karakterleri. Tek katalog hem katılma ekranını, hem sunucunun doğrulamasını, hem de model
// kurucusunu besler — maps.js'in harita seçimini beslediği gibi: istemci sunucunun tanımadığı bir
// görünüm adı gönderemez.
//
// Dört karakter aynı baş, yüz ve beden geometrisini kullanır; avatar() bunları her seferinde aynı
// şekilde çizer. Buradaki kod yalnızca kıyafet ve başlık ekler, yani ayrım giyimden gelir, yüz ya
// da beden hatlarından gelmez. Etiketler de kişi adı ve kıyafet tarifidir, grup adı değildir.
export const SKINS=[
 {id:'levi',name:'Levi',note:'Geniş şapka, uzun ceket'},
 {id:'marco',name:'Marco',note:'Beyaz yaka, haç kolye'},
 {id:'yusuf',name:'Yusuf',note:'Takke, krem cübbe'},
 {id:'tenzin',name:'Tenzin',note:'Safran cübbe, tıraşlı baş'},
];
export const DEFAULT_SKIN=SKINS[0].id;
export const validSkin=id=>SKINS.some(s=>s.id===id);
export const skinFor=id=>validSkin(id)?id:DEFAULT_SKIN;

// Kıyafet katmanı. map-models.js ile aynı bağlam nesnesini alır, böylece geometri tarayıcı veya
// WebGL olmadan da kurulup sınanabilir. Dönen değer avatar()'ın gövde ve pantolon için kullandığı
// malzemelerdir; `hair:false` başlık saçın yerini aldığı anlamına gelir.
// Ölçü referansları avatar() ile aynı: baş küresinin tepesi ~1.76 m, gövde 0.91–1.39 m, göz
// hizası 1.63 m. Başlıklar başın üstüne, cübbeler gövdenin altına oturur.
export function buildSkin(c,id,g){
 const {box,round,cyl,sphere,torus,rod,m}=c;
 // Sakal çenenin çevresini kapatır, göz hizasının altında kalır: yüz geometrisi hiç değişmez.
 const beard=()=>round(.175,.125,.10,.045,0,1.532,-.095,m.black,g);
 if(id==='levi'){
  // Geniş kenarlı şapka: düz bir kenar diski, üstünde silindir kalıp.
  cyl(.295,.295,.022,0,1.757,0,m.black,g,28);
  cyl(.152,.163,.17,0,1.852,0,m.black,g,22);
  torus(.164,.014,0,1.788,0,m.teal,g).rotation.x=Math.PI/2;
  // Uzun ceket: gövdenin altını dizin üstüne kadar kapatır, baldır açıkta kalır.
  round(.44,.55,.26,.06,0,.72,0,m.black,g);
  box(.14,.38,.03,0,1.17,-.112,m.white,g);
  beard();
  return {shirt:m.black,pants:m.black,hair:false};
 }
 if(id==='marco'){
  // Roma yakası: boyun dibini saran ince beyaz bant ve öndeki küçük dikdörtgen.
  cyl(.079,.079,.05,0,1.414,0,m.white,g,22);
  box(.046,.042,.022,0,1.404,-.07,m.white,g);
  for(let i=0;i<4;i++)cyl(.013,.013,.01,0,1.30-i*.085,-.123,m.teal,g,8).rotation.x=Math.PI/2;
  // Haç kolye: zincir yakanın iki ucundan V yapıp göğüste birleşir, haç gömleğin ve düğmelerin
  // önünde durur (z -.146..-.130, gövde ön yüzü -.120). Latin haçı, yatay kol üst üçte bire oturur.
  for(const side of [-1,1])rod([side*.055,1.4,-.105],[0,1.195,-.132],.006,m.brass,g);
  box(.028,.105,.016,0,1.14,-.138,m.brass,g);
  box(.075,.026,.016,0,1.158,-.138,m.brass,g);
  return {shirt:m.black,pants:m.black,hair:true};
 }
 if(id==='yusuf'){
  // Takke: başın tepesine oturan kısa kalıp ve yuvarlatılmış üst.
  cyl(.118,.132,.075,0,1.735,0,m.white,g,26);
  sphere(.118,0,1.772,0,m.white,g,1,.45,1);
  // Krem cübbe: gövdeden baldıra kadar iner.
  round(.42,.6,.25,.06,0,.69,0,m.cream,g);
  box(.085,.3,.03,0,1.22,-.117,m.teal,g);
  beard();
  return {shirt:m.cream,pants:m.cream,hair:false};
 }
 if(id==='tenzin'){
  // Tıraşlı baş: başlık yok ve saç küresi de çizilmez, çıplak baş küresi kendisi kılık olur.
  // Bu yüzden dördü içinde tepesi en alçak silüet bu; uzaktan da ayırt edilir.
  // Omuzdan göğse inen üst sarma, altındaki cübbeden bir ton koyu: tek renk yerine katman okunur.
  // Üstü 1.42'de biter, boynun bir parçası açıkta kalsın — daha yükseği çeneyi yakaya gömüyordu.
  round(.455,.30,.275,.07,0,1.27,0,m.clay,g);
  box(.46,.03,.285,0,1.105,0,m.teal,g);
  // Sarmanın önünden inen açık renkli kenar: tek omuzdan atılan cübbenin ucu, silüete asimetri verir.
  box(.075,.3,.03,-.13,1.27,-.145,m.orange,g);
  // Cübbe gövdeden baldıra iner; sakal yok, dördüncü ayırt edici bu.
  round(.43,.62,.26,.06,0,.7,0,m.orange,g);
  return {shirt:m.orange,pants:m.orange,hair:false};
 }
 return null;
}
