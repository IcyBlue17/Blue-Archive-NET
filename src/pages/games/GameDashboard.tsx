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
import { useAppTexts } from '../../content/texts'

const GAMES: GameName[] = ['chu3', 'mai2', 'ongeki', 'wacca']
const CHU3_SECTIONS = ['overview', 'songs', 'plays'] as const
type GameSection = (typeof CHU3_SECTIONS)[number]

function sectionPath(game: GameName, section: GameSection) {
  return section === 'overview' ? `/games/${game}` : `/games/${game}/${section}`
}

function chunk<T>(rows: T[], size: number) {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}

function normMusicMap(raw: AllMusicMap | null | undefined): Record<number, MusicMetaLite> {
  const out: Record<number, MusicMetaLite> = {}
  if (!raw) return out
  for (const [key, value] of Object.entries(raw)) {
    const musicId = parseInt(key, 10)
    if (Number.isNaN(musicId)) continue
    out[musicId] = value as MusicMetaLite
  }
  return out
}

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

function GameSectionSkeleton() {
  return (
    <LayerCard className="p-4">
      <SkeletonBox className="h-5 w-28 rounded-md" />
      <SkeletonBox className="mt-4 h-10 w-full rounded-xl" />
      <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBox key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <SkeletonBox className="h-[32rem] w-full rounded-xl" />
      </div>
    </LayerCard>
  )
}

export function GameDashboardPage() {
  const { game: rawGame, section: rawSection } = useParams<{ game: string; section?: string }>()
  const nav = useNavigate()
  const { locale } = useI18n()
  const texts = useAppTexts()
  const { user } = useAuth()
  const loc = locale === 'en' ? 'en' : 'zh'
  const game = (GAMES.includes(rawGame as GameName) ? rawGame : 'chu3') as GameName
  const section = (game === 'chu3' && CHU3_SECTIONS.includes(rawSection as GameSection) ? rawSection : 'overview') as GameSection
  const username = user?.username ?? ''

  const allMusicQuery = useQuery<AllMusicMap>({
    queryKey: qk.gameAllMusic(game),
    placeholderData: (old) => old,
    queryFn: async () => dataApi.allMusic(game) as Promise<AllMusicMap>,
  })

  const allMusic = allMusicQuery.data ?? null
  const musicById = useMemo(() => normMusicMap(allMusic), [allMusic])
  const musicIds = useMemo(
    () => Object.keys(musicById).map((one) => parseInt(one, 10)).filter((one) => !Number.isNaN(one)),
    [musicById],
  )

  const dashQuery = useQuery<{
    summary: GenericGameSummary | null
    trend: TrendEntry[]
  }>({
    queryKey: qk.gameDash(username, game),
    enabled: !!username && section === 'overview',
    queryFn: async () => {
      const [summary, trend] = await Promise.all([gameApi.userSummary(username, game), gameApi.trend(username, game)])
      return {
        summary: summary as GenericGameSummary,
        trend: trend,
      }
    },
  })

  const songQuery = useQuery<Chu3UserMusicDetail[]>({
    queryKey: qk.gameLibrary(username, game),
    enabled: !!username && game === 'chu3' && section === 'songs' && musicIds.length > 0,
    placeholderData: (old) => old,
    queryFn: async () => {
      const group = chunk(musicIds, 300)
      const rows = await Promise.all(group.map((part) => gameApi.userMusicFromList(username, 'chu3', part)))
      return rows.flat()
    },
  })

  const playQuery = useQuery<GamePlayRecord[]>({
    queryKey: qk.gamePlaylog(username, game),
    enabled: !!username && game === 'chu3' && (section === 'plays' || section === 'songs'),
    placeholderData: (old) => old,
    queryFn: async () => gameApi.recent(username, 'chu3'),
  })

  const summary = dashQuery.data?.summary ?? null
  const trend = dashQuery.data?.trend ?? []
  const composition = summary?.ratingComposition as Record<string, unknown> | undefined
  const overviewErr = dashQuery.error instanceof Error ? dashQuery.error.message : dashQuery.error ? texts.gamesPage.noSummary : null
  const songErr = songQuery.error instanceof Error ? songQuery.error.message : songQuery.error ? texts.gamesPage.loadSongsFailed : allMusicQuery.error instanceof Error ? allMusicQuery.error.message : allMusicQuery.error ? texts.gamesPage.loadMusicFailed : null
  const playErr = playQuery.error instanceof Error ? playQuery.error.message : playQuery.error ? texts.gamesPage.loadPlaysFailed : allMusicQuery.error instanceof Error ? allMusicQuery.error.message : allMusicQuery.error ? texts.gamesPage.loadMusicFailed : null
  const showOverviewLoading = section === 'overview' && ((dashQuery.isPending && !dashQuery.data) || (allMusicQuery.isPending && !allMusic))
  const showSongsLoading = section === 'songs' && ((allMusicQuery.isPending && !allMusic) || (songQuery.isPending && !songQuery.data))
  const showPlaysLoading = section === 'plays' && ((allMusicQuery.isPending && !allMusic) || (playQuery.isPending && !playQuery.data))

  return (
    <div>
      <PageHeader title={`${gameTitle(game, loc)} · ${texts.gamesPage.games}`} crumbs={[{ label: texts.nav.home, href: '/home' }]} />
      <Tabs
        className="mb-4"
        variant="underline"
        tabs={GAMES.map((one) => ({ value: one, label: gameTitle(one, loc) }))}
        value={game}
        onValueChange={(value) => nav(sectionPath(value as GameName, value === 'chu3' ? section : 'overview'))}
      />

      {game === 'chu3' ? (
        <Tabs
          className="mb-6"
          variant="segmented"
          tabs={[
            { value: 'overview', label: texts.gamesPage.overview },
            { value: 'songs', label: texts.gamesPage.songs },
            { value: 'plays', label: texts.gamesPage.plays },
          ]}
          value={section}
          onValueChange={(value) => nav(sectionPath(game, value as GameSection))}
        />
      ) : null}

      {section === 'overview' ? (
        <>
          {overviewErr ? (
            <LayerCard className="mb-4 p-4">
              <LayerCard.Secondary>{texts.common.prompt}</LayerCard.Secondary>
              <p className="text-kumo-subtle mt-2 text-sm">{overviewErr}</p>
            </LayerCard>
          ) : null}
          {showOverviewLoading ? (
            <GameDashSkeleton />
          ) : (
            <>
              <GameSummaryPanel game={game} summary={summary} />
              <RatingCompositionSection game={game} ratingComposition={composition} allMusics={musicById as Record<string, MusicMetaLite>} />
              <LayerCard className="mb-6 mt-6 p-4">
                <LayerCard.Secondary>{texts.gamesPage.ratingTrend}</LayerCard.Secondary>
                <div className="mt-4">
                  <TrendLineChart data={trend} game={game} />
                </div>
              </LayerCard>
              <LayerCard className="mb-6 p-4">
                <LayerCard.Secondary>{texts.gamesPage.playsHeatmap}</LayerCard.Secondary>
                <div className="mt-4">
                  <PlaysHeatmap trend={trend} />
                </div>
              </LayerCard>
              <RecentScoresSection game={game} recent={summary?.recent} musicById={musicById} />
            </>
          )}
        </>
      ) : null}

      {game === 'chu3' && section === 'songs' ? (
        showSongsLoading ? (
          <GameSectionSkeleton />
        ) : (
          <>
            {songErr ? (
              <LayerCard className="mb-4 p-4">
                <LayerCard.Secondary>{texts.common.prompt}</LayerCard.Secondary>
                <p className="text-kumo-subtle mt-2 text-sm">{songErr}</p>
              </LayerCard>
            ) : (
              <Chu3MusicLibrary
                musicById={musicById}
                detailRows={songQuery.data ?? []}
                records={playQuery.data ?? []}
                loading={showSongsLoading}
                error={songErr}
                locale={loc}
              />
            )}
          </>
        )
      ) : null}

      {game === 'chu3' && section === 'plays' ? (
        showPlaysLoading ? (
          <GameSectionSkeleton />
        ) : (
          <>
            {playErr ? (
              <LayerCard className="mb-4 p-4">
                <LayerCard.Secondary>{texts.common.prompt}</LayerCard.Secondary>
                <p className="text-kumo-subtle mt-2 text-sm">{playErr}</p>
              </LayerCard>
            ) : (
              <Chu3PlaylogExplorer
                musicById={musicById}
                records={playQuery.data ?? []}
                loading={showPlaysLoading}
                error={playErr}
                locale={loc}
              />
            )}
          </>
        )
      ) : null}
    </div>
  )
}
