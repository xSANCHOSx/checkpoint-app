#!/bin/bash
# ═══════════════════════════════════════════════════════
#  КПП — Скрипт розгортання
#  Запустіть: chmod +x setup.sh && ./setup.sh
# ═══════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   КПП — Система контрольно-пропускного   ║${NC}"
echo -e "${BLUE}║                  пункту                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Перевірка Node.js ────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js не знайдено. Встановіть Node.js 20+${NC}"
  echo -e "  https://nodejs.org"
  exit 1
fi
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "${RED}✗ Потрібен Node.js 18+. Поточна версія: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# ── Перевірка pnpm ───────────────────────────────────────────
if ! command -v pnpm &> /dev/null; then
  echo -e "${YELLOW}▶ Встановлення pnpm...${NC}"
  npm install -g pnpm
fi
echo -e "${GREEN}✓ pnpm $(pnpm -v)${NC}"

# ── Вибір режиму розгортання ─────────────────────────────────
echo ""
echo -e "${BOLD}Оберіть режим розгортання:${NC}"
echo ""
echo -e "  ${CYAN}1)${NC} Docker  — локальний сервер (рекомендовано для продакшну)"
echo -e "  ${CYAN}2)${NC} Vercel  — хмарний деплой (безкоштовно, потрібен GitHub)"
echo -e "  ${CYAN}3)${NC} Dev     — локальна розробка без Docker"
echo ""
read -rp "Ваш вибір [1/2/3]: " MODE
echo ""

# ════════════════════════════════════════════════════════════
#  РЕЖИМ 1: DOCKER
# ════════════════════════════════════════════════════════════
if [ "$MODE" = "1" ]; then

  if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker не знайдено.${NC}"
    echo -e "  Встановіть: https://docs.docker.com/get-docker/"
    exit 1
  fi
  echo -e "${GREEN}✓ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')${NC}"

  if [ ! -f .env ]; then
    echo -e "${YELLOW}▶ Генерація .env...${NC}"
    cp .env.example .env 2>/dev/null || touch .env

    CRON_SECRET=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    DB_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)

    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/STRONG_PASSWORD/${DB_PASS}/g" .env 2>/dev/null || true
      sed -i '' "s/random-secret-string-here/${CRON_SECRET}/" .env 2>/dev/null || true
      sed -i '' "s/another-random-secret/${NEXTAUTH_SECRET}/" .env 2>/dev/null || true
      sed -i '' "s|APP_URL=.*|APP_URL=http://localhost:3000|" .env 2>/dev/null || true
      sed -i '' "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://localhost:3000|" .env 2>/dev/null || true
      sed -i '' "s/strong-admin-password/admin123/" .env 2>/dev/null || true
    else
      sed -i "s/STRONG_PASSWORD/${DB_PASS}/g" .env 2>/dev/null || true
      sed -i "s/random-secret-string-here/${CRON_SECRET}/" .env 2>/dev/null || true
      sed -i "s/another-random-secret/${NEXTAUTH_SECRET}/" .env 2>/dev/null || true
      sed -i "s|APP_URL=.*|APP_URL=http://localhost:3000|" .env 2>/dev/null || true
      sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://localhost:3000|" .env 2>/dev/null || true
      sed -i "s/strong-admin-password/admin123/" .env 2>/dev/null || true
    fi

    echo -e "${GREEN}✓ .env створено${NC}"
    echo -e "${YELLOW}  Логін адміна: admin / admin123${NC}"
    echo -e "${YELLOW}  ⚠ Змініть ADMIN_PASS перед продакшном!${NC}"
  else
    echo -e "${GREEN}✓ .env вже існує${NC}"
  fi

  echo ""
  echo -e "${YELLOW}▶ Запуск Docker Compose...${NC}"
  docker compose up -d --build

  echo ""
  echo -e "${GREEN}════════════════════════════════════════════${NC}"
  echo -e "${GREEN}${BOLD}✓ Сервер запущено!${NC}"
  echo ""
  echo -e "  Оператор КПП:  ${CYAN}http://localhost:3000${NC}"
  echo -e "  Адмін-панель:  ${CYAN}http://localhost:3000/admin${NC}"
  echo ""
  echo -e "${YELLOW}  Для доступу з планшету (без домену):${NC}"
  echo -e "  ${CYAN}cloudflared tunnel --url http://localhost:3000${NC}"
  echo -e "${GREEN}════════════════════════════════════════════${NC}"

# ════════════════════════════════════════════════════════════
#  РЕЖИМ 2: VERCEL
# ════════════════════════════════════════════════════════════
elif [ "$MODE" = "2" ]; then

  echo -e "${BLUE}══ Розгортання на Vercel ══════════════════${NC}"
  echo ""
  echo -e "${YELLOW}Перед деплоєм потрібно:${NC}"
  echo -e "  1. Акаунт на ${CYAN}vercel.com${NC}"
  echo -e "  2. Безкоштовна PostgreSQL БД — ${CYAN}supabase.com${NC} або ${CYAN}neon.tech${NC}"
  echo -e "  3. Код завантажено на GitHub"
  echo ""
  read -rp "Продовжити? [y/N]: " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Скасовано."
    exit 0
  fi

  echo ""
  echo -e "${YELLOW}▶ Перевірка Vercel CLI...${NC}"
  if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}  Встановлення vercel CLI...${NC}"
    npm install -g vercel
  fi
  echo -e "${GREEN}✓ Vercel CLI $(vercel --version 2>/dev/null | head -1)${NC}"

  echo ""
  echo -e "${YELLOW}▶ Встановлення залежностей...${NC}"
  pnpm install
  echo -e "${GREEN}✓ Залежності встановлено${NC}"

  CRON_SECRET=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  ADMIN_PASS="admin123"

  echo ""
  echo -e "${YELLOW}▶ Логін у Vercel...${NC}"
  vercel login

  echo ""
  echo -e "${YELLOW}▶ Ініціалізація проекту Vercel...${NC}"
  vercel link

  echo ""
  echo -e "${CYAN}Введіть DATABASE_URL (наприклад, з Supabase або Neon):${NC}"
  echo -e "  Supabase: Project Settings → Database → Connection string → URI"
  echo -e "  Neon: Dashboard → Connection string"
  echo -e "  Формат: ${YELLOW}postgresql://user:pass@host:port/dbname?sslmode=require${NC}"
  echo ""
  read -rp "DATABASE_URL: " DATABASE_URL

  if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ DATABASE_URL не може бути порожнім${NC}"
    exit 1
  fi

  echo ""
  echo -e "${YELLOW}▶ Встановлення змінних у Vercel (production + preview + development)...${NC}"

  for ENV_TYPE in production preview development; do
    echo "$DATABASE_URL"    | vercel env add DATABASE_URL    "$ENV_TYPE" --force 2>/dev/null || true
    echo "$CRON_SECRET"     | vercel env add CRON_SECRET     "$ENV_TYPE" --force 2>/dev/null || true
    echo "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET "$ENV_TYPE" --force 2>/dev/null || true
    echo "admin"            | vercel env add ADMIN_USER      "$ENV_TYPE" --force 2>/dev/null || true
    echo "$ADMIN_PASS"      | vercel env add ADMIN_PASS      "$ENV_TYPE" --force 2>/dev/null || true
  done

  echo -e "${GREEN}✓ Змінні встановлено${NC}"

  echo ""
  echo -e "${YELLOW}▶ Генерація Prisma client...${NC}"
  DATABASE_URL="$DATABASE_URL" pnpm exec prisma generate
  echo -e "${GREEN}✓ Prisma client згенеровано${NC}"

  echo ""
  echo -e "${YELLOW}▶ Застосування міграцій до БД...${NC}"
  DATABASE_URL="$DATABASE_URL" pnpm exec prisma migrate deploy 2>/dev/null || \
  DATABASE_URL="$DATABASE_URL" pnpm exec prisma db push
  echo -e "${GREEN}✓ БД ініціалізовано${NC}"

  echo ""
  echo -e "${YELLOW}▶ Деплой на Vercel (production)...${NC}"
  DEPLOY_OUTPUT=$(vercel deploy --prod 2>&1)
  DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -E "^https://" | tail -1 | tr -d ' ')

  if [ -n "$DEPLOY_URL" ]; then
    echo ""
    echo -e "${YELLOW}▶ Оновлення APP_URL → ${DEPLOY_URL}...${NC}"
    for ENV_TYPE in production preview development; do
      echo "$DEPLOY_URL" | vercel env add APP_URL      "$ENV_TYPE" --force 2>/dev/null || true
      echo "$DEPLOY_URL" | vercel env add NEXTAUTH_URL "$ENV_TYPE" --force 2>/dev/null || true
    done
    vercel deploy --prod --no-wait 2>/dev/null || true
  fi

  echo ""
  echo -e "${GREEN}════════════════════════════════════════════${NC}"
  echo -e "${GREEN}${BOLD}✓ Деплой на Vercel завершено!${NC}"
  echo ""
  if [ -n "$DEPLOY_URL" ]; then
    echo -e "  Оператор КПП:  ${CYAN}${DEPLOY_URL}${NC}"
    echo -e "  Адмін-панель:  ${CYAN}${DEPLOY_URL}/admin${NC}"
  else
    echo -e "  URL у Vercel Dashboard → Deployments"
  fi
  echo ""
  echo -e "${YELLOW}  Логін адміна: admin / ${ADMIN_PASS}${NC}"
  echo -e "${YELLOW}  ⚠ Змініть ADMIN_PASS: Vercel Dashboard → Settings → Environment Variables${NC}"
  echo ""
  echo -e "${YELLOW}  Cron (щоденна перевірка пропусків) — автоматично через vercel.json${NC}"
  echo -e "${YELLOW}  PWA: відкрийте URL в Chrome → меню ⋮ → 'Встановити додаток'${NC}"
  echo -e "${GREEN}════════════════════════════════════════════${NC}"

# ════════════════════════════════════════════════════════════
#  РЕЖИМ 3: DEV
# ════════════════════════════════════════════════════════════
elif [ "$MODE" = "3" ]; then

  echo -e "${YELLOW}▶ Режим локальної розробки${NC}"
  echo ""

  if [ ! -f .env ]; then
    cp .env.example .env 2>/dev/null || touch .env
    echo -e "${YELLOW}  Відредагуйте .env — вкажіть DATABASE_URL для локального PostgreSQL${NC}"
    echo -e "  Приклад: ${CYAN}postgresql://postgres:password@localhost:5432/checkpoint_db${NC}"
    echo ""
    read -rp "Натисніть Enter після редагування .env..."
  fi

  echo -e "${YELLOW}▶ Встановлення залежностей...${NC}"
  pnpm install

  echo -e "${YELLOW}▶ Генерація Prisma client...${NC}"
  pnpm exec prisma generate

  echo -e "${YELLOW}▶ Запуск міграцій...${NC}"
  pnpm exec prisma migrate dev --name init 2>/dev/null || pnpm exec prisma migrate deploy

  echo ""
  echo -e "${GREEN}✓ Готово! Запуск dev-сервера...${NC}"
  echo -e "  Адреса: ${CYAN}http://localhost:3000${NC}"
  echo ""
  pnpm run dev

else
  echo -e "${RED}✗ Невідомий вибір. Введіть 1, 2 або 3.${NC}"
  exit 1
fi
