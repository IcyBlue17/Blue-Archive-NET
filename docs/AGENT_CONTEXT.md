# AGENT_CONTEXT

Agent-facing summary of the current React frontend in [`src/`](/workspaces/Blue-Archive-NET/src). This is a behavior-preservation document first, not a redesign brief.

## Scope

- The active app is the Vite + React frontend under [`src/`](/workspaces/Blue-Archive-NET/src).
- [`README.md`](/workspaces/Blue-Archive-NET/README.md) still mentions an older Svelte frontend at `aquaNet/`, but that directory is not present in this checkout.
- Assume the worktree may be dirty. Do not revert unrelated edits made by other people.
- When refactoring, preserve business logic and backend contracts before improving structure or styling.

## Stack And Architecture

- Runtime stack: React 19, TypeScript, Vite 8, React Router 7, TanStack Query, Cloudflare Kumo UI, Tailwind v4.
- Entry point: [`src/main.tsx`](/workspaces/Blue-Archive-NET/src/main.tsx) sets `document.title`, mounts `<App />`, and includes Vercel Analytics + Speed Insights.
- App shell: [`src/App.tsx`](/workspaces/Blue-Archive-NET/src/App.tsx) wraps the app with:
  - `I18nProvider`
  - `ThemeProvider`
  - `QueryClientProvider`
  - `AuthProvider`
  - `Toasty`
  - `BrowserRouter`
- Data flow is mostly page/component driven:
  - `src/api/*` contains thin fetch wrappers.
  - `src/lib/*` contains formatting, config, asset helpers, and domain-specific UI logic.
  - `src/pages/*` composes the actual business flows.
- There is no path alias setup. Imports are relative.
- TypeScript is strict in [`tsconfig.app.json`](/workspaces/Blue-Archive-NET/tsconfig.app.json).

## Source Layout

- [`src/api/`](/workspaces/Blue-Archive-NET/src/api): backend and CDN fetch wrappers.
- [`src/components/`](/workspaces/Blue-Archive-NET/src/components): reusable UI and feature components.
- [`src/content/texts.ts`](/workspaces/Blue-Archive-NET/src/content/texts.ts): main UI copy dictionary for `zh` and `en`.
- [`src/hooks/`](/workspaces/Blue-Archive-NET/src/hooks): auth/admin hooks and re-exports.
- [`src/layouts/`](/workspaces/Blue-Archive-NET/src/layouts): route shells.
- [`src/lib/`](/workspaces/Blue-Archive-NET/src/lib): config, theme, i18n, query keys, asset helpers, formatting, shared types.
- [`src/pages/`](/workspaces/Blue-Archive-NET/src/pages): route-level pages.

## Routing Map

Routes are declared centrally in [`src/App.tsx`](/workspaces/Blue-Archive-NET/src/App.tsx).

- `/`
  - Redirects to `/home` if `isLoggedIn()` sees a token in localStorage.
  - Redirects to `/login` otherwise.
- Auth layout under [`src/layouts/AuthLayout.tsx`](/workspaces/Blue-Archive-NET/src/layouts/AuthLayout.tsx)
  - `/login`
  - `/register`
  - `/oauth/callback`
  - `/reset-password`
  - `/verify`
  - `/change-password`
- Public profile routes
  - `/u/:username`
  - `/u/:username/:game`
- Authenticated app under `RequireAuth` + [`src/layouts/DashboardLayout.tsx`](/workspaces/Blue-Archive-NET/src/layouts/DashboardLayout.tsx)
  - `/home`
  - `/cards`
  - `/setup`
  - `/support`
  - `/transfer`
  - `/collectibles`
  - `/pictures`
  - `/ranking` -> redirects to `/ranking/chu3`
  - `/ranking/:game`
  - `/games` -> redirects to `/games/chu3`
  - `/games/:game`
  - `/games/:game/:section`
  - `/team`
  - `/friends`
  - `/settings` -> redirects to `/settings/profile`
  - `/settings/:page`
- Admin area
  - `/admin` is nested inside the authenticated dashboard shell.
  - `AdminGuard` checks admin status before rendering.
  - [`src/layouts/AdminLayout.tsx`](/workspaces/Blue-Archive-NET/src/layouts/AdminLayout.tsx) provides overview/users/login-bonus/unlock-challenge/download-order navigation.
- Fallback
  - `*` -> `PageNotFound`

## Layouts And Cross-Cutting State

- `RequireAuth` only checks token presence, not full user identity. Do not silently change this gate without checking downstream assumptions.
- `AuthProvider` in [`src/components/auth/AuthProvider.tsx`](/workspaces/Blue-Archive-NET/src/components/auth/AuthProvider.tsx) owns:
  - `me` query loading
  - logout
  - refresh
  - JWT-to-image-cookie sync
- `useAdmin` in [`src/hooks/useAdmin.ts`](/workspaces/Blue-Archive-NET/src/hooks/useAdmin.ts) separately calls admin status.
- Theme state lives in [`src/lib/theme.tsx`](/workspaces/Blue-Archive-NET/src/lib/theme.tsx) and persists to localStorage key `aquanet-theme`.
- Locale state lives in [`src/lib/i18n.tsx`](/workspaces/Blue-Archive-NET/src/lib/i18n.tsx) and persists to localStorage key `locale`.
- React Query defaults are in [`src/lib/query.ts`](/workspaces/Blue-Archive-NET/src/lib/query.ts):
  - `staleTime`: 10 minutes
  - `gcTime`: 30 minutes
  - refetch-on-focus/mount/reconnect disabled
  - mutations do not retry

## Major Page Areas

- Home: [`src/pages/dashboard/Home.tsx`](/workspaces/Blue-Archive-NET/src/pages/dashboard/Home.tsx)
  - Dashboard landing page.
  - Shows game summary cards and a CHUNITHM profile card when data exists.
  - Home completion uses `CHU3_COMPLETE_MAX = 50000`.
- Cards: [`src/pages/dashboard/LinkCard.tsx`](/workspaces/Blue-Archive-NET/src/pages/dashboard/LinkCard.tsx)
  - Binds and unbinds cards.
  - Shows ghost card summary.
  - Current default migrate list is `mai2,chu3`; preserve unless product logic changes intentionally.
- Setup: [`src/pages/dashboard/Setup.tsx`](/workspaces/Blue-Archive-NET/src/pages/dashboard/Setup.tsx)
  - Shows connection address, generated `segatools.ini` example, and keychip allocation.
- Transfer: [`src/pages/dashboard/Transfer.tsx`](/workspaces/Blue-Archive-NET/src/pages/dashboard/Transfer.tsx)
  - Validates remote server params.
  - Pulls exports via streaming responses.
  - Pushes pasted or pulled JSON back to the backend.
- Collectibles: [`src/pages/dashboard/Collectibles.tsx`](/workspaces/Blue-Archive-NET/src/pages/dashboard/Collectibles.tsx)
  - CHUNITHM appearance/item management.
  - Uses both owned items and optional full catalog loading.
  - Hides `frameId` from the web UI on purpose.
  - Persists "unlock all" UI state in localStorage.
- Pictures: [`src/pages/games/MaiPhoto.tsx`](/workspaces/Blue-Archive-NET/src/pages/games/MaiPhoto.tsx)
  - maimai photo viewer.
- Ranking: [`src/pages/games/Ranking.tsx`](/workspaces/Blue-Archive-NET/src/pages/games/Ranking.tsx)
  - Per-game player ranking.
  - Separate CHUNITHM team ranking tab.
- Games dashboard: [`src/pages/games/GameDashboard.tsx`](/workspaces/Blue-Archive-NET/src/pages/games/GameDashboard.tsx)
  - All games have overview mode.
  - Only `chu3` currently has extra `songs` and `plays` sections.
  - Overview combines summary, rating composition, trend chart, heatmap, and recent scores.
  - Songs/playlog depend on `all-music` metadata plus per-user data queries.
- Friends: [`src/pages/dashboard/Chu3Friends.tsx`](/workspaces/Blue-Archive-NET/src/pages/dashboard/Chu3Friends.tsx)
  - CHUNITHM rival management.
  - Favorites are capped in UI logic; preserve the current limit unless requirements change.
- Team: [`src/pages/dashboard/Chu3Team.tsx`](/workspaces/Blue-Archive-NET/src/pages/dashboard/Chu3Team.tsx)
  - CHUNITHM team creation, join, edit, approval, leave, and ranking-linked invalidation.
- Settings: [`src/pages/profile/Settings.tsx`](/workspaces/Blue-Archive-NET/src/pages/profile/Settings.tsx)
  - Profile editing.
  - OAuth linking/unlinking.
  - Passkey registration/removal.
  - Global and per-game settings.
- Public profile: [`src/pages/profile/UserProfile.tsx`](/workspaces/Blue-Archive-NET/src/pages/profile/UserProfile.tsx)
  - Public user page with per-game summary.
  - Logged-in users can add/remove rivals/friends from here.
- Support: [`src/pages/dashboard/Support.tsx`](/workspaces/Blue-Archive-NET/src/pages/dashboard/Support.tsx)
  - Env-driven community links only.
- Admin pages:
  - Overview: [`src/pages/admin/Overview.tsx`](/workspaces/Blue-Archive-NET/src/pages/admin/Overview.tsx)
  - User list/detail: [`src/pages/admin/UserList.tsx`](/workspaces/Blue-Archive-NET/src/pages/admin/UserList.tsx), [`src/pages/admin/UserDetail.tsx`](/workspaces/Blue-Archive-NET/src/pages/admin/UserDetail.tsx)
  - Login bonus CRUD: [`src/pages/admin/LoginBonus.tsx`](/workspaces/Blue-Archive-NET/src/pages/admin/LoginBonus.tsx)
  - Unlock challenge CRUD: [`src/pages/admin/UnlockChallenge.tsx`](/workspaces/Blue-Archive-NET/src/pages/admin/UnlockChallenge.tsx)
  - Download order / INI / assignment / report tooling: [`src/pages/admin/DownloadOrder.tsx`](/workspaces/Blue-Archive-NET/src/pages/admin/DownloadOrder.tsx)

## API Conventions

Central fetch helpers live in [`src/api/client.ts`](/workspaces/Blue-Archive-NET/src/api/client.ts).

- Token storage:
  - localStorage key is `token`.
  - `setToken()` also syncs the image JWT cookie when image auth is enabled.
- User-facing API convention:
  - Most calls use `POST`.
  - Auth is sent via `?token=` query param, not an Authorization header.
  - Query params are often the real contract even when a JSON body would look cleaner.
  - Example: settings and several game detail mutations expect query params.
- JSON body usage:
  - `userPost(..., { json })` is used only when the backend expects body payloads in addition to query params.
  - Do not normalize everything to JSON without verifying backend handlers.
- Multipart uploads:
  - `userPostForm()` keeps token in query string and sends `FormData`.
- Streaming:
  - `userPostStream()` expects newline-delimited JSON chunks.
  - `transfer.pull()` depends on this behavior.
- Invalid token handling:
  - Exact response text `Invalid token` clears auth and hard-redirects to `/login`.
  - Preserve this until backend/client error semantics are changed together.
- Admin API:
  - Current frontend helper also appends `?token=` for admin requests.
  - README text says admin should use `Authorization: Bearer <jwt>`.
  - Treat this as a live contract mismatch. Do not "fix" one side in isolation.
- Public data/CDN:
  - `src/api/data.ts` fetches `all-music.json` and `all-items.json` from the data host or CHUNITHM asset host.
  - CHUNITHM asset helpers in [`src/lib/chu3Assets.ts`](/workspaces/Blue-Archive-NET/src/lib/chu3Assets.ts) build image and JSON URLs and cache JSON fetches client-side.

## Query Key Conventions

Shared query keys are centralized in [`src/lib/query.ts`](/workspaces/Blue-Archive-NET/src/lib/query.ts). Keep keys stable if you expect existing invalidation to keep working.

Important keys reused across pages:

- `qk.me`
- `qk.settings`
- `qk.homeSummary(username)`
- `qk.homeChu3Box(username)`
- `qk.chu3Rivals`
- `qk.chu3Team`
- `qk.chu3TeamDetail(teamId)`
- `qk.chu3TeamRanking(limit)`
- `qk.chu3TeamRequests`
- `qk.gameDash(username, game)`
- `qk.gameAllMusic(game)`
- `qk.gameLibrary(username, game)`
- `qk.gamePlaylog(username, game)`
- `qk.collectiblesChu3`

## Text And Content System

- Main UI copy lives in [`src/content/texts.ts`](/workspaces/Blue-Archive-NET/src/content/texts.ts).
- `TEXTS` is a TypeScript object, not JSON.
- Both `zh` and `en` must stay in sync.
- Text entries include both plain strings and formatter functions such as `(name) => ...`.
- `useAppTexts()` reads the current locale from `useI18n()` and returns the locale slice.
- `gameTitle()` and `settingFieldLabel()` both derive labels from the same text system.
- Prefer adding/changing copy in `texts.ts` rather than scattering strings through page components.
- Be careful when renaming keys:
  - there is no translation extraction layer
  - compile-time failures may catch some usage, but missing runtime keys can still degrade UX

## Config And Environment

Key environment-driven behavior is centralized in [`src/lib/config.ts`](/workspaces/Blue-Archive-NET/src/lib/config.ts) and [`src/lib/imgSign.ts`](/workspaces/Blue-Archive-NET/src/lib/imgSign.ts).

- `VITE_AQUA_HOST`: API origin.
- `VITE_DEV_PROXY_TARGET`: dev proxy override.
- `VITE_OAUTH_HOST`: optional separate OAuth origin.
- `VITE_DATA_HOST`: optional static data host.
- `VITE_IMAGE_HOST`: optional image/CDN host.
- `VITE_IMAGE_AUTH` and related cookie vars: enable JWT cookie sync for image requests.
- `VITE_APP_NAME`: overrides displayed app name.
- `VITE_AQUA_CONNECTION`: shown on setup page.
- Community links (`DISCORD`, `TELEGRAM`, `QQ`, `GITHUB`) directly control support page output.

Image-specific notes:

- `imgUrl1()` rewrites static asset URLs onto `VITE_IMAGE_HOST` when configured.
- `/api`, `/uploads`, and `/d` are intentionally bypassed by that rewrite path.
- `imgCross1()` returns `use-credentials` only for matching image-host requests when image auth is enabled.

## Build, Lint, And Dev Commands

From [`package.json`](/workspaces/Blue-Archive-NET/package.json):

- Install: `bun install`
- Dev: `bun run dev`
- Build: `bun run build`
- Lint: `bun run lint`
- Preview: `bun run preview`

Dev server proxy behavior from [`vite.config.ts`](/workspaces/Blue-Archive-NET/vite.config.ts):

- `/api` proxies to `VITE_DEV_PROXY_TARGET`, else `VITE_AQUA_HOST`, else `http://127.0.0.1:8080`
- `/uploads` proxies to the same target
- `/d` proxies to the same target

## Refactor Constraints

If you are doing a refactor, preserve these behaviors unless the task explicitly says otherwise.

- Preserve route paths, redirect targets, and layout nesting.
- Preserve localStorage keys: `token`, `locale`, `aquanet-theme`, and current feature-specific keys such as collectibles unlock-all state.
- Preserve user API auth semantics using `?token=` query params.
- Preserve invalid-token logout behavior.
- Preserve streaming transfer behavior based on newline-delimited JSON.
- Preserve admin tooling field names and payload shapes; many admin forms map almost 1:1 to backend DTO fields.
- Preserve CHUNITHM-only sections and assumptions where the UI currently depends on them.
- Preserve query keys or update every related invalidation path together.
- Preserve current text keys and both locales when changing copy.
- Preserve current asset URL behavior, including image-host rewriting and JWT cookie sync.
- Preserve business rules even if the current UI structure changes:
  - card default migrate list
  - collectibles field exclusions
  - favorites/team workflow assumptions
  - setup/keychip flow
  - ranking and profile actions
- Prefer extracting or renaming code without changing request shapes, cache behavior, or persisted keys.
- If a README statement conflicts with the runtime code, verify both sides before changing either one.

## Practical Advice For Future Agents

- Read [`src/App.tsx`](/workspaces/Blue-Archive-NET/src/App.tsx), [`src/api/client.ts`](/workspaces/Blue-Archive-NET/src/api/client.ts), [`src/lib/query.ts`](/workspaces/Blue-Archive-NET/src/lib/query.ts), and [`src/content/texts.ts`](/workspaces/Blue-Archive-NET/src/content/texts.ts) before doing large changes.
- For UI-only refactors, avoid touching API wrappers unless the task is specifically about contracts.
- For backend-facing changes, inspect both the page and the corresponding `src/api/*` helper before editing.
- For copy changes, update both locales in one pass.
- Do not clean up unrelated files or revert someone else's in-progress work.
