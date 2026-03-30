function bool1(raw: unknown): boolean {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  return s === '1' || s === 'true' || s === 'on' || s === 'yes' || s === 'aws4'
}

function fixPath1(raw: string): string {
  const s = raw.trim()
  if (!s) return '/_img'
  return s.startsWith('/') ? s : `/${s}`
}

const signOn1 = bool1(import.meta.env.VITE_IMAGE_SIGNING)
const devSign1 = bool1(import.meta.env.VITE_IMAGE_SIGN_DEV)
const signPath1 = fixPath1((import.meta.env.VITE_IMAGE_SIGN_PATH as string) || '/_img')

export function imageSignOn1(): boolean {
  if (!signOn1) return false
  if (import.meta.env.DEV && !devSign1) return false
  return true
}

export function imgUrl1(raw?: string | null): string {
  const src1 = String(raw ?? '').trim()
  if (!src1) return ''
  if (!imageSignOn1()) return src1
  if (/^(data|blob|about):/i.test(src1)) return src1
  if (src1 === signPath1 || src1.startsWith(`${signPath1}?`)) return src1
  const q1 = new URLSearchParams({ u: src1 }).toString()
  return `${signPath1}?${q1}`
}
