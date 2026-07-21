# Feature 003 — Görev Listesi ve Kart Görünümü (Task List & Card)

> Bu spec `docs/PRD.md` §5 (Veri Modeli), §6.2 (Tamamlama), §7.2–§7.4
> (Sıralama/filtre), §8 (Son tarih/overdue) ve `docs/ARCHITECTURE.md`
> ADR-2 (global `order`), ADR-3 (subtask parent'ı otomatik tetiklemez),
> ADR-5 (timezone'suz `dueDate`) ile uyumludur. Renk/tipografi/spacing
> token'ları `002-uygulama-kabugu.md`'de tanımlıdır, burada tekrar
> edilmez — yalnızca token adlarıyla referans verilir.

## Görev Kartı Anatomisi

```
┃ ☐  Fatura ödemesini yap                          15 Tem  2/4  ⋮⋮
┃    Elektrik + su faturası, son gün ayın 15'i
┃    #ev  #finans
  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔  ← color.rule ayraç
```

Soldan sağa, yukarıdan aşağıya:

- **Öncelik sırtı** (`┃`) — kartın tam solunda `3px` dikey şerit, bkz.
  §2.
- **Checkbox** (`☐`) — tamamlama toggle'ı (PRD §6.2). `44×44px` dokunma
  alanı, görsel kutu daha küçük (`20px`) ortalanır.
- **Başlık** — Inter, `color.ink`, 1 satırla sınırlı (`text-overflow:
  ellipsis`); tam metin `title` attribute/tooltip ile görülür.
- **Açıklama** — varsa, başlığın altında `color.ink-muted`, 1 satırla
  sınırlı önizleme (tam metin düzenleme panelinde görünür, bkz. §6).
- **Etiketler** — açıklamanın altında, `#etiket` biçiminde küçük metin
  chip'leri (arka plansız, sadece `color.ink-muted` metin + hafif
  `color.rule` üzerinde nokta ayraç — ağır renkli badge kullanılmaz,
  tasarım dilinin "sakin yüzey" ilkesiyle tutarlı).
- **Son tarih rozeti** — sağ üstte, mono font, bkz. §3.
- **Alt görev sayacı (`N/M`)** — son tarihin yanında, mono font, bkz.
  §4.
- **Sürükleme tutamacı (`⋮⋮`)** — en sağda, yalnızca Aktif görünümde ve
  yalnızca hover/focus'ta belirir (mobilde her zaman görünür — hover
  kavramı yok), bkz. §5.

Kart, `002`'deki kural gereği gölgesizdir; kartlar arası ayraç tek bir
`1px` `color.rule` çizgisidir (üst üste yığılmış indeks kartları
hissi).

## Öncelik Gösterimi (Priority Spine)

| Öncelik | Token | Genişlik |
|---|---|---|
| `high` | `color.brick` | 3px |
| `medium` | `color.slate` | 3px |
| `low` | `color.moss` | 3px |

Öncelik **ayrı bir chip/badge olarak metinle tekrar edilmez** — sırt
rengi tek göstergedir. Renk körlüğü erişilebilirliği için sırt genişliği
`high` öncelikte `4px`'e çıkarılarak (renkten bağımsız) ikinci bir ayırt
edici sinyal eklenir. Kart, klavye ile odaklandığında veya ekran
okuyucuda önceliğin sözel karşılığı (`aria-label="Yüksek öncelik"` vb.)
gizli metin olarak sunulur — sadece renge dayanılmaz.

## Son Tarih Rozetleri (Due Date Badges)

PRD §8'deki overdue mantığı birebir uygulanır: `dueDate < bugün (yerel)
VE completed == false`.

| Durum | Görünüm |
|---|---|
| Overdue | `color.brick`, mono font, kalın (örn. "15 Tem" kırmızı) |
| Bugün son tarih | `color.amber`, mono font |
| Gelecekteki tarih | `color.ink-muted`, mono font (nötr) |
| `dueDate` yok | Rozet gösterilmez (boşluk bırakılmaz, sayaç varsa sola kayar) |
| Görev tamamlandıysa | Rozet gösterilmez/nötrleşir — tamamlanmış bir görev artık "overdue" sayılmaz (PRD §6.2 ile tutarlı: tamamlananlar ayrı görünüme taşınır) |

Tamamlananlar ve Çöp Kutusu görünümlerinde tarih rozetleri hiçbir zaman
overdue/bugün renklendirmesi almaz — sadece nötr mono tarih metni
gösterilir (bu görünümlerdeki görevler için "gecikmiş" kavramı anlamsız,
PRD §7.2).

## Alt Görev İlerleme Göstergesi (N/M)

- Format: `tamamlanan/toplam` (örn. `2/4`), mono font, `color.ink-muted`.
- Subtask'ı olmayan görevlerde bu alan tamamen gizlenir (boş `0/0`
  gösterilmez).
- Bu gösterge **tıklanabilir değildir** salt görsel bir özettir; alt
  görev listesi yalnızca görev düzenleme panelinde açılır (bkz. §6) —
  liste satırında inline genişleme yoktur (kapsamı sade tutar, ADR-3 ile
  tutarlı: alt görevler ana listenin karmaşıklığını artırmamalı).
- `M` alt görevin tamamı tamamlanmış olsa bile (`4/4`) ana görev
  otomatik tamamlanmaz; gösterge bunu ima etmez, sadece sayar (PRD
  §6.2, ADR-3).

## Sürükle-Bırak Sıralama (Drag & Drop)

- Yalnızca **Aktif görünümde** aktiftir; Tamamlananlar/Çöp Kutusu'nda
  tutamaç render edilmez (bu görünümler sabit sıra kullanır, PRD §7.2).
- Sürüklenen kart kaldırılırken **tek istisna olarak** hafif bir gölge
  ve `1.02` ölçek uygulanır (002'deki "gölgesiz" kuralın kasıtlı
  istisnası — sürüklenen öğeyi diğerlerinden ayırmak için gereklidir).
- Bırakıldığında, kart yeni komşularının arasına enjekte edilir;
  arka planda tüm etkilenen görevlerin **global `order`** değerleri
  `PATCH /api/tasks/reorder` ile güncellenir (ARCHITECTURE.md API
  Surface). Filtre/etiket uygulanmışken sürüklemenin, filtrelenmemiş
  görevlerin göreli sırasını nasıl koruyacağı **UI'nin sorumluluğudur**
  (backend "filtre" kavramını bilmez) — hesaplama detayı PRD §7.4'te
  tanımlıdır, bu spec sadece görsel/etkileşim davranışını tanımlar.
- Klavye alternatifi: odaklanmış bir kartta `Alt+↑` / `Alt+↓` kartı bir
  pozisyon yukarı/aşağı taşır (fare olmadan erişilebilirlik için gerekli
  minimum alternatif; PRD'de belirtilmemiş ama §12'deki genel
  erişilebilirlik/kullanılabilirlik ruhuyla tutarlı bir tasarım kararı).
- Sürükleme sırasında `aria-live="polite"` bir bölge, "Fatura ödemesini
  yap, pozisyon 2/8" gibi durum anonsu yapar (ekran okuyucu desteği).

## Tamamlananlar / Çöp Kutusu Görünümlerinde Kart Farklılıkları

- **Tamamlananlar:** checkbox işaretli görünür (tersine çevrilebilir —
  tekrar tıklanınca Aktif'e döner, PRD §6.2 "undo/toggle"); sıralama
  `updatedAt` azalan (PRD §7.2), sürükleme tutamacı yok.
- **Çöp Kutusu:** checkbox yerine iki aksiyon ikonu — **geri yükle**
  (↺) ve **kalıcı sil** (🗑, `color.brick`, tıklandığında onay diyaloğu
  zorunlu — PRD §6.3'teki geri dönüşsüz işlem). Sıralama `deletedAt`
  azalan. Öncelik sırtı ve son tarih rozeti burada da gösterilir (bilgi
  kaybolmaz) ama nötr/soluk tonda (`opacity: 0.7`) — görevin "aktif
  olmayan" durumunu ima eder.

## Arama ve Etiket Filtresi Etkileşimi

- Arama, başlık + açıklama üzerinde **client-side, debounced** (PRD
  §7.3) — öneri: `250ms` debounce, kullanıcı yazmayı bıraktıktan sonra
  filtrelenir; her tuş vuruşunda anlık filtreleme yapılmaz (performans +
  gözle takip edilebilirlik).
- Etiket filtresi üst bardaki dropdown'dan çoklu seçilebilir (PRD
  §7.3 — MVP'de OR mantığı); seçili etiketler dropdown butonunun
  yanında küçük sayı rozetiyle özetlenir (örn. "etiket ▾ (2)").
- Filtre aktifken sürükle-bırak yine çalışır (PRD §7.4) — bu durumda
  sürüklenen kartın üstünde ince bir ipucu metni belirmez; davranış
  sessizce doğru global sırayı üretir (kullanıcı bir fark hissetmez, bu
  PRD §7.4'ün amaçladığı "sürpriz içermeyen" deneyimdir).

## Görev Formu Tetikleyicisi

Karta (checkbox/tutamaç/aksiyon ikonları hariç) tıklanması, görevi
düzenleme panelini açar (başlık, açıklama, öncelik, son tarih,
etiketler, alt görevler — PRD §12). Bu panelin kendi iç tasarımı
(form düzeni, alt görev ekleme UX'i) bu spec'in kapsamı dışındadır;
ayrı bir spec konusu olarak `docs/specs/004-...` altında ele
alınmalıdır.

## Erişilebilirlik

- Checkbox klavye ile `Tab` + `Space` ile değiştirilebilir; sadece fare
  ile tıklanabilir bir alan olarak bırakılmaz.
- Öncelik ve overdue durumu her zaman renkten bağımsız ikinci bir sinyal
  taşır (bkz. §2 genişlik farkı, §3 mono font + konum).
- `N/M` sayaç ve son tarih rozeti değişimleri (örn. bir görev
  tamamlandığında sayaç güncellenirse) `aria-live` bölgesiyle anons
  edilmez — bunlar pasif özet bilgisi kabul edilir, sadece sürükleme
  pozisyon değişimi gibi **aktif kullanıcı eylemi sonucu** durumlar
  anons edilir (aşırı anonstan kaçınmak için bilinçli bir sınır).

## Acceptance Criteria

- [ ] Her görev kartı, önceliğe göre renklendirilmiş `3px` (yüksekte
      `4px`) sol sırt, checkbox, başlık, (varsa) açıklama önizleme,
      (varsa) etiketler, son tarih rozeti ve (varsa) `N/M` sayacı
      gösterir; kartlar arası tek `1px` çizgi ile ayrılır, gölge
      kullanılmaz.
- [ ] `dueDate < bugün ve completed=false` olan görevler `color.brick`
      ile, bugün son tarihi olanlar `color.amber` ile, gelecekteki
      tarihler nötr renkle gösterilir; tamamlanmış veya çöp kutusundaki
      görevlerde overdue renklendirmesi hiçbir zaman uygulanmaz.
- [ ] `N/M` alt görev sayacı yalnızca alt görevi olan kartlarda görünür
      ve tüm alt görevler tamamlansa bile (`M/M`) ana görevi otomatik
      tamamlamaz.
- [ ] Sürükleme tutamacı yalnızca Aktif görünümde render edilir;
      Tamamlananlar/Çöp Kutusu'nda hiç görünmez.
- [ ] Bir kart sürüklenip bırakıldığında `PATCH /api/tasks/reorder`
      isteği etkilenen görevlerin güncel global `order` değerleriyle
      gönderilir; filtre uygulanmış haldeyken sürükleme, filtre
      kaldırıldığında görevlerin göreli sırasının bozulmadığı bir
      sonuç üretir (PRD §7.4 senaryosu manuel olarak doğrulanır).
- [ ] Klavye ile odaklanmış bir kart `Alt+↑`/`Alt+↓` ile taşınabilir ve
      bu taşıma `aria-live` bölgesiyle anons edilir.
- [ ] Arama kutusuna yazıldığında filtreleme debounce sonrası uygulanır
      (her tuş vuruşunda değil); etiket filtresi çoklu seçimde OR
      mantığıyla çalışır.
- [ ] Çöp kutusundaki bir kartta "kalıcı sil" aksiyonu, onay diyaloğu
      olmadan hiçbir hard-delete isteği tetiklemez.
