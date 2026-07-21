# Todo App — Architecture

Bu doküman `docs/PRD.md`'de tanımlanan ürünün teknik mimarisini anlatır.
Ürün kararları (kapsam, davranış, UX) için kaynak PRD'dir; burada onların
sisteme nasıl yansıdığı, sınırların nerede çizildiği ve neden bu şekilde
tasarlandığı ele alınır. Kod içermez — implementasyon öncesi bir mimari
referanstır.

## Stack

| Katman | Teknoloji | Not |
|---|---|---|
| Frontend | React + Vite, TypeScript | SPA, `src/api`'ye REST/JSON üzerinden istek atar |
| Backend | Node.js + Express (veya Fastify), TypeScript | REST API, tek süreç |
| ORM / migration | Prisma | Şema tanımı + migration yönetimi tek yerden |
| Veritabanı | PostgreSQL | Tek instance, tek şema (multi-tenant yok) |
| Yerel orkestrasyon | Docker Compose | Postgres + api + web tek komutla ayağa kalkar |
| Auth | Yok | Bkz. Deployment Assumptions ve Architectural Decisions |
| CI/CD | Yok | Kapsam dışı; proje lokal geliştirme için tasarlandı |

Backend ve frontend ayrı süreçlerdir (aynı framework içinde birleşik
full-stack çözüm — örn. Next.js — kullanılmaz). Bu ayrım, PRD'nin
"ayrı REST/API backend + SPA frontend" kararının doğrudan sonucudur.

## Klasör Sorumlulukları

Mevcut iskelet korunur; her klasörün sorumluluğu:

- **`src/api`** — REST API sunucusu. HTTP katmanı (route/controller),
  iş kuralları (validasyon, reorder algoritması, soft-delete/cascade
  mantığı, overdue hesaplama) ve Prisma üzerinden veri erişimi burada
  yaşar. Tüm iş kurallarının **tek doğruluk kaynağı** burasıdır —
  frontend validasyonu sadece UX için bir kopyadır, güvenlik/doğruluk
  sınırı değildir.
- **`src/web`** — React SPA. Görünüm durumu (aktif/tamamlanan/çöp
  kutusu sekmesi, arama/filtre state'i, dark mode tercihi), API
  client'ı ve sunum mantığı. İş kuralı tekrarlanmaz; sadece backend'in
  döndürdüğü veriyi ve hata zarfını yorumlar.
- **`tests/api`** — Backend'e karşı unit + integration testleri, gerçek
  bir Postgres test veritabanına karşı çalışır (mock DB yok). Tek
  planlanan test katmanıdır (bkz. Testing Strategy).
- **`tests/web`** — İskelette mevcut ama şu an kapsam dışı; frontend
  testi PRD'de backlog'a alınmıştır.
- **`docs/`** — `PRD.md` (ürün spesifikasyonu, kaynak of truth) ve
  `ARCHITECTURE.md` (bu doküman). `docs/specs/` ileride özellik bazlı
  detay spec'ler için ayrılmış, şu an boş.

Katmanlar arası kural: `src/web`, Prisma'ya veya veritabanına asla
doğrudan erişmez; her zaman `src/api`'nin HTTP sınırından geçer.

## Veri Modeli

Üç varlık, tek şema, tek kullanıcı — multi-tenant ayrımı (ör.
`userId` foreign key) yoktur.

```
Task 1───N Subtask
Task N───M Tag   (join tablo üzerinden)
```

**Task** — `id (UUID, PK)`, `title (1–200 char, zorunlu)`,
`description (0–2000 char, opsiyonel)`, `completed (bool, default false)`,
`priority (enum: low|medium|high, default medium)`,
`dueDate (date, YYYY-MM-DD, timezone'suz, opsiyonel)`,
`order (float|int, global manuel sıra)`,
`deletedAt (datetime, nullable — soft delete işareti)`,
`createdAt`, `updatedAt (otomatik)`.

**Subtask** — `id (UUID, PK)`, `taskId (FK → Task)`,
`title (1–200 char, zorunlu)`, `completed (bool, default false)`,
`order (int, task içi sıra)`. Kendi due date/priority/tag'i yoktur —
kasıtlı olarak sadece bir checklist satırıdır (bkz. ADR-3).

**Tag** — `id (UUID, PK)`, `name (1–50 char, case-insensitive
benzersiz)`. Renk alanı yok, task başına sayı sınırı yok.

**Bütünlük kuralları:**
- Task silinince (soft delete) tüm Subtask'ları cascade soft-delete
  edilir; Tag ilişkileri (join tablo satırları) kalıcı silinir ama Tag
  kaydının kendisi etkilenmez.
- Tag silinince, o Tag'e referans veren join tablo satırları silinir;
  Task'lar etkilenmez.
- `order`, tüm aktif Task'lar arasında **global** ve tekildir (view/filtre
  bazlı değil) — bkz. API Surface / reorder ve ADR-2.

## API Surface

REST, JSON gövde, konvansiyonel HTTP status kodları, pagination yok
(küçük ölçek varsayımı — bkz. Non-goals).

```
GET    /api/tasks?view=active|completed|trash&q=&tag=
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id            # soft delete (deletedAt set edilir)
POST   /api/tasks/:id/restore    # deletedAt = null
DELETE /api/tasks/:id/permanent  # hard delete, DB'den kalkar
PATCH  /api/tasks/reorder        # [{id, order}, ...] toplu güncelleme

POST   /api/tasks/:id/subtasks
PATCH  /api/subtasks/:id
DELETE /api/subtasks/:id

GET    /api/tags
POST   /api/tags
PATCH  /api/tags/:id
DELETE /api/tags/:id
```

**Görünüm (view) parametresi API'nin sorumluluğundadır**, client-side
filtreleme değildir: `view=active` `deletedAt IS NULL AND completed =
false`, `view=completed` `deletedAt IS NULL AND completed = true`,
`view=trash` `deletedAt IS NOT NULL` koşuluna karşılık gelir. Arama (`q`)
ve etiket (`tag`) filtreleri bu view'ın üzerine ek WHERE koşulu olarak
uygulanır.

**Reorder endpoint'i** kasıtlı olarak toplu (`PATCH /api/tasks/reorder`)
tasarlanmıştır: frontend, sürükle-bırak sırasında filtrelenmiş bir alt
kümeyi yeniden diziyor olsa da, backend'e her zaman etkilenen task'ların
**yeni global `order` değerlerini** gönderir. Filtre-farkında sıralama
mantığı (görünmeyen task'ların göreli sırasını koruma) frontend'de
hesaplanır, backend sadece düz `{id, order}` çiftlerini uygular — backend
"filtre" kavramını bilmez, bu bilinçli bir sorumluluk ayrımıdır.

## Error Handling

Tüm hata yanıtları tek, tutarlı bir zarf (envelope) kullanır:

```json
{ "error": { "code": "string", "message": "string", "fields": { "...": "..." } } }
```

- `code`: makine tarafından ayırt edilebilir bir string (ör.
  `VALIDATION_ERROR`, `NOT_FOUND`, `DUPLICATE_TAG_NAME`).
- `message`: insana okunabilir açıklama.
- `fields`: sadece validasyon hatalarında, alan bazlı hata mesajları
  (opsiyonel).
- HTTP status kodları semantik olarak kullanılır: `400` validasyon,
  `404` kayıt bulunamadı, `409` çakışma (ör. benzersiz tag adı ihlali).
  `401/403` yoktur — auth olmadığı için bu kod aralığı kullanılmaz.
- Validasyon **backend'de zorunlu ve tek doğruluk kaynağıdır** (PRD §10);
  frontend validasyonu sadece anlık geri bildirim için bir kopyadır ve
  backend kontrolünü asla ikame etmez. Backend, frontend'i atlayan
  herhangi bir isteğe (ör. doğrudan `curl`) karşı da aynı kuralları
  uygular.
- Beklenmeyen sunucu hataları (`500`) client'a iç detay sızdırmaz;
  generic bir `INTERNAL_ERROR` mesajı döner, detay sadece sunucu
  loglarına yazılır.

## Testing Strategy

Kapsam bilinçli olarak dardır (PRD §14): **sadece backend unit +
integration testleri**. Frontend testi ve e2e testi backlog'dadır,
şu an yazılmaz.

- Testler `tests/api` altında yaşar ve gerçek bir Postgres test
  veritabanına karşı çalışır — DB mock'lanmaz. İki yöntemden biri
  kullanılabilir: Docker Compose ile ayrı bir test DB'si, veya her
  test için transaction açıp rollback etme pattern'i.
- Kapsanması gereken davranışlar: Task/Subtask/Tag CRUD (validasyon
  kuralları dahil), soft-delete → restore → permanent-delete akışı,
  Task silindiğinde Subtask'ların cascade soft-delete olması, Tag
  benzersizlik kısıtı, reorder endpoint'inin `order` değerlerini doğru
  güncellemesi, overdue hesaplamasının sınır durumları (bugün/dün/
  gelecek), ve hata zarfının tutarlılığı (400/404/409 senaryoları).
- Bu kapsam sınırlaması bir eksiklik değil, bilinçli bir trade-off'tur:
  iş kuralının tamamı backend'de yaşadığı için (yukarıya bkz., Klasör
  Sorumlulukları), backend testleri ürünün doğruluğunun büyük kısmını
  zaten garanti eder; frontend büyük ölçüde "aptal" bir sunum katmanı
  olduğundan test ROI'si düşüktür.

## Deployment Assumptions

- Uygulama **sadece lokal geliştirme ortamında** çalışır; internete açık
  bir deploy hedefi (Vercel/Render/VPS vb.) **yoktur**.
- Tek çalıştırma yolu `docker-compose up` — Postgres, `src/api` ve
  `src/web` aynı komutla ayağa kalkar. Geliştirme sırasında kaynak kodu
  container'lara mount edilir, hot-reload (`ts-node-dev` / `vite dev`)
  ile çalışılır.
- CI/CD pipeline'ı yoktur; bu proje kapsamında kurulması planlanmıyor.
- Bu varsayım, auth'suz tasarımın **önkoşuludur**: uygulama asla halka
  açık bir ağa maruz kalmayacağı için kimlik doğrulama, rate limiting ve
  CORS sertleştirmesi gereksizdir. Deployment hedefi değişirse (canlıya
  alma), bu doküman ve PRD §13 güncellenmeden önce üretim kod
  değişikliği yapılmamalıdır — auth eksikliği o senaryoda bir güvenlik
  açığı olur.

## Non-goals

PRD §1 ve §15'ten mimariyi doğrudan etkileyen, bilinçli olarak
tasarlanmayan noktalar:

- **Çoklu kullanıcı / auth** — şema `userId` ayrımı içermez, API hiçbir
  endpoint'te kimlik doğrulama/yetkilendirme kontrolü yapmaz.
- **Pagination / lazy-loading** — ölçek onlarca-yüzlerce task ile
  sınırlı kabul edildiği için `GET /api/tasks` her zaman tam sonuç
  kümesini döner; cursor/offset parametresi yoktur.
- **Gerçek zamanlı senkronizasyon (WebSocket/polling)** — tek kullanıcı
  olduğu için eşzamanlı çoklu istemci senaryosu (çakışan güncellemeler,
  optimistic concurrency) tasarım kapsamı dışıdır.
- **Bildirim altyapısı (push/email)** — arka planda zamanlanmış iş
  (cron/queue) gerektiren hiçbir özellik yoktur; çöp kutusu dahi
  otomatik temizlenmez (bkz. ADR-4).
- **Tekrarlayan (recurring) görevler, offline-first, native mobil** —
  şema ve API bunları desteklemez; eklenmeleri veri modelinde ve
  senkronizasyon stratejisinde yeni tasarım gerektirir.
- **Frontend/e2e test altyapısı** — `tests/web` bilinçli olarak boş
  bırakılmıştır.

## Architectural Decisions

Aşağıdaki kararlar PRD'deki trade-off tartışmalarının mimariye
yansımasıdır; her biri neden o şekilde seçildiğini ve nelerin bilerek
feda edildiğini içerir.

**ADR-1: Auth yok, çünkü deployment hedefi yalnızca lokal.**
Tek kullanıcı + internete kapalı ortam kombinasyonu, session/kimlik
yönetiminin getireceği karmaşıklığı gereksiz kılıyor. Bedel: bu karar
deployment varsayımına sıkı sıkıya bağlıdır (bkz. Deployment
Assumptions) — varsayım değişirse karar da değişmeli.

**ADR-2: Sıralama tek global `order` alanıyla, view/filtre bazlı ayrı
alanlar yerine.**
Alternatif olarak her filtre kombinasyonu için ayrı bir sıra tutulabilirdi,
ama bu hem şemayı hem reorder mantığını orantısız karmaşıklaştırırdı.
Bunun yerine tek `order` alanı tutulur; filtre-farkında "görünmeyen
öğelerin sırasını koru" mantığı frontend'de hesaplanıp backend'e düz
`{id, order}` listesi olarak gönderilir (bkz. API Surface). Bedel:
frontend'in reorder hesaplaması backend'den bağımsız doğru çalışmak
zorunda — bu mantık değişirse iki katmanda da güncellenmeli.

**ADR-3: Subtask'lar bağımsız birer mini-task değil, sade bir checklist.**
Subtask'a kendi due date/priority/tag'i vermek veri modelini ve UI'yi
ciddi şekilde büyütürdü (her subtask için ayrı overdue hesaplama, ayrı
filtre mantığı vb.). Onun yerine subtask sadece `title + completed`
taşır ve tamamlanması parent'ı otomatik tetiklemez — sadece `N/M`
ilerleme göstergesi üretir. Bedel: "tüm alt görevler bitti ama üst görev
hâlâ açık" durumu kalıcı bir UI durumu olarak kabul edilmiştir, bug değil.

**ADR-4: Silme soft-delete + süresiz çöp kutusu, otomatik temizleme yok.**
Hard-delete geri dönüşü olmayan bir işlem olacağından yanlışlıkla veri
kaybı riski taşırdı; soft-delete + manuel kalıcı silme bu riski ortadan
kaldırır. Otomatik süre bazlı temizleme (ör. 30 gün) reddedildi çünkü
bir background job/cron gerektirir — tek kullanıcılı, küçük ölçekli bir
uygulamada bu altyapı maliyeti kazanımına değmiyor. Bedel: çöp kutusu
süresiz büyüyebilir; bu kabul edilen bir trade-off'tur.

**ADR-5: `dueDate` timezone'suz saklanır, overdue tarayıcı yerel saatine
göre hesaplanır.**
Datetime + timezone saklamak (UTC + kullanıcı timezone dönüşümü) tek
kullanıcılı bir uygulamada karşılığı olmayan bir karmaşıklık eklerdi.
Salt tarih (`YYYY-MM-DD`) saklanır, "overdue" karşılaştırması her zaman
istemcinin yerel `bugün`üne göre yapılır. Bedel: bu tasarım çoklu
kullanıcı/çoklu timezone senaryosuna genişletilemez — o senaryo gelirse
şema değişmeli (bkz. Non-goals).

**ADR-6: Prisma + PostgreSQL, ham SQL yerine.**
Amaç hem tip güvenliği hem de migration yönetimini tek araçla çözmekti;
TypeScript stack'i zaten seçilmiş olduğundan Prisma'nın tip üretimi
doğal bir uyum sağlıyor. Bedel: Prisma'nın soyutlama katmanı, çok ince
ayarlı sorgular gerektiğinde (ör. karmaşık reorder toplu güncellemeleri)
bazen ham SQL'e (`$queryRaw`) düşmeyi gerektirebilir.

**ADR-7: Pagination yoktur, tüm liste tek seferde döner.**
Beklenen ölçek (onlarca-yüzlerce task, tek kullanıcı) pagination'ın
getirdiği ek state yönetimini (cursor, sayfa numarası, sonsuz kaydırma)
haklı çıkarmıyor. Bedel: bu karar ölçek varsayımına bağlıdır — task
sayısı binlere çıkarsa (Non-goals'ta reddedilen bir senaryo) yeniden
değerlendirilmesi gerekir.

**ADR-8: İş kuralının tamamı backend'de, frontend "aptal" bir sunum
katmanı.**
Validasyon, reorder algoritmasının çekirdek mantığı, cascade silme ve
overdue hesaplaması backend'de yaşar; frontend bunları tekrar
implemente etmez, sadece backend'in ürettiği veriyi/hata zarfını
yansıtır (frontend validasyonu hariç — o sadece UX hızlandırması).
Bu, test kapsamının backend'e yoğunlaşmasını (bkz. Testing Strategy)
mimari olarak destekleyen karardır: iş kuralı tek yerde yaşadığı için
tek yerde test edilmesi yeterlidir.
