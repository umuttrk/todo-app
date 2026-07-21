# Feature 002 — Uygulama Kabuğu ve Görsel Tasarım Sistemi (App Shell & Design System)

> Bu spec `docs/PRD.md` §7.1 (Görünümler), §8 (Son tarih/overdue), §12
> (UI/UX kapsamı) ve `docs/ARCHITECTURE.md` (Klasör Sorumlulukları —
> `src/web`, ADR-8 "frontend aptal sunum katmanı") ile uyumludur. Burada
> tanımlanan renk/tipografi/spacing token'ları, `003-gorev-listesi.md`
> dahil tüm sonraki UI spec'leri tarafından referans alınır — tekrar
> tanımlanmaz.

## Tasarım Dili

**Konsept — "dosya/kart indeksi":** Uygulama, dijital bir kanban panosu
gibi değil, fiziksel bir **kart katalog kutusu / dosya klasörü**
metaforuyla tasarlanır. Görünüm sekmeleri (Aktif / Tamamlananlar / Çöp
Kutusu) fiziksel klasör sekmeleri gibi görünür; her görev bir indeks
kartı gibi ince bir üst-alt çizgiyle ayrılır; öncelik ağır bir renkli
rozet/chip yerine kartın sol kenarında ince bir **"sırt" (spine)**
şeridiyle gösterilir (bkz. `003-gorev-listesi.md` §2). Ağır gölge,
yüksek border-radius'lu "SaaS kart" görünümü kullanılmaz — çizgiler
(hairline rule) ve düz yüzeyler tercih edilir.

Bu, tek kullanıcılı, günlük kullanılan bir kişisel araç için sakin,
dağıtmayan; ama kendine has bir kimlik hedefler.

## Design Tokens

### Renk Paleti

| Token | Işık modu | Karanlık mod | Kullanım |
|---|---|---|---|
| `color.paper` | `#F7F3EA` | `#1C1814` | Sayfa arka planı |
| `color.ink` | `#241F1A` | `#EFE8DC` | Birincil metin |
| `color.ink-muted` | `#6B6255` | `#A69C8C` | İkincil metin (açıklama, meta) |
| `color.rule` | `#D8CFBF` | `#3A332A` | Hairline çizgiler, kart ayraçları |
| `color.slate` (accent) | `#35505C` | `#6E93A1` | Aktif sekme, linkler, focus, orta öncelik sırtı |
| `color.brick` (danger/high) | `#B3402C` | `#D9705A` | Overdue rozeti, yüksek öncelik sırtı, yıkıcı aksiyon |
| `color.amber` (today) | `#C98A2E` | `#E0A94E` | "Bugün" son tarih vurgusu |
| `color.moss` (low) | `#6B7A4F` | `#93A66B` | Düşük öncelik sırtı |

Not: `color.brick` hem "overdue rozeti" hem "yüksek öncelik sırtı" için
kullanılır ama bu iki gösterge farklı görsel biçimlerde olduğu için
(rozet vs. ince kenar şeridi, bkz. `003-gorev-listesi.md`) karışıklık
yaratmaz. Tüm renk çiftleri WCAG AA metin kontrastını (`ink`/`paper`
üzerinde ≥ 4.5:1) hedefler; `amber` yalnızca dolgu/ikon rengi olarak
kullanılır, üzerine düz metin yazılmaz (kontrast riski).

### Tipografi

| Rol | Yazı tipi | Kullanım |
|---|---|---|
| Display (serif, ölçülü kullanım) | Fraunces | Sekme etiketleri (Aktif/Tamamlananlar/Çöp Kutusu), boş durum başlıkları, "Etiketlerim" sayfa başlığı |
| Body (grotesk) | Inter | Görev başlığı/açıklaması, form alanları, buton metni, genel UI |
| Utility (mono) | IBM Plex Mono | Son tarih, oluşturma/güncelleme zaman damgası, `N/M` alt görev sayacı |

Fraunces **sadece** kısa etiket/başlık metinlerinde kullanılır — büyük
bir "hero" başlığı yoktur, bu bir landing page değil işlevsel bir
araçtır. Inter, Türkçe karakter desteği ve küçük punto okunabilirliği
için seçildi. Mono yazı tipi, tarihleri ve sayaçları bir "kütüphane
kataloğu" hissiyle hizalı/tekdüze genişlikte gösterir.

### Spacing / Kenar / Yükseklik Kuralları

- 8px taban birim (`4/8/12/16/24/32`); kart iç boşluğu `16px`, kartlar
  arası boşluk yok — bunun yerine `1px` `color.rule` çizgisi (indeks
  kartı hissi, ayrık "SaaS kutu" hissi değil). Bu kural
  `003-gorev-listesi.md`'deki görev kartı düzeninde uygulanır.
- `border-radius`: yalnızca sekme şeridinin **üst köşelerinde** (`6px`,
  fiziksel klasör sekmesi görünümü). Görev kartlarında, butonlarda,
  input'larda radius `2px` (neredeyse keskin köşe) — yumuşak/"pill"
  buton kullanılmaz.
- Gölge (`box-shadow`) kullanılmaz; hiyerarşi çizgi ve renk kontrastıyla
  kurulur. Tek istisna: sürükleme sırasında kaldırılan kart (bkz.
  `003-gorev-listesi.md` §5).

## Layout

```
┌───────────────────────────────────────────────────────────┐
│  Todo            [ ara...        ] [ etiket ▾]     ☾/☀     │  ← üst bar
├───────────────────────────────────────────────────────────┤
│ ╭────────╮╭──────────────╮╭─────────────╮                 │
│ │ Aktif  ││ Tamamlananlar ││ Çöp Kutusu  │                 │  ← sekme şeridi
│ └────────┴┴──────────────┴┴─────────────┴─────────────────│
│                                                             │
│   (aktif görünümün içeriği — bkz. 003-gorev-listesi.md)   │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

- **Üst bar:** solda wordmark ("Todo", Fraunces), ortada/sağda arama
  kutusu ve etiket filtresi (PRD §12 — "üst barda"), en sağda dark mode
  toggle.
- **Sekme şeridi:** aktif sekme `color.paper` ile ana içerikle
  kesintisiz birleşir (üstte sekme çıkıntısı gibi durur); pasif
  sekmeler `color.rule` arka planla geride durur.
- **Ana içerik alanı:** tek sütun, maksimum genişlik `720px`, ortalanır
  (geniş ekranlarda ferah kenar boşluğu — çok sütunlu dashboard
  düzeni değil, PRD'nin "onlarca-yüzlerce görev" ölçeğine uygun sade bir
  liste).

## Sekmeler / Görünüm Geçişi

PRD §7.1'deki üç görünüm birebir üç sekmeye karşılık gelir: **Aktif**
(varsayılan), **Tamamlananlar**, **Çöp Kutusu**. Sekme geçişi:

- URL/route senkron değildir (spec kapsamı dışı — implementasyon
  detayı); ama sekme durumu sayfa yenilemede kaybolmamalı (query param
  veya route önerilir, implementasyon sırasında karar verilecek, PRD
  §16 ruhuna uygun açık bir karar).
- Aktif sekme `color.slate` alt çizgi + `color.ink` metin; pasif
  sekmeler `color.ink-muted` metin.
- Sekme değişimi anlık render'dır (route/veri değişimi hariç ekstra
  geçiş animasyonu yok — `prefers-reduced-motion` ile zaten tutarlı).

## Dark Mode

- Sistem tercihine (`prefers-color-scheme`) varsayılan olarak uyar;
  kullanıcı üst bardaki toggle ile manuel override edebilir (PRD §12).
- Tercih `localStorage` içinde saklanır (`theme: "light" | "dark" |
  "system"`); sayfa ilk yüklemede flash-of-wrong-theme'i önlemek için
  tema class'ı render öncesi (inline script) uygulanır.
- Toggle ikonu: ay (☾) / güneş (☀), metin etiketi yok — tooltip ile
  "Karanlık moda geç" / "Aydınlık moda geç" açıklaması.

## Responsive Davranış

- Kırılma noktası: `640px`. Altında tek sütun, üst bar iki satıra
  bölünür (üstte wordmark + dark mode toggle, altta tam genişlik arama
  + etiket filtresi).
- Sekme şeridi mobilde yatay kaydırılabilir (`overflow-x: auto`),
  daralmaz/kısaltılmaz — üç sekme adı her zaman tam okunur.
- Dokunma hedefleri (checkbox, sekme, buton) minimum `44×44px` (PRD
  §12 "dokunma hedefleri yeterince büyük").

## Boş Durumlar (Empty States)

Her görünüm için Fraunces ile kısa bir başlık + Inter ile yönlendirici
alt metin; ikon/illüstrasyon kullanılmaz (tipografik empty state):

| Görünüm | Başlık | Alt metin |
|---|---|---|
| Aktif (boş) | "Henüz görev yok" | "Yeni bir görev ekleyerek başla." |
| Tamamlananlar (boş) | "Tamamlanan görev yok" | "Bir görevi tamamlandı işaretlediğinde burada görünür." |
| Çöp Kutusu (boş) | "Çöp kutusu boş" | "Sildiğin görevler geri yükleyebilmen için burada bekler." |

Arama/etiket filtresi sonucu boşsa (görünümün kendisi boş değil,
filtre sonucu boş), farklı bir mesaj kullanılır: **"Eşleşen görev
bulunamadı"** + "Farklı bir arama terimi veya etiket dene." — bu, "hiç
görev yok" durumuyla karıştırılmamalıdır.

## Erişilebilirlik

- Klavye focus göstergesi: tüm etkileşimli öğelerde `2px` `color.slate`
  (dark modda karanlık varyantı) `outline` — `box-shadow` değil,
  tarayıcı varsayılanını taklit eder. Her zaman görünür kalır,
  `outline: none` ile kaldırılmaz.
- `prefers-reduced-motion: reduce` durumunda sekme geçişi/panel
  açılışı gibi tüm geçiş animasyonları anlık (`transition: none`) hale
  gelir.
- Dark/light her iki modda da tüm metin/arka plan çiftleri WCAG AA
  (≥4.5:1, büyük metinde ≥3:1) kontrastını karşılar (bkz. Renk Paleti).

## Acceptance Criteria

- [ ] Üç sekme (Aktif/Tamamlananlar/Çöp Kutusu) üst barın altında,
      fiziksel klasör sekmesi görünümünde (üst köşe radius'lu, aktif
      sekme içerikle kesintisiz) render edilir.
- [ ] Dark mode toggle, sistem tercihini varsayılan alır, manuel
      override `localStorage`'a yazılır ve sayfa yenilemede korunur.
- [ ] 640px altında üst bar iki satıra bölünür, sekme şeridi yatay
      kaydırılabilir, tüm dokunma hedefleri ≥44×44px.
- [ ] Üç görünümün her biri boşken kendine özgü başlık+alt metin
      gösterir; arama/filtre sonucu boşsa farklı bir "eşleşme yok"
      mesajı gösterilir.
- [ ] Klavyeyle gezinirken tüm etkileşimli öğelerde görünür bir focus
      halkası vardır; `prefers-reduced-motion` açıkken geçiş
      animasyonları devre dışı kalır.
- [ ] Renk paleti light ve dark modda WCAG AA metin kontrastını
      karşılar (manuel kontrol: örn. Chrome DevTools kontrast denetimi).
