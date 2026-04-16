export type FormatLocale = 'zh' | 'en'

export function coerceInt(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value !== '') return parseInt(value, 10) || 0
  return 0
}

export function formatDateTimeMaybe(raw: string | undefined, locale: FormatLocale): string {
  if (!raw) return '—'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')
}

export function formatDateMaybe(raw: string | undefined, locale: FormatLocale): string {
  if (!raw) return '—'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')
}

export function formatRatioPercent(value: number, total: number, digits = 2): string {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return '—'
  return `${((Math.max(0, value) / total) * 100).toFixed(digits)}%`
}
