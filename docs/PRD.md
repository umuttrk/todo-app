# Todo App — PRD

## 1. Özet

Tek kullanıcılı, kişisel bir görev (todo) yönetim uygulaması. Kullanıcı görev
ekler, düzenler, tamamlar, etiketler, alt görevlere böler ve öncelik/son
tarih atar. Öğrenme ve portföy amaçlı bir projedir; sadece lokal geliştirme
ortamında çalışacak, internete deploy edilmeyecektir.

**Kapsam dışı (bilinçli olarak):** çoklu kullanıcı/auth, gerçek zamanlı
işbirliği, push/email bildirimleri, mobil native uygulama, offline-first
senkronizasyon, tekrarlayan (recurring) görevler.

## 2. Hedefler ve motivasyon

- Modern bir full-stack projeyi uçtan uca (DB → API → UI) inşa ederek
  React + TypeScript + Node + PostgreSQL + Prisma stack'ini portföy
  kalitesinde göstermek.
- Gerçekte günlük görev takibi için kullanılabilecek kadar işlevsel ve
  kullanışlı olmak.
- Kapsamı MVP'nin ötesine taşımadan, üzerine iyi düşünülmüş, tutarlı bir
  ürün ortaya koymak.

## 3. Kullanıcı ve kullanım bağlamı

- **Kullanıcı:** Tek kullanıcı (uygulamanın sahibi). Kimlik doğrulama yok;
  uygulamayı açan herkes aynı veriye erişir.
- **Ortam:** Sadece lokal geliştirme makinesinde, Docker Compose ile
  çalıştırılır. İnternete açık bir deploy hedefi yoktur — bu nedenle
  auth'suz olması kabul edilebilir bir trade-off'tur. (İleride canlıya
  alınmak istenirse, auth eklenmeden önce bu doküman güncellenmelidir.)
- **Ölçek:** Onlarca–yüzlerce görev. Sayfalama (pagination) veya
  lazy-loading gerekmez; liste tek seferde yüklenir.

## 4. Mimari genel bakış

```
┌─────────────┐        HTTP/JSON (REST)        ┌─────────────┐        ┌────────────┐
│  src/web     │ ───────────────────────────▶  │  src/api     │ ─────▶ │ PostgreSQL │
│  React+Vite  │ ◀───────────────────────────  │  Node+Express│ ◀───── │  (Prisma)  │
│  TypeScript  │                                 │  TypeScript  │        │            │
└─────────────┘                                 └─────────────┘        └────────────┘
```

- **Backend:** Node.js + Express (veya Fastify), TypeScript.
- **Frontend:** React + Vite, TypeScript. Ayrı bir SPA olarak backend'e
  REST üzerinden istek atar.
- **Veritabanı:** PostgreSQL, Prisma ORM ile (şema tanımı + migration
  yönetimi).
- **Lokal ortam:** `docker-compose up` ile Postgres + api + web tek
  komutla ayağa kalkar. Geliştirme sırasında hot-reload için `api` ve
  `web` container'ları kaynak kodu mount edip dev server (`ts-node-dev` /
  `vite dev`) çalıştırır.
- **Klasör yapısı:** Mevcut iskelet korunur — `src/api`, `src/web`,
  `tests/api`, `tests/web`, `docs/specs`.

## 5. Veri modeli

### Task (Görev)

| Alan          | Tip                          | Zorunlu | Notlar |
|---------------|-------------------------------|---------|--------|
| id            | UUID                          | evet    | PK |
| title         | string (1–200 karakter)       | evet    | boş olamaz |
| description   | string (0–2000 karakter)      | hayır   | |
| completed     | boolean                       | evet    | default `false` |
| priority      | enum: `low` \| `medium` \| `high` | evet | default `medium` |
| dueDate       | date (saatsiz, `YYYY-MM-DD`)  | hayır   | timezone'suz saklanır, bkz. §8 |
| order         | float / int                   | evet    | global manuel sıralama için (bkz. §7.4) |
| deletedAt     | datetime, nullable             | evet (nullable) | soft delete işareti, bkz. §7.5 |
| createdAt     | datetime                       | evet    | otomatik |
| updatedAt     | datetime                       | evet    | otomatik |

İlişkiler: `Task 1—N Subtask`, `Task N—M Tag` (join tablo üzerinden).

### Subtask (Alt görev)

| Alan       | Tip     | Zorunlu | Notlar |
|------------|---------|---------|--------|
| id         | UUID    | evet    | PK |
| taskId     | UUID    | evet    | FK → Task |
| title      | string (1–200 karakter) | evet | |
| completed  | boolean | evet    | default `false` |
| order      | int     | evet    | alt görev listesi içi sıralama |

Alt görevler sadedir: kendi due date / priority / etiketi yoktur, sadece
başlık + checkbox. Sayı veya uzunluk üst sınırı yoktur.

### Tag (Etiket)

| Alan  | Tip                      | Zorunlu | Notlar |
|-------|--------------------------|---------|--------|
| id    | UUID                     | evet    | PK |
| name  | string (1–50 karakter, benzersiz) | evet | trim edilir, case-insensitive benzersizlik |

Kullanıcı ayrı bir "Etiketlerim" ekranından etiket oluşturur, yeniden
adlandırır, siler (CRUD). Renk yok. Bir göreve eklenebilecek etiket
sayısında sınır yok.

## 6. Görev yaşam döngüsü

### 6.1 Oluşturma
- Zorunlu: `title`. Diğer her şey opsiyonel, oluşturma anında veya sonra
  eklenebilir.
- Yeni görev, mevcut `order` değerlerinin en üstüne/en altına eklenir
  (ürün kararı: listenin **başına** eklenir — en yeni görev en üstte).

### 6.2 Tamamlama
- Kullanıcı bir görevi tamamlandı işaretlediğinde, görev aktif listeden
  kaybolur ve otomatik olarak ayrı bir **"Tamamlananlar"** görünümüne
  taşınır (ayrı sekme/bölüm).
- Alt görevler ana görevin tamamlanma durumunu **otomatik tetiklemez**.
  Ana görev kartında `3/5` şeklinde bir ilerleme göstergesi gösterilir;
  ana görevi tamamlamak her zaman kullanıcının bilinçli, ayrı eylemidir.
- Tamamlanmış bir görev tekrar aktif hale getirilebilir (undo/toggle).

### 6.3 Silme (soft delete + çöp kutusu)
- Silme, `deletedAt` alanını doldurur; kayıt veritabanından hemen
  kalkmaz.
- Silinen görevler ayrı bir **"Çöp Kutusu"** görünümünde listelenir.
  Kullanıcı buradan görevi **geri yükleyebilir** (`deletedAt = null`) veya
  **kalıcı olarak silebilir** (hard delete, DB'den kalkar).
- **Otomatik temizleme yoktur** — çöp kutusu süresiz birikir, sadece
  kullanıcının manuel "kalıcı sil" eylemiyle boşalır. Bu nedenle
  background job / cron gerekmez.
- Bir görev silindiğinde tüm alt görevleri de onunla birlikte
  soft-delete edilir (cascade); etiketler etkilenmez (etiketler bağımsız
  varlıklardır, sadece ilişki kaydı silinir).

## 7. Sıralama, filtreleme, arama

### 7.1 Görünümler
Üç ana görünüm: **Aktif** (default), **Tamamlananlar**, **Çöp Kutusu**.

### 7.2 Varsayılan sıralama
Aktif görünümde görevler `order` alanına göre sıralanır (manuel sıra).
Tamamlananlar ve Çöp Kutusu görünümlerinde sabit sıralama kullanılır
(sırasıyla `updatedAt` / `deletedAt` azalan).

### 7.3 Arama ve filtre
- Başlık + açıklama üzerinde serbest metin arama (client-side, debounced).
- Etikete göre filtre (çoklu seçim, AND/OR — MVP'de tek etiket seçimi
  yeterli, çoklu seçim varsa OR mantığıyla).
- Tamamlanma durumuna göre filtre zaten görünüm ayrımıyla sağlanıyor.

### 7.4 Manuel sıralama (drag & drop) — filtre ile etkileşim
Tek bir **global `order`** alanı vardır. Kullanıcı bir filtre/etiket
uygulanmışken sürükle-bırak yaparsa, bu işlem yalnızca görünen alt kümenin
göreli sırasını değiştiriyormuş gibi görünür, ama arka planda global
`order` değerleri güncellenir (filtrelenmemiş görevler kendi aralarındaki
göreli sırayı korur, sürüklenen öğe sadece görünen komşuları arasına
enjekte edilir). Böylece filtre kaldırıldığında tutarlı, sürpriz
içermeyen bir global sıra elde edilir.

Not: `order` `float` tipinde tutulursa (iki komşu değerin ortalaması),
yeniden numaralandırma ihtiyacı azalır; pratikte periyodik bir
"renormalize" işlemi (tüm task'lara tam sayı sıra ver) arka planda
gerekebilir ama bu kullanıcıya görünmez.

### 7.5 Çöp kutusu ve sıralama
Çöp kutusundaki görevler `order` alanını korumaz/kullanmaz; geri
yüklendiklerinde listenin başına (en yeni) eklenirler.

## 8. Son tarih (due date) ve zaman ele alımı

- `dueDate` **saatsiz** bir tarih olarak saklanır (`YYYY-MM-DD`,
  timezone bilgisi yok). Bu, timezone karmaşıklığını tamamen ortadan
  kaldırır.
- "Overdue" (gecikmiş) kontrolü, **kullanıcının tarayıcısındaki yerel
  bugünün tarihi** ile karşılaştırılarak yapılır: `dueDate < bugün VE
  completed == false`.
- Overdue görevler listede kırmızı/vurgulu bir rozet ile gösterilir.
  Bugün son tarihi olan görevler ayrı bir "bugün" vurgusuyla (örn. sarı)
  gösterilebilir.

## 9. Etiket yönetimi (CRUD ekranı)

- Ayrı bir "Etiketler" sayfası/paneli: listele, oluştur, yeniden
  adlandır, sil.
- Bir etiket silinirse, o etikete sahip tüm görevlerden ilişki kaydı
  kaldırılır (görevler silinmez).
- Etiket adı benzersizliği case-insensitive kontrol edilir (`iş` ve
  `İş` aynı kabul edilir); trim edilmiş boş isim reddedilir.

## 10. Doğrulama kuralları (validation)

| Alan | Kural |
|---|---|
| Task.title | zorunlu, trim sonrası 1–200 karakter |
| Task.description | opsiyonel, max 2000 karakter |
| Task.priority | `low` \| `medium` \| `high` dışında değer reddedilir |
| Task.dueDate | geçerli ISO tarih formatı (`YYYY-MM-DD`); geçmiş tarih girilebilir (kullanıcı geçmişe kayıt eklemek isteyebilir) |
| Subtask.title | zorunlu, trim sonrası 1–200 karakter |
| Tag.name | zorunlu, trim sonrası 1–50 karakter, benzersiz (case-insensitive) |

Tüm doğrulamalar hem backend'de (kaynak of truth, API 400 döner) hem
frontend'de (anlık kullanıcı geri bildirimi için) uygulanır.

## 11. API tasarımı (özet)

REST, JSON gövde, konvansiyonel HTTP status kodları. Pagination yok
(küçük ölçek). Örnek uç noktalar:

```
GET    /api/tasks?view=active|completed|trash&q=&tag=
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id            # soft delete
POST   /api/tasks/:id/restore
DELETE /api/tasks/:id/permanent  # hard delete
PATCH  /api/tasks/reorder        # [{id, order}, ...]

POST   /api/tasks/:id/subtasks
PATCH  /api/subtasks/:id
DELETE /api/subtasks/:id

GET    /api/tags
POST   /api/tags
PATCH  /api/tags/:id
DELETE /api/tags/:id
```

Hata yanıtları tutarlı bir zarf (envelope) kullanır:
`{ "error": { "code": string, "message": string, "fields"?: {...} } }`.

## 12. UI/UX kapsamı

- **Görünümler:** Aktif / Tamamlananlar / Çöp Kutusu arasında sekme
  geçişi.
- **Görev listesi:** Sürükle-bırak ile yeniden sıralama (sadece Aktif
  görünümde ve filtre uygulanmışken de çalışır, bkz. §7.4).
- **Görev formu:** Başlık, açıklama, öncelik, son tarih, etiketler, alt
  görevler — tek bir form/panelde (modal veya kayan panel) düzenlenir.
- **Arama kutusu** ve **etiket filtresi** üst barda.
- **Dark mode:** kullanıcı tarafından açılıp kapatılabilir (sistem
  tercihine varsayılan olarak uyar, manuel override edilebilir; tercih
  `localStorage`'da saklanır).
- **Responsive:** mobil genişliklerde de kullanılabilir (tek sütun
  layout, dokunma hedefleri yeterince büyük). Native mobil uygulama
  kapsam dışı.
- **Boş durumlar (empty states):** Aktif liste boşken, Tamamlananlar
  boşken ve Çöp Kutusu boşken anlamlı, yönlendirici mesajlar gösterilir.
- **Bildirimler:** Kapsam dışı — overdue/yaklaşan tarih sadece görsel
  (renk/rozet) olarak işaretlenir; push/email/browser notification yok.

## 13. Güvenlik ve gizlilik notları

- Auth yok; bu bilinçli bir kapsam kararıdır ve **sadece lokal
  geliştirme ortamında** çalıştırılacağı için kabul edilebilir.
- Girdi temizliği: `title`/`description` render edilirken XSS'e karşı
  React'in varsayılan escaping'ine güvenilir; `dangerouslySetInnerHTML`
  kullanılmaz.
- Uygulama internete deploy edilecekse (gelecekteki bir karar), bu PRD
  auth, rate limiting ve CORS kısıtlamaları eklenerek revize edilmelidir.

## 14. Test stratejisi

- **Kapsam:** Sadece backend'de kritik unit + integration testleri.
  Frontend testi ve e2e testi bu aşamada kapsam dışıdır.
- **Backend test kapsamı:**
  - Task CRUD (create/read/update/delete/restore/permanent-delete)
    validasyon kuralları dahil.
  - Subtask CRUD ve task'a bağlılığı (cascade soft-delete).
  - Tag CRUD ve benzersizlik kısıtı.
  - Reorder endpoint'inin `order` değerlerini doğru güncellediği.
  - Overdue hesaplama mantığı (tarih sınır durumları: bugün, dün, gelecek).
  - Hata yanıtı formatının tutarlılığı (400/404/409 senaryoları).
- Testler `tests/api` altında, gerçek bir test veritabanına (Docker
  Compose ile ayağa kalkan ayrı bir Postgres test DB'si veya
  transaction-rollback pattern'i) karşı çalışır — mock DB kullanılmaz.

## 15. Kapsam dışı / gelecek fikirler (backlog)

Bu PRD'nin bilinçli olarak dışında bıraktığı, ama ileride
değerlendirilebilecek konular:

- Çoklu kullanıcı desteği ve authentication.
- Canlıya deploy (Vercel/Render/VPS) ve buna bağlı güvenlik sertleştirmeleri.
- Push/email hatırlatmaları.
- Tekrarlayan (recurring) görevler.
- Etiketlere renk atama.
- Görev/alt görev sayısına üst sınır.
- Offline destek / PWA.
- Frontend unit testleri ve e2e testleri.
- Çöp kutusu için otomatik süre bazlı temizleme (örn. 30 gün).

## 16. Açık kararlar / varsayımlar

- Express mi Fastify mi kesin seçilmedi — implementasyon sırasında
  karar verilebilir, PRD her ikisiyle de uyumludur.
- Yeni görevlerin listeye eklenme konumu (en üst) bir varsayımdır,
  implementasyon öncesi teyit edilebilir.
- `order` alanının `float` mi `int` mi olacağına, reorder algoritmasının
  implementasyon detayında karar verilecektir.
