# DuDu Admin

**Languages**: [English](README.md) | [中文](README-zh.md)

## Overview

`dudu-admin` is the admin frontend project for `dudu-admin-api`, built with Vue 3, Vite, Element Plus, Axios, and Pinia.
It currently covers admin authentication, profile management, users, roles, permissions, menus, and operation records.

- Frontend repository: `https://github.com/seakee/dudu-admin`
- Backend repository: `https://github.com/seakee/dudu-admin-api`
- Recommended local frontend address: `http://localhost:3000`
- Recommended local backend address: `http://127.0.0.1:8080`
- Default API route prefix: `/dudu-admin-api`

## Quick Start

### Requirements

- Node.js
- npm
- A running `dudu-admin-api` service for real API integration

### Run Locally

```bash
git clone https://github.com/seakee/dudu-admin.git
cd dudu-admin

npm run init
npm run dev
```

The Vite dev server listens on `http://localhost:3000`.

### Docker / Compose Local Integration

If you want to boot the full local integration stack directly, use the repository `compose.yml`. The current setup contains:

- `frontend`: the current frontend project, served by Nginx and proxying `/dudu-admin-api`
- `backend`: the local `dudu-admin-api` repository
- `mysql`: the database required by backend initialization
- `redis`: the cache dependency used by the backend

Before using it, make sure:

- Docker and Docker Compose are installed
- the `dudu-admin-api` repository already exists on your machine
- if your directory layout differs from the example, update `DUDU_ADMIN_API_DIR` in `.env.compose.example`

Start the stack:

```bash
docker compose --env-file .env.compose.example up --build -d
```

Check service status:

```bash
docker compose --env-file .env.compose.example ps
```

Stop the stack and remove the network:

```bash
docker compose --env-file .env.compose.example down
```

If you also want to remove MySQL / Redis volumes and rerun initialization SQL from scratch:

```bash
docker compose --env-file .env.compose.example down -v
```

Default URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- Backend health check: `http://localhost:8080/dudu-admin-api/external/ping`
- Backend health check through the frontend proxy: `http://localhost:3000/dudu-admin-api/external/ping`

Default local admin account:

- Display username: `local-admin`
- Login email: `local-admin@example.com`
- Login phone: `13800000000`
- Plain-text password: `LocalAdmin123!`

Additional notes:

- Compose generates the final backend config from `docker/backend/local.json` and `docker/backend/start.sh`
- `backend` now has a healthcheck, and `frontend` waits for backend health before entering the dependency chain
- MySQL first runs `bin/data/sql/mysql/init.sql` from the backend repository, then runs `docker/mysql/02-local-admin.sql` from this repository to override the local admin record
- `.env.compose.example` is now the single place for local MySQL passwords and JWT secrets; the sample local admin account is defined in `docker/mysql/02-local-admin.sql`
- These example values are for local development only and must not be used in production

## Backend Integration

### Recommended Local Workflow

1. Start the backend project [`dudu-admin-api`](https://github.com/seakee/dudu-admin-api).
2. Keep the backend route prefix aligned with the frontend API prefix.
3. Run `npm run check:backend` to verify local linkage contracts.
4. Start the frontend with `npm run dev`.
5. Open `http://localhost:3000`.

### Frontend Environment Variables

Current defaults:

```env
VITE_API_BASE_URL=/
VITE_API_ROUTE_PREFIX=/dudu-admin-api
VITE_USE_MOCK=false
```

With the default configuration, the Vite dev server proxies `/{apiPrefix}` requests to `http://127.0.0.1:8080`.

### Backend Configuration That Must Stay Aligned

When using the default local integration setup, confirm these backend values:

- `system.route_prefix = dudu-admin-api`
- `system.http_port = :8080`
- `system.admin.oauth.redirect_url` points to the current frontend callback route `/auth/callback`, for example `http://localhost:3000/auth/callback`
- `system.admin.webauthn.rp_origins` contains `http://localhost:3000`

See the backend setup and API docs:

- [dudu-admin-api README](https://github.com/seakee/dudu-admin-api/blob/main/README.md)
- [Backend Development Guide](https://github.com/seakee/dudu-admin-api/blob/main/docs/Development-Guide.md)
- [Backend Admin Auth Doc](https://github.com/seakee/dudu-admin-api/blob/main/docs/Admin-Auth.md)
- [Backend Admin System Management Doc](https://github.com/seakee/dudu-admin-api/blob/main/docs/Admin-System-Management.md)

## Development Commands

```bash
npm run init
npm run check:backend
npm run dev
npm run build
npm run preview
npm run lint
```

> `npm run lint` uses ESLint with `--fix` and will modify files automatically.

For UI-only local debugging without backend linkage:

```bash
VITE_USE_MOCK=true npm run dev
```

## Project Docs

- [Admin Auth Notes (ZH)](docs/Admin-Auth-zh.md)
- [Admin Auth Notes (EN)](docs/Admin-Auth.md)
- [Admin System Management Notes (ZH)](docs/Admin-System-Management-zh.md)
- [Admin System Management Notes (EN)](docs/Admin-System-Management.md)

## Related Projects

- [dudu-admin-api](https://github.com/seakee/dudu-admin-api)
