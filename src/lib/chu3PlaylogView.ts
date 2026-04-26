import { chusanRating, chu3RatingLevel, getMult, type MusicMetaLite } from './scoring'
import type { GamePlayRecord } from './types'

const CHU3_DIFFS = ['Basic', 'Advanced', 'Expert', 'Master', 'Ultima']

export function noteIdx(level: number): number {
  return level === 10 ? 0 : Math.max(0, level)
}

export function playTime(row: Pick<GamePlayRecord, 'userPlayDate' | 'playDate'>): string {
  return row.userPlayDate || row.playDate || ''
}

export function recordKey(row: Pick<GamePlayRecord, 'sortNumber' | 'musicId' | 'level' | 'track' | 'userPlayDate' | 'playDate'>): string {
  return [
    row.sortNumber ?? 0,
    playTime(row),
    row.musicId,
    row.level,
    row.track ?? 0,
  ].join(':')
}

export function score(row: Partial<GamePlayRecord>): number {
  const n = Number(row.score ?? row.achievement ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function rank(score: number): string {
  const raw = String(getMult(score, 'chu3')[2] ?? '')
  return raw ? raw.replace('p', '+') : '—'
}

export function chartLevel(meta: MusicMetaLite | undefined, level: number): number | null {
  return chu3RatingLevel(meta, level) ?? null
}

export function chartRating(meta: MusicMetaLite | undefined, level: number, row: Partial<GamePlayRecord>): string {
  const lv = chartLevel(meta, level)
  if (lv == null) return '—'
  return (Math.floor(chusanRating(lv, score(row))) / 100).toFixed(2)
}

export function diffLabel(level: number, meta?: MusicMetaLite): string {
  const tag = meta?.worldsEndTag?.trim()
  const goodTag = tag && tag !== 'Invalid' ? tag : ''
  if (level === 10 || (goodTag && (meta?.notes?.length ?? 0) <= 1)) {
    return goodTag ? `WE ${goodTag}` : 'WE'
  }
  return CHU3_DIFFS[noteIdx(level)] ?? `#${level}`
}

export function diffLabelByIdx(idx: number, meta?: MusicMetaLite): string {
  return diffLabel(idx, meta)
}

export function formatLv(meta: MusicMetaLite | undefined, idx: number): string {
  if (idx === 10) {
    const tag = meta?.worldsEndTag?.trim()
    return tag && tag !== 'Invalid' ? tag : 'WE'
  }
  const raw = meta?.notes?.[idx]?.lv
  const lv = Number(raw)
  if (!Number.isFinite(lv)) return '—'
  return Number.isInteger(lv) ? String(lv) : lv.toFixed(1)
}

export function fmtScore(score: number): string {
  return Number.isFinite(score) ? Math.round(score).toLocaleString() : '—'
}

export function fmtRate(raw?: number): string {
  const n = Number(raw)
  if (!Number.isFinite(n)) return '—'
  return `${(n / 100).toFixed(2)}%`
}

export function fmtTime(raw: string, locale: 'zh' | 'en'): string {
  if (!raw) return '—'
  const hasTz = /(z|[+-]\d{2}:?\d{2})$/i.test(raw.trim())
  let d = hasTz ? new Date(raw) : new Date(Number.NaN)
  if (Number.isNaN(d.getTime())) {
    const m = raw.trim().match(
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ t](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/i,
    )
    if (m) {
      const [, yy, mm, dd, hh = '0', mi = '0', ss = '0'] = m
      d = new Date(
        Date.UTC(
          Number(yy),
          Number(mm) - 1,
          Number(dd),
          Number(hh) - 9,
          Number(mi),
          Number(ss),
        ),
      )
    }
  }
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')
}
