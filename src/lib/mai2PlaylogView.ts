import { getMult, type MusicMetaLite } from '@/lib/scoring'
import type { GamePlayRecord } from '@/lib/types'
import { fmtRate, fmtScore, fmtTime, playTime, recordKey } from '@/lib/chu3PlaylogView'

export { fmtRate, fmtScore, fmtTime, playTime, recordKey }

const MAI2_DIFFS = ['Basic', 'Advanced', 'Expert', 'Master', 'Re:MASTER', 'Utage']

// maimai DX achievement is a 0-1010000 score (reported as % * 10000)
export function score(row: Partial<GamePlayRecord>): number {
  const n = Number(row.achievement ?? row.score ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function rank(score: number): string {
  const raw = String(getMult(score, 'mai2')[2] ?? '')
  return raw ? raw.replace('p', '+') : '—'
}

export function chartExists(meta: MusicMetaLite | undefined, idx: number): boolean {
  const note = meta?.notes?.[idx]
  const lv = Number(note?.lv)
  return Number.isFinite(lv) && lv > 0
}

export function chartLevel(meta: MusicMetaLite | undefined, idx: number): number | null {
  const lv = Number(meta?.notes?.[idx]?.lv)
  return Number.isFinite(lv) && lv > 0 ? lv : null
}

// comboStatus / syncStatus enum on maimai2_user_playlog:
// comboStatus 0=none 1=FC 2=FC+ 3=AP 4=AP+ (syncStatus same scheme for multiplayer)
export function comboLabel(status: number | undefined): string {
  switch (status) {
    case 1:
      return 'FC'
    case 2:
      return 'FC+'
    case 3:
      return 'AP'
    case 4:
      return 'AP+'
    default:
      return ''
  }
}

export function syncLabel(status: number | undefined): string {
  switch (status) {
    case 1:
      return 'SYNC'
    case 2:
      return 'FS'
    case 3:
      return 'FS+'
    case 4:
      return 'FDX'
    case 5:
      return 'FDX+'
    default:
      return ''
  }
}

export function ratingFlags(row: Partial<GamePlayRecord>) {
  return {
    combo: comboLabel(row.comboStatus),
    sync: syncLabel(row.syncStatus),
    legacyFc: row.isFullCombo === true,
    legacyAp: row.isAllPerfect === true,
  }
}

// DX rating for one chart: lv * mult * min(100.5, achievement)/100
export function chartRating(meta: MusicMetaLite | undefined, idx: number, row: Partial<GamePlayRecord>): string {
  const lv = chartLevel(meta, idx)
  if (lv == null) return '—'
  const ach = score(row)
  const mult = Number(getMult(ach, 'mai2')[1] ?? 0)
  if (!mult) return '—'
  return String(Math.floor(lv * mult * (Math.min(100.5, ach / 10000) / 100)))
}

export function diffLabel(idx: number): string {
  return MAI2_DIFFS[idx] ?? `#${idx}`
}

export function formatLv(meta: MusicMetaLite | undefined, idx: number): string {
  const lv = chartLevel(meta, idx)
  return lv == null ? '—' : Number.isInteger(lv) ? String(lv) : lv.toFixed(1)
}
