# Ticaret Platformu Dahili Borsa Yol Haritası

## Platform Üzerinde Dahili Alım Satım

---

## Mevcut Aşama (Lisans Öncesi)

- Arka uç tamamlandı: Spot Alım Satım + Vadeli İşlemler + Para Yatırma + Para Çekme + Cüzdan + Yönetici Paneli
- Alım satım şu anda KuCoin üzerinden yapılıyor (sadece test için, geçici)
- Mevcut ön yüz sadece test amaçlı bir prototip — tamamen yeniden inşa edilecek
- Para yatırma sistemi: bir kullanıcı = bir bağımsız adres (lisans sonrası uygulanacak)

---

## Lisans Sonrası — Hedef

Alım satım tamamen platform içinde gerçekleşecek.
Kullanıcılar, KuCoin'e bağlı kalmadan birbirleriyle doğrudan işlem yapacak.

---

## Gerekli Bileşenler

### 1. Eşleştirme Motoru — Platformun Kalbi

Projenin en zor parçası.
Görevi: alış emirlerini fiyat ve miktara göre satış emirleriyle eşleştirmek.

- Hız sağlamak için C++ veya Rust dilinde yazılacak
- Saniyede binlerce işlemi kaldırabilecek
- Tutarlı olmalı — tek bir emir bile kaybedilmemeli
- Şu emir türlerini destekleyecek: Piyasa Emri, Limit Emri, Stop-Limit Emri

---

### 2. Emir Defteri

- Açık olan tüm emirleri (alış / satış teklifleri) saklar
- Her işlemde anlık olarak güncellenir
- Kullanıcılara WebSocket üzerinden gösterilir

---

### 3. Likidite — En Büyük Zorluk

**Sorun:**
Başlangıçta kullanıcı sayısı az olacağı için Emir Defteri boş olur.
Örnek: A kullanıcısı BTC'yi 50.000 dolardan satın almak istiyor — B kullanıcısı 52.000 dolardan satmak istiyor — işlem gerçekleşmiyor.

**Çözüm — Hibrit Model:**

```
Kullanıcı platformda bir emir veriyor
            ↓
Başka bir kullanıcıyla dahili bir eşleşme var mı?
            ↓
Evet → dahili olarak gerçekleştirilir (daha iyi)
Hayır → KuCoin'e veya bir likidite sağlayıcısına gönderilerek gerçekleştirilir (karşı pozisyon)
```

Bu sayede platform ilk günden itibaren likiditeye sahip olur.
Kullanıcı sayısı arttıkça karşı pozisyona bağımlılık kademeli olarak azalır.

---

### 4. Uzlaşma Motoru

- Her işlemin sonucunu veritabanına kaydeder
- Alıcı ve satıcıların bakiyelerini anında güncelleştirir
- Her işlem için geçmiş kaydı oluşturur

---

### 5. Risk Yönetimi

- Kullanıcının bakiyesini aşan emirleri engeller
- Fiyat manipülasyonuna karşı koruma sağlar
- Devre kesici: fiyatlar anormal şekilde hareket ederse alım satımı otomatik olarak durdurur

---

## Gerekli Yeni Dosyalar (Arka Uç)

| Dosya | İşlev |
|---|---|
| `matchingEngine.js` veya `matching_engine.rs` | Emir eşleştirme |
| `orderBookService.js` | Emir Defteri yönetimi |
| `settlementService.js` | İşlem uzlaşması ve bakiye güncellemeleri |
| `hedgeService.js` | Eşleşme yoksa emirleri KuCoin'e gönderir |
| `riskService.js` | Emir gerçekleştirilmeden önce bakiye ve riski kontrol eder |
| `priceService.js` | Piyasadan referans fiyatları alır |

---

## Değişecek Dosyalar (Arka Uç)

| Dosya | Değişiklik |
|---|---|
| `tradeController.js` | KuCoin kullanımını durdurur ve Eşleştirme Motorunu kullanır |
| `wsServer.js` | Emir Defteri güncellemelerini kullanıcılara yayınlar |
| `depositController.js` | Yeni cüzdan sistemine bağlanır |
| `txMonitor.js` | Blok zincirini doğrudan izler |

---

## Değişmeyecek Dosyalar

| Dosya | Sebep |
|---|---|
| `walletService.js` | Aynı bakiye mantığı |
| `withdrawalController.js` | Aynı para çekme mantığı |
| `adminController.js` | Aynı yönetici mantığı |
| `authController.js` | Aynı kimlik doğrulama mantığı |
| `database.js` | Aynı veritabanı |

---

## Ön Yüz — Tamamen Yeniden İnşa

Mevcut ön yüz sadece test amaçlı ve geçicidir.
Lisans sonrasında tamamen yeniden inşa edilecek ve şunları içerecek:

- Alım satım sayfası: Emir Defteri + Grafik + Alış/Satış formu
- WebSocket üzerinden anlık güncellemeler
- Para yatırma sayfası: her kullanıcı için QR Kodlu bağımsız bir adres
- Para çekme sayfası
- Geçmiş sayfası
- Tam yönetici paneli

---

## Tahmini Zaman Çizelgesi (Lisans Sonrası)

| Aşama | Süre | Detaylar |
|---|---|---|
| Para yatırma sistemi (ayrı cüzdanlar) | 1 hafta | CoinsPaid veya HD Cüzdan |
| Eşleştirme Motoru (temel) | 2-3 hafta | Limit + Piyasa Emirleri |
| Emir Defteri + WebSocket | 3-4 hafta | Anlık |
| Uzlaşma + Risk | 2 hafta | Uzlaşma ve koruma |
| Hibrit Likidite (KuCoin Karşı Pozisyonu) | 2-3 hafta | Başlangıç likiditesi için |
| Ön yüzün yeniden inşası | 1 hafta | Tam tasarım |
| Test ve yayına alma | 1 ay | Kalite Kontrol + Güvenlik Denetimi |

---

## Önemli Notlar

1. **Güvenlik Denetimi zorunludur** — yayına almadan önce uzman bir şirketin kodu incelemesi gerekir
2. **Eşleştirme Motoru en kritik bölümdür** — tek bir hata, kullanıcıların para kaybetmesine yol açabilir
