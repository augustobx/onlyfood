# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM base AS builder
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV NODE_ENV=production \
    DATABASE_URL=mysql://build:build@127.0.0.1:3306/build \
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY}
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN ./node_modules/.bin/prisma generate \
    && npm run build

# Production migration image. It never runs seeds and is not part of the
# default production Compose startup.
FROM base AS database-migrate
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
CMD ["sh", "-c", "./node_modules/.bin/prisma generate && ./node_modules/.bin/prisma migrate deploy"]

# Local Docker initialization preserves the project's existing opt-in seed.
FROM database-migrate AS database-init
COPY scripts ./scripts
CMD ["sh", "-c", "./node_modules/.bin/prisma generate && ./node_modules/.bin/prisma migrate deploy && node scripts/seed-saas.mjs"]

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    TZ=America/Argentina/Buenos_Aires

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
