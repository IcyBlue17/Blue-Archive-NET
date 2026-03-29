import type { CardSummary, GameName } from './types'

export function cardSummaryKeyToGame(key: keyof CardSummary): GameName | null {
  if (key === 'chu3' || key === 'mai2' || key === 'ongeki' || key === 'wacca') return key
  return null
}

/**
 * 后端/API 原始 Rating → 界面数值。
 * CHUNITHM・音击：`playerRating` 等为 ×100（如 1683 → 16.83）；Wacca：×10。
 */
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
