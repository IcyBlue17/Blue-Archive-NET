import type { ChusanMatchingOption } from './types'

/** 站点显示名（侧栏、登录、`document.title`）；`.env` 里设 `VITE_APP_NAME` 可覆盖 */
export const APP_NAME = (import.meta.env.VITE_APP_NAME as string)?.trim() || 'Blue Archive'

export const AQUA_HOST = (import.meta.env.VITE_AQUA_HOST as string)?.trim() || ''
export const DATA_HOST = (import.meta.env.VITE_DATA_HOST as string)?.trim() || ''

/** 与 aquaNet 默认一致：曲图 / `all-items.json` 等静态资源来自官方 CDN。 */
const DATA_CDN_FALLBACK = 'https://aquadx.net'

/** Absolute base for API (empty env → current origin, for Vite proxy to backend). */
export function apiBase(): string {
  const h = AQUA_HOST.replace(/\/$/, '')
  if (h) return h
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export function apiUrl(path: string): URL {
  const p = path.startsWith('/') ? path : `/${path}`
  return new URL(p, apiBase())
}

export function dataUrl(path: string): URL {
  const p = path.startsWith('/') ? path : `/${path}`
  const base = (DATA_HOST || DATA_CDN_FALLBACK).replace(/\/$/, '')
  return new URL(p, base)
}
export const AQUA_CONNECTION = (import.meta.env.VITE_AQUA_CONNECTION as string) || ''
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string) || ''
export const DISCORD_INVITE = (import.meta.env.VITE_DISCORD_INVITE as string) || ''
export const TELEGRAM_INVITE = (import.meta.env.VITE_TELEGRAM_INVITE as string) || ''
export const QQ_INVITE = (import.meta.env.VITE_QQ_INVITE as string) || ''
export const GITHUB_REPOSITORY = (import.meta.env.VITE_GITHUB_REPOSITORY as string) || ''

export const DEFAULT_PFP = '/assets/imgs/no_profile.png'

/** National matching presets — same as aquaNet `config.ts`. */
export const CHU3_MATCHINGS: ChusanMatchingOption[] = [
  {
    name: 'Yukiotoko',
    ui: 'https://yukiotoko.metatable.sh/',
    guide: 'https://github.com/MewoLab/AquaDX/blob/v1-dev/docs/chu3-national-matching.md',
    matching: 'http://yukiotoko.chara.lol:9004/',
    reflector: 'http://yukiotoko.chara.lol:50201/',
    coop: ['Missless', 'CozyNet', 'GMG'],
  },
  {
    name: '林国对战',
    ui: 'https://chu3-match.sega.ink/rooms',
    guide: 'https://performai.evilleaker.com/manual/games/chunithm/national_battle/',
    matching: 'https://chu3-match.sega.ink/',
    reflector: 'http://reflector.naominet.live:18080/',
    coop: ['RinNET', 'MysteriaNET'],
  },
]
