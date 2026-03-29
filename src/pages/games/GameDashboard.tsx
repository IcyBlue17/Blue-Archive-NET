import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { PageHeader } from '../../components/common/PageHeader'
import { SkeletonBox } from '../../components/common/Skeleton'
import { GameSummaryPanel } from '../../components/game/GameSummaryPanel'
import { PlaysHeatmap } from '../../components/game/PlaysHeatmap'
import { RatingCompositionSection } from '../../components/game/RatingCompositionSection'
import { RecentScoresSection } from '../../components/game/RecentScoresSection'
import { TrendLineChart } from '../../components/game/TrendLineChart'
import * as dataApi from '../../api/data'
import * as gameApi from '../../api/game'
import { useAuth } from '../../hooks/useAuth'
import { qk } from '../../lib/query'
import type { GameName, GenericGameSummary, TrendEntry } from '../../lib/types'
import type { MusicMetaLite } from '../../lib/scoring'
import { gameTitle } from '../../lib/gameTitles'
import { useI18n } from '../../lib/i18n'

const GAMES: GameName[] = ['chu3', 'mai2', 'ongeki', 'wacca']

function GameDashSkeleton() {
  return (
    <>
      <LayerCard className="p-4">
        <SkeletonBox className="h-5 w-28 rounded-md" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-kumo-border rounded-md border px-3 py-2">
              <SkeletonBox className="h-3 w-16 rounded-md" />
              <SkeletonBox className="mt-2 h-5 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </LayerCard>
      <LayerCard className="mb-6 mt-6 p-4">
        <SkeletonBox className="h-5 w-24 rounded-md" />
        <SkeletonBox className="mt-4 h-56 w-full rounded-xl" />
      </LayerCard>
      <LayerCard className="mb-6 p-4">
        <SkeletonBox className="h-5 w-24 rounded-md" />
        <SkeletonBox className="mt-4 h-44 w-full rounded-xl" />
      </LayerCard>
      <LayerCard className="p-4">
        <SkeletonBox className="h-5 w-24 rounded-md" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBox key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </LayerCard>
    </>
  )
}

export function GameDashboardPage() {
  const { game: g } = useParams<{ game: string }>()
  const nav = useNavigate()
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const loc = locale === 'en' ? 'en' : 'zh'
  const game = (GAMES.includes(g as GameName) ? g : 'chu3') as GameName
  const username = user?.username ?? ''

  const dashQuery = useQuery<{
    summary: GenericGameSummary | null
    trend: TrendEntry[]
    musicById: Record<number, MusicMetaLite>
  }>({
    queryKey: qk.gameDash(username, game),
    enabled: !!username,
    queryFn: async () => {
      const musicP = dataApi.allMusic(game).catch(() => null)
      const [sum, tr, rawMusic] = await Promise.all([
        gameApi.userSummary(username, game),
        gameApi.trend(username, game),
        musicP,
      ])
      const musicById: Record<number, MusicMetaLite> = {}
      if (rawMusic && typeof rawMusic === 'object') {
        for (const [k, v] of Object.entries(rawMusic as Record<string, MusicMetaLite>)) {
          const id = parseInt(k, 10)
          if (!Number.isNaN(id)) musicById[id] = v
        }
      }
      return {
        summary: sum as GenericGameSummary,
        trend: tr,
        musicById,
      }
    },
  })

  const summary = dashQuery.data?.summary ?? null
  const trend = dashQuery.data?.trend ?? []
  const musicById = dashQuery.data?.musicById ?? {}
  const loadErr =
    dashQuery.error instanceof Error ? dashQuery.error.message : dashQuery.error ? '该游戏暂无绑定数据或无法加载摘要' : null

  const composition = summary?.ratingComposition as Record<string, unknown> | undefined
  const showLoading = dashQuery.isPending && !dashQuery.data

  return (
    <div>
      <PageHeader title="游戏面板" crumbs={[{ label: t('home'), href: '/home' }]} />
      <Tabs
        className="mb-6"
        variant="underline"
        tabs={GAMES.map((x) => ({ value: x, label: gameTitle(x, loc) }))}
        value={game}
        onValueChange={(v) => nav(`/games/${v}`)}
      />
      {loadErr ? (
        <LayerCard className="mb-4 p-4">
          <LayerCard.Secondary>提示</LayerCard.Secondary>
          <p className="text-kumo-subtle mt-2 text-sm">{loadErr}</p>
        </LayerCard>
      ) : null}
      {showLoading ? (
        <GameDashSkeleton />
      ) : (
        <>
          <GameSummaryPanel game={game} summary={summary} />
          <RatingCompositionSection
            game={game}
            ratingComposition={composition}
            allMusics={musicById as Record<string, MusicMetaLite>}
          />
          <LayerCard className="mb-6 mt-6 p-4">
            <LayerCard.Secondary>Rating 趋势</LayerCard.Secondary>
            <div className="mt-4">
              <TrendLineChart data={trend} game={game} />
            </div>
          </LayerCard>
          <LayerCard className="mb-6 p-4">
            <LayerCard.Secondary>游玩热力图</LayerCard.Secondary>
            <div className="mt-4">
              <PlaysHeatmap trend={trend} />
            </div>
          </LayerCard>
          <RecentScoresSection game={game} recent={summary?.recent} musicById={musicById} />
        </>
      )}
    </div>
  )
}
