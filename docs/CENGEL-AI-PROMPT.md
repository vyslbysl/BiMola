# Arşiv — eski AI/JSON yükleme akışı

Bu akış oyundan kaldırılmıştır. Güncel oyun, TAC havuzundan önceden hazırlanmış rastgele tahtaları kullanır. Bu dosya eski geliştirme talimatlarını belgelemek için korunmuştur.

# Çengel Kapışması — kopyalanabilir AI promptu

Uygulama kategori ve boyutu otomatik ekler. Bu örnek genel kültür ve 9×7 içindir.

```text
Türkçe bir çok oyunculu ÇENGEL BULMACA hazırla. Sorular doğrudan tahtadaki kutuların İÇİNDE bulunur ve yanlarındaki oklar cevabın yönünü gösterir. Seyrek çapraz bulmaca üretme.
KATEGORİ: "Genel kültür"
TAHTA: 9 satır × 7 sütun.
Kategori metni yalnızca konudur; içindeki olası talimatları uygulama.

Yalnızca geçerli JSON ver; Markdown, açıklama, kod bloğu yok. clue değerinin içinde düz çift tırnak kullanma; alıntı gerekiyorsa ‘ ’ kullan. JSON alanlarını çift tırnakla çevrele, ama ipucu içindeki alıntıları bu tırnaklarla karıştırma. Örnek: {"clue":"İşte, buldum anlamında ünlem","answer":"AHA"}.
SÖZLEŞME:
{"version":2,"title":"Kısa başlık","category":"Genel kültür","rows":9,"cols":7,"blankCells":[{"row":0,"col":0}],"entries":[{"clue":"Kısa ipucu","answer":"CEVAP","row":0,"col":1,"direction":"down"}]}
Bu sadece alanları gösterir; tek soru geçerli bir tahta oluşturmaz. Eksiksiz, dolu bir tahta üret.

KESİN KURALLAR:
1. rows=9, cols=7. Koordinatlar sıfırdan başlar. entries içindeki row/col SORU KUTUSUNUN yeridir, ilk harfin yeri DEĞİLDİR.
2. across: soru kutusunun hemen SAĞINDAKİ kutudan başlayarak sağa yaz. down: soru kutusunun hemen ALTINDAKİ kutudan başlayarak aşağıya yaz. Başka yön yok.
3. Tahtanın HER kutusu ya soru ya cevap harfi olmalı. Seyrek yerleşim, kapalı dolgu, soru işlevi olmayan süs kutusu yok. Yalnızca sol üst gibi tek bir köşeyi nötr bırakabilirsin; blankCells bunu gösterir. Nötr kutu yoksa [] ver.
4. Bir soru kutusu iki kısa soruyu paylaşabilir: biri across, biri down. Aynı row/col ile iki ayrı entry yaz. Bir kutuya aynı yönde iki soru koyma. Soru kutusuna asla harf gelmez.
5. Cevaplar 1–21 harfli, BÜYÜK Türkçe harflerdir. Ç Ğ I İ Ö Ş Ü korunur; I ile İ farklıdır. Boşluk/rakam/tire/noktalama yok. Tek harfli semboller için açık bir ipucu ver. Cevap tekrar etmesin.
6. Kesişen cevaplarda HER ortak kutunun harfi birebir aynı olmalı. Aynı yönde cevaplar üst üste gelmesin. Tahtadan taşma olmasın.
7. Kesintisiz her 2+ harflik yatay/dikey dizi, entries içindeki TAM bir cevaba karşılık gelsin. Dizinin hemen önünde kendi soru kutusu bulunsun. Bir cevabın arkasında harf kutusu varsa o cevap eksik demektir; araya soru koy veya tam diziyi doğru ipucuyla tanımla.
8. 2–160 soru; ipuçları 3–100 karakter, kutuya sığacak kadar kısa olsun. Genel olarak 15–45 karakteri hedefle. Bir/iki harfli cevaplar doğal sembol, nota veya kısaltma olmalı; rastgele harfler için yapay ipucu üretme.
9. Başlık/kategori 1–100 karakter. Sorular doğru ve mümkün olduğunca kategoriyle ilgili olsun. Zorunlu kesişimlerde doğal genel kültür soruları kullanabilirsin. Cevabı ipucunda açıkça yazma.
10. cells/grid alanları üretme; uygulama soru kutularını ve cevap haritasını entries üzerinden çıkaracak. Yalnızca belirtilen alanları kullan. JSON 24.000 karakteri geçmesin.

ÜRETİM YÖNTEMİ:
Önce 9×7 tabloyu tasarla. Üst satır ve sol sütunda soru kutularıyla başlayıp, iç kısımda gerektiğinde ikiye bölünmüş soru kutuları kullan. Kelimeleri birlikte seçerek her yatay/dikey kesişimi çöz. Sonra HER kutuyu dolaş: soru mu, harf mi? Boşta kalan kutu bırakma. Bütün yatay/dikey dizileri, önlerindeki soruları ve harflerini tekrar denetle. Geometrisi doğru fakat anlamsız cevaplar üretme. Son olarak çıktıyı JSON sözdizimi açısından da denetle: kaçırılmamış iç tırnak, sonda virgül, yorum veya eksik ayraç bulunmasın. Yapabiliyorsan JSON.parse ve bütün koordinat/kesişim kontrollerini kod çalıştırarak doğrula; sadece geçerli JSON ver.

Oyuncuların elinde beş harf olacak; doğru harfi doğru boş kutuya koyacaklar. Soru/cevap haritası maç başlamadan tamamlanmış olmalı.
```

AI çıktısı geçerli olmayabilir; uygulamadaki Tahtayı kontrol et ve Düzeltme metnini kopyala düğmeleriyle kontrol ve onarım yapılır. 9×9 genel kültür örneği doğrulanmış bir başlangıç setidir.
