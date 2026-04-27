# 🚗 Checkpoint App — КПП

PWA-система контролю доступу транспортних засобів для контрольно-пропускних пунктів. Працює повністю офлайн завдяки локальній базі даних у браузері.

---

## Зміст

- [Технологічний стек](#технологічний-стек)
- [Архітектура](#архітектура)
- [Функціонал](#функціонал)
- [Розгортання](#розгортання)
- [Змінні середовища](#змінні-середовища)
- [Ролі та доступ](#ролі-та-доступ)
- [API](#api)
- [Локальна розробка](#локальна-розробка)

---

## Технологічний стек

| Шар | Технологія |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| PWA | @ducanh2912/next-pwa, Service Worker |
| Офлайн база | Dexie.js (IndexedDB) |
| База даних | PostgreSQL (Supabase) |
| ORM | Prisma 7 |
| Аутентифікація | JWT (jose) + bcryptjs |
| Деплой | Vercel |

---

## Архітектура

```
Оператор (планшет / телефон)
  └── PWA (Chrome / Safari)
        ├── Service Worker → кешує статику офлайн
        ├── IndexedDB (Dexie) → локальна копія бази авто
        └── Sync (кожні 5 хв) ←→ Vercel API ←→ Supabase (PostgreSQL)
```

### Local-First підхід

Додаток **завжди** шукає авто в локальній IndexedDB — незалежно від наявності інтернету. Це гарантує швидкий відгук навіть при поганому сигналі на КПП.

При появі інтернету:
- Завантажуються оновлення бази авто (delta-sync по `updatedAt`)
- Завантажується аварійний список
- Офлайн-логи проїздів відправляються на сервер

---

## Функціонал

### Оператор КПП

- **Пошук по цифрах** номера (наприклад `1234` → знаходить `АА1234ВВ`)
- **Пошук іменних номерів** (`BOSS`, `UKRAINE`) — окреме поле
- **Аварійний список** — авто що завжди дозволені (директор, ДСНС, охорона), перевіряється першим
- **Запис проїзду** з результатом ALLOWED / DENIED
- **Офлайн-режим** — пошук і запис логів без інтернету, синхронізація при відновленні

### Адміністратор

**Автомобілі**
- CRUD з валідацією номерів
- Три типи пропусків: Постійний, Тимчасовий, Разовий (SINGLE_USE — блокується після першого проїзду)
- Масове продовження термінів (+30/+90/+180/+365 днів або до конкретної дати)
- Фільтрація: всі / постійні / тимчасові / разові / прострочені

**Проекти**
- Групування авто по проектах
- Вимкнення проекту → всі авто отримують статус ЗАБОРОНЕНО з приміткою «Проект закінчено»
- Вмикання проекту → статус відновлюється
- Видалення проекту з можливістю каскадного видалення авто

**Аварійний список**
- Окрема таблиця авто що завжди пропускаються
- Синхронізується в IndexedDB незалежно від основної бази

**Журнал проїздів**
- Фільтрація по даті, номеру авто, результату (ALLOWED / DENIED / UNKNOWN)
- Кнопка «Сьогодні» для швидкого переходу

**Імпорт Excel**
- Два режими: шаблонний (кожен лист = проект) і довільний (вказуєш які колонки)
- Джерело: файл з комп'ютера або посилання на Google Drive / Google Sheets
- Попередній перегляд перед імпортом з вибором листів

**Користувачі** (тільки ADMIN)
- Створення, зміна ролі, зміна пароля, видалення
- Захист: не можна видалити останнього адміна або власний акаунт

---

## Розгортання

### Vercel + Supabase (рекомендовано)

**1. Підготовка бази даних (Supabase)**

Виконати SQL міграції в порядку:

```sql
-- 1. Основна структура (таблиці Vehicle, AccessLog, Project, EmergencyVehicle)
-- 2. auth-migration.sql (таблиця User)
```

**2. Змінні середовища на Vercel**

```
DATABASE_URL=postgresql://...
ADMIN_USER=your_admin_login
ADMIN_PASS=your_secure_password
JWT_SECRET=<32+ символи, згенерувати через: openssl rand -base64 32>
CRON_SECRET=<довільний секрет для захисту cron endpoint>
```

**3. Vercel Cron**

Додати в `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron", "schedule": "0 2 * * *" }]
}
```

**4. Перший адмін**

Після першого деплою виконати локально:
```bash
npm run db:seed
```

Скрипт створить адміна з `ADMIN_USER` / `ADMIN_PASS` з env.

**5. Пуш та деплой**

```bash
git add .
git commit -m "initial deploy"
git push
```

Vercel автоматично виконає `prisma generate && next build`.

---

## Змінні середовища

| Змінна | Обов'язкова | Опис |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Секрет для підпису JWT токенів (мін. 32 символи) |
| `ADMIN_USER` | ✅ | Логін першого адміна (для seed) |
| `ADMIN_PASS` | ✅ | Пароль першого адміна (для seed) |
| `CRON_SECRET` | ✅ | Секрет для захисту `/api/cron` |

---

## Ролі та доступ

| Маршрут | Публічний | OPERATOR | ADMIN |
|---|---|---|---|
| `/` (головна, пошук) | ✅ | ✅ | ✅ |
| `/api/checkpoint` | ✅ | ✅ | ✅ |
| `/api/vehicles/sync` | ✅ | ✅ | ✅ |
| `/api/emergency/sync` | ✅ | ✅ | ✅ |
| `/api/logs/batch` | ✅ | ✅ | ✅ |
| `/admin` | ❌ | ✅ | ✅ |
| `/admin/logs` | ❌ | ✅ | ✅ |
| `/admin/vehicles` | ❌ | ❌ | ✅ |
| `/admin/projects` | ❌ | ❌ | ✅ |
| `/admin/emergency` | ❌ | ❌ | ✅ |
| `/admin/import` | ❌ | ❌ | ✅ |
| `/admin/users` | ❌ | ❌ | ✅ |

Аутентифікація — JWT токен в httpOnly cookie (24 години).

---

## API

### Публічні (без токену)

| Метод | Маршрут | Опис |
|---|---|---|
| `POST` | `/api/auth/login` | Вхід, повертає JWT cookie |
| `POST` | `/api/checkpoint` | Запис проїзду (оператор) |
| `GET` | `/api/vehicles/sync` | Синхронізація авто в IndexedDB |
| `GET` | `/api/emergency/sync` | Синхронізація аварійного списку |
| `POST` | `/api/logs/batch` | Офлайн-синхронізація логів |

### Захищені (JWT)

| Метод | Маршрут | Опис |
|---|---|---|
| `POST` | `/api/auth/logout` | Вихід |
| `GET` | `/api/auth/me` | Поточний користувач |
| `GET/POST` | `/api/auth/users` | Список / створення (ADMIN) |
| `PATCH/DELETE` | `/api/auth/users/[id]` | Редагування / видалення (ADMIN) |
| `GET/POST` | `/api/vehicles` | Список / створення авто |
| `PUT/DELETE` | `/api/vehicles/[id]` | Редагування / видалення |
| `PATCH` | `/api/vehicles/batch` | Масове оновлення термінів |
| `GET` | `/api/logs` | Журнал проїздів |
| `GET/POST` | `/api/projects` | Проекти |
| `PATCH/DELETE` | `/api/projects/[id]` | Редагування / видалення проекту |
| `GET/POST` | `/api/emergency` | Аварійний список |
| `DELETE` | `/api/emergency/[id]` | Видалення з аварійного списку |
| `GET` | `/api/cron` | Ручний запуск cron (CRON_SECRET) |

---

## Локальна розробка

```bash
# Клонування
git clone https://github.com/xSANCHOSx/checkpoint-app.git
cd checkpoint-app

# Залежності
npm install

# Змінні середовища
cp .env.example .env
# Заповнити DATABASE_URL, JWT_SECRET, ADMIN_USER, ADMIN_PASS, CRON_SECRET

# Генерація Prisma клієнта
npx prisma generate

# Міграція бази
npx prisma migrate deploy

# Перший адмін
npm run db:seed

# Запуск
npm run dev
```

Додаток буде доступний на `http://localhost:3000`.

---

## Структура проекту

```
├── app/
│   ├── page.tsx                    # Головна сторінка (оператор)
│   ├── offline/page.tsx            # Офлайн заглушка
│   ├── admin/
│   │   ├── page.tsx                # Адмін-дашборд
│   │   ├── login/page.tsx          # Сторінка входу
│   │   ├── users/page.tsx          # Управління користувачами
│   │   ├── vehicles/page.tsx       # Список авто
│   │   ├── logs/page.tsx           # Журнал проїздів
│   │   ├── projects/page.tsx       # Проекти
│   │   ├── emergency/page.tsx      # Аварійний список
│   │   └── import/page.tsx         # Імпорт Excel
│   └── api/                        # API маршрути
├── components/
│   ├── VehicleCard.tsx             # Картка авто для оператора
│   ├── SearchInput.tsx             # Поле пошуку по цифрах
│   ├── SyncIndicator.tsx           # Індикатор синхронізації
│   └── admin/                      # Компоненти адмінки
├── hooks/
│   ├── useSearch.ts                # Логіка пошуку (завжди IndexedDB)
│   ├── useSync.ts                  # Управління синхронізацією
│   ├── useAuth.ts                  # Поточний користувач
│   └── useOnlineStatus.ts          # Онлайн/офлайн стан
├── lib/
│   ├── localDb.ts                  # Dexie IndexedDB схема і запити
│   ├── sync.ts                     # Логіка синхронізації з retry
│   ├── jwt.ts                      # JWT утиліти (jose)
│   ├── prisma.ts                   # Prisma клієнт
│   ├── plateUtils.ts               # Нормалізація/валідація номерів
│   └── rateLimit.ts                # In-memory rate limiting
├── prisma/
│   ├── schema.prisma               # Схема бази даних
│   └── seed.ts                     # Seed першого адміна
├── middleware.ts                   # JWT перевірка, захист маршрутів
└── next.config.mjs                 # Next.js + PWA конфігурація
```

---

## Безпека

- JWT токени в httpOnly cookie — недоступні для JavaScript
- bcrypt з cost factor 12 для хешування паролів
- Rate limiting: логін (10/15хв), пошук (120/хв), checkpoint (60/хв)
- Timing-safe порівняння паролів (захист від user enumeration)
- Валідація всіх вхідних даних на рівні API
- `Cache-Control: no-store` для всіх захищених відповідей
- Захист від видалення останнього адміна