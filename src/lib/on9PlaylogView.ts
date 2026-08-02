import { getMult, ongekiRating, type MusicMetaLite } from '@/lib/scoring'
import type { GamePlayRecord } from '@/lib/types'
import { fmtRate, fmtScore, fmtTime, playTime, recordKey } from '@/lib/chu3PlaylogView'

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

/**
 * LUNATIC 単独曲は notes が 1 件しか無いのに playlog の level は 4 で来る。
 * notes → fumenList → 単独譜面 の順に拾わないと定数が取れず「—」になる。
 */
export function chartLevel(meta: OngekiMusicMetaLite | undefined, idx: number): number | null {
  const fromNotes = Number(meta?.notes?.[idx]?.lv)
  if (Number.isFinite(fromNotes) && fromNotes > 0) return fromNotes

  const fromFumen = Number(meta?.fumenList?.[idx]?.lv)
  if (Number.isFinite(fromFumen) && fromFumen > 0) return fromFumen

  if (idx === 4 && (meta?.notes?.length ?? 0) === 1) {
    const only = Number(meta?.notes?.[0]?.lv)
    if (Number.isFinite(only) && only > 0) return only
  }
  return null
}

export function ratingFlags(row: Partial<GamePlayRecord>) {
  return {
    allBreak: row.isAllBreak === true,
    fullCombo: row.judgeMiss === 0,
    fullBell: row.isFullBell === true,
  }
}

export function chartRating(meta: OngekiMusicMetaLite | undefined, idx: number, row: Partial<GamePlayRecord>): string {
  const lv = chartLevel(meta, idx)
  if (lv == null) return '—'
  return (Math.floor(ongekiRating(lv, score(row), ratingFlags(row)) * 100) / 100).toFixed(2)
}

export function diffLabel(idx: number): string {
  return ON9_DIFFS[idx] ?? `#${idx}`
}

export function formatLv(meta: MusicMetaLite | undefined, idx: number): string {
  const lv = chartLevel(meta, idx)
  return lv == null ? '—' : Number.isInteger(lv) ? String(lv) : lv.toFixed(1)
}
