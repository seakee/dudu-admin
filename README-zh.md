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

### Docker / Compose 本地联调

如果你希望直接启动完整的本地联调栈，可以使用仓库内的 `compose.yml`。当前编排包含：

- `frontend`：当前前端项目，使用 Nginx 托管构建产物并反向代理 `/dudu-admin-api`
- `backend`：本地 `dudu-admin-api` 仓库
- `mysql`：后端初始化所需数据库
- `redis`：后端缓存依赖

使用前请确认：

- 已安装 Docker 与 Docker Compose
- 本机已存在 `dudu-admin-api` 仓库
- 若目录结构与当前示例不同，请先调整 `.env.compose.example` 中的 `DUDU_ADMIN_API_DIR`

启动：

```bash
docker compose --env-file .env.compose.example up --build -d
```

查看状态：

```bash
docker compose --env-file .env.compose.example ps
```

停止并清理容器网络：

```bash
docker compose --env-file .env.compose.example down
```

如果你希望连同 MySQL / Redis 数据卷一起清空，并重新执行初始化 SQL：

```bash
docker compose --env-file .env.compose.example down -v
```

默认访问地址：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8080`
- 后端健康检查：`http://localhost:8080/dudu-admin-api/external/ping`
- 通过前端代理访问后端健康检查：`http://localhost:3000/dudu-admin-api/external/ping`

默认本地管理员：

- 显示用户名：`local-admin`
- 登录邮箱：`local-admin@example.com`
- 登录手机号：`13800000000`
- 明文密码：`LocalAdmin123!`

补充说明：

- Compose 会通过 `docker/backend/local.json` 模板和 `docker/backend/start.sh` 生成后端最终配置
- `backend` 已增加 healthcheck，`frontend` 会等待后端健康后再进入依赖链
- MySQL 会先执行后端仓库中的 `bin/data/sql/mysql/init.sql`，再执行当前仓库的 `docker/mysql/02-local-admin.sql` 覆盖本地管理员信息
- `.env.compose.example` 中统一维护本地 MySQL 密码和 JWT 密钥；本地管理员示例账号定义在 `docker/mysql/02-local-admin.sql`
- 上述示例值仅用于本地联调，不适用于生产环境

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
