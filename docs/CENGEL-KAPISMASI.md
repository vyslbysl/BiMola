# Çengel Kapışması

Ortak tahtada oynanan çengel oyunu. Sorular kutuların içindedir; oklar cevap yönünü gösterir. **AI promptu ve JSON yükleme kaldırılmıştır.** Her oda ve rövanşta hazırlanmış havuzdan rastgele tahta seçilir.

## Oyun akışı

Oda aç veya kodla katıl, Hazırım de. Tek kişiysen Mola Botu rakibindir. Bütün gerçek oyuncular hazır olduğunda maç başlar. Hazırlıkta oda sahibi Yeni rastgele tahta düğmesiyle başka tahta seçebilir; herkesin hazırlığı sıfırlanır. Aktif maçta tahta değişmez.

Tahta boyutu otomatik, 9×9 veya 11×11 olabilir. Otomatik boyutta beş gerçek oyuncuya ulaşılan hazırlık odası 11×11 olur; hazır işaretleri sıfırlanır. Aktif tahta maç sırasında büyümez. Maç sonunda herkes yeniden hazır olduğunda yeni tahta gelir; otomatik boyut mevcut oyuncu sayısına göre tekrar değerlendirilir.

Havuz 512 farklı tahta içerir: 272 adet 9×9, 240 adet 11×11. Her boyutun havuzu karıştırılıp sırayla tüketilir. Odanın son 32 tahtası seçim dışında tutulur; havuz yeniden karıştırıldığında da yakın tekrar önlenir. Havuz sonludur; bütün oyun geçmişinde sonsuza kadar benzersizlik garantisi yoktur.

## İçerik üretimi ve yayın

Kaynak, kullanıcının indirdiği TAC cevap–ipucu veri setidir. Ham verinin tamamı yerelde saklanır. `scripts/build-cengel-pool.mjs` kısa, kontrol karakteri içermeyen ipuçlarını seçer; kısa cevaplarda `ht` kaynak grubunu tercih eder. `scripts/generate-cengel-pool.py` kesişim kısıtları, aday kümelerini daraltma ve geri izlemeyle tahtalar üretir. 9×9 ve 11×11 şablonların transpozeleri de kullanılır.

Her tahta `validatePuzzle` denetiminden geçer: çakışma, taşma, soru/harf örtüşmesi, ipucusuz dizi, boş kutu, kopuk bölge ve tekrarlanan cevap reddedilir. JSON otomatik kodlanır; tırnaklı ipuçları korunur. Geometri doğrulaması bilgi doğruluğunu kanıtlamaz; içerik incelemesi ayrıca yapılabilir.

Paket `server/games/cengel-kapismasi/pools/boards.json.gz` içindedir. Docker'ın mevcut `COPY server ./server` adımı bunu da taşır. Yayında TAC indirmek, Python veya AI çalıştırmak gerekmez. Paket kalıcı puan diski `data/` altında değildir; boş bir kalıcı disk onu gizlemez.

Yeniden üretmek için Python 3 ve yerel TAC JSON dosyaları gerekir:

```sh
npm run cengel:build-pool
```

`PYTHON` Python yürütücüsünü; `CENGEL_POOL_COUNT` tahta sayısını seçer. Üretim geliştirme aşamasında yapılır. Eski AI/prompt dokümanı arşiv olarak korunmuştur.

## Harfler ve puanlar

- Özel el en fazla beş harftir. Her harfin kalan tahtada ayrı bir boş karşılığı vardır. Beşten az kutu kalınca görünür el küçülür; yinelenen harfler kalan aynı harflerin sayısını aşamaz. Rakip bir harfin son kutusunu doldurursa o harf elden çıkarılır, yerine yeni harf çekilmez; diğer geçerli konumlar ve el sürümü değişmez. Tahta tamamlandığında eller boşalır.
- Harfleri sürükle veya seçip kutuya dokun. Taslağı değiştirebilir, Geri al ile temizleyebilirsin. Onayla sıfır, bir veya beş harflik hamleyi kabul eder.
- Doğru harf kilitlenir ve +1 puan getirir. Yanlış harf −1 puan getirir; harf elde, kutu boş kalır. Son harfi koyan ayrıca kelimenin uzunluğu kadar bonus puan alır. İki kelime tamamlanırsa ikisi de puan getirir.
- Beş el konumunun her birinden doğru harf kullanmak +5 bonus getirir. İlerleme El bonusu sayacındadır; aynı konumu tekrar kullanmak sayacı ikinci kez ilerletmez. Bonusla sayaç sıfırlanır.
- Onaylanan harfler teker teker gösterilir: doğru yeşil tik, yanlış kırmızı çarpı ve −1. Sonra rakip/bot harfleri sırayla uçar. Kelime ve Beşte beş kutlaması en sondadır. Gösterim sırasında yeni onay kapalıdır; hareket azaltma tercihinde uçuş gösterilmez.
- Tur süresi 15/30/45/60 saniyedir; varsayılan 30 saniye. Her oyuncu turda bir kez onaylar. Herkes onaylayınca veya süre dolunca yeni tur açılır; maç yalnızca tahta dolunca biter. Onaylanmamış taslaklar süre sonunda silinir. Yeni harfler tur sonunda gelir; doğru harf koymayanın eli aynen korunur. Tur ortasında rakip onayı diğer oyuncunun elini veya el sürümünü değiştirmez. En yüksek puan kazanır; eşitlik beraberliktir. Eksik cevaplar sonuçta açılır.
- Aktif maçta yeni oyuncu katılmaz. Sahip ayrılırsa sıradaki gerçek oyuncu sahip olur. Son hazırlıksız oyuncu ayrıldığında kalanlar hazırsa maç başlar.

Sunucu bütün taslağı önce doğrular. Rakibin doldurduğu kutu, eski tahta veya değişmiş el puan kesmeden reddedilir. Onay kimliği ve el sürümü tekrar gönderilen hamlenin ikinci kez puanlanmasını önler. HTTP'de randomUUID bulunmasa da onay anahtarı üretilebilir.

## Bot, yerleşim ve performans

Mola Botu her turda kabul edilen insan onayından sonra 1–2 doğru kutu doldurur. İnsan onaylamazsa tur süresi dolduğunda bot bir kez oynar. Yanlış/boş onay da bot sırasını başlatır; reddedilen veya tekrar gönderilmiş onay başlatmaz. Hazırlıkta ikinci insan gelirse bot kaldırılır. Aktif çok oyunculu maçta ayrılma yeni bot eklemez. Botun puanları kalıcı sıralamaya girmez.

Tahta geniş ekranda yüksekliğin kullanılabilir tamamına yayılır; harfler, Onayla ve seçili ipucu sağ sütundadır. Mobilde tahta ekran genişliğine sığar, el ve Onayla hemen altındadır. Tahtanın içinde kaydırma yoktur; büyüteç kaldırılmıştır. Uzun ipucunun tamamı seçili ipucu panelinde okunur. Tüm ipuçları açılır listede tutulur.

Canlı oyun CSS grid ve DOM kullanır. Üretim motoru canlı sunucuda veya tarayıcıda çalışmaz. Paket ilk yüklemede bir kez doğrulanır; oda ve rövanşta yalnızca hazırlanmış tahta kopyalanır. Bekleme odaları tick işlemez; aktif maçta süre kontrolü 250 ms, olağan durum yayını bir saniyedir. En fazla 12 gerçek oyuncu desteklenir.

Tarayıcıya tüm banka/havuz veya boş kutuların cevapları gönderilmez. Yalnızca oynanan tahtanın soruları, doldurulmuş kutuları ve oyuncunun kendi eli gönderilir. Havuz `public/` altında değildir. `upload` soket komutu kaldırılmıştır.

## Kalıcı puanlar

Çengel puanları ortak defterde `cengel-kapismasi` için tutulur. Kimlik anonim HttpOnly çerezine bağlıdır. Negatif puanlar ve maç bitişleri korunur; bot kayıtları üretilmez.

Yayında `/app/data` kalıcı ve yazılabilir diske bağlanmalıdır. Aktif odalar yeniden başlatmada kapanır; kalıcı olan puan defteridir. Rastgele tahta paketi sunucu dosyalarıyla gelir ve puan diskinden bağımsızdır.
