# Kör Atış

Blind Shot türündeki gizli hamle / eşzamanlı atış mekaniğinden esinlenen bağımsız BiMola oyunu. 1–8 insan oyuncu; toplam 8 koltuğa kadar 0–7 bot. Giriş: `/games/blind-shot/`.

## Kurallar ve maçlar

Oda sahibi haritayı, bot sayısını ve maç uzunluğunu (1, 3 veya 5 raund; varsayılan 3) bekleme lobisinde seçer. Maç en az iki insan/botla başlar. Her raundda herkes yeniden doğar; en fazla 12 gizli hamle oynanır. Her hamle için 12 saniye verilir. WASD / oklar ile yürü, fareyle kamera ve nişanı döndür; Space / Enter ile kilitle. Fare kilidi kullanılamazsa sürükleyerek bakılır. Her haritada ve yeni raund başında karakteri takip eden kamera / WASD modu açılır; çokgen sınırlar kameranın da arena içinde kalmasını sağlar. Üstten konum/nişan modları ve dokunmatik yön düğmeleri de vardır. Sunucu son kabul edilen taslağı kullanır. Kilitlenen seçim değişmez; herkes kilitlerse atışlar erken açılır.

Haritalar başlangıçta 1400 × 1100 birimlik zarf içine sığar: Dökümhane (kasalar ve kolonlar), Avlu (taş duvarlar ve geçitler), Depo (konteyner koridorları). Ek olarak Altıgen Kale ve Sekizgen İstasyon gerçek 6 / 8 kenarlı zemin ve sınırlar kullanır. Her atışın tekrarından sonra, sonraki hamleye geçerken kenarlar %10 içeri çekilir (alan %19 küçülür). Dışarıda kalan yaşayan oyuncular siperlere girmeden en yakın güvenli konuma taşınır; yeni alan içinde bütünüyle kalmayan siperler kaldırılır. Her raund başında arena ve siperler tam boyutuna döner. Turuncu sınır oynanabilir alanı, dış taraftaki turuncu zemin kapalı alanı gösterir. Siperler hareketi ve mermileri engeller; karakterler engellere çarpar ve kenarlarından kayarak yürür. Bir mermi en yakın siper veya oyuncuda durur. Bütün atışlar aynı konum fotoğrafından hesaplanır; vurulan da kendi atışını yapar. Tek isabet eler.

Hayatta kalınan her atış +1 puan, her isabet +3 puan, raund galibiyeti +5 puandır. Aynı atışta vurulup elenen oyuncu isabet puanını alır fakat hayatta kalma puanı alamaz. Herkes aynı anda elenirse raund galibi yoktur; isabet puanları korunur. 12 hamle sonunda birden fazla oyuncu yaşarsa her biri galibiyet bonusunu alır. Sonuçlar ve tekrar 6,2 saniye gösterilir. Raundlar arasında 5 saniyelik bekleme vardır. Çok raundlu maçın sonunda toplam puanı en yüksek olanlar kazanır; eşitlik ortak galibiyettir. Tek raund seçeneği raund kazananını esas alır. Puanlar bu maç içindir, kalıcı kaydedilmez.

## Görsel, ses ve tekrar

Renkli mermi izleri, ateş eden / hedef isimleri, turuncu isabet patlaması, kıvılcımlar ve karakter düşüşü atışı açıklar. Oyuncunun isabeti veya kendisini vuranlar sahnedeki uyarıda görünür. Adım sonuçları ve maç puanları yan panelde listelenir. Atış sonunda kazanılan puan sahnede görünür. Tüm raundlar tamamlanınca ekranın ortasında sıralama, hayatta kalma / isabet / galibiyet puanları ve toplamları gösterilir; tablo kapatılıp yeniden açılabilir. Son atışın isimli özeti sonraki gizli hamlede kalır; konum saklamaz.

Normal atış gösteriminden sonra kamera atış yolunu yakınlaştırır; 0,25× tekrar mermi uçuşunu ve düşüşü yeniden oynatır. Ağır çekim düğmesi tekrar başlatır veya atlar. Tekrar yalnız açık sonuçlarda bulunur ve yeni gizli hamlede durur. Azaltılmış hareket tercihi patlama ve düşüş hareketlerini atlar.

Ses düğmesi yerel Web Audio efektlerini açar/kapatır. Atış, isabet, sipere çarpma, kilitleme, son üç saniye ve raund sonucu farklı sesler kullanır. Sesler kullanıcı etkileşimiyle açılır; gizli sekmede çalmaz. Harici ses dosyası veya servis kullanılmaz.

Tam ekran düğmesi sahneyi, süreyi, kontrolleri ve masaüstünde yan paneli büyütür. Düğme / Esc ile çıkılır. Fullscreen API kullanılamazsa sahne pencereyi kaplar. Küçük ekranda yan panel gizlenir; isabet uyarısı ve hareket / kilitleme kontrolleri kalır.

## Mimari, botlar ve gizlilik

- `server/games/blind-shot/game.js`: seçim, isabet, puan, raund / hamle fazları ve özel durum paketleri.
- `server/games/blind-shot/adapter.js`: platform üyeliği, botlar, harita / raund ayarları ve komut yetkisi.
- `public/games/blind-shot/maps.js` ve `arena.js`: istemci / sunucu ortak harita tanımları, süpürülmüş çarpışma ve mermi kesişimleri.
- `scene3d.js`, `audio.js`, `fullscreen.js`, `results.js`, `controls.js`: oyun sayfasına özel görsel, ses ve giriş katmanları.

Gizli hamlede rakip konumları, açıları, başlangıçları ve önceki atış koordinatları paketten çıkarılır. Harita geometrisi ve puanlar açıktır. Tekrar sunucu sonuçlarını kullanır; isabet veya puan üretemez. Botlar gizli hamle başlamadan plan yapar; yalnız önceki açık sonuçtaki rakip konumlarını tahmin eder, siper sınırlarına uyar ve 1,5–4 saniye içinde kilitler.

Maç ve raund aralarında yeni katılım / ayar değişimi kapalıdır. Bekleme / maç sonu katılım açıktır; dolu bekleme odasında insan bir botu değiştirir. Oda sahibi yalnız insanlara devredilir. Son insan ayrılınca oda botlarla birlikte silinir. Aktif fazlarda ortak zamanlayıcı 50 ms kontrol / 200 ms yayın kullanır; bekleme ve maç sonunda çalışmaz. Sayfa kapanırken ses, çizim, soket, zamanlayıcı, WebGL ve geçici efekt kaynakları kapatılır.

## Doğrulama

`npm test`: platformun ve mevcut oyunların kontrolleri. Kör Atış testleri gizlilik, Socket.IO izolasyonu, kapasite, bot adaleti, hatalı hamleler, karşılıklı eleme, gerçek çokgen köşe ve eğimli kenarlar, her atışta daralma ve güvenli taşıma, siperden geçmeme, engel arkasında isabet olmaması, bütün haritalarda 2–8 güvenli başlangıç, bot maçları, puanların tek yazılması, raund yeniden doğması ve ev sahibi ayarlarını kapsar.

## Takımlar, özel kurallar ve yetenekler

Özel oda kuralları yalnız oda sahibi tarafından bekleme / maç sonu ekranında değişir. Mod: herkes tek veya 2 / 3 / 4 takım. Her takım için 1–4 oyuncu seçilir; toplam en fazla 8 koltuk. 2 takım için 2v2, 3v3, 4v4; ayrıca 2v2v2 veya 2v2v2v2 mümkündür. Seçilen takım büyüklükleri eşit ve tam dolmadan maç başlamaz. Botlarla eksik koltuklar tamamlanabilir. Turkuaz / Turuncu / Mor / Pembe takımları giriş formunda seçilebilir. Lobide maç öncesinde değiştirilebilir. Dolu insan takımına geçilemez; bot koltuğuna bir insan geçebilir. Botlar diğer boş koltuklara dengeli dağıtılır. Takım seçimi yapılmazsa en az dolu takıma atanır; maç başlatmak insan seçimlerini değiştirmez. Yaşayan takım üyeleri birbirlerinin konum ve nişanını görür; elenenlerin sonraki gizli hamlede takım konumları da kapalıdır. Dost mermisi arkadaşında durur, hasar / isabet puanı vermez. Son takım raundu kazanır; elenenler dahil takımın tüm üyeleri galibiyet bonusu alır. Hamle sınırında birden fazla takım yaşıyorsa bonus paylaşılır. Çok raundlu maç takım puan toplamıyla; tek raund raund sonucuyla değerlendirilir.

Hamle süresi 8 / 12 / 20 saniye, doğrusal daralma %5 / %10 / %15, raund sınırı 8 / 12 / 16 atış, siper miktarı normal / az / sıfır ve yeteneklerin açık / kapalı olması seçilebilir. Hayatta kalma puanı 1–5, isabet 1–10, raund galibiyeti 0–10 aralığında tam sayıdır. Varsayılanlar önceki kurallardır; ayarlar odaya özeldir.

Her oyuncu kalkanı ve siper kurmayı maçta birer kez kullanabilir. Seçim kilitlenene kadar değişebilir; süre dolunca son kabul edilen seçim uygulanır. Kullanım atış açılınca tüketilir; yeni raundda yenilenmez, yeni maçta sıfırlanır. Kalkan o atıştaki bütün düşman mermilerini emer; atıcıya isabet puanı verilmez. Siper 70 birim nişan yönüne 52×52×75 birimlik engel kurar. Kendi atışını da durdurur; sınır dışında kalınca veya raund sonunda kaldırılır. Plan sırasında yalnız kişinin kendi siper önizlemesi gösterilir. Siper bir karakterin üzerine kurulursa atıştan önce karakter güvenli zemine taşınır. Botlar takım arkadaşlarına nişan almaz; yetenekler insan oyuncunun seçimine bırakılmıştır.

Maç sonunda takım toplamları, bireysel puan dağılımı, atış / isabet sayısı, isabet oranı, raund içindeki en uzun hayatta kalma serisi, elenme / kalkanın emdiği mermi sayısı, en çok vurulan oyuncu ve her raundda kazanılan puanlar gösterilir. İstatistikler sunucuda hesaplanır; tekrar izlemek puan / istatistik üretmez.

Takım seçimi girişte ve lobide renkli kartlara tıklanarak yapılır. Seçili kart işaretlidir; insanlarla dolmuş takımın kartı kapalıdır. Kalkan / siper düğmeleri doğrudan arena görüntüsünün alt solunda yer alır; 1/1 hazır, seçili veya 0/1 kullanıldı durumunu gösterir. Yeniden tıklamak seçimi iptal eder. Q / E kısayollarıyla kamera kontrolünü bırakmadan seçilebilir. Yeteneğin hakkı atış açılınca tüketilir; kilitli veya elenmiş oyuncu değiştiremez.

## Harita rotasyonu ve takım kartları

İlk raund oda sahibinin seçtiği haritada başlar. Sonraki raundlar kalan haritaların rastgele karıştırılmış sırasını kullanır; 5 raundluk maçta beş harita birer kez oynanır. Harita atış veya tekrar sırasında değişmez, yeni raundda tam boyutuyla açılır. Raund geçmişi harita adını da gösterir. Yeni maç ilk harita tercihini koruyup sıralamayı yeniden karıştırır.

Lobide ve maçta takım seçimi / toplam puanı aynı renkli kartta gösterilir. Maç sırasında kart seçimi kapanır; puanlar güncellenir. Karakter kıyafeti, ayak halkası, sahnedeki isim etiketi, takım kartı ve oyuncu listelerindeki renk işareti aynı `TEAMS` renk tanımını kullanır. Emoji rengine bağlı işaretler kullanılmaz.
