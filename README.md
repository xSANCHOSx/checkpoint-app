# Виправлення безпеки та архітектури

## Куди копіювати файли

| Файл в архіві | Куди в проекті |
|---|---|
| `lib/rateLimit.ts` | `lib/rateLimit.ts` (новий файл) |
| `lib/localDb.ts` | `lib/localDb.ts` |
| `lib/sync.ts` | `lib/sync.ts` |
| `lib/prisma.ts` | `lib/prisma.ts` |
| `app/api/vehicles/route.ts` | `app/api/vehicles/route.ts` |
| `app/api/checkpoint/route.ts` | `app/api/checkpoint/route.ts` |
| `app/api/cron/route.ts` | `app/api/cron/route.ts` |
| `app/api/import/save/route.ts` | `app/api/import/save/route.ts` |
| `app/api/logs/route.ts` | `app/api/logs/route.ts` |
| `app/api/search/route.ts` | `app/api/search/route.ts` |
| `app/admin/logs-page.tsx` | `app/admin/logs/page.tsx` |
| `app/admin/admin-page.tsx` | `app/admin/page.tsx` |
| `instrumentation.ts` | `instrumentation.ts` |
| `docker-compose.yml` | `docker-compose.yml` |

## Додатково — видалити вручну
```bash
git rm next.config.ts   # якщо є поруч з next.config.mjs
```

## Що виправлено

| # | Проблема | Файл |
|---|---|---|
| 1 | accessType не валідувався | `app/api/vehicles/route.ts` |
| 2 | Import без ліміту (DoS) | `app/api/import/save/route.ts` |
| 3 | accessType в import не валідувався | `app/api/import/save/route.ts` |
| 4 | Rate limiting для публічних API | `lib/rateLimit.ts` + checkpoint + search |
| 5 | Cron timing attack | `app/api/cron/route.ts` |
| 6 | PostgreSQL порт закритий (localhost only) | `docker-compose.yml` |
| 7 | DATABASE_URL! без перевірки | `lib/prisma.ts` |
| 10 | Promise.all деструктуризація | `lib/sync.ts` |
| 11 | Cron подвоєний (Vercel + node-cron) | `instrumentation.ts` |
| 12 | projectId не в IndexedDB індексах | `lib/localDb.ts` (version 3) |
| 14 | prompt() замінено на форму з паролем | `app/admin/page.tsx` |
| 15 | Фільтр по результату в журналі | `app/admin/logs/page.tsx` |
| 20 | lastSync не оновлювався при 0 змін | `lib/sync.ts` |
