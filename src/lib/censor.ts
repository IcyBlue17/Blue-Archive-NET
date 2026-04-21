export function fmtNameErr(raw: unknown, title: string) {
  const msg = raw instanceof Error ? raw.message : String(raw || '')
  if (!msg) return `${title}失败`
  if (msg.includes('不可用')) return `${title}失败，${msg}`
  return msg
}
