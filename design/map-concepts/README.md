# MOLA — beş alternatif harita

8 Eylül 2026. **Uygulama güncellemesi:** Beş konsept artık oyunda seçilebilir 3D haritalara uyarlandı. Pazar, sera, arcade ve müze için kullanıcının Nano Banana görselleri; otel için Higgsfield görseli referans alındı. Orijinal üretim kayıtları `higgsfield-jobs.json` dosyasında korunur. Aşağıdaki metinler ilk tasarım hedefleridir; güncel oynanış ve seçim yolu ana README'dedir. Tüm haritalar 28 × 36 m sınır kullanır; müze iki rampayla ulaşılan üst galeri içerir.

## Ortak oyun dili

Aydınlık, gerçekçi malzeme ve gündelik eşya ölçeği. Her bağımsız görünen eşya — fincandan büyük mobilyaya kadar — seçilebilir envanterin parçası olur. Mimari zemin, taşıyıcı duvar ve dış çevre sabittir. Kupa, tabak, yastık gibi parçalar mobilyadan bağımsız seçilir; taşıyıcı mobilya hareket edince üzerindekileri taşır. Gerçekçilik ışık, yüzey ve oranlardan gelir; kalabalık eşya sayısından değil.

İlk nesne yakından seçilir; sonraki üç değişim bulunduğun bölgeye uygun rastgele nesnelerdir. Üç kalıcı sahte kopya, tek isabette görsel olarak dağılır. Mevcut isabet, yoğunluk, süre ve takım ayarları aynen kullanılır. Yeni yetenek veya sesle anlaşılması gereken mekanik eklenmez.

Her plan iki dolaşım halkası ve en az bir kısa bağlantı içerir. Ana geçitlerde yaklaşık 2,4 m açıklık hedeflenir; büyük kılıkların kapıları kapatması mevcut yerleşim denetimiyle önlenir. Eşya yoğunluğu geçitlerde değil, anlamlı kümelerde artırılır. 1v1 için çevre bölümleri kapatılabilen bir çekirdek; kalabalık takımlar için tüm alan düşünülür. Aşağıdaki ölçüler ilk prototip hedefidir; tur süresi ve kazanma oranlarıyla test edilecektir.

| Harita | Yaklaşık alan | Görsel kimlik | Temel strateji |
|---|---|---|---|
| Kıyı Pazarı | 28 × 30 m | Mavi tente, limon sarısı, ahşap kasalar | Tezgâhların arkasından halka değiştir |
| Çatı Serası | 26 × 32 m | Adaçayı yeşili, cam, sıcak ahşap | Camdan görünürken örtü arkasına geç |
| Son Jeton | 28 × 28 m | Kobalt, tereyağı sarısı, mercan | Tekrarlayan makinelerin düzenine karış |
| Minik Mucitler | 30 × 28 m | Krem terrazzo, renkli ahşap sergiler | Büyük sergiden küçük çalışma masasına geç |
| Bavul Molası | 28 × 32 m | Traverten, turkuaz kepenk, çizgili şemsiye | Avlu görüşünü servis rotasıyla kır |

## 1 — Kıyı Pazarı

**Mekân:** Sabah güneşinde, deniz kenarında üstü tenteli mahalle pazarı. Sebze tezgâhı, balıkçı, küçük kahve köşesi, kasa deposu ve dağıtım yolu. Arka plandaki deniz sınır dışıdır; oynanış karada kalır.

**Bağlantı:** Meydan → manav → kasa deposu → meydan. İkinci halka meydan → balıkçı → kahve terası → meydan. Manav ve balıkçı arkasındaki servis koridoru halkalar arası kısa yol.

**Kılık havuzu:** Terazi, meyve kasası, portakal, sepet, buz kutusu, tezgâh, tabure, kahve fincanı, sürahi, katlanır sandalye, büyük saksı. Büyük tezgâh güçlü örtü sunar ama yer değiştirdiğinde düzeni bozar; fincan gözden kaçar ama açık terasta kaçışı risklidir.

**Ayırt edici karar:** Meydandaki avcıya görünmemek için tezgâh altından dolanmak mı, kahve terasına sprint atmak mı? Kopyayı kasa kümesine bırakıp diğer halkaya geçmek işe yarar; açık meydan saklanma alanı değildir.

**Denge kontrolü:** Kasalar tam kapalı labirent oluşturmaz. Balıkçı ve kafe en az iki çıkış alır. Meydandan bütün saklanma kümeleri aynı anda görülemez. 1v1 çekirdek: meydan, manav, kafe.

**Görsel durum:** Kullanıcı Nano Banana referansını sağladı; proje içindeki `public/maps/references/` klasörüne alındı.

## 2 — Çatı Serası

**Mekân:** Şehir üzerinde bir bitki atölyesi. Cam sera, çiçek satış bölümü, saksılama atölyesi, çay köşesi ve açık bitki terası. Güneşli, botanik ve gerçekçi; dev fantastik bitkiler yok.

**Bağlantı:** Bitki terası → cam sera → saksılama atölyesi → teras. İkinci halka teras → çiçekçi → çay köşesi → teras. Atölye ile çiçekçi arasında raf arkasından kısa geçiş.

**Kılık havuzu:** Fide tepsisi, sulama kabı, toprak çuvalı, eldiven, bahçe taburesi, budama makası, uzun saksı, bitki arabası, ahşap tezgâh, çay bardağı. İnce yaprak dokusu görsel örtü sağlar; isabet gövdesi bütün yaprakları dev bir kutu saymaz.

**Ayırt edici karar:** Avcı camın arkasından hareketi görür ama oraya ulaşmak için kapıya gitmelidir. Saklanan, avcı rota değiştirirken iki farklı kapıdan çıkabilir. Cam kurşun/su geçirgenliği görselinden anlaşılacak şekilde tek tip uygulanır: kapalı cam suyu durdurur.

**Denge kontrolü:** Yapraklar tamamen görünmez saklanma noktası yaratmaz. Rafların arkasında erişilemeyen boşluk bırakılmaz. Çatı çevresinde düşme veya harita dışına kaçış olmaz. 1v1 çekirdek: teras, sera, atölye.

**Görsel durum:** Kullanıcı Nano Banana referansını sağladı; proje içindeki `public/maps/references/` klasörüne alındı.

## 3 — Son Jeton

**Mekân:** Geniş pencereli 90'lar oyun salonu ve bitişik çamaşırhane. Arcade makineleri, langırt/bilardo köşesi, atıştırmalık tezgâhı, bakım odası. Renkli ama gündüz aydınlığı baskın; karanlık neon atmosferi yok.

**Bağlantı:** Atıştırmalık merkezi → arcade sıraları → bakım odası → merkez. Diğer halka merkez → bilardo → çamaşırhane → merkez. Bakım odası ile çamaşırhane arasında servis kapısı.

**Kılık havuzu:** Arcade makinesi, langırt, bilardo taburesi, çamaşır makinesi, sepet, deterjan kutusu, katlı havlu, bardak, tepsi, servis masası. Makinelerin ayrık kolları/ekranları gereksiz seçim karmaşası yaratmaz; makine tek işlevsel eşya, üzerindeki bardak bağımsız eşyadır.

**Ayırt edici karar:** Aynı model makineler arasında düzeni bozmadan kalmak, küçük sepetle bir sonraki sıraya kaçmak veya kopyayı mevcut sıranın ucuna bırakmak. Ekran animasyonları rastgele oyuncu kimliğini belli etmez.

**Denge kontrolü:** Makine sıralarının iki ucu açık. Tekrarlar ezber gerektirir ama her köşe aynı görünmez; renkli duvarlar yön buldurur. Hiçbir mekanik ses gerektirmez. 1v1 çekirdek: arcade, merkez, çamaşırhane.

**Görsel durum:** Kullanıcı Nano Banana referansını sağladı; proje içindeki `public/maps/references/` klasörüne alındı.

## 4 — Minik Mucitler

**Mekân:** Ziyaret saati bitmiş, güneş alan bilim müzesi. Ahşap mekanik güneş sistemi çevresinde deney masaları, el işi stüdyosu, robot tezgâhı, küçük planetarium köşesi ve hediyelik dükkânı. Gerçek müze ölçeği; oyuncu karakterleri için minyatür dünya değil.

**Bağlantı:** Ana sergi → deney galerisi → robot atölyesi → ana sergi. İkinci halka ana sergi → el işi stüdyosu → hediyelik → ana sergi. Planetarium, iki galeriyi bağlayan yarı açık kısa geçiş.

**Kılık havuzu:** Ahşap gezegen modeli, masa lambası, deney standı, model robot, fırça kavanozu, boya kutusu, sandalye, çalışma masası, paket oyuncak, defter. Sergi parçaları taşınabilir bağımsız nesneler halinde modellenir; taşıyıcı bina parçaları seçilmez.

**Ayırt edici karar:** Büyük sergi gövdesine dönüşerek göz önünde durmak mı, çalışma masalarının üzerindeki küçük parçalara karışmak mı? Üç kopya aynı çalışma masasında makul bir düzen kurabilir; rastgele dağınıklık şüphe çeker.

**Denge kontrolü:** Tavana asılı erişilemez kılıklar yok; hedeflenebilir yükseklik sınırı. Yan galerilerde uzun kör sokak yok. Dekoratif deneyler oyuncuyu fiziksel olarak fırlatmaz. 1v1 çekirdek: ana sergi, deney galerisi, robot atölyesi.

**Görsel durum:** Kullanıcı Nano Banana referansını sağladı; proje içindeki `public/maps/references/` klasörüne alındı.

## 5 — Bavul Molası

**Mekân:** Akdeniz butik otelinin resepsiyonu, bagaj alanı, oturma salonu, kahvaltı büfesi ve havuzlu avlusu. Krem taş, turkuaz doğrama, mercan çizgili şemsiyeler. Sabah ışığı ve kullanılmış ama bakımlı gerçek eşya dokuları.

![Higgsfield — Bavul Molası konsepti](https://d8j0ntlcm91z4.cloudfront.net/user_3J0lDA8J7xCSdkM1Z0khz8Ftn6f/hf_20260908_115528_fabdda52-799e-4919-9b01-0cf336da0a86.png)

**Bağlantı:** Avlu → resepsiyon → bagaj → salon → avlu. İkinci halka avlu → kahvaltı → servis odası → salon → avlu. Resepsiyondan kahvaltıya geniş kısa bağlantı. Dekoratif havuz sığ ve geçilebilir tasarlanır; yüzme, boğulma veya yeni su kuralı yok.

**Kılık havuzu:** Valiz, bagaj arabası, resepsiyon zili, laptop, kanepe, minder, büyük saksı, kahve makinesi, tabak, fincan, büfe masası, havlu, şezlong ve güneş şemsiyesi.

**Ayırt edici karar:** Avluyu hızla geçmek görünürlük riski taşır; servis rotası daha örtülü ama uzundur. Valiz kopyasını bagaj sırasına bırakıp kahvaltı eşyasına geçmek odalar arası davranış farkından yararlanır.

**Denge kontrolü:** Şemsiye ve bagaj arabaları tüm koridoru tıkamaz. Havuz kenarında erişilemez alt yüzey yok. Render atmosfer referansıdır; kapı ölçüleri ve bağlantılar yukarıdaki oynanış planına göre kurulur. 1v1 çekirdek: resepsiyon, salon, bagaj.

**Görsel durum:** Higgsfield `nano_banana_2`, 2752 × 1536, tamamlandı. İş: `fabdda52-799e-4919-9b01-0cf336da0a86`.

## Uygulama sırası

İlk prototip için **Bavul Molası** önerilir: mevcut evin mobilya ve mutfak envanterinin çoğu yeniden kullanılabilir, avlu da bugünkü koridor ağırlıklı düzenden farklı bir oyun sunar. Önce basit geometrili iki halka kurulur; 1v1 ve 6v6 yürüyüş, hedeflenebilirlik ve büyük eşya geçişi test edilir. Sonra gerçekçi modeller, malzemeler ve ışık eklenir. Diğer haritalar aynı ortak envanter/çarpışma sistemini kullanır.
