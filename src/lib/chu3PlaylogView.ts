import { chusanRating, getMult, type MusicMetaLite } from './scoring'
import type { GamePlayRecord } from './types'

const CHU3_DIFFS = ['Basic', 'Advanced', 'Expert', 'Master', 'Ultima']

export function noteIdx1(level: number): number {
  return level === 10 ? 0 : Math.max(0, level)
}

export function playTime1(row: Pick<GamePlayRecord, 'userPlayDate' | 'playDate'>): string {
  return row.userPlayDate || row.playDate || ''
}

export function recordKey1(row: Pick<GamePlayRecord, 'sortNumber' | 'musicId' | 'level' | 'track' | 'userPlayDate' | 'playDate'>): string {
  return [
    row.sortNumber ?? 0,
    playTime1(row),
    row.musicId,
    row.level,
    row.track ?? 0,
  ].join(':')
}

export function score1(row: Partial<GamePlayRecord>): number {
  const n = Number(row.score ?? row.achievement ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function rank1(score: number): string {
  const raw1 = String(getMult(score, 'chu3')[2] ?? '')
  return raw1 ? raw1.replace('p', '+') : '—'
}

export function chartLevel1(meta: MusicMetaLite | undefined, level: number): number | null {
  if (level === 10) return null
  const idx1 = noteIdx1(level)
  const raw1 = meta?.notes?.[idx1]?.lv
  const lv1 = Number(raw1)
  return Number.isFinite(lv1) ? lv1 : null
}

export function chartRating1(meta: MusicMetaLite | undefined, level: number, row: Partial<GamePlayRecord>): string {
  const lv1 = chartLevel1(meta, level)
  if (lv1 == null) return '—'
  return (Math.floor(chusanRating(lv1, score1(row))) / 100).toFixed(2)
}

export function diffLabel1(level: number, meta?: MusicMetaLite): string {
  if (level === 10 || (meta?.worldsEndTag && meta.worldsEndTag !== 'Invalid' && (meta.notes?.length ?? 0) <= 1)) {
    return meta?.worldsEndTag ? `WE ${meta.worldsEndTag}` : 'WE'
  }
  return CHU3_DIFFS[noteIdx1(level)] ?? `#${level}`
}

export function diffLabelByIdx1(idx: number, meta?: MusicMetaLite): string {
  return diffLabel1(idx, meta)
}

export function formatLv1(meta: MusicMetaLite | undefined, idx: number): string {
  if (idx === 10) return meta?.worldsEndTag || 'WE'
  const raw1 = meta?.notes?.[idx]?.lv
  const lv1 = Number(raw1)
  if (!Number.isFinite(lv1)) return '—'
  return Number.isInteger(lv1) ? String(lv1) : lv1.toFixed(1)
}

export function fmtScore1(score: number): string {
  return Number.isFinite(score) ? Math.round(score).toLocaleString() : '—'
}

export function fmtRate1(raw?: number): string {
  const n1 = Number(raw)
  if (!Number.isFinite(n1)) return '—'
  return `${(n1 / 100).toFixed(2)}%`
}

export function fmtTime1(raw: string, locale: 'zh' | 'en'): string {
  if (!raw) return '—'
  const d1 = new Date(raw)
  if (Number.isNaN(d1.getTime())) return raw
  return d1.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')
}
