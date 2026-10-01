# BiMola

Arkadaşlarınla tarayıcıda buluşup çok oyunculu oyunlar oynayabileceğin bir oyun lobisi. Oyunlar: **Nesne Avı** (3D saklanma oyunu, sekiz harita ve botlar), **Ateş Köprüsü** (köprüde koşulan çok oyunculu bilgi yarışması), **Çengel Kapışması** (özel harf tepsileriyle ortak bulmaca tahtası) ve **Snake Showdown 3D** (çok oyunculu neon yılan arenası).

```sh
npm ci
npm start
```

[Lobi](http://localhost:3000) · [Nesne Avı](http://localhost:3000/games/prop-hunt/) · [Ateş Köprüsü](http://localhost:3000/games/ates-koprusu/) · [Çengel Kapışması](http://localhost:3000/games/cengel-kapismasi/) · [Snake Showdown 3D](http://localhost:3000/games/snake/)

Node.js 24 (Docker ile aynı sürüm) önerilir. Geliştirme: `npm run dev`. Doğrulama: `npm test`. Ek derleme adımı yok; ES modülleri kullanılır.

## Yapı

- `public/platform/`: oyun kataloğu, oda listesi, oda koduyla katılma, ortak oyuncu adı.
- `server/platform/`: oyun bağımsız oda yaşam döngüsü, bağlantı yönlendirme, yayın ve simülasyon zamanlayıcısı.
- `server/games/registry.js`: oyunların tanımları ve gerektiğinde yüklenen sunucu modülleri.
- `server/games/prop-hunt/`: Nesne Avı sunucu kuralları ve platform adaptörü.
- `public/games/prop-hunt/`: yalnızca bu oyunun ekranları, Three.js sahnesi, fizik yardımcıları ve varlıkları.
- `server/games/ates-koprusu/` + `public/games/ates-koprusu/`: Ateş Köprüsü kuralları, başlangıç soru seti (yalnız sunucuda), soru şeması/AI promptu ve köprü sahnesi.
- `server/games/snake/` + `public/games/snake/`: Snake oyun kuralları, oda adaptörü, 3B arena ve oyun ekranı. Oda kurabilir veya dört haneli kodla katılabilirsin; ilk oyuncu oda sahibidir. Oda üst sınırı 12 oyuncu (botlar dahil), ızgara üst sınırı 128×128 ve bot üst sınırı 11’dir.
- `server/games/cengel-kapismasi/` + `public/games/cengel-kapismasi/`: ortak çengel tahtası, özel beş harflik eller, TAC havuzundan hazırlanmış rastgele tahtalar ve 2D arayüz.

**Yeni oyun eklemek, lobiyi veya diğer oyunları değiştirmeyi gerektirmez.** Kendi istemci klasörünü ve sunucu adaptörünü ekleyip kataloğa kaydet. Çalışan iki farklı oyunla izolasyonu gösteren örnek test `test/platform.test.js` içindedir; test oyunu kullanıcı kataloğuna eklenmez.

[Kararlar, sözleşmeler ve yeni oyun ekleme rehberi](docs/ARCHITECTURE.md) · [Nesne Avı oynanış notları](docs/NESNE-AVI.md) · [Ateş Köprüsü planı ve durumu](docs/ATES-KOPRUSU-PLAN.md)

## Performans yaklaşımı

Lobi 3D motor, oyun simülasyonu veya Socket.IO istemcisi yüklemez. Oyun seçildiğinde ilgili sayfa açılır. Oyun değişimi belge düzeyinde olduğundan sahne, olay dinleyicileri ve oyun belleği eski sayfayla birlikte bırakılır. Nesne Avı ayrıca sayfadan çıkışta bağlantıyı, çizimi, ses bağlamını ve WebGL bağlamını kapatır.

Lobi oda listesini görünürken 15 saniyede bir yeniler; istekler üst üste binmez. Saklanma oyunu sunucuda 40 Hz simülasyon, en fazla 20 Hz düzenli durum yayını kullanır. Bekleme lobilerinde simülasyon/yayın döngüsü yoktur; değişiklikler hemen yayınlanır. Oylama yalnızca açıkken 4 Hz kontrol edilir. Sıra tabanlı oyunlar döngü açmadan sadece komutlarla çalışabilir.

İstemci girdileri ve düzenli durum paketleri bağlantıda birikmez; eski paketler atılabilir. Katılma, ayar değişikliği ve sonuç gibi kontrol mesajları normal güvenilir iletimi kullanır. Gizli bilgi filtrelemesi oyun adaptörüne aittir.

Lobi HTML + CSS + JS için **40 KiB sıkıştırılmamış kaynak bütçesi** testle korunur (görseller hariç). Bu bir FPS ya da eşzamanlı kullanıcı garantisi değildir. Gerçek cihaz ve dağıtım yük testleri ayrıca yapılmalıdır.

## Çalıştırma

```sh
# İsteğe bağlı kaynak sınırı; performans garantisi değildir.
MAX_ROOMS=64 PORT=3000 npm start

docker compose up --build -d
```

Docker ile başka bir servise yayımlarken kaynak dalı `main`, build context depo kökü (`.`) ve Dockerfile yolu kökteki `Dockerfile` olmalıdır. Son Dockerfile `server.js`, `server/` ve `public/` dizinlerini kopyalar. Günlükte `COPY server.js game.js ./` görünüyorsa servis eski committeki Dockerfile'ı veya servise ayrıca kaydedilmiş eski bir Dockerfile'ı kullanıyordur; yalnızca build önbelleğini temizlemek yanlış kaynak commitini düzeltmez. Önce servisin çektiği commit kimliğini GitHub `main` ile karşılaştırın, ardından doğru committen yeniden dağıtın.

Sağlık: `/health`. Katalog: `/api/games`. Katılınabilir odalar: `/api/rooms?gameId=prop-hunt`. Kod çözümleme: `/api/rooms/1234`. Eski `/?room=1234` davetleri de doğru oyuna yönlendirilir. Antrenman ve dolu odalar listelenmez.

Oda durumu bellekte ve tek sunucu sürecindedir; yeniden başlatmada kaybolur. **Ateş Köprüsü ve Çengel Kapışması puanları ise kalıcıdır:** toplam puan, maç rekoru, en uzun seri ve tamamlanan maçlar sunucudaki `data/` klasöründe saklanır. `BIMOLA_DATA_DIR` başka bir kayıt dizini seçer. Docker Compose bu klasörü `bimola-scores` adlı kalıcı volume'a bağlar. Başka bir yayın servisinde `/app/data` yoluna kalıcı disk bağlamak gerekir; yalnızca Docker imajını korumak puanları korumaz. Kayıt klasörü yedeklenmelidir; aynı deftere tek sunucu süreci yazmalıdır.

Oyuncu kimliği tarayıcıdaki HttpOnly çerezle tanınır; adı değiştirmek puanını sıfırlamaz. Çerezi silmek veya başka cihaz kullanmak yeni oyuncu oluşturur. Hesapla cihazlar arası taşıma, oda geri yükleme ve otomatik oturum kurtarma henüz yoktur. İnternet yayını HTTPS ve WebSocket destekli ters vekil gerektirir. Docker sunucusunda ekran kartı gerekmez; oyun görüntüsü oyuncunun tarayıcısında çizilir.

[Köprü arayüzü, joker kuralları ve kalıcı puan notları](docs/ATES-KOPRUSU-JOKERLER.md)

[Çengel Kapışması kuralları ve rastgele tahta mimarisi](docs/CENGEL-KAPISMASI.md) · [TAC havuzu ve içerik hazırlama](docs/CENGEL-TAC-HAVUZU.md)
