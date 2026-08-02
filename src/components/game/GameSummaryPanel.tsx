import type { GameName, GenericGameSummary } from '@/lib/types'
import { formatDisplayRating } from '@/lib/gameRatingDisplay'
import { RankDetailsTable } from '@/components/game/RankDetailsTable'
import { useAppTexts } from '@/content/texts'
import { SectionCard } from '@/components/ui/SectionCard'
import { Text } from '@/components/ui/Text'

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
      <SectionCard title={<>{title ?? texts.gamesPage.summary}</>}>
        <Text className="text-app-subtle mt-2">—</Text>
      </SectionCard>
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
    <SectionCard title={<>{title ?? texts.gamesPage.statsTitle(summary.name)}</>}>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="border-app-line rounded-md border px-3 py-2">
            <div className="text-app-subtle text-xs">{s.label}</div>
            <div className="text-app-default mt-0.5 font-medium">{s.value}</div>
          </div>
        ))}
      </div>
      {summary.ranks?.length ? (
        <div className="mt-6">
          <Text className="text-sm mb-2">
            {texts.gamesPage.rankDistribution}
          </Text>
          <div className="flex flex-wrap gap-2">
            {summary.ranks.map((rk) => (
              <span
                key={rk.name}
                className="bg-app-recessed text-app-subtle rounded px-2 py-1 text-xs"
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
    </SectionCard>
  )
}
