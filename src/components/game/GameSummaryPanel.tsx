import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import type { GameName, GenericGameSummary } from '../../lib/types'
import { formatDisplayRating } from '../../lib/gameRatingDisplay'
import { RankDetailsTable } from './RankDetailsTable'

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
  if (!summary) {
    return (
      <LayerCard className="p-4">
        <LayerCard.Secondary>{title ?? 'Summary'}</LayerCard.Secondary>
        <Text DANGEROUS_className="text-kumo-subtle mt-2">—</Text>
      </LayerCard>
    )
  }

  const rankLabel =
    Number.isFinite(summary.serverRank) && summary.serverRank >= 0 ? `#${summary.serverRank + 1}` : '—'

  const stats: { label: string; value: string }[] = [
    { label: 'Rating', value: formatDisplayRating(summary.rating, game) },
    { label: '最高 Rating', value: formatDisplayRating(summary.ratingHighest, game) },
    { label: 'PC数', value: fmtInt(summary.plays) },
    { label: 'FC / AP', value: `${summary.fullCombo} / ${summary.allPerfect}` },
    { label: '服务器排名', value: rankLabel },
    { label: 'ROM版本', value: summary.lastVersion || '—' },
    { label: '最近游玩', value: summary.lastSeen || '—' },
  ]

  return (
    <LayerCard className="p-4">
      <LayerCard.Secondary>{title ?? `${summary.name} · 统计`}</LayerCard.Secondary>
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
            等级分布
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
