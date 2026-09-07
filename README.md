# MOLA — Gözünün önündeyim

Gün ışığı alan, 28 × 36 metre büyüklüğündeki loftta nesnelere dönüşerek saklanma oyunu. Tarayıcıda 3D, gerçek zamanlı çok oyunculu; Node.js, Socket.IO, Three.js. Arayüz Türkçe.

Loft, ortadaki koridora kapı boşluklarıyla açılan beş temalı odadan oluşur: oturma odası, yatak odası, mutfak, çalışma köşesi ve giriş/vitrin. Her odanın kendi nesne kategorisi vardır — mutfakta kupa, tabure ve saksı; yatak odasında yastık, çamaşır sepeti ve valiz; çalışma köşesinde kitap yığını ve valiz. Her turda nesnelerin hem yeri hem türü yeniden karılır, aynı tur asla tekrarlanmaz. Mutfakta her turda mutlaka bir kütük yemek masası, oturma odasında mutlaka bir duvar tablosu bulunur; bunlar da saklanılabilir, yerleri değişir ama hiç ikilenmez. Küçük eşyalar tezgah, ada, masa ve bank üstünde de doğabilir. Oda kurucusu lobide toplam nesne sayısını da (20–90 arası) ayarlayabilir. Saklananlar tura odalara dağılmış olarak başlar.

## Başlat

```sh
npm ci
npm start
```

[Oyunu aç](http://localhost:3000). **Hemen oyna**, seçtiğin tarafta 3'e 3 botlu antrenman açar. Hazırım düğmesine basmadan süre başlamaz. **Kendi odanı kur** ile özel oda oluşturulur.

## Oda ayarları

- Takım başına 1–12 kişi: 1'e 1, 3'e 3, 5'e 5, 6'ya 6, 12'ye 12.
- Bot yok / boş yerleri doldur / iki takım için ayrı bot sayısı.
- 10–60 saniye saklanma; 1–10 dakika tur.
- Oyuncular takım seçebilir veya otomatik dağıtılır.
- Oda sahibi lobide bot ekler/çıkarır, insanları taşır, kapasite ve süreleri değiştirir.
- Tur, her iki tarafta en az bir kişi varsa başlar: takımların eşit olması gerekmez, 1'e 1 de olur. Takım başına seçilen sayı yalnızca üst sınırdır. Yeni turda takımlar yer değiştirir.
- Oda kodu 4 haneli bir sayıdır; davet bağlantısı kodu hazır getirir.
- Oda sahibi ayrılırsa yetki kalan bir insana geçer. Son insan ayrılınca oda silinir.

## Oynanış

**Saklanan:** Eşyaya yaklaş, E ile yakındaki nesneleri aç, ilk kılığını kendin seç — panel her nesnenin gerçek 3D önizlemesini gösterir. O nesnenin yerini alırsın. Yerini ayarla, **Z/X** ile nesnenin yönünü çevir, **Boşluk** ile zıpla ve F ile konumunu sabitle. Zıplama tezgah, ada, yemek masası, bank, yatak yüksekliğine kadar çıkar; puf, valiz, sepet ve kütük masa gibi geniş eşyaların üstüne de basabilirsin. Kupa ya da kitap yığını gibi küçük bir kılıktayken yemek masasının, çalışma masasının ve kütük masanın altına girebilirsin — büyük bir kılık oraya sığmaz. İlk seçim ücretsizdir; ardından Q ile **üç kez** o odaya uygun, farklı bir nesneye dönüşebilirsin. Değişimde konumun ve biriken su korunur. Bir kez ıslandıktan sonra kılığın sabitse çözülür ve avcının **iki katı** hızla kaçabilirsin. Henüz nesne seçmemiş insan oyuncu süre bitince otomatik dönüştürülmez; seçimini yapana kadar görünür ve ıslatılabilir.

**Avcı:** Sol fare tuşuna veya Boşluk'a basılı tutarak su sık. Doğru nişan ve görüş gerekir; duvarlar, mobilyalar ve öndeki nesneler suyu keser. **Sıradan bir eşyaya tek atış yeter:** ilk isabette tamamen ıslanır ve "gerçek eşya" olarak işaretlenir, üstüne depo boşaltmaya gerek yoktur. Saklanan bir oyuncu ise her isabette %10 ıslanır ve ancak %100'e ulaştığında açığa çıkıp elenir. Depo 25 atış alır; R ile 2 saniyede dolar.

Süre dolarsa saklananlar, tüm saklananlar bulunursa avcılar kazanır. Ölüm, can puanı, silahlı çatışma, kaçış görevleri veya yetenek kartları yoktur.

## Kontroller

| Kontrol | İşlev |
|---|---|
| WASD / oklar | Hareket |
| Fare | Bakış ve kamera (tur boyunca fare imleci oyuna kilitlenir) |
| E | İlk nesneyi seç (3D önizlemeli panel) |
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
