// Görsel geri bildirimlerin ömrü ve izleyicisi. Sunucu efekti bu süre dolunca listeden düşürür,
// istemci de aynı süre boyunca canlandırır — tek kaynak olmazsa ikisi sessizce ayrışıyordu.
//
// Patlama efektleri (açığa çıkma, kopya dağılması, eşya dağılması, kıpırdamayanın izi) eskiden
// olduğu gibi sunucuda 1.8 sn tutulur ve istemcide 1.5 sn'de söner. Su damlası bir patlama değil,
// izlenecek bir iz: 5 saniye yerinde kalır.
export const BURST_MS=1800,FADE_MS=1500,DRIP_MS=5000;
// Damlalar arası yol. Süreye değil mesafeye bağlı: duran saklanan hiç damlatmaz, koşan sık damlatır.
export const DRIP_STEP=1.1;
// Aynı anda taşınan efekt tavanı. Damla izi sürekli beslendiği için eski 32'lik tavan bir turda
// birkaç saniyede doluyordu; paket boyutu nesne listesinin yanında hâlâ küçük kalıyor.
export const EFFECT_CAP=160;
export const effectLife=kind=>kind==='drip'?DRIP_MS:BURST_MS;
export const effectFade=kind=>kind==='drip'?DRIP_MS:FADE_MS;
// Bu izler yalnızca avcılara ve izi bırakanın kendisine gider. Oyuncu kendi izini görmezse
// görünmeyen bir ceza olurdu; diğer saklananlar görürse takım arkadaşının yerini öğrenirdi.
export const privateTrace=kind=>kind==='idle'||kind==='drip';
