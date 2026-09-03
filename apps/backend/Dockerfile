# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/backend/package.json   ./apps/backend/

RUN pnpm install --frozen-lockfile

COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY apps/backend   ./apps/backend

RUN cd apps/backend && pnpm build

# ── Stage 2: Production ────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/backend/package.json   ./apps/backend/

# --prod install (tsx đã được chuyển sang dependencies nên có sẵn)
RUN pnpm install --frozen-lockfile --prod

# Compiled app
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Source migrations + knexfile.ts — tsx cần file .ts gốc để migrate
# (knex_migrations table lưu tên .ts, không thể dùng compiled .js)
COPY apps/backend/migrations ./apps/backend/migrations
COPY apps/backend/knexfile.ts ./apps/backend/

COPY apps/backend/entrypoint.sh ./apps/backend/
RUN chmod +x ./apps/backend/entrypoint.sh

RUN mkdir -p ./apps/backend/uploads/images ./apps/backend/uploads/files

WORKDIR /app/apps/backend
EXPOSE 3002
ENTRYPOINT ["./entrypoint.sh"]
