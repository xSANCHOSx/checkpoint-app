# 🚗 КПП — Система контрольно-пропускного пункту

PWA-додаток для перевірки пропусків автомобілів. Працює онлайн і офлайн.

---

## ⚡ Швидкий старт

```bash
chmod +x setup.sh && ./setup.sh
```

Скрипт автоматично:
- Генерує `.env` з випадковими секретами
- Встановлює залежності
- Запускає через Docker (або `npm run dev` якщо Docker відсутній)

---

## 🌐 Доступ з планшету (без домену)

PWA вимагає HTTPS. Використовуйте один з варіантів:

### Варіант 1 — Cloudflare Tunnel (рекомендовано, безкоштовно)

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Відкрити тунель (замінює домен)
cloudflared tunnel --url http://localhost:3000
```

Отримаєте URL: `https://random-name.trycloudflare.com`

Після цього обновіть `.env`:
```env
APP_URL=https://random-name.trycloudflare.com
NEXTAUTH_URL=https://random-name.trycloudflare.com
```

### Варіант 2 — ngrok

```bash
# Встановити з ngrok.com → отримати токен
ngrok config add-authtoken YOUR_TOKEN
ngrok http 3000
```

---

## 📱 Встановлення PWA на Android

1. Відкрити Chrome на планшеті
2. Перейти на URL тунелю
3. Меню `⋮` → **"Встановити додаток"**
4. При першому запуску з Wi-Fi — система завантажить всі авто в офлайн-базу
5. Можна від'єднати Wi-Fi — пошук працює офлайн

---

## 🐳 Docker команди

```bash
# Запуск
docker compose up -d

# Зупинка
docker compose down

# Логи
docker compose logs -f app

# Міграція вручну
docker compose exec app npx prisma migrate deploy

# Prisma Studio (перегляд БД)
docker compose exec app npx prisma studio
```

---

## 🔧 Без Docker (локальна розробка)

```bash
# 1. Потрібен PostgreSQL
# Ubuntu/Debian:
sudo apt install postgresql
sudo -u postgres psql -c "CREATE USER checkpoint_user WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "CREATE DATABASE checkpoint_db OWNER checkpoint_user;"

# 2. Заповнити .env (скопіювати з .env.example)
cp .env.example .env
# Відредагувати DATABASE_URL

# 3. Міграція та запуск
npm install
npx prisma migrate dev --name init
npm run dev
```

---

## 🔐 Доступ

| Шлях | Опис | Авторизація |
|------|------|-------------|
| `/` | Оператор КПП | Відкрито |
| `/admin` | Панель адміністратора | Basic Auth |
| `/admin/vehicles` | Список авто + CRUD | Basic Auth |
| `/admin/logs` | Журнал проїздів | Basic Auth |
| `/api/search` | Пошук авто | Відкрито |
| `/api/cron` | Крон-задача | `x-cron-secret` header |

Логін/пароль адміна — змінні `ADMIN_USER` / `ADMIN_PASS` в `.env`

---

## 📊 Формат Excel для імпорту

| Колонка | Назви (будь-яка з варіантів) | Обов'язково |
|---------|------------------------------|-------------|
| Номер авто | `Номер авто`, `Номер`, `Держ. номер`, `plate` | ✅ |
| Компанія | `Компанія`, `Організація`, `Фірма`, `company` | ✅ |
| Дійсний до | `Дійсний до`, `Закінчення`, `Термін` | — |
| Контакт | `Контакт`, `ПІБ`, `Відповідальний` | — |
| Телефон | `Телефон`, `Phone` | — |
| Примітка | `Примітка`, `Коментар`, `Note` | — |

Якщо колонка `Дійсний до` заповнена — пропуск тимчасовий. Якщо порожня — постійний.

---

## 📁 Структура проекту

```
checkpoint-app/
├── app/                    # Next.js App Router
│   ├── api/                # API маршрути
│   │   ├── search/         # GET /api/search?q=1234
│   │   ├── vehicles/       # CRUD + sync
│   │   ├── logs/           # Журнал + batch
│   │   ├── import/         # Excel імпорт
│   │   └── cron/           # Крон задача
│   ├── admin/              # Адмін-панель
│   └── page.tsx            # Екран оператора
├── components/             # React компоненти
├── hooks/                  # useSearch, useSync, useOnlineStatus
├── lib/                    # prisma, localDb, sync, excelParser
├── prisma/                 # Схема БД
├── public/                 # Іконки, manifest.json
├── middleware.ts            # Basic Auth захист
├── instrumentation.ts       # Запуск cron при старті
├── Dockerfile
├── docker-compose.yml
└── setup.sh                # Скрипт першого запуску
```

---

## ✅ Чеклист готовності

- [ ] PostgreSQL запущено (`docker compose up -d db`)
- [ ] Prisma міграція виконана
- [ ] `.env` заповнено
- [ ] Додаток запущено без помилок на `:3000`
- [ ] Пошук за цифрами повертає результати
- [ ] Кнопка "Записати" зберігає лог
- [ ] Тунель відкрито (cloudflared / ngrok)
- [ ] PWA встановлено на Android планшеті
- [ ] IndexedDB наповнюється при першому онлайн-запуску
- [ ] Пошук працює офлайн (вимкнути Wi-Fi)
- [ ] Офлайн-логи синхронізуються при появі інтернету
- [ ] Excel-імпорт парсить файл коректно
- [ ] Адмін-панель захищена паролем
