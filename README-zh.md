# DuDu Admin

**语言版本**: [English](README.md) | [中文](README-zh.md)

## 项目概述

`dudu-admin` 是 `dudu-admin-api` 的后台管理前端项目，基于 Vue 3、Vite、Element Plus、Axios、Pinia 构建，
当前覆盖后台登录鉴权、个人资料、用户、角色、权限、菜单、操作记录等能力。

- 前端仓库: `https://github.com/seakee/dudu-admin`
- 后端仓库: `https://github.com/seakee/dudu-admin-api`
- 推荐本地前端地址: `http://localhost:3000`
- 推荐本地后端地址: `http://127.0.0.1:8080`
- 默认 API 路由前缀: `/dudu-admin-api`

## 快速开始

### 运行依赖

- Node.js
- npm
- 用于真实接口联调的 `dudu-admin-api` 服务

### 本地运行

```bash
git clone https://github.com/seakee/dudu-admin.git
cd dudu-admin

npm run init
npm run dev
```

Vite 开发服务器默认监听 `http://localhost:3000`。

## 与后端联调

### 推荐本地联调顺序

1. 启动后端项目 [`dudu-admin-api`](https://github.com/seakee/dudu-admin-api)。
2. 确保后端生效路由前缀与前端 API 前缀保持一致。
3. 执行 `npm run check:backend` 校验本地联调契约。
4. 执行 `npm run dev` 启动前端。
5. 打开 `http://localhost:3000` 进行联调。

### 前端环境变量

当前默认值：

```env
VITE_API_BASE_URL=/
VITE_API_ROUTE_PREFIX=/dudu-admin-api
VITE_USE_MOCK=false
```

在默认配置下，Vite 开发服务器会把 `/{apiPrefix}` 请求代理到 `http://127.0.0.1:8080`。

### 后端需保持对齐的配置

采用默认本地联调方案时，建议确认后端配置为：

- `system.route_prefix = dudu-admin-api`
- `system.http_port = :8080`
- `system.admin.oauth.redirect_url` 指向当前前端回调路由 `/auth/callback`，例如 `http://localhost:3000/auth/callback`
- `system.admin.webauthn.rp_origins` 包含 `http://localhost:3000`

相关后端文档：

- [dudu-admin-api README](https://github.com/seakee/dudu-admin-api/blob/main/README-zh.md)
- [后端开发指南](https://github.com/seakee/dudu-admin-api/blob/main/docs/Development-Guide-zh.md)
- [后台鉴权文档](https://github.com/seakee/dudu-admin-api/blob/main/docs/Admin-Auth-zh.md)
- [系统管理接口文档](https://github.com/seakee/dudu-admin-api/blob/main/docs/Admin-System-Management-zh.md)

## 开发命令

```bash
npm run init
npm run check:backend
npm run dev
npm run build
npm run preview
npm run lint
```

> `npm run lint` 当前会携带 ESLint 的 `--fix`，会自动修改文件。

如果只想本地看界面、不接真实后端，可直接使用 Mock：

```bash
VITE_USE_MOCK=true npm run dev
```

## 项目文档

- [后台鉴权说明（中文）](docs/Admin-Auth-zh.md)
- [Admin Auth Notes (EN)](docs/Admin-Auth.md)
- [系统管理接口说明（中文）](docs/Admin-System-Management-zh.md)
- [Admin System Management Notes (EN)](docs/Admin-System-Management.md)

## 相关项目

- [dudu-admin-api](https://github.com/seakee/dudu-admin-api)
