const imgHost1 = String(import.meta.env.VITE_IMAGE_HOST ?? '')
  .trim()
  .replace(/\/$/, '')
const authOn1 = bool1(import.meta.env.VITE_IMAGE_AUTH ?? import.meta.env.VITE_IMAGE_AUTHING)
const authPrefix1 = fixPrefix1((import.meta.env.VITE_IMAGE_AUTH_PREFIX as string) || '/img')

function bool1(raw: unknown): boolean {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  return s === '1' || s === 'true' || s === 'on' || s === 'yes'
}

function fixPrefix1(raw: string): string {
  const s = raw.trim()
  if (!s) return '/img'
  const withSlash1 = s.startsWith('/') ? s : `/${s}`
  return withSlash1.replace(/\/+$/, '') || '/img'
}

export function imageCdnOn1(): boolean {
  return !!imgHost1
}

export function imageAuthOn1(): boolean {
  return authOn1
}

function shouldBypass1(url1: URL): boolean {
  return (
    url1.pathname.startsWith('/api/') ||
    url1.pathname.startsWith('/uploads/') ||
    url1.pathname === authPrefix1 ||
    url1.pathname.startsWith(`${authPrefix1}/`)
  )
}

function toAuthPath1(url1: URL): string {
  const path1 = url1.pathname.startsWith('/') ? url1.pathname : `/${url1.pathname}`
  return `${authPrefix1}${path1}${url1.search}${url1.hash}`
}

export function imgUrl1(raw?: string | null): string {
  const src1 = String(raw ?? '').trim()
  if (!src1) return ''
  if (/^(data|blob|about):/i.test(src1)) return src1
  try {
    const base1 = imgHost1 || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const url1 = src1.startsWith('/') ? new URL(src1, `${base1}/`) : new URL(src1)
    if (shouldBypass1(url1)) return src1
    if (imageAuthOn1()) return toAuthPath1(url1)
    if (imageCdnOn1()) return new URL(`${url1.pathname}${url1.search}${url1.hash}`, `${imgHost1}/`).toString()
    return url1.toString()
  } catch {
    return src1
  }
}
