import { chusanRating, getMult, type MusicMetaLite } from './scoring'
import type { GamePlayRecord } from './types'
import { fmtRate, fmtScore, fmtTime, playTime, recordKey } from './chu3PlaylogView'

export { fmtRate, fmtScore, fmtTime, playTime, recordKey }

const ON9_DIFFS = ['Basic', 'Advanced', 'Expert', 'Master', 'Lunatic']

export interface On9FumenEntry {
  typeId?: number | null
  type?: string | null
  enable?: boolean | null
  lv?: number | null
}

export interface OngekiMusicMetaLite extends MusicMetaLite {
  fumenList?: On9FumenEntry[]
}

/** ONGEKI's techScore (achievement) is what scores/ranks are computed from. */
export function score(row: Partial<GamePlayRecord>): number {
  const n = Number(row.techScore ?? row.achievement ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function rank(score: number): string {
  const raw = String(getMult(score, 'ongeki')[2] ?? '')
  return raw ? raw.replace('p', '+') : '—'
}

/** Whether a chart actually exists for this difficulty (fumenList.enable, falling back to a positive level). */
export function chartExists(meta: OngekiMusicMetaLite | undefined, idx: number): boolean {
  const fumen = meta?.fumenList?.[idx]
  if (fumen?.enable != null) return fumen.enable
  const lv = Number(meta?.notes?.[idx]?.lv)
  return Number.isFinite(lv) && lv > 0
}

export function chartLevel(meta: MusicMetaLite | undefined, idx: number): number | null {
  const lv = Number(meta?.notes?.[idx]?.lv)
  return Number.isFinite(lv) && lv > 0 ? lv : null
}

export function chartRating(meta: MusicMetaLite | undefined, idx: number, row: Partial<GamePlayRecord>): string {
  const lv = chartLevel(meta, idx)
  if (lv == null) return '—'
  return (Math.floor(chusanRating(lv, score(row))) / 100).toFixed(2)
}

export function diffLabel(idx: number): string {
  return ON9_DIFFS[idx] ?? `#${idx}`
}

export function formatLv(meta: MusicMetaLite | undefined, idx: number): string {
  const lv = chartLevel(meta, idx)
  return lv == null ? '—' : Number.isInteger(lv) ? String(lv) : lv.toFixed(1)
}
