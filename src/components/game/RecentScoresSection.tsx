import { memo, useMemo } from 'react'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import type { GameName, GenericGamePlaylog } from '../../lib/types'
import { getMult, roundFloor, type MusicMetaLite } from '../../lib/scoring'
import { toDisplayRating } from '../../lib/gameRatingDisplay'
import { formatPlaylogLevelLabel } from '../../lib/playlogDisplay'
import { musicJacketUrl } from '../../lib/musicCover'
import { imgCross1 } from '../../lib/imgSign'

type Row = GenericGamePlaylog & MusicMetaLite & { worldsEndTag?: string }

function useRounding() {
  try {
    return localStorage.getItem('rounding') !== 'false'
  } catch {
    return true
  }
}

const RecentScoreRow = memo(function RecentScoreRow({
  game,
  row,
  index,
  rounding,
}: {
  game: GameName
  row: Row
  index: number
  rounding: boolean
}) {
  const lvLabel = formatPlaylogLevelLabel(game, row.level, row.notes, row.worldsEndTag)
  const mult = getMult(row.achievement, game)
  const rankStr = String(mult[2] ?? '').replace('p', '+')
  const pct = rounding
    ? roundFloor(row.achievement, game, 1)
    : (row.achievement / 10000).toFixed(4)
  const showEndRating = game === 'wacca' || game === 'chu3' || game === 'ongeki'
  const jacket1 = musicJacketUrl(game, row.musicId, game === 'chu3')

  return (
    <div
      className={`border-kumo-border flex items-center gap-3 rounded-lg border px-3 py-2 ${
        index % 2 === 0 ? 'bg-kumo-surface-secondary/40' : ''
      }`}
      style={{ contentVisibility: 'auto' }}
    >
      <img
        src={jacket1}
        crossOrigin={imgCross1(jacket1)}
        alt=""
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        className="h-12 w-12 shrink-0 rounded object-cover"
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden'
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{row.name ?? `ID ${row.musicId}`}</div>
        <div className="text-kumo-subtle mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          {row.isAllPerfect || row.isAllJustice ? (
            <span className="text-kumo-success font-medium">AP/AJ</span>
          ) : null}
          {row.isFullCombo ? <span className="text-kumo-accent font-medium">FC</span> : null}
          <span>Lv {lvLabel}</span>
          <span className="text-kumo-text">{rankStr}</span>
          <span title={(row.achievement / 10000).toFixed(4)}>{pct}%</span>
          {showEndRating && typeof row.afterRating === 'number' ? (
            <span>Rating {toDisplayRating(row.afterRating, game).toFixed(2)}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
})

export function RecentScoresSection({
  game,
  recent,
  musicById,
}: {
  game: GameName
  recent: GenericGamePlaylog[] | undefined
  musicById: Record<number, MusicMetaLite>
}) {
  const rounding = useRounding()
  const rows = useMemo(() => {
    if (!recent?.length) return []
    return recent.slice(0, 20).map((r) => {
      const meta = musicById[r.musicId] ?? {}
      return { ...r, ...meta } as Row
    })
  }, [recent, musicById])

  if (!rows.length) {
    return (
      <LayerCard className="p-4">
        <LayerCard.Secondary>最近成绩</LayerCard.Secondary>
        <Text DANGEROUS_className="text-kumo-subtle mt-2">暂无记录</Text>
      </LayerCard>
    )
  }

  return (
    <LayerCard className="p-4">
      <LayerCard.Secondary>最近成绩</LayerCard.Secondary>
      <div className="mt-4 flex flex-col gap-2">
        {rows.map((r, i) => (
          <RecentScoreRow
            key={`${r.musicId}-${r.playDate}-${i}`}
            game={game}
            row={r}
            index={i}
            rounding={rounding}
          />
        ))}
      </div>
    </LayerCard>
  )
}
