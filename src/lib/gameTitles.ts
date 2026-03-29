import type { GameName } from './types'

export const GAME_TITLE: Record<GameName, { zh: string; en: string }> = {
  chu3: { zh: 'CHUNITHM', en: 'CHUNITHM' },
  mai2: { zh: 'maimaiDX', en: 'maimaiDX' },
  ongeki: { zh: '音击', en: 'Ongeki' },
  wacca: { zh: 'WACCA', en: 'WACCA' },
}

export function gameTitle(game: string, locale: 'zh' | 'en') {
  const row = GAME_TITLE[game as GameName]
  if (!row) return game === 'diva' ? (locale === 'zh' ? '初音' : 'Project DIVA') : game
  return locale === 'zh' ? row.zh : row.en
}
