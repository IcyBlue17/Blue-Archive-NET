export function fmtNameErr1(raw1: unknown, title1: string) {
  const msg1 = raw1 instanceof Error ? raw1.message : String(raw1 || '')
  if (!msg1) return `${title1}失败`
  if (msg1.includes('不可用')) return `${title1}失败，${msg1}`
  return msg1
}
