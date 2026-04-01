import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { PageHeader } from '../../components/common/PageHeader'
import { SkeletonBox } from '../../components/common/Skeleton'
import { Chu3MusicLibrary } from '../../components/game/Chu3MusicLibrary'
import { Chu3PlaylogExplorer } from '../../components/game/Chu3PlaylogExplorer'
import { GameSummaryPanel } from '../../components/game/GameSummaryPanel'
import { PlaysHeatmap } from '../../components/game/PlaysHeatmap'
import { RatingCompositionSection } from '../../components/game/RatingCompositionSection'
import { RecentScoresSection } from '../../components/game/RecentScoresSection'
import { TrendLineChart } from '../../components/game/TrendLineChart'
import * as dataApi from '../../api/data'
import * as gameApi from '../../api/game'
import { useAuth } from '../../hooks/useAuth'
import { qk } from '../../lib/query'
import type { AllMusicMap, Chu3UserMusicDetail, GameName, GamePlayRecord, GenericGameSummary, TrendEntry } from '../../lib/types'
import type { MusicMetaLite } from '../../lib/scoring'
import { gameTitle } from '../../lib/gameTitles'
import { useI18n } from '../../lib/i18n'

const GAMES: GameName[] = ['chu3', 'mai2', 'ongeki', 'wacca']
const CHU3_SECTIONS = ['overview', 'songs', 'plays'] as const
type GameSection = (typeof CHU3_SECTIONS)[number]

function sectionPath1(game: GameName, section: GameSection) {
  return section === 'overview' ? `/games/${game}` : `/games/${game}/${section}`
}

function chunk1<T>(rows: T[], size: number) {
  const out1: T[][] = []
  for (let i1 = 0; i1 < rows.length; i1 += size) out1.push(rows.slice(i1, i1 + size))
  return out1
}

function normMusicMap1(raw: AllMusicMap | null | undefined): Record<number, MusicMetaLite> {
  const out1: Record<number, MusicMetaLite> = {}
  if (!raw) return out1
  for (const [key1, value1] of Object.entries(raw)) {
    const musicId1 = parseInt(key1, 10)
    if (Number.isNaN(musicId1)) continue
    out1[musicId1] = value1 as MusicMetaLite
  }
  return out1
}

function GameDashSkeleton() {
  return (
    <>
      <LayerCard className="p-4">
        <SkeletonBox className="h-5 w-28 rounded-md" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i1) => (
            <div key={i1} className="border-kumo-border rounded-md border px-3 py-2">
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
          {Array.from({ length: 6 }).map((_, i1) => (
            <SkeletonBox key={i1} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </LayerCard>
    </>
  )
}

function GameSectionSkeleton() {
  return (
    <LayerCard className="p-4">
      <SkeletonBox className="h-5 w-28 rounded-md" />
      <SkeletonBox className="mt-4 h-10 w-full rounded-xl" />
      <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i1) => (
            <SkeletonBox key={i1} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <SkeletonBox className="h-[32rem] w-full rounded-xl" />
      </div>
    </LayerCard>
  )
}

export function GameDashboardPage() {
  const { game: rawGame1, section: rawSection1 } = useParams<{ game: string; section?: string }>()
  const nav = useNavigate()
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const loc1 = locale === 'en' ? 'en' : 'zh'
  const game1 = (GAMES.includes(rawGame1 as GameName) ? rawGame1 : 'chu3') as GameName
  const section1 = (game1 === 'chu3' && CHU3_SECTIONS.includes(rawSection1 as GameSection) ? rawSection1 : 'overview') as GameSection
  const username1 = user?.username ?? ''

  const allMusicQuery1 = useQuery<AllMusicMap>({
    queryKey: qk.gameAllMusic(game1),
    placeholderData: (old1) => old1,
    queryFn: async () => dataApi.allMusic(game1) as Promise<AllMusicMap>,
  })

  const allMusic1 = allMusicQuery1.data ?? null
  const musicById1 = useMemo(() => normMusicMap1(allMusic1), [allMusic1])
  const musicIds1 = useMemo(
    () => Object.keys(musicById1).map((one1) => parseInt(one1, 10)).filter((one1) => !Number.isNaN(one1)),
    [musicById1],
  )

  const dashQuery1 = useQuery<{
    summary: GenericGameSummary | null
    trend: TrendEntry[]
  }>({
    queryKey: qk.gameDash(username1, game1),
    enabled: !!username1 && section1 === 'overview',
    queryFn: async () => {
      const [summary1, trend1] = await Promise.all([gameApi.userSummary(username1, game1), gameApi.trend(username1, game1)])
      return {
        summary: summary1 as GenericGameSummary,
        trend: trend1,
      }
    },
  })

  const songQuery1 = useQuery<Chu3UserMusicDetail[]>({
    queryKey: qk.gameLibrary(username1, game1),
    enabled: !!username1 && game1 === 'chu3' && section1 === 'songs' && musicIds1.length > 0,
    placeholderData: (old1) => old1,
    queryFn: async () => {
      const group1 = chunk1(musicIds1, 300)
      const rows1 = await Promise.all(group1.map((part1) => gameApi.userMusicFromList(username1, 'chu3', part1)))
      return rows1.flat()
    },
  })

  const playQuery1 = useQuery<GamePlayRecord[]>({
    queryKey: qk.gamePlaylog(username1, game1),
    enabled: !!username1 && game1 === 'chu3' && section1 === 'plays',
    placeholderData: (old1) => old1,
    queryFn: async () => gameApi.recent(username1, 'chu3'),
  })

  const summary1 = dashQuery1.data?.summary ?? null
  const trend1 = dashQuery1.data?.trend ?? []
  const composition1 = summary1?.ratingComposition as Record<string, unknown> | undefined
  const overviewErr1 = dashQuery1.error instanceof Error ? dashQuery1.error.message : dashQuery1.error ? '该游戏暂无绑定数据或无法加载摘要' : null
  const songErr1 = songQuery1.error instanceof Error ? songQuery1.error.message : songQuery1.error ? '无法加载乐曲列表' : allMusicQuery1.error instanceof Error ? allMusicQuery1.error.message : allMusicQuery1.error ? '无法加载曲库' : null
  const playErr1 = playQuery1.error instanceof Error ? playQuery1.error.message : playQuery1.error ? '无法加载游玩记录' : allMusicQuery1.error instanceof Error ? allMusicQuery1.error.message : allMusicQuery1.error ? '无法加载曲库' : null
  const showOverviewLoading1 = section1 === 'overview' && ((dashQuery1.isPending && !dashQuery1.data) || (allMusicQuery1.isPending && !allMusic1))
  const showSongsLoading1 = section1 === 'songs' && ((allMusicQuery1.isPending && !allMusic1) || (songQuery1.isPending && !songQuery1.data))
  const showPlaysLoading1 = section1 === 'plays' && ((allMusicQuery1.isPending && !allMusic1) || (playQuery1.isPending && !playQuery1.data))

  return (
    <div>
      <PageHeader title={`${gameTitle(game1, loc1)} · Games`} crumbs={[{ label: t('home'), href: '/home' }]} />
      <Tabs
        className="mb-4"
        variant="underline"
        tabs={GAMES.map((one1) => ({ value: one1, label: gameTitle(one1, loc1) }))}
        value={game1}
        onValueChange={(value1) => nav(sectionPath1(value1 as GameName, value1 === 'chu3' ? section1 : 'overview'))}
      />

      {game1 === 'chu3' ? (
        <Tabs
          className="mb-6"
          variant="segmented"
          tabs={[
            { value: 'overview', label: locale === 'zh' ? '概览' : 'Overview' },
            { value: 'songs', label: locale === 'zh' ? '乐曲列表' : 'Songs' },
            { value: 'plays', label: locale === 'zh' ? '游玩记录' : 'Plays' },
          ]}
          value={section1}
          onValueChange={(value1) => nav(sectionPath1(game1, value1 as GameSection))}
        />
      ) : null}

      {section1 === 'overview' ? (
        <>
          {overviewErr1 ? (
            <LayerCard className="mb-4 p-4">
              <LayerCard.Secondary>提示</LayerCard.Secondary>
              <p className="text-kumo-subtle mt-2 text-sm">{overviewErr1}</p>
            </LayerCard>
          ) : null}
          {showOverviewLoading1 ? (
            <GameDashSkeleton />
          ) : (
            <>
              <GameSummaryPanel game={game1} summary={summary1} />
              <RatingCompositionSection game={game1} ratingComposition={composition1} allMusics={musicById1 as Record<string, MusicMetaLite>} />
              <LayerCard className="mb-6 mt-6 p-4">
                <LayerCard.Secondary>Rating 趋势</LayerCard.Secondary>
                <div className="mt-4">
                  <TrendLineChart data={trend1} game={game1} />
                </div>
              </LayerCard>
              <LayerCard className="mb-6 p-4">
                <LayerCard.Secondary>游玩热力图</LayerCard.Secondary>
                <div className="mt-4">
                  <PlaysHeatmap trend={trend1} />
                </div>
              </LayerCard>
              <RecentScoresSection game={game1} recent={summary1?.recent} musicById={musicById1} />
            </>
          )}
        </>
      ) : null}

      {game1 === 'chu3' && section1 === 'songs' ? (
        showSongsLoading1 ? (
          <GameSectionSkeleton />
        ) : (
          <>
            {songErr1 ? (
              <LayerCard className="mb-4 p-4">
                <LayerCard.Secondary>提示</LayerCard.Secondary>
                <p className="text-kumo-subtle mt-2 text-sm">{songErr1}</p>
              </LayerCard>
            ) : null}
            <Chu3MusicLibrary
              musicById={musicById1}
              detailRows={songQuery1.data ?? []}
              loading={showSongsLoading1}
              error={null}
              locale={loc1}
            />
          </>
        )
      ) : null}

      {game1 === 'chu3' && section1 === 'plays' ? (
        showPlaysLoading1 ? (
          <GameSectionSkeleton />
        ) : (
          <>
            {playErr1 ? (
              <LayerCard className="mb-4 p-4">
                <LayerCard.Secondary>提示</LayerCard.Secondary>
                <p className="text-kumo-subtle mt-2 text-sm">{playErr1}</p>
              </LayerCard>
            ) : null}
            <Chu3PlaylogExplorer
              musicById={musicById1}
              records={playQuery1.data ?? []}
              loading={showPlaysLoading1}
              error={null}
              locale={loc1}
            />
          </>
        )
      ) : null}
    </div>
  )
}
