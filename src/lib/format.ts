import { formatDate, formatDateTime } from './datetime'

export type FormatLocale = 'zh' | 'en'

export function coerceInt(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value !== '') return parseInt(value, 10) || 0
  return 0
}

// 时间格式化统一在 lib/datetime.ts（moment），这里只保留原有的调用名
export function formatDateTimeMaybe(raw: string | undefined, locale: FormatLocale): string {
  return formatDateTime(raw, locale)
}

export function formatDateMaybe(raw: string | undefined, locale: FormatLocale): string {
  return formatDate(raw, locale)
}

export function formatRatioPercent(value: number, total: number, digits = 2): string {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return '—'
  return `${((Math.max(0, value) / total) * 100).toFixed(digits)}%`
}
