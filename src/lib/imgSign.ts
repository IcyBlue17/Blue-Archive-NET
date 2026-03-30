const imgHost1 = String(import.meta.env.VITE_IMAGE_HOST ?? '')
  .trim()
  .replace(/\/$/, '')
const authOn1 = bool1(import.meta.env.VITE_IMAGE_AUTH ?? import.meta.env.VITE_IMAGE_AUTHING)
const cookieName1 = String(import.meta.env.VITE_IMAGE_COOKIE_NAME ?? 'aqua_jwt').trim() || 'aqua_jwt'
const cookieDomain1 = String(import.meta.env.VITE_IMAGE_COOKIE_DOMAIN ?? '').trim()
const cookiePath1 = String(import.meta.env.VITE_IMAGE_COOKIE_PATH ?? '/').trim() || '/'
const cookieSameSite1 = fixSameSite1((import.meta.env.VITE_IMAGE_COOKIE_SAMESITE as string) || 'None')
const cookieSecure1 = bool1(import.meta.env.VITE_IMAGE_COOKIE_SECURE ?? true)
const cookieMaxAge1 = fixMaxAge1(import.meta.env.VITE_IMAGE_COOKIE_MAX_AGE)

function bool1(raw: unknown): boolean {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  return s === '1' || s === 'true' || s === 'on' || s === 'yes'
}

export function imageCdnOn1(): boolean {
  return !!imgHost1
}

export function imageAuthOn1(): boolean {
  return authOn1 && !!imgHost1
}

export function imageCookieOn1(): boolean {
  return imageAuthOn1()
}

function fixSameSite1(raw: string): 'Lax' | 'Strict' | 'None' {
  const s = raw.trim().toLowerCase()
  if (s === 'strict') return 'Strict'
  if (s === 'none') return 'None'
  return 'Lax'
}

function fixMaxAge1(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? n : 7 * 86400
}

function host1(raw: string): string {
  return raw.trim().toLowerCase().replace(/:\d+$/, '')
}

function imgHostUrl1(): URL | null {
  if (!imgHost1) return null
  try {
    return new URL(imgHost1)
  } catch {
    return null
  }
}

function shouldBypass1(url1: URL): boolean {
  return url1.pathname.startsWith('/api/') || url1.pathname.startsWith('/uploads/') || url1.pathname.startsWith('/d/')
}

export function imgUrl1(raw?: string | null): string {
  const src1 = String(raw ?? '').trim()
  if (!src1) return ''
  if (/^(data|blob|about):/i.test(src1)) return src1
  try {
    const base1 = imgHost1 || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const url1 = src1.startsWith('/') ? new URL(src1, `${base1}/`) : new URL(src1)
    if (shouldBypass1(url1)) return src1
    if (imageCdnOn1()) return new URL(`${url1.pathname}${url1.search}${url1.hash}`, `${imgHost1}/`).toString()
    return url1.toString()
  } catch {
    return src1
  }
}

export function imgCross1(raw?: string | null): 'use-credentials' | undefined {
  if (!imageAuthOn1()) return undefined
  const src1 = imgUrl1(raw)
  if (!src1) return undefined
  const hostUrl1 = imgHostUrl1()
  if (!hostUrl1) return undefined
  try {
    const base1 = typeof window !== 'undefined' ? window.location.origin : hostUrl1.origin
    const url1 = src1.startsWith('/') ? new URL(src1, `${base1}/`) : new URL(src1)
    return host1(url1.host) === host1(hostUrl1.host) ? 'use-credentials' : undefined
  } catch {
    return undefined
  }
}

export function syncImgJwtCookie1(token?: string | null) {
  if (!imageCookieOn1()) return
  if (typeof document === 'undefined') return
  const bits1 = [`${cookieName1}=${token ? encodeURIComponent(token) : ''}`, `Path=${cookiePath1}`]
  bits1.push(`SameSite=${cookieSameSite1}`)
  bits1.push(`Max-Age=${token ? cookieMaxAge1 : 0}`)
  if (cookieDomain1) bits1.push(`Domain=${cookieDomain1}`)
  if (cookieSecure1 || cookieSameSite1 === 'None') bits1.push('Secure')
  document.cookie = bits1.join('; ')
}
