const imgHost = String(import.meta.env.VITE_IMAGE_HOST ?? '')
  .trim()
  .replace(/\/$/, '')
const authOn = bool(import.meta.env.VITE_IMAGE_AUTH ?? import.meta.env.VITE_IMAGE_AUTHING)
const cookieName = String(import.meta.env.VITE_IMAGE_COOKIE_NAME ?? 'aqua_jwt').trim() || 'aqua_jwt'
const cookieDomain = String(import.meta.env.VITE_IMAGE_COOKIE_DOMAIN ?? '').trim()
const cookiePath = String(import.meta.env.VITE_IMAGE_COOKIE_PATH ?? '/').trim() || '/'
const cookieSameSite = fixSameSite((import.meta.env.VITE_IMAGE_COOKIE_SAMESITE as string) || 'None')
const cookieSecure = bool(import.meta.env.VITE_IMAGE_COOKIE_SECURE ?? true)
const cookieMaxAge = fixMaxAge(import.meta.env.VITE_IMAGE_COOKIE_MAX_AGE)

function bool(raw: unknown): boolean {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  return s === '1' || s === 'true' || s === 'on' || s === 'yes'
}

export function imageCdnOn(): boolean {
  return !!imgHost
}

export function imageAuthOn(): boolean {
  return authOn && !!imgHost
}

export function imageCookieOn(): boolean {
  return imageAuthOn()
}

function fixSameSite(raw: string): 'Lax' | 'Strict' | 'None' {
  const s = raw.trim().toLowerCase()
  if (s === 'strict') return 'Strict'
  if (s === 'none') return 'None'
  return 'Lax'
}

function fixMaxAge(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? n : 7 * 86400
}

function host(raw: string): string {
  return raw.trim().toLowerCase().replace(/:\d+$/, '')
}

function imgHostUrl(): URL | null {
  if (!imgHost) return null
  try {
    return new URL(imgHost)
  } catch {
    return null
  }
}

function shouldBypass(url: URL): boolean {
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/d/')
}

export function imgUrl(raw?: string | null): string {
  const src = String(raw ?? '').trim()
  if (!src) return ''
  if (/^(data|blob|about):/i.test(src)) return src
  try {
    const base = imgHost || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const url = src.startsWith('/') ? new URL(src, `${base}/`) : new URL(src)
    if (shouldBypass(url)) return src
    if (imageCdnOn()) return new URL(`${url.pathname}${url.search}${url.hash}`, `${imgHost}/`).toString()
    return url.toString()
  } catch {
    return src
  }
}

export function imgUrlOnHost(raw?: string | null): string {
  const src = String(raw ?? '').trim()
  if (!src) return ''
  if (/^(data|blob|about):/i.test(src)) return src
  try {
    const base = imgHost || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const url = src.startsWith('/') ? new URL(src, `${base}/`) : new URL(src)
    if (imageCdnOn()) return new URL(`${url.pathname}${url.search}${url.hash}`, `${imgHost}/`).toString()
    return url.toString()
  } catch {
    return src
  }
}

export function imgCross(raw?: string | null): 'use-credentials' | undefined {
  if (!imageAuthOn()) return undefined
  const src = imgUrl(raw)
  if (!src) return undefined
  const hostUrl = imgHostUrl()
  if (!hostUrl) return undefined
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : hostUrl.origin
    const url = src.startsWith('/') ? new URL(src, `${base}/`) : new URL(src)
    return host(url.host) === host(hostUrl.host) ? 'use-credentials' : undefined
  } catch {
    return undefined
  }
}

export function syncImgJwtCookie(token?: string | null) {
  if (!imageCookieOn()) return
  if (typeof document === 'undefined') return
  const bits = [`${cookieName}=${token ? encodeURIComponent(token) : ''}`, `Path=${cookiePath}`]
  bits.push(`SameSite=${cookieSameSite}`)
  bits.push(`Max-Age=${token ? cookieMaxAge : 0}`)
  if (cookieDomain) bits.push(`Domain=${cookieDomain}`)
  if (cookieSecure || cookieSameSite === 'None') bits.push('Secure')
  document.cookie = bits.join('; ')
}
