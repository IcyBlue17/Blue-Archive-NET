import type { CardSummary, GameName } from './types'

export function cardSummaryKeyToGame(key: keyof CardSummary): GameName | null {
  if (key === 'chu3' || key === 'mai2' || key === 'ongeki' || key === 'wacca') return key
  return null
}

export function toDisplayRating(raw: number, game: GameName): number {
  if (!Number.isFinite(raw)) return raw
  if (game === 'wacca') return raw / 10
  if (game === 'chu3' || game === 'ongeki') return raw / 100
  return raw
}

export function formatDisplayRating(raw: number, game: GameName): string {
  const digits = game === 'wacca' || game === 'chu3' || game === 'ongeki' ? 2 : 0
  return toDisplayRating(raw, game).toFixed(digits)
}

/**
 * CHUNITHM 从 SDHD 2.30 / SDHJ 1.30 起，rating 的第二枠由 Recent 10 改为 New 20。
 * 版本解析不出来时按新制处理（现役版本都是新制）。
 */
export function chu3UsesNew20(version: string | null | undefined): boolean {
  const m = /^(\d+)\.(\d{1,2})/.exec((version ?? '').trim())
  if (!m) return true
  const major = Number(m[1])
  const minor = Number(m[2])
  if (major >= 3) return true
  if (major === 2 || major === 1) return minor >= 30
  return false
}
