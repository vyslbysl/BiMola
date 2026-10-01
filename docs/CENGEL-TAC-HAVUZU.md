# TAC soru–cevap havuzu

Kaynak: https://huggingface.co/datasets/Kamyar-zeinalipour/TAC

İndirilen kaynak sürümü: `1b7a520f1d3d872d21c7e33f05ccf15c6f1e7ef6`.
Kullanıcının verdiği Parquet dosyası ile kaynaktan indirilen dosyanın SHA-256 değeri aynıdır:
`10d69e4b9a861b9a4cdfd0cb361d64acf17b00f119b2d0563925650c9e913644`.

## Yerelde hazırlanan dosyalar

- `data/cengel/tac/tac.parquet`: 187.395 kaydın tamamını içeren özgün dosya.
- `data/cengel/tac/tac-all.json`: kaynak alanları korunmuş 187.395 kayıt.
- `data/cengel/tac/clue-bank.json`: 180.513 benzersiz cevap–ipucu çifti, 53.393 farklı cevap.
- `data/cengel/tac/import-report.json`: sayımlar, filtre nedenleri, uzunluk dağılımı ve dosya özeti.
- `data/cengel/tac/source-card.md`: kaynak veri kartının kopyası.

Bu dosyalar mevcut `data/` kuralı nedeniyle Git tarafından izlenmez ve `public/` altında değildir. Ham bankanın tamamı yerelde tutulur. Bu bankadan hazırlanan 512 doğrulanmış tahta artık oyunda kullanılır; sıkıştırılmış tahta paketi sunucu dosyalarıyla birlikte yayınlanır. Başka sunucuya ham bankayı taşımak gerekmez.

## Filtreleme ve metin güvenliği

Oyunla aynı Türkçe büyük harf normalizasyonu uygulanır; I/İ ayrımı korunur. Cevap yalnızca oyun alfabesinde 1–21 harf, ipucu 3–100 karakter olmalıdır. Aynı cevap–ipucu çifti bir kez tutulur; aynı cevabın farklı ipuçları korunur.

- 5.649 kayıt: ipucu uzunluğu uygun değil.
- 1.150 kayıt: cevap formatı uygun değil.
- 83 kayıt: aynı cevap–ipucu çiftinin tekrarı.

Havuzun formatı bir soru bankasıdır; `version:2` oyun tahtası değildir ve tahta yükleme alanına doğrudan yapıştırılmaz. Koordinatları ve kesişimleri yerleştirme motoru üretmelidir. Format kontrolü bilgi doğruluğunu veya ipucu kalitesini garanti etmez.

JSON elle birleştirilmez: `json.dumps` kullanılır ve her çıktı tekrar okunarak kaynak nesneyle karşılaştırılır. Düz veya tipografik tırnaklar, ters eğik çizgiler ve satır sonları veri olarak korunur. Örneğin JETON cevabının “... geç düşmek” ipucu havuzda aynen bulunur. Üretilen bankanın tüm kayıtları ayrıca oyunun JavaScript uzunluk ve alfabe kurallarıyla kontrol edilmiştir.

## Yeniden dönüştürme

Python 3 ve `pyarrow` gereklidir. Araç, uygulamanın çalışma zamanı bağımlılıklarına eklenmez.

```sh
python3 scripts/import-tac.py /path/to/train-00000-of-00001.parquet
```

`--output` ile başka bir yerel çıktı klasörü seçilebilir.

## Kullanım koşulları ve sonraki aşama

Proje açıklaması veri setleri için ayrı bir Research License belirtir:
https://github.com/KamyarZeinalipour/CW_Clue_Gen_tr

Veri kartında yayın kullanımına ilişkin açık bir lisans doğrulanmadı. Ham bankanın tamamı GitHub'a veya oyunun herkese açık dosyalarına eklenmez. Kullanıcının rastgele oyun talebiyle hazırlanmış tahta paketi sunucuya gömülmüştür; bu teknik entegrasyon kullanım izninin doğrulandığı anlamına gelmez.

Üretim motoru `scripts/build-cengel-pool.mjs` ve `scripts/generate-cengel-pool.py` içinde uygulanmıştır; kelimeleri uzunluk/harf konumuna göre indeksler, uyumlu tahtaları üretir ve her çıktıyı `validatePuzzle` ile denetler. Oyun tarayıcısına tüm havuz yerine yalnızca oynanan tahtanın görünür bilgileri gönderilir.
