# ── Stage 1: Build React app ──────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/web/package.json        ./apps/web/

RUN pnpm install --frozen-lockfile

COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY apps/web       ./apps/web

RUN cd apps/web && pnpm build

# ── Stage 2: Serve với nginx ───────────────────────────────────────────────────
FROM nginx:alpine AS production

# Copy React build
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# nginx config: serve static + proxy /api và /uploads sang backend
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
