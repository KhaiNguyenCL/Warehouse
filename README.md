# Warehouse Management System (WMS)
**DNS Technology Invest Co., Ltd**

Hệ thống quản lý kho cho thiết bị công nghệ và linh kiện mạng. Quản lý tồn kho real-time, theo dõi serial number, số hoá quy trình báo giá và tích hợp Bitrix CRM.

---

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Backend | Node.js + Fastify + TypeScript |
| Frontend | React + Vite + shadcn/ui + Tailwind CSS v4 |
| Database | PostgreSQL 16 (Docker) |
| Query | Knex.js |
| Template | Carbone.io (xuất Excel/PDF) |
| Monorepo | pnpm workspaces |

---

## Yêu cầu

- Node.js 20+
- pnpm 9+
- Docker Desktop

---

## Cài đặt

### 1. Clone và cài dependencies

```bash
git clone <repo-url>
cd Warehouse
pnpm install
```

### 2. Khởi động PostgreSQL

```bash
docker run -d --name wms-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5435:5432 \
  postgres:16-alpine
```

### 3. Tạo databases

```bash
docker exec wms-postgres psql -U postgres -c "CREATE DATABASE wms_db;"
docker exec wms-postgres psql -U postgres -c "CREATE DATABASE wms_test_db;"
```

### 4. Cấu hình environment

Tạo file `.env` ở root dự án:

```env
# Database
DB_HOST=localhost
DB_PORT=5435
DB_NAME=wms_db
DB_USER=postgres
DB_PASSWORD=postgres

# Test database
DB_TEST_HOST=localhost
DB_TEST_PORT=5435
DB_TEST_NAME=wms_test_db
DB_TEST_USER=postgres
DB_TEST_PASSWORD=postgres

# Server
PORT=3002
NODE_ENV=development

# JWT — đổi thành chuỗi bí mật ngẫu nhiên
JWT_SECRET=your-secret-key-here

# Bitrix CRM webhook URL (chỉ đọc)
BITRIX_WEBHOOK_URL=https://erp.dnsvn.com/rest/78/<api_key>/
```

### 5. Chạy migration

```bash
pnpm migrate
```

> Migration tạo toàn bộ schema từ `backend/migrations/001_initial_schema.sql`. Chạy thêm cho test DB:
> ```bash
> cd apps/backend && DB_NAME=wms_test_db DB_PORT=5435 pnpm migrate:latest
> ```

---

## Chạy development

Mở **2 terminal**:

```bash
# Terminal 1 — Backend API (port 3002)
pnpm dev:backend

# Terminal 2 — Frontend (port 5173)
pnpm dev:web
```

Truy cập: [http://localhost:5173](http://localhost:5173)

API: [http://localhost:3002](http://localhost:3002)

---

## Scripts

| Command | Mô tả |
|---|---|
| `pnpm dev:backend` | Khởi động backend với hot-reload |
| `pnpm dev:web` | Khởi động frontend Vite |
| `pnpm dev:mobile` | Khởi động Expo (mobile) |
| `pnpm migrate` | Chạy Knex migration (wms_db) |
| `pnpm typecheck` | Kiểm tra TypeScript toàn monorepo |
| `cd apps/backend && pnpm test` | Chạy test suite |

---

## Cấu trúc dự án

```
/
├── apps/
│   ├── backend/          — Fastify API (port 3002)
│   ├── web/              — React frontend (port 5173)
│   └── mobile/           — React Native + Expo
├── backend/
│   └── migrations/
│       └── 001_initial_schema.sql   — Schema SQL tổng hợp (squashed)
├── packages/
│   ├── types/            — Shared TypeScript interfaces
│   └── utils/            — Shared validators
└── docs/                 — BRD, workflow diagrams
```

Xem `CLAUDE.md` để hiểu đầy đủ business logic, quy trình nghiệp vụ và architecture.

---

## Database

### Backup

```bash
docker exec wms-postgres pg_dump -U postgres wms_db > wms_db_backup_$(date +%Y%m%d).sql
```

### Restore từ backup

```bash
docker cp backup.sql wms-postgres:/tmp/dump.sql
docker exec wms-postgres psql -U postgres -c "DROP DATABASE IF EXISTS wms_db; CREATE DATABASE wms_db;"
docker exec wms-postgres psql -U postgres wms_db -f /tmp/dump.sql
```

### Thêm migration mới

```bash
cd apps/backend
pnpm migrate:make ten_migration_moi
# Sửa file migration vừa tạo, rồi:
pnpm migrate:latest
# Apply thêm cho test DB:
DB_NAME=wms_test_db pnpm migrate:latest
```

---

## Restore trên máy mới

```bash
# 1. Chạy container
docker run -d --name wms-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5435:5432 \
  postgres:16-alpine

# 2. Restore từ file backup
docker cp wms_db_backup.sql wms-postgres:/tmp/dump.sql
docker exec wms-postgres psql -U postgres -c "CREATE DATABASE wms_db;"
docker exec wms-postgres psql -U postgres wms_db -f /tmp/dump.sql

# 3. Tạo test DB (schema only)
docker exec wms-postgres psql -U postgres -c "CREATE DATABASE wms_test_db;"
cd apps/backend && DB_NAME=wms_test_db pnpm migrate:latest

# 4. Cài dependencies và chạy
pnpm install
pnpm dev:backend  # terminal 1
pnpm dev:web      # terminal 2
```
