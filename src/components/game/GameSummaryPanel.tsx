import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import type { GameName, GenericGameSummary } from '../../lib/types'
import { formatDisplayRating } from '../../lib/gameRatingDisplay'
import { RankDetailsTable } from './RankDetailsTable'
import { useAppTexts } from '../../content/texts'

function fmtInt(n: number) {
  if (!Number.isFinite(n)) return '—'
  return String(Math.round(n))
}

export function GameSummaryPanel({
  game,
  summary,
  title,
}: {
  game: GameName
  summary: GenericGameSummary | null
  title?: string
}) {
  const texts = useAppTexts()
  if (!summary) {
    return (
      <LayerCard className="p-4">
        <LayerCard.Secondary>{title ?? texts.gamesPage.summary}</LayerCard.Secondary>
        <Text DANGEROUS_className="text-kumo-subtle mt-2">—</Text>
      </LayerCard>
    )
  }

  const rankLabel =
    Number.isFinite(summary.serverRank) && summary.serverRank >= 0 ? `#${summary.serverRank + 1}` : '—'

  const stats: { label: string; value: string }[] = [
    { label: texts.common.rating, value: formatDisplayRating(summary.rating, game) },
    { label: texts.gamesPage.highestRating, value: formatDisplayRating(summary.ratingHighest, game) },
    { label: texts.gamesPage.playCount, value: fmtInt(summary.plays) },
    { label: texts.gamesPage.fcAp, value: `${summary.fullCombo} / ${summary.allPerfect}` },
    { label: texts.gamesPage.serverRank, value: rankLabel },
    { label: texts.gamesPage.romVersion, value: summary.lastVersion || '—' },
    { label: texts.gamesPage.lastPlayed, value: summary.lastSeen || '—' },
  ]

  return (
    <LayerCard className="p-4">
      <LayerCard.Secondary>{title ?? texts.gamesPage.statsTitle(summary.name)}</LayerCard.Secondary>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="border-kumo-border rounded-md border px-3 py-2">
            <div className="text-kumo-subtle text-xs">{s.label}</div>
            <div className="text-kumo-text mt-0.5 font-medium">{s.value}</div>
          </div>
        ))}
      </div>
      {summary.ranks?.length ? (
        <div className="mt-6">
          <Text DANGEROUS_className="mb-2" size="sm">
            {texts.gamesPage.rankDistribution}
          </Text>
          <div className="flex flex-wrap gap-2">
            {summary.ranks.map((rk) => (
              <span
                key={rk.name}
                className="bg-kumo-surface-secondary text-kumo-subtle rounded px-2 py-1 text-xs"
              >
                {rk.name}: {rk.count}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {summary.detailedRanks && Object.keys(summary.detailedRanks).length ? (
        <div className="mt-6">
          <RankDetailsTable summary={summary} />
        </div>
      ) : null}
    </LayerCard>
  )
}
