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

## 图片签名

支持构建时开关图片签名：

```bash
VITE_IMAGE_SIGNING=on
```

打开后，前端所有图片 URL 会统一改走 `/_img?u=原始地址`，由同仓库的服务端函数代签并回源取图。这样浏览器里不会暴露 AWS Secret。

常用环境变量：

```bash
VITE_IMAGE_SIGNING=on
VITE_IMAGE_SIGN_DEV=off
VITE_IMAGE_SIGN_PATH=/_img

IMAGE_SIGN_ALLOW_HOSTS=blue-archive.icybit.cn,aquadx.net,aqua.icybit.cn
IMAGE_SIGN_AWS_HOSTS=img.example.com
IMAGE_SIGN_AWS_ACCESS_KEY_ID=...
IMAGE_SIGN_AWS_SECRET_ACCESS_KEY=...
IMAGE_SIGN_AWS_SESSION_TOKEN=
IMAGE_SIGN_AWS_REGION=ap-shanghai
IMAGE_SIGN_AWS_SERVICE=s3
```

- `IMAGE_SIGN_ALLOW_HOSTS`：代理允许访问的图片域名白名单。
- `IMAGE_SIGN_AWS_HOSTS`：这些域名会额外套 AWS Signature V4。
- 如果你已经配置了 `VITE_DATA_HOST` / `VITE_AQUA_HOST`，服务端函数会自动把这两个域名加入允许列表。
- 本地 `bun run dev` 默认不走签名代理；如需本地联调，再把 `VITE_IMAGE_SIGN_DEV=on`。

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
