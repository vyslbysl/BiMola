# MOLA — Gözünün önündeyim

Gün ışığı alan, 28 × 36 metre büyüklüğündeki loftta nesnelere dönüşerek saklanma oyunu. Tarayıcıda 3D, gerçek zamanlı çok oyunculu; Node.js, Socket.IO, Three.js. Arayüz Türkçe.

Loft, ortadaki koridora kapı boşluklarıyla açılan beş temalı odadan oluşur: oturma odası, yatak odası, mutfak, çalışma köşesi ve giriş/vitrin. Her odanın kendi nesne kategorisi vardır — mutfakta kupa, tabure ve saksı; yatak odasında yastık, çamaşır sepeti ve valiz; çalışma köşesinde kitap yığını ve valiz. Her turda nesnelerin hem yeri hem türü yeniden karılır, aynı tur asla tekrarlanmaz. Mutfakta her turda mutlaka bir kütük yemek masası, oturma odasında mutlaka bir duvar tablosu bulunur; bunlar da saklanılabilir, yerleri değişir ama hiç ikilenmez. Küçük eşyalar tezgah, ada, masa ve bank üstünde de doğabilir. Oda kurucusu lobide ek rastgele eşya sayısını (0–90), süs eşyası yoğunluğunu, saklananın kaç isabette açığa çıkacağını ve ıslanan saklananın kaçış hızını da ayarlayabilir. Saklananlar tura odalara dağılmış olarak başlar.

## Başlat

```sh
npm ci
npm start
```

[Oyunu aç](http://localhost:3000). **Hemen oyna**, seçtiğin tarafta 3'e 3 botlu antrenman açar. Hazırım düğmesine basmadan süre başlamaz. **Kendi odanı kur** ile özel oda oluşturulur.

## Haritalar

**Kendi odanı kur → Harita** bölümünde haritalar önizlemeli kartlar olarak seçilir; **Hemen oyna** ekranında da aynı kartlar vardır. Oda sahibi haritayı lobide veya tur bitiminde değiştirebilir; devam eden tur sırasında değiştiremez. Mevcut Güneşli Ev korunur.

**Turlar arasında harita değişimi varsayılan olarak açıktır:** yeni turda takımlar yer değiştirirken mekân da rastgele değişir (aynı harita üst üste gelmez), böylece bir odayı ezberleyen taraf avantaj kazanmaz. Kurucu tur bitiminde bir harita seçerse o tur onun seçtiği haritada başlar, rotasyon sonraki turda devralır; "Hep aynı haritada kal" seçilirse mekân sabitlenir.

- **Kıyı Pazarı:** çizgili tenteli tezgâhlar, meyve kasaları, çeşmeli meydan ve kahve köşesi.
- **Çatı Serası:** cam sera, bitki kasaları, bakım masaları ve çatı terası. Cam suyu durdurur; görüşü kesmez. Kuzey, güney ve yan çıkışlar vardır.
- **Son Jeton:** arcade ve pinball makineleri, langırt, çamaşırhane ve kahve tezgâhı.
- **Minik Mucitler:** güneş sistemi sergisi, robot ve deney masaları, kitaplıklar; iki rampayla çıkılan 3 m yüksekliğinde üst galeri.
- **Bavul Molası:** resepsiyon, bagaj alanı, oturma salonu ve dekoratif su avlusu. Avlu geçilebilir; yüzme mekaniği yoktur.

Her haritanın mimarisi, nesne havuzu ve bot yolları ayrıdır. Eşya değişimi, kopyalar, isabet ve yoğunluk ayarları ortak çalışır. Yeni haritalarda 21 yeni eşya türü bulunur; büyük nesnelerin üzerindeki küçük eşyalar bağımsız seçilir. Müzedeki yükseltme sınırı bulunulan katın zemininden ölçülür. Gönderilen görsellerden palet, malzeme ve yerleşim fikri alınmıştır; sahneler gerçek zamanlı geometriyle yeniden kurulmuştur, fotoğrafların birebir 3D kopyası değildir.

## Oda ayarları

- Takım başına 1–12 kişi: 1'e 1, 3'e 3, 5'e 5, 6'ya 6, 12'ye 12.
- Bot yok / boş yerleri doldur / iki takım için ayrı bot sayısı.
- 10–60 saniye saklanma; 1–10 dakika tur.
- **Kıpırdamayanın izi (15 · 30 · 45 · 60 saniye · kapalı):** bir saklanan bu kadar süre yer değiştirmezse yerinin ~1 m çevresinde 1,5 saniyelik amber bir iz (halka + ince ışık sütunu) belirir. Yalnızca avcılar ve o saklananın kendisi görür; diğer saklananlara sızmaz. Yarım metreden fazla yer değiştirmek sayacı sıfırlar — yerinde titremek kurtarmaz. Aynı oyuncu için izler arasında en az 3,6 saniye vardır, yani iz yağmuru olmaz ve iz eleme değil ipucudur. Saklanan önce "5 saniye içinde kıpırdamazsan" uyarısını, sonra iz çıktığında ikinci uyarıyı alır.
- **Süs eşyası yoğunluğu (tam · orta · az · çok az, varsayılan çok az):** tezgah, masa ve duvarlardaki küçük süslerin ne kadarı doğsun. Mobilya, tezgah ve üstünde başka bir şey taşıyan parçalar her kademede yerinde kalır; yalnızca üstünde bir şey olmayan küçük süsler seyreltilir, yani odalar kimliğini kaybetmez. Varsayılan (çok az süs + 10 ek eşya) kurulumda oda ~120 nesneyle açılır; tam süs ve bol eşyayla ~340'a çıkar — zayıf ekran kartlarında en büyük ikinci kazanç budur.
- **Ek rastgele eşya (0–90, varsayılan 10):** her tur serpilen ekstra eşya sayısı. **Hiç** seçilirse oda yalnızca mobilyasıyla ve her odanın imza parçasıyla (mutfakta kütük masa, salonda duvar tablosu) kalır.
- **Islatma dayanıklılığı (1–10 isabet, varsayılan 3):** saklanan bir oyuncunun açığa çıkması için gereken isabet sayısı. Her isabet %100'ün bu paya bölünmüş kadarını doldurur (3 isabette %34), son gereken isabet tam %100'e oturur. Gerçek eşyalara her ayarda tek atış yeter.
- **Islanınca kaçış hızı (1×–2×, varsayılan 1.1×):** ilk isabeti yiyen saklananın avcıya göre kaçış hızı. 1× seçilirse iki taraf aynı hızda koşar.
- Oyuncular takım seçebilir veya otomatik dağıtılır.
- Oda sahibi lobide bot ekler/çıkarır, insanları taşır, kapasite ve süreleri değiştirir.
- Tur, her iki tarafta en az bir kişi varsa başlar: takımların eşit olması gerekmez, 1'e 1 de olur. Takım başına seçilen sayı yalnızca üst sınırdır. Yeni turda takımlar yer değiştirir.
- Oda kodu 4 haneli bir sayıdır; davet bağlantısı kodu hazır getirir.
- Oda sahibi ayrılırsa yetki kalan bir insana geçer. Son insan ayrılınca oda silinir.

## Oynanış

**Saklanan:** Bir eşyanın yanına geldiğinde yakındaki nesneler kendiliğinden alt şeritte listelenir — E'ye basmak gerekmez, 1–8 ile seçersin. Şerit fareyi almaz, bakışın ve hareketin bozulmaz; E ile kapatırsan o eşyanın yanından ayrılana kadar bir daha açılmaz. Baktığın eşya olmak için de E yeter. İlk kılığını kendin seç — panel her nesnenin gerçek 3D önizlemesini gösterir. O nesnenin yerini alırsın. Yerini ayarla, **Z/X** ile nesnenin yönünü çevir, **Boşluk** ile zıpla ve F ile konumunu sabitle. Zıplama tezgah, ada, yemek masası, bank, yatak yüksekliğine kadar çıkar; puf, valiz, sepet ve kütük masa gibi geniş eşyaların üstüne de basabilirsin. Kupa ya da kitap yığını gibi küçük bir kılıktayken yemek masasının, çalışma masasının ve kütük masanın altına girebilirsin — büyük bir kılık oraya sığmaz. İlk seçim ücretsizdir; ardından Q ile **üç kez** o odaya uygun, farklı bir nesneye dönüşebilirsin. Değişimde konumun ve biriken su korunur. Bir kez ıslandıktan sonra kılığın sabitse çözülür ve avcının **oda ayarındaki katı** (varsayılan 1.1×) hızla kaçabilirsin. Henüz nesne seçmemiş insan oyuncu süre bitince otomatik dönüştürülmez; seçimini yapana kadar görünür ve ıslatılabilir.

Aynı yerde çakılıp kalmak artık bedava değil: oda ayarındaki süre boyunca (varsayılan 30 sn) kıpırdamayan saklananın yerinin çevresinde kısa bir iz belirir ve avcılar bunu görür. Kıpırdamak sayacı sıfırlar.

**Avcı:** Sol fare tuşuna veya Boşluk'a basılı tutarak su sık. Doğru nişan ve görüş gerekir; duvarlar, mobilyalar ve öndeki nesneler suyu keser. **Sıradan bir eşyaya tek atış yeter:** ilk isabette tamamen ıslanır ve "gerçek eşya" olarak işaretlenir, üstüne depo boşaltmaya gerek yoktur. Saklanan bir oyuncu ise oda ayarına göre ıslanır — varsayılan 3 isabette, yani her atışta %34 — ve ancak %100'e ulaştığında açığa çıkıp elenir. Depo 25 atış alır; R ile 2 saniyede dolar.

Süre dolarsa saklananlar, tüm saklananlar bulunursa avcılar kazanır. Ölüm, can puanı, silahlı çatışma, kaçış görevleri veya yetenek kartları yoktur.

## Yakalanınca izleme

Yakalanan oyuncu serbest kameraya geçer. **WASD / oklar** ile dolaşır, fareyle bakar, **Boşluk** ile yükselir, **C** ile alçalır ve **Shift** ile hızlanır. Kamera oda sınırları içinde, iç duvarların ve eşyaların arasından geçebilir. **V** serbest kamera ile yaşayan takım arkadaşını izleme arasında geçiş yapar; **Q / E** önceki / sonraki takım arkadaşını seçer. Ekrandaki düğmeler ve mobil yüksel/alçal kontrolleri de aynı işi yapar. İzlenen oyuncu yakalanırsa sıradaki yaşayan takım arkadaşı seçilir; kimse kalmadığında serbest kameraya dönülür ve tur sonucu gösterilir.

İzleyici hareketi sunucuya oyuncu hareketi olarak gönderilmez. Yakalanan oyuncu eşya seçemez, kopya bırakamaz veya ateş edemez. Canlı oyuncuların görüş ve hazırlık gizliliği korunur. Yeni tur ve odadan çıkış kamera tercihini sıfırlar.

Beş yeni haritanın tasarım planı ve Higgsfield üretim durumları: [Alternatif haritalar](design/map-concepts/README.md). Beş alternatif harita artık oda ayarlarında ve hızlı oyunda seçilebilir. Konsept görselleri harita seçiminin referans önizlemeleridir; oyun içi ekran görüntüsü değildir.

## Kontroller

| Kontrol | İşlev |
|---|---|
| WASD / oklar | Hareket |
| Fare | Bakış ve kamera (tur boyunca fare imleci oyuna kilitlenir) |
| E | Baktığın eşya ol; hiçbir şeye bakmıyorsan listeyi aç/kapat. Bir eşyanın yanına gelince liste **kendiliğinden açılır**, 1–8 ile seçersin |
| Q | Odaya ve bulunduğun yere uygun rastgele nesneye değiş (3 hak) — yerdeyken yerde duran eşyalara, bir yüzeydeyken yüzeyde duran eşyalara |
| C | Sahte kopya bırak (saklanma süresinde de olur, turda 3 hak, isabet alana kadar kalır) |
| Z / X | Nesnenin yönünü çevir |
| Fare tekerleği / PgUp · PgDn | Kılığı yükselt · indir (sıradan eşya en fazla 2,2 m; duvara asılı parçalar 3,4 m). Koltuğa gömülü bir minder gibi eşyalar kaldırılırken bir sonraki boş yüksekliğe çıkar |
| Boşluk | Zıpla — saklanan tezgaha ve masaya çıkar, avcı yüksek rafların üstünü görmek için zıplar |
| F | Konumu sabitle / serbest bırak |
| Sol tık | Su sık |
| R | Su deposunu doldur |
| Esc | Fareyi serbest bırak ve menüyü aç — fare serbest kalır, ekrana tıklayınca oyun geri alır |

Saklanan dönüşünce kendi nesnesini her zaman üçüncü şahıs kameradan görür. Kamera baktığın yöne gider; arada kalan duvar, cam cephe, üst silme, tavan paneli veya mobilya o kare boyunca gizlenir, yani duvarın arkasına geçmesi gerektiğinde duvar yokmuş gibi davranır. Duvardaki tablo veya tavandaki lamba gibi yükseğe asılı kılıklarda daha geriden ve daha aşağıdan bakar, bakış noktası da nesnenin biraz altına iner; böylece ekranı tavan değil oda doldurur. Avcı birinci şahıs kamerayla su tabancası taşır. Tur sırasında fare imleci her iki tarafta da oyuna kilitlenir; imleç ancak nesne seçme paneli veya bir menü açıkken serbest kalır. Tarayıcı fare kilidini desteklemiyorsa sürükleyerek bakılabilir; Boşluk ile ateş edilebilir. Dokunmatik yön ve ateş düğmeleri de bulunur; ana oynanış masaüstü için tasarlanmıştır.

## Performans (Intel HD ve zayıf kartlar)

Oyun içinde **Esc → Görüntü kalitesi**: Yüksek · Orta · Düşük. Ekran kartının adı Intel HD/UHD, yazılım render (SwiftShader/llvmpipe) gibi zayıf bir kartı gösteriyorsa oyun kendiliğinden **düşük** açılır; seçimin tarayıcıda saklanır ve elle seçim yaparsan otomatik müdahale durur. Ayrıca kare süresi 90 karede bir ölçülür: 38 FPS'nin altına düşerse kademe bir aşağı iner, hâlâ ağırsa çözünürlük %65'e kadar kısılır ve durum bildirilir.

Kademeler arasında değişenler:

| | Yüksek | Orta | Düşük |
|---|---|---|---|
| Gölge haritası | 3072², yumuşak (PCFSoft) | 1536², sert (PCF) | kapalı |
| Gölge tazeleme | her kare | 3 karede bir | — |
| Piksel oranı | ekranın 1.75 katına kadar | 1.25 katına kadar | ekranın 0.8 katı |
| Kenar yumuşatma | açık | kapalı | kapalı |
| Oda dolgu ışığı | 5 | 5 | 2 |
| Kamera önündeki engel taraması | her kare | 2 karede bir | 3 karede bir |
| Doku keskinliği (anisotropy) | 8× | 4× | 1× |

Kademelerden bağımsız olarak oda ayarlarındaki **süs eşyası yoğunluğu** ve **ek rastgele eşya** çizim sayısını doğrudan düşürür: en seyrek kurulumda sahnedeki nesne sayısı üçte bire iner, bu da Intel HD gibi kartlarda kalite kademesinden bile fazla iş görebilir.

Kenar yumuşatma WebGL bağlamı kurulurken belirlendiği için yalnızca sayfa yenilenince değişir; diğer her şey seçtiğin anda uygulanır. En büyük kazanç gölgenin kapanmasıdır: güneş için ikinci bir tam sahne geçişi ortadan kalkar.

## Docker

```sh
docker compose up --build -d
```

Port: `3000`. Sağlık kontrolü: `/health`. Durdur: `docker compose down`.

Aynı ağdaki oyuncular sunucu bilgisayarının yerel IP adresi ve 3000 portuyla bağlanabilir. Davet linki açıldığı adresi kullanır: `localhost` bağlantısı başka bilgisayarda çalışmaz. İnternet üzerinden oynamak için erişilebilir bir sunucu, HTTPS ve WebSocket destekli ters vekil gerekir; oyun otomatik yayımlanmaz.

## Doğrulama ve sınırlar

```sh
npm test
```

Nesne seçimi, üç rastgele değişim, su miktarının korunması, duvar arkasına isabetin engellenmesi, yeniden doldurma, hazırlık gizliliği, kapasite/bot ayarları, yetki kontrolleri ve gerçek Socket.IO bağlantıları test edilir. Bot simülasyonları 3'e 3, 6'ya 6 ve 12'ye 12 çalıştırılmıştır. Bu, 24 farklı cihazla gerçek ağ yük testi yapıldığı anlamına gelmez.

Oda ve tur durumu bellektedir, sunucu yeniden başlayınca silinir. Hesap/kalıcı ilerleme/otomatik yeniden bağlanma yoktur. Botlar basit nesne inceleme davranışı kullanır; insan oyuncuların stratejik seviyesinde değildir. Sahne, fotoğraf varlıkları yerine ayrıntılı geometri ve üretilen malzeme dokularıyla oluşturulmuştur. WebGL 2 ve donanım hızlandırması gerekir. Yazı tipleri Google Fonts üzerinden yüklenir, çevrimdışıyken sistem yazı tipleri kullanılır.

## Kış bahçesi, sahte kopyalar ve görsel geri bildirim

Doğudaki eski giriş/vitrin odası artık oturma alanı, okuma sehpası, bank ve bitki bakım tezgâhıyla kış bahçesidir. Sabit mobilyaların çarpışma alanları sunucuyla ortaktır; rastgele eşyalar oda temasına göre üretilir.

Duvara asılı parçalar (tablo, perde, duvar rafı, sarkıt lamba) kılık olarak alındığında duvarda kalır: yana kaydırılabilir, yükseltilip indirilebilir ama düşmez. Sıradan eşyaların kaldırılabileceği en yüksek nokta 2,2 m'dir; zıplayan bir avcının göz hizası 2,8 m'ye ulaştığı için orada bırakılan nesne görülebilir kalır.

Saklananlar bir nesneyken ve yere basarken C veya ekrandaki Sahte kopya düğmesiyle bulundukları yerde aynı görünümde bir kopya bırakabilir; bu saklanma süresinde de yapılabilir, avın başlamasını beklemek gerekmez. Turda üç hak vardır; Q dönüşüm haklarından bağımsızdır. Kopyalar zaman aşımına uğramaz. Tek su isabetinde parçacık animasyonuyla kaybolur; asıl oyuncunun su miktarını değiştirmez. Kopyaya dönüşülemez, yeni tur tüm kopyaları temizler.

%100 ıslanan oyuncuda su halkası, yükselen siluet ve damla animasyonu oynar. Ses başlangıçta kapalıdır; bütün kurallar ve geri bildirimler görseldir. İstenirse menüden ses açılabilir.

Docker yapılandırması Node 24 Alpine, ayrıcalıksız kullanıcı, sağlık kontrolü ve 3000 portunu içerir. 3B görüntü oyuncunun tarayıcısında çizilir; Docker sunucusunda ekran kartı gerekmez. Bu geliştirme bilgisayarında Docker kurulu olmadığı için konteyner derleme/çalıştırma doğrulaması yapılamadı; yerel Node sunucusu ve Socket.IO testleriyle doğrulandı.
