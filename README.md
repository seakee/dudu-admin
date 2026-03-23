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
