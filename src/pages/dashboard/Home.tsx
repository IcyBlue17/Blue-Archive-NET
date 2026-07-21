import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '@cloudflare/kumo/components/button'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { CardSummaryGrid } from '../../components/common/CardSummaryGrid'
import { PageHeader } from '../../components/common/PageHeader'
import { SkeletonBox } from '../../components/common/Skeleton'
import * as gameApi from '../../api/game'
import { useAuth } from '../../hooks/useAuth'
import { chu3CharacterImageUrl } from '../../lib/chu3Assets'
import { fetchOn9AssetJson, on9CardImageUrl, type On9CardJsonEntry } from '../../lib/on9Assets'
import { imgCross } from '../../lib/imgSign'
import { qk } from '../../lib/query'
import * as cardApi from '../../api/card'
import type { CardSummary } from '../../lib/types'
import { formatDisplayRating } from '../../lib/gameRatingDisplay'
import { coerceInt, formatDateMaybe, formatRatioPercent } from '../../lib/format'
import { useI18n } from '../../lib/i18n'
import { useAppTexts } from '../../content/texts'

const SUMMARY_KEYS: (keyof CardSummary)[] = ['chu3', 'mai2', 'ongeki', 'wacca', 'diva']
const CHU3_COMPLETE_MAX = 50000

type Chu3HomeProfile = {
  userName?: string
  level?: number | string
  playerRating?: number | string
  characterId?: number | string
  totalMapNum?: number | string
  lastPlayDate?: string
}

type Chu3HomeBox = {
  user?: Chu3HomeProfile | null
}

type On9HomeProfile = {
  userName?: string
  level?: number | string
  reincarnationNum?: number | string
  playerRating?: number | string
  battlePoint?: number | string
  playCount?: number | string
  cardId?: number | string
  lastPlayDate?: string
}

type On9HomeBox = {
  user?: On9HomeProfile | null
  cards?: Array<{ cardId?: number | string }>
}

function SummaryCardSkeleton() {
  return (
    <div className="border-kumo-line rounded-lg border px-4 py-3">
      <SkeletonBox className="h-5 w-24 rounded-md" />
      <SkeletonBox className="mt-3 h-4 w-32 rounded-md" />
      <SkeletonBox className="mt-2 h-4 w-24 rounded-md" />
      <SkeletonBox className="mt-2 h-3 w-40 rounded-md" />
    </div>
  )
}

function Chu3ProfileCardSkeleton() {
  return (
    <LayerCard className="mt-6 overflow-hidden p-0">
      <div className="border-kumo-line border-b px-5 py-5">
        <SkeletonBox className="h-9 w-52 rounded-lg" />
      </div>
      <div className="grid gap-5 px-4 py-4 md:grid-cols-[112px_minmax(0,1fr)] md:items-center">
        <SkeletonBox className="mx-auto size-24 rounded-xl" />
        <div className="space-y-3">
          <SkeletonBox className="h-5 w-40 rounded-md" />
          <SkeletonBox className="h-5 w-28 rounded-md" />
          <SkeletonBox className="h-5 w-32 rounded-md" />
          <SkeletonBox className="h-5 w-36 rounded-md" />
        </div>
      </div>
      <div className="border-kumo-line border-t px-4 py-3">
        <SkeletonBox className="ml-auto h-5 w-40 rounded-md" />
      </div>
    </LayerCard>
  )
}

function On9ProfileCardSkeleton() {
  return (
    <LayerCard className="mt-6 overflow-hidden p-0">
      <div className="border-kumo-line border-b px-5 py-5">
        <SkeletonBox className="h-9 w-52 rounded-lg" />
      </div>
      <div className="grid gap-5 px-4 py-4 md:grid-cols-[112px_minmax(0,1fr)] md:items-center">
        <SkeletonBox className="mx-auto aspect-[3/4] w-24 rounded-xl" />
        <div className="space-y-3">
          <SkeletonBox className="h-5 w-40 rounded-md" />
          <SkeletonBox className="h-5 w-28 rounded-md" />
          <SkeletonBox className="h-5 w-32 rounded-md" />
          <SkeletonBox className="h-5 w-36 rounded-md" />
        </div>
      </div>
      <div className="border-kumo-line border-t px-4 py-3">
        <SkeletonBox className="ml-auto h-5 w-40 rounded-md" />
      </div>
    </LayerCard>
  )
}

export function HomePage() {
  const { locale } = useI18n()
  const texts = useAppTexts()
  const { user } = useAuth()
  const username = user?.username ?? ''
  const summaryQuery = useQuery<CardSummary>({
    queryKey: qk.homeSummary(username),
    enabled: !!username,
    placeholderData: (old) => old,
    queryFn: async () => cardApi.userGames(username),
  })
  const summary = summaryQuery.data ?? null
  const chu3BoxQuery = useQuery<Chu3HomeBox>({
    queryKey: qk.homeChu3Box(username),
    enabled: !!username && !!summary?.chu3,
    placeholderData: (old) => old,
    queryFn: async () => gameApi.userBox() as Promise<Chu3HomeBox>,
  })
  const on9BoxQuery = useQuery<{ box: On9HomeBox; totalCards: number }>({
    queryKey: qk.homeOn9Box(username),
    enabled: !!username && !!summary?.ongeki,
    placeholderData: (old) => old,
    queryFn: async () => {
      const [box, cardCatalog] = await Promise.all([
        gameApi.ongekiUserBox() as Promise<On9HomeBox>,
        fetchOn9AssetJson<On9CardJsonEntry[]>('card.json').catch(() => [] as On9CardJsonEntry[]),
      ])
      return { box, totalCards: cardCatalog.length }
    },
  })

  const showSummarySkeleton = summaryQuery.isPending && !summary
  const hasSummary = SUMMARY_KEYS.some((key) => Boolean(summary?.[key]))
  const chu3Row = summary?.chu3 ?? null
  const chu3Profile = chu3BoxQuery.data?.user ?? null
  const showChu3Card = !!chu3Row
  const showChu3CardSkeleton = showChu3Card && chu3BoxQuery.isPending && !chu3Profile
  const chu3NameRaw = chu3Profile?.userName || chu3Row?.name || user?.displayName || user?.username || '—'
  const chu3Name = /[a-z]/i.test(chu3NameRaw) ? chu3NameRaw.toUpperCase() : chu3NameRaw
  const chu3Avatar = chu3CharacterImageUrl(coerceInt(chu3Profile?.characterId), '02')
  const chu3Rating = formatDisplayRating(coerceInt(chu3Profile?.playerRating) || chu3Row?.rating || 0, 'chu3')
  const chu3Level = coerceInt(chu3Profile?.level)
  const chu3Complete = formatRatioPercent(coerceInt(chu3Profile?.totalMapNum), CHU3_COMPLETE_MAX)
  const chu3LastPlay = formatDateMaybe(chu3Profile?.lastPlayDate || chu3Row?.lastLogin, locale)
  const accessCardId = user?.ghostCard?.extId != null ? String(user.ghostCard.extId) : user?.ghostCard?.luid || '—'

  const on9Row = summary?.ongeki ?? null
  const on9Box = on9BoxQuery.data?.box ?? null
  const on9Profile = on9Box?.user ?? null
  const showOn9Card = !!on9Row
  const showOn9CardSkeleton = showOn9Card && on9BoxQuery.isPending && !on9Profile
  const on9NameRaw = on9Profile?.userName || on9Row?.name || user?.displayName || user?.username || '—'
  const on9Name = /[a-z]/i.test(on9NameRaw) ? on9NameRaw.toUpperCase() : on9NameRaw
  const on9Avatar = on9CardImageUrl(coerceInt(on9Profile?.cardId))
  const on9Rating = formatDisplayRating(coerceInt(on9Profile?.playerRating) || on9Row?.rating || 0, 'ongeki')
  const on9Level = coerceInt(on9Profile?.level)
  const on9Reincarnation = coerceInt(on9Profile?.reincarnationNum)
  const on9LevelText = on9Level
    ? on9Reincarnation > 0
      ? `${on9Level} · ${texts.homePage.reincarnation(on9Reincarnation)}`
      : String(on9Level)
    : '—'
  const on9BattlePoint = coerceInt(on9Profile?.battlePoint)
  const on9PlayCount = coerceInt(on9Profile?.playCount)
  const on9OwnedCards = new Set(
    (on9Box?.cards ?? []).map((one) => coerceInt(one.cardId)).filter((one) => one > 0),
  ).size
  const on9Complete = formatRatioPercent(on9OwnedCards, on9BoxQuery.data?.totalCards ?? 0)
  const on9LastPlay = formatDateMaybe(on9Profile?.lastPlayDate || on9Row?.lastLogin, locale)

  return (
    <div>
      <PageHeader title={texts.nav.home} crumbs={[{ label: texts.nav.dashboard, href: '/home' }]} />
      {showChu3CardSkeleton ? (
        <Chu3ProfileCardSkeleton />
      ) : showChu3Card ? (
        <LayerCard className="mt-6 overflow-hidden p-0">
          <div className="border-kumo-line border-b px-5 py-5">
            <div className="text-kumo-default truncate text-[clamp(1.5rem,4vw,2.35rem)] font-black tracking-[0.32em]">
              {chu3Name}
            </div>
          </div>
          <div className="grid gap-5 px-4 py-4 md:grid-cols-[116px_minmax(0,1fr)] md:items-center">
            <div className="border-kumo-line bg-kumo-recessed mx-auto flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
              {chu3Avatar ? (
                <img
                  src={chu3Avatar}
                  crossOrigin={imgCross(chu3Avatar)}
                  alt={chu3NameRaw}
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="text-kumo-subtle text-xs">{texts.homePage.noAvatar}</div>
              )}
            </div>
            <dl className="grid min-w-0 grid-cols-[max-content_1fr] gap-x-5 gap-y-2 text-sm sm:text-base">
              <dt className="font-semibold text-kumo-default">{texts.homePage.id}</dt>
              <dd className="truncate text-kumo-default">{accessCardId}</dd>
              <dt className="font-semibold text-kumo-default">{texts.homePage.level}</dt>
              <dd className="text-kumo-default">{chu3Level || '—'}</dd>
              <dt className="font-semibold text-kumo-default">{texts.homePage.rating}</dt>
              <dd className="text-kumo-default">{chu3Rating}</dd>
              <dt className="font-semibold text-kumo-default">{texts.homePage.completion}</dt>
              <dd className="text-kumo-default">{chu3Complete}</dd>
            </dl>
          </div>
          <div className="border-kumo-line bg-kumo-recessed flex justify-end border-t px-4 py-3">
            <Text DANGEROUS_className="text-right text-sm font-medium">
              {texts.homePage.lastPlayed(chu3LastPlay)}
            </Text>
          </div>
        </LayerCard>
      ) : null}
      {showOn9CardSkeleton ? (
        <On9ProfileCardSkeleton />
      ) : showOn9Card ? (
        <LayerCard className="mt-6 overflow-hidden p-0">
          <div className="border-kumo-line border-b px-5 py-5">
            <div className="text-kumo-default truncate text-[clamp(1.5rem,4vw,2.35rem)] font-black tracking-[0.32em]">
              {on9Name}
            </div>
          </div>
          <div className="grid gap-5 px-4 py-4 md:grid-cols-[116px_minmax(0,1fr)] md:items-center">
            <div className="border-kumo-line bg-kumo-recessed mx-auto flex aspect-[3/4] w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
              {on9Avatar ? (
                <img
                  src={on9Avatar}
                  crossOrigin={imgCross(on9Avatar)}
                  alt={on9NameRaw}
                  className="size-full object-cover object-top"
                  loading="lazy"
                />
              ) : (
                <div className="text-kumo-subtle text-xs">{texts.homePage.noAvatar}</div>
              )}
            </div>
            <dl className="grid min-w-0 grid-cols-[max-content_1fr] gap-x-5 gap-y-2 text-sm sm:text-base">
              <dt className="font-semibold text-kumo-default">{texts.homePage.id}</dt>
              <dd className="truncate text-kumo-default">{accessCardId}</dd>
              <dt className="font-semibold text-kumo-default">{texts.homePage.level}</dt>
              <dd className="text-kumo-default">{on9LevelText}</dd>
              <dt className="font-semibold text-kumo-default">{texts.homePage.rating}</dt>
              <dd className="text-kumo-default">{on9Rating}</dd>
              <dt className="font-semibold text-kumo-default">{texts.homePage.battlePoint}</dt>
              <dd className="text-kumo-default">{on9BattlePoint ? on9BattlePoint.toLocaleString() : '—'}</dd>
              <dt className="font-semibold text-kumo-default">{texts.gamesPage.playCount}</dt>
              <dd className="text-kumo-default">{on9PlayCount ? on9PlayCount.toLocaleString() : '—'}</dd>
              <dt className="font-semibold text-kumo-default">{texts.homePage.completion}</dt>
              <dd className="text-kumo-default">{on9Complete}</dd>
            </dl>
          </div>
          <div className="border-kumo-line bg-kumo-recessed flex justify-end border-t px-4 py-3">
            <Text DANGEROUS_className="text-right text-sm font-medium">
              {texts.homePage.lastPlayed(on9LastPlay)}
            </Text>
          </div>
        </LayerCard>
      ) : null}
      <LayerCard className="mt-6 p-4">
        <LayerCard.Secondary>{texts.homePage.games}</LayerCard.Secondary>
        {showSummarySkeleton ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SummaryCardSkeleton key={i} />
            ))}
          </div>
        ) : summaryQuery.error ? (
          <Text DANGEROUS_className="text-kumo-danger mt-2">
            {summaryQuery.error instanceof Error ? summaryQuery.error.message : texts.common.error}
          </Text>
        ) : summary && hasSummary ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CardSummaryGrid
              summary={summary}
              locale={locale === 'en' ? 'en' : 'zh'}
              texts={texts}
              ratingLabel={texts.common.rating}
              lastLoginLabel={texts.homePage.lastLogin}
            />
          </div>
        ) : (
          <Text DANGEROUS_className="text-kumo-subtle mt-2">
            {texts.homePage.noGameData}
          </Text>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/cards">
            <Button variant="primary">{texts.nav.cards}</Button>
          </Link>
          <Link to="/team">
            <Button variant="secondary">{texts.nav.team}</Button>
          </Link>
          <Link to="/friends">
            <Button variant="secondary">{texts.nav.friends}</Button>
          </Link>
          <Link to="/friends/ongeki">
            <Button variant="secondary">{texts.nav.on9Friends}</Button>
          </Link>
          <Link to="/settings/profile">
            <Button variant="secondary">{texts.nav.settings}</Button>
          </Link>
        </div>
      </LayerCard>
    </div>
  )
}
