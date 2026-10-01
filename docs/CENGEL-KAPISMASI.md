# Çengel Kapışması

BiMola’nın ortak tahtada oynanan çengel oyunu. **Sorular doğrudan ızgara kutularının içindedir.** Oklar cevabın sağa mı aşağıya mı yazılacağını gösterir. Bir kutuda biri sağa biri aşağıya giden iki soru bulunabilir. Bütün alan soru ve cevap kutularıyla dolar; en fazla tek bir nötr köşe vardır. Seyrek çapraz bulmaca değildir.

## İçerik hazırlama

1. Oda kur veya koda katıl. **Yeni bulmaca hazırla** düğmesine bas.
2. Kategoriyi yaz. Oyuncu sayısına göre boyut önerisi gelir: 1–3 kişi 9×9, 4–6 kişi 11×11, 7–9 kişi 13×13, 10–12 kişi 15×15. Satır ve sütun birbirinden bağımsız 7–21 arasında ayarlanabilir. Tahta maç sırasında büyümez.
3. **Promptu kopyala**. Uygulama kategori/boyutu sabit talimata otomatik ekler. AI API anahtarı ve uygulamanın otomatik ücretli AI çağrısı yoktur.
4. AI yanıtını yapıştır, **Tahtayı kontrol et**. Önizlemede soru kutuları, oklar ve doğru harfler görünür.
5. İpuçlarını önizlemede düzenleyebilirsin. Cevap/koordinat değişiklikleri JSON'da yapılır ve yeniden denetlenir.
6. Geçerli çıktıda **Bu tahtayı odaya yükle**. Her oyuncu yükleyebilir. Yükleme herkesin hazırlığını sıfırlar; aktif maçta tahta değişmez.
7. Herkes hazır olduğunda maç başlar.

Hatalı çıktıda yükleme açılmaz. **Düzeltme metnini kopyala**, mevcut JSON ve geometrik hata ile AI’ya yeniden ver. Yerleşim doğruluğu AI’ya bırakılmaz: önizleme ve sunucu aynı doğrulayıcıyı kullanır. Bilgilerin doğruluğunu yükleyen kişi kontrol eder; geometrik denetim bilimsel/tarihsel doğruluğu kanıtlamaz.

Gömülü başlangıç tahtası **9×7, 24 soru, 42 harf kutusu, 20 soru kutusu ve bir nötr köşe** içerir. Kullanıcının paylaştığı dolu çengel örneğine göre hazırlanmış, aynı doğrulayıcıyla kontrol edilmiş bir başlangıç içeriğidir. İlk maç için AI çıktısı almak gerekmez.

## JSON sözleşmesi — version 2

```json
{
  "version": 2,
  "title": "Bulmaca başlığı",
  "category": "Genel kültür",
  "rows": 9,
  "cols": 7,
  "blankCells": [{"row":0,"col":0}],
  "entries": [
    {"clue":"Kısa ipucu","answer":"CEVAP","row":0,"col":1,"direction":"down"}
  ]
}
```

Bu yalnızca sözleşme örneğidir; tek soru tam tahta değildir ve doğrulayıcıdan geçmez. Tam çalışan örnek `public/games/cengel-kapismasi/starter.js` içindedir.

- Koordinatlar sıfırdan başlar. **row/col SORU KUTUSUNUN yeridir**, ilk harfin yeri değildir.
- `across` cevap soru kutusunun hemen sağında; `down` hemen altında başlar.
- Aynı soru kutusu iki ayrı entry ile sağa/aşağıya iki soru taşıyabilir. Aynı yönde iki soru olamaz.
- Her kutu bir soru veya harf olmalıdır. Dolgu ve kullanılmayan iç kutular reddedilir. `blankCells` yalnızca en fazla tek bir nötr köşeyi tanımlar; hiç yoksa `[]` olur.
- Sorularla harf kutuları çakışamaz. Kesişen harfler aynı olmak zorundadır; aynı yönde cevaplar üst üste gelemez, tahta dışına taşamaz.
- Kesintisiz her 2+ harflik yatay/dikey dizi tek bir tam cevaba ait olmalıdır ve kendi soru kutusundan başlamalıdır.
- Tek harfli semboller, kısaltmalar ve harf soruları geçerlidir. Cevap 1–21 Türkçe harf, boşluksuz/noktalamasızdır. I ve İ ayrıdır. Türkçe büyük harfe dönüşüm ve NFC normalizasyonu uygulanır.
- Başlık/kategori 1–100 karakter. İpuçları 3–100 karakter; kutuya sığması için 15–45 karakter hedeflenir. 2–160 soru; tekrar cevap yoktur.
- `cells`, `clueCells` ve cevap başlangıçları uygulama tarafından hesaplanır. AI'nın hücre haritasına güvenilmez.
- Toplam en fazla 24.000 karakter, 800 karakterlik en fazla 30 parça. Platformun 4 KiB paket sınırı korunur. Eksik, sırasız, eski ve eşzamanlı çakışan yüklemeler tahtayı değiştiremez.
- Eski version 1 seyrek tahta formatı kabul edilmez; yeni sabit promptla içerik yenilenmelidir.

Sabit talimat `public/games/cengel-kapismasi/puzzle.js` içindeki `buildPrompt(category, rows, cols)` işlevidir. [Kopyalanabilir örnek prompt](CENGEL-AI-PROMPT.md).

## Oynanış

- 1–12 oyuncu, aynı ortak tahta, herkesin özel beş harflik tepsisi.
- Soru kutusuna dokununca tam ipucu ve cevap yönü gösterilir. Harfler boş cevap kutularına sürüklenir; seçip kutuya dokunmak da mümkündür. Önce taslak oluşturulur; hamle ancak **Onayla** ile sunucuya gider. Bir, beş veya sıfır harflik hamle onaylanabilir. Taslak harfler taşınabilir, eline geri alınabilir; **Geri al** hepsini geri getirir.
- Onaydan sonra doğru harf kilitlenir; kullanılan konumların yeni harfleri toplu değerlendirme sonunda gelir. Yanlış harf **−1 puan**; harf elde, kutu boş kalır.
- Kelimenin son harfini koyan **kelimenin uzunluğu kadar puan** alır. Bir kesişimde iki kelime tamamlanırsa ikisi de puan getirir. Her kelime bir kez puanlanır. Kelimeyi henüz tamamlamayan doğru harf kendi başına puan getirmez.
- Beş tepsi konumunun her birinden doğru harf kullanınca **+5 bonus**. Konum işaretlenir, yerine gelen yeni harf kullanılabilir ama aynı konum sayacı ikinci kez ilerletmez. Beş konum tamamlanınca sayaç yenilenir. Bu kural anında yenilemeyle beş harfi tüketme bonusunu birlikte sağlar.
- Harfler yalnızca tahtadaki henüz boş cevap kutularından dağıtılır. Bir harfin tahtada yeri kalmadığında o harf ücretsiz otomatik yenilenir; bonus ilerlemez.
- Aynı kutuya yarışta ilk doğru hamle kabul edilir. Dolu/kapalı kutu, eski tahta veya değişmiş tepsi nedeniyle reddedilen hamle puan ve harf tüketmez.
- Sunucu bütün taslağı önce denetler. Bir kutu rakip tarafından doldurulmuşsa veya el değişmişse hamlenin tamamı puan/harf tüketmeden reddedilir. Kabul edilen hamlede her yanlış harf ayrı −1 getirir. Benzersiz onay kimliği ve el sürümü tekrar gönderilen hamlenin ikinci kez puanlanmasını önler. Boş onay puan/harf değiştirmez. Oyuncu başına 250 ms onay aralığı vardır.
- Süre 2/3/5/10 dakika. Tahta dolunca veya süre bitince maç biter. En yüksek puan kazanır; eşitlik beraberliktir. Eksik cevaplar sonuçta açılır.
- Aktif maçta yeni oyuncu katılmaz. Oda sahibi çıkarsa sıradaki oyuncu sahipliği alır. Yeniden hazırlıkla aynı tahta oynanabilir veya yeni tahta yüklenebilir.
- 1–5 tuşları eldeki harfi seçer; Escape seçimi kaldırır. Soru/cevap kutuları klavyeyle de seçilebilir.

## Performans ve kayıtlar

CSS grid ve DOM kutuları kullanılır; Three.js/WebGL veya fizik motoru yoktur. Sunucu modülü yalnızca oyuna girilince yüklenir. Bekleme odaları tick işlemez. Aktif maçta süre kontrolü 250 ms; olağan durum yayını bir saniye, kabul edilen hamleler anında paylaşılır. Tahta en fazla 21×21, soru sayısı 160, oyuncu sayısı 12 ile sınırlıdır. Daha büyük odalar için ayrıca yük testi gerekir.

Büyük kareler korunur; tahta ekranın kalan alanına göre kendi içinde kayar. Harf tepsisi ve Onayla düğmesi görünür alanın altında ayrı bir bölümde kalır; kutuları kapatmaz. Kutu boyutu ayarlanabilir. Harf tepsisi tahtanın altında durur ve kutuların üzerine binmez. Mobilde ek oyuncu/ipucu listesi isteğe bağlı açılır. Soruların tam metni seçilen ipucu alanında da görünür. Her oyuncuya yalnızca kendi eli gönderilir; boş kutuların cevapları maç sonuna kadar gönderilmez. İçeriği hazırlayan kişi AI JSON'unda cevapları zaten görür; arkadaşlarla özel içerik akışının doğal sınırıdır.

Puanlar mevcut ortak defterde **cengel-kapismasi** için ayrı tutulur. Negatif puanlar, doğru harfler ve biten maçlar kaydedilir. Komutla üretilen puan olayları anında alınır; son hamlenin puanı kaybolmaz. Kimlik aynı tarayıcıdaki anonim HttpOnly çerezine bağlıdır; hesap/cihazlar arası taşıma yoktur.

Yayında `/app/data` kalıcı ve yazılabilir diske bağlanmalıdır. Compose named volume ayarı bu oyunu da kapsar. Aktif odalar ve yüklenmiş tahtalar bellektedir; yeniden başlatmada kapanır. Kalıcı olan puan defteridir. Dosya deposu tek sunucu süreci içindir.

## Dosyalar

- `public/games/cengel-kapismasi/puzzle.js`: version 2 sözleşmesi, sabit prompt ve geometrik denetim.
- `public/games/cengel-kapismasi/starter.js`: dolu başlangıç tahtası.
- `server/games/cengel-kapismasi/game.js`: harfler, yetkili hamleler, puanlar ve maç.
- `server/games/cengel-kapismasi/adapter.js`: platform bağlantısı.
- `public/games/cengel-kapismasi/`: mobil arayüz, soru kutuları, oklar ve önizleme.
- `test/cengel-kapismasi.test.js`: doluluk, kesişimler, iki sorulu kutular, özel eller, eksi puan, çakışan hamleler, bonus, çift kelime, süre, atomik yükleme ve iki gerçek Socket.IO istemcisiyle puan kaydı.

### Tahta yerleşimi ve kelime kutlaması

Tahtanın tamamı kullanılabilir ekran alanına otomatik sığar; oyun tahtasında yatay veya dikey kaydırma yoktur. Harf eli ve Onayla düğmesi görünür kalır. Küçük kutulardaki soruya dokununca tam ipucu tahtanın altında gösterilir.

Sunucunun doğruladığı yeni tamamlanan kelimelerin harfleri sırayla parlar. Oyuncunun kendi tamamladığı kelimede kısa bir konfeti, kelime ve kazanılan kelime puanı gösterilir; aynı hamlede iki kelime için Çifte Kelime kutlaması vardır. Efekt kontrolleri engellemez ve 1,7 saniyede kaldırılır. Hareket azaltma tercihi açıksa animasyon yerine sabit bildirim kullanılır.

### Tek oyuncu ve Mola Botu

Tek gerçek oyuncu olan hazırlık odasına Mola Botu otomatik eklenir. Gerçek oyuncu Hazırım dediğinde botu beklemeden maç başlar. Hazırlıkta ikinci bir insan gelirse bot kaldırılır; oda tekrar tek kişiye düşerse bot geri gelir. Aktif çok oyunculu maçtan birinin ayrılması maç ortasında yeni bot eklemez.

Bot, yalnızca kabul edilen insan onayından sonra kendi beş harflik elindeki harflerle 1–2 doğru boş kutu doldurur. Yanlış harf veya boş onay da botun bir sırasını tetikler; reddedilen hamle ve aynı onayın tekrar gönderilmesi tetiklemez. İnsan tahtayı bitirmişse bot oynamaz. Bot kelime ve beş konum bonusunu aynı kurallarla kazanır. Botun eli istemciye gönderilmez; yalnızca görünür harfleri ve puanı paylaşılır. Kalıcı puan olayları bot için üretilmez. Bot kendi kendine çalışan döngü veya AI çağrısı açmaz. Son insan ayrıldığında oda ve bot temizlenir.

### Büyüteç, el bonusu ve rakip harfleri

Tahta üstündeki Büyüteç, seçili kelimenin çevresini 5×5 kutuluk yakın görünümde gösterir. Uzun kelimelerde Önceki/Sonraki düğmeleri kullanılır; Tüm tahta düğmesi normal görünüme döner. Kaydırma açılmaz; yakın görünümde de aynı kutu koordinatlarına sürükleme ve onay yapılır.

Sunucunun doğruladığı beş harf bonusu “Beşte beş!” ateş ve konfeti kutlamasını açar. Aynı hamlede tamamlanan kelimelerin puanları kutlamaya dahil edilir; +5 el bonusu ayrıca belirtilir. Yanlış ve yalnızca taslak yerleştirmeler bonus kutlaması üretmez.

Rakip ve bot tarafından yeni doldurulan görünür kutulara harfler oyuncunun puan kartından kısa bir yay çizerek uçar. Her kutu yalnızca ilk dolduğunda animasyon alır; gizli yakın görünüm kutuları için uçuş üretilmez. Efektler oyunun durumunu veya onayını geciktirmez; tamamlanınca, oda/tahta/görünüm değişince veya bağlantı kesilince temizlenir. Hareket azaltma tercihinde uçuş gösterilmez.

Onay ve yükleme anahtarları güvenli bağlantı gerektiren crypto.randomUUID bulunmadığında da üretilebilir. Onay hazırlığındaki hatalar dahil bütün hata yolları bekleme durumunu kapatır; normal HTTP yayınında Onaylanıyor durumunda takılma engellenir.
