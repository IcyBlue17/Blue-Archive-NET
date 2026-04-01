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
  const tag1 = meta?.worldsEndTag?.trim()
  const goodTag1 = tag1 && tag1 !== 'Invalid' ? tag1 : ''
  if (level === 10 || (goodTag1 && (meta?.notes?.length ?? 0) <= 1)) {
    return goodTag1 ? `WE ${goodTag1}` : 'WE'
  }
  return CHU3_DIFFS[noteIdx1(level)] ?? `#${level}`
}

export function diffLabelByIdx1(idx: number, meta?: MusicMetaLite): string {
  return diffLabel1(idx, meta)
}

export function formatLv1(meta: MusicMetaLite | undefined, idx: number): string {
  if (idx === 10) {
    const tag1 = meta?.worldsEndTag?.trim()
    return tag1 && tag1 !== 'Invalid' ? tag1 : 'WE'
  }
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
  const hasTz1 = /(z|[+-]\d{2}:?\d{2})$/i.test(raw.trim())
  let d1 = hasTz1 ? new Date(raw) : new Date(Number.NaN)
  if (Number.isNaN(d1.getTime())) {
    const m1 = raw.trim().match(
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ t](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/i,
    )
    if (m1) {
      const [, yy1, mm1, dd1, hh1 = '0', mi1 = '0', ss1 = '0'] = m1
      d1 = new Date(
        Date.UTC(
          Number(yy1),
          Number(mm1) - 1,
          Number(dd1),
          Number(hh1) - 9,
          Number(mi1),
          Number(ss1),
        ),
      )
    }
  }
  if (Number.isNaN(d1.getTime())) return raw
  return d1.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')
}
