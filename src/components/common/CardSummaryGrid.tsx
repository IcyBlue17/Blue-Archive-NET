import type { CardSummary, CardSummaryGame, GameName } from '../../lib/types'
import { cardSummaryKeyToGame, formatDisplayRating } from '../../lib/gameRatingDisplay'
import { gameTitle } from '../../lib/gameTitles'
import type { AppTexts } from '../../content/texts'
import { formatDateTimeMaybe } from '../../lib/format'

const SUMMARY_KEYS: (keyof CardSummary)[] = ['chu3', 'mai2', 'ongeki', 'wacca', 'diva']

export function CardSummaryGrid({
  summary,
  locale,
  texts,
  itemClassName = 'border-kumo-line rounded-lg border px-4 py-3',
  nameClassName = 'text-kumo-subtle mt-2 text-sm',
  detailClassName = 'text-kumo-subtle mt-1 text-xs',
  ratingLabel,
  lastLoginLabel,
}: {
  summary: CardSummary
  locale: 'zh' | 'en'
  texts: AppTexts
  itemClassName?: string
  nameClassName?: string
  detailClassName?: string
  ratingLabel: string
  lastLoginLabel: string
}) {
  return (
    <>
      {SUMMARY_KEYS.map((key) => {
        const row = summary[key] as CardSummaryGame | null | undefined
        if (!row) return null
        const title = gameTitle(key as GameName, locale)
        const g = cardSummaryKeyToGame(key)
        const ratingStr =
          g != null
            ? formatDisplayRating(row.rating, g)
            : Number.isFinite(row.rating)
              ? String(Math.round(row.rating))
              : '—'
        return (
          <div key={String(key)} className={itemClassName}>
            <div className="text-kumo-default font-semibold">{title}</div>
            <div className={nameClassName}>
              {texts.homePage.inGameName}: {row.name || '—'}
            </div>
            <div className={detailClassName}>
              {ratingLabel}: {ratingStr}
            </div>
            <div className={detailClassName}>
              {lastLoginLabel}: {formatDateTimeMaybe(row.lastLogin, locale)}
            </div>
          </div>
        )
      })}
    </>
  )
}
