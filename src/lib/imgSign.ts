const imgHost1 = String(import.meta.env.VITE_IMAGE_HOST ?? '')
  .trim()
  .replace(/\/$/, '')

export function imageCdnOn1(): boolean {
  return !!imgHost1
}

export function imgUrl1(raw?: string | null): string {
  const src1 = String(raw ?? '').trim()
  if (!src1) return ''
  if (/^(data|blob|about):/i.test(src1)) return src1
  if (!imageCdnOn1()) return src1
  try {
    if (src1.startsWith('/')) return new URL(src1, `${imgHost1}/`).toString()
    const url1 = new URL(src1)
    return new URL(`${url1.pathname}${url1.search}${url1.hash}`, `${imgHost1}/`).toString()
  } catch {
    return src1
  }
}
