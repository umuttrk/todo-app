# Feature 001 — Görev Oluştur (Task Create)

> Bu spec, `docs/PRD.md` (§5 Veri Modeli, §6.1 Oluşturma, §10 Validasyon,
> §11 API) ve `docs/ARCHITECTURE.md` (API Surface, Error Handling) ile
> uyumlu olacak şekilde güncellenmiştir. Alan adları, tipler, endpoint ve
> hata sözleşmesi bu iki dokümandaki tanımların birebir aynısıdır.

## User Story
Kullanıcı olarak, bir başlık girip yeni bir görev (task) oluşturabilmek
istiyorum ki yapılacaklarımı takip edebileyim.

## API Contract

```
POST /api/tasks
```

**Request:**
```json
{ "title": "string" }
```

`title` dışındaki alanlar bu istekte gönderilmez; oluşturma anında sadece
başlık zorunludur (PRD §6.1). Diğer alanlar PRD §5'teki default'ları
alır.

**Response (201 Created):**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "title": "string",
  "description": null,
  "completed": false,
  "priority": "medium",
  "dueDate": null,
  "order": 1000,
  "deletedAt": null,
  "createdAt": "2026-07-20T10:00:00.000Z",
  "updatedAt": "2026-07-20T10:00:00.000Z"
}
```

Şema, `id: UUID`, camelCase alan adları (`dueDate`, `deletedAt`,
`createdAt`, `updatedAt`) ve `completed` (boolean) dahil olmak üzere
PRD §5'teki Task modelinin tamamını yansıtır — kısmi/eksik bir görünüm
değildir.

## Validation Rules
(kaynak: PRD §10)

- `title` zorunlu; trim sonrası boş olamaz.
- `title` trim sonrası 1–200 karakter aralığında olmalı.

## Error Response

Validasyon hatası **400 Bad Request** ile döner (ARCHITECTURE.md, Error
Handling — `422` kullanılmaz). Gövde, projede tek standart olan hata
zarfını kullanır:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "string",
    "fields": { "title": "string" }
  }
}
```

## Acceptance Criteria
- [ ] Geçerli `title` ile `POST /api/tasks` → `201 Created`, response
      yukarıdaki tam Task şemasını döner (`completed: false`,
      `priority: "medium"`, `deletedAt: null`).
- [ ] Boş veya sadece boşluktan oluşan `title` ile `POST` → `400`,
      `error.code = "VALIDATION_ERROR"`.
- [ ] 200 karakterden uzun `title` ile `POST` → `400`,
      `error.code = "VALIDATION_ERROR"`.
- [ ] Oluşturulan görev veritabanında `deletedAt = null`,
      `completed = false` olarak görünüyor.
- [ ] Yeni görev, aktif listenin **başına** eklenir (PRD §6.1) —
      `order` değeri, listeyi başa getirecek şekilde hesaplanır (kesin
      hesaplama yöntemi implementasyon detayıdır, bkz. PRD §16).

## Test Cases
- test_create_task_success_returns_full_task_schema
- test_create_task_empty_title_fails_with_400_validation_error
- test_create_task_whitespace_only_title_fails_with_400
- test_create_task_title_over_200_chars_fails_with_400
- test_create_task_defaults_completed_false_and_priority_medium
- test_create_task_is_placed_at_top_of_active_list
