import md5 from 'blueimp-md5'

const imgHost1 = String(import.meta.env.VITE_IMAGE_HOST ?? '')
  .trim()
  .replace(/\/$/, '')
const signOn1 = bool1(import.meta.env.VITE_IMAGE_SIGNING)
const tokenName1 = String(import.meta.env.VITE_IMAGE_SIGN_PARAM ?? 'token').trim() || 'token'
const signKey1 = String(import.meta.env.VITE_IMAGE_SIGN_KEY ?? '').trim()
const uid1 = String(import.meta.env.VITE_IMAGE_SIGN_UID ?? '0').trim() || '0'
const randLen1 = clamp1(parseInt1(import.meta.env.VITE_IMAGE_SIGN_RAND_LEN), 6, 48, 12)

function bool1(raw: unknown): boolean {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  return s === '1' || s === 'true' || s === 'on' || s === 'yes'
}

function parseInt1(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? ''), 10)
  return Number.isFinite(n) ? n : NaN
}

function clamp1(raw: number, min1: number, max1: number, fallback1: number): number {
  if (!Number.isFinite(raw)) return fallback1
  return Math.min(max1, Math.max(min1, raw))
}

function rand1(len1: number): string {
  const abc1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let out1 = ''
  for (let i = 0; i < len1; i += 1) {
    out1 += abc1[Math.floor(Math.random() * abc1.length)] || 'A'
  }
  return out1
}

export function imageCdnOn1(): boolean {
  return !!imgHost1
}

export function imageSignOn1(): boolean {
  return signOn1 && !!signKey1
}

function signA1(url1: URL): void {
  if (!imageSignOn1()) return
  const ts1 = String(Math.floor(Date.now() / 1000))
  const randStr1 = rand1(randLen1)
  const body1 = `${url1.pathname}-${ts1}-${randStr1}-${uid1}-${signKey1}`
  const sig1 = md5(body1)
  url1.searchParams.set(tokenName1, `${ts1}-${randStr1}-${uid1}-${sig1}`)
}

export function imgUrl1(raw?: string | null): string {
  const src1 = String(raw ?? '').trim()
  if (!src1) return ''
  if (/^(data|blob|about):/i.test(src1)) return src1
  try {
    const base1 = imgHost1 || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const url1 = src1.startsWith('/') ? new URL(src1, `${base1}/`) : new URL(src1)
    const out1 = imageCdnOn1()
      ? new URL(`${url1.pathname}${url1.search}${url1.hash}`, `${imgHost1}/`)
      : new URL(url1.toString())
    signA1(out1)
    return out1.toString()
  } catch {
    return src1
  }
}
