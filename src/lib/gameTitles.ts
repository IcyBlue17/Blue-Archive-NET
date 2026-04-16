import { getAppTexts } from '../content/texts'

export function gameTitle(game: string, locale: 'zh' | 'en') {
  const titles = getAppTexts(locale).gameTitles as Record<string, string>
  return titles[game] ?? game
}
