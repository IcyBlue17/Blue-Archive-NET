# AquaNet v2 (React + Cloudflare Kumo)

面向 AquaDX 后端的 Web 控制台：用户账号、卡片、设置、排行榜、数据迁移与 **管理员 API**（用户管理、CHUNITHM 登录奖励与解锁挑战）。

## 开发

```bash
bun install
cp .env.example .env
# 编辑 .env：至少设置 VITE_AQUA_HOST（后端地址）、VITE_TURNSTILE_SITE_KEY（生产必填）
bun run dev
```

开发时 Vite 已将 `/api`、`/uploads` 代理到 `http://127.0.0.1:8080`，可与本机后端联调。

## 构建

```bash
bun run build
bun run preview
```

将 `dist/` 部署到任意静态托管，并保证 `VITE_AQUA_HOST` 指向可访问的后端（含 CORS）。

## 图片 CDN / 鉴权入口

支持把图片单独切到对象存储 / CDN 域名：

```bash
VITE_IMAGE_HOST=https://img.example.com
```

打开后，现有的曲绘、CHUNITHM 静态资源、头像、站点品牌图都会统一改到这个图片域名。

- 如果你要走同域 cookie / JWT 鉴权入口，可继续配置：

```bash
VITE_IMAGE_HOST=https://img.example.com
VITE_IMAGE_AUTH=on
VITE_IMAGE_AUTH_PREFIX=/img
```

- 前端这里只负责图片域名切换。
- 开启 `VITE_IMAGE_AUTH` 后，静态图片会统一改成同域路径，例如 `/img/chu3-assets/...`。
- 浏览器会自动带上同域 cookie，所以适合让 EdgeOne Middleware / Edge Function 去验用户 JWT。
- `/api/...`、`/uploads/...` 这类后端动态资源不会被这层改写，避免把现有接口图片流量带坏。

## 技术栈

- React 19 + TypeScript + Vite 8
- `@cloudflare/kumo` + Tailwind CSS v4
- React Router 7
- `@marsidev/react-turnstile`（登录/注册）

## 与后端约定

- **用户 API**：`POST`，`token` 放在 **URL query**（与旧版 AquaNet 一致）。
- **管理 API**：请求头 `Authorization: Bearer <jwt>`，且用户名需在服务端 `aqua.admin.usernames` 白名单。

## 旧版

原 Svelte 前端仍位于仓库根目录 `aquaNet/`。
