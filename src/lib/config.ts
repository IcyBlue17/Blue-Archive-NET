import type { ChusanMatchingOption } from './types'

export const APP_NAME = (import.meta.env.VITE_APP_NAME as string)?.trim() || 'banet'

export const AQUA_HOST = (import.meta.env.VITE_AQUA_HOST as string)?.trim() || ''

export const OAUTH_HOST = (import.meta.env.VITE_OAUTH_HOST as string)?.trim() || ''
export const DATA_HOST = (import.meta.env.VITE_DATA_HOST as string)?.trim() || ''

const DATA_CDN_FALLBACK = 'https://aquadx.net'

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

export function oauthApiOrigin(): string {
  const h = OAUTH_HOST.replace(/\/$/, '')
  if (h) return h
  return apiBase()
}

export const OAUTH_API_ORIGIN = oauthApiOrigin

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

export const CHU3_MATCHINGS: ChusanMatchingOption[] = [
  {
    id: 'yukiotoko',
    ui: 'https://yukiotoko.metatable.sh/',
    guide: 'https://github.com/MewoLab/AquaDX/blob/v1-dev/docs/chu3-national-matching.md',
    matching: 'http://yukiotoko.chara.lol:9004/',
    reflector: 'http://yukiotoko.chara.lol:50201/',
  },
  {
    id: 'linguo',
    ui: 'https://chu3-match.sega.ink/rooms',
    guide: 'https://performai.evilleaker.com/manual/games/chunithm/national_battle/',
    matching: 'https://chu3-match.sega.ink/',
    reflector: 'http://reflector.naominet.live:18080/',
  },
]
