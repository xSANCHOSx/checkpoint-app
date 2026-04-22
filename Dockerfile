# ── Стадія 1: залежності ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Копіюємо тільки файли залежностей для кешування шарів
COPY package*.json ./
RUN npm ci --frozen-lockfile

# ── Стадія 2: збірка ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Генеруємо Prisma client перед збіркою
RUN npx prisma generate

# Збираємо Next.js додаток
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Стадія 3: продакшн ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Створюємо системного користувача (безпека)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Копіюємо тільки необхідне для запуску
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
