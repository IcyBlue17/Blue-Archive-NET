import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '@cloudflare/kumo/components/button'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { PageHeader } from '../../components/common/PageHeader'
import { SkeletonBox } from '../../components/common/Skeleton'
import * as gameApi from '../../api/game'
import { useAuth } from '../../hooks/useAuth'
import { chu3CharacterImageUrl } from '../../lib/chu3Assets'
import { imgCross1 } from '../../lib/imgSign'
import { qk } from '../../lib/query'
import * as cardApi from '../../api/card'
import type { CardSummary, CardSummaryGame, GameName } from '../../lib/types'
import { cardSummaryKeyToGame, formatDisplayRating } from '../../lib/gameRatingDisplay'
import { gameTitle } from '../../lib/gameTitles'
import { useI18n } from '../../lib/i18n'

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

function formatLogin(iso: string | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function num1(v: unknown) {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v !== '') return parseInt(v, 10) || 0
  return 0
}

function formatDate1(iso: string | undefined, locale: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')
}

function formatChu3Complete(totalMapNum: number) {
  if (!Number.isFinite(totalMapNum)) return '—'
  return `${((Math.max(0, totalMapNum) / CHU3_COMPLETE_MAX) * 100).toFixed(2)}%`
}

function SummaryCardSkeleton() {
  return (
    <div className="border-kumo-border rounded-lg border px-4 py-3">
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
      <div className="border-kumo-border border-b px-5 py-5">
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
      <div className="border-kumo-border border-t px-4 py-3">
        <SkeletonBox className="ml-auto h-5 w-40 rounded-md" />
      </div>
    </LayerCard>
  )
}

export function HomePage() {
  const { t, locale } = useI18n()
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

  const showSummarySkeleton = summaryQuery.isPending && !summary
  const hasSummary = SUMMARY_KEYS.some((key) => Boolean(summary?.[key]))
  const chu3Row = summary?.chu3 ?? null
  const chu3Profile = chu3BoxQuery.data?.user ?? null
  const showChu3Card = !!chu3Row
  const showChu3CardSkeleton = showChu3Card && chu3BoxQuery.isPending && !chu3Profile
  const chu3NameRaw = chu3Profile?.userName || chu3Row?.name || user?.displayName || user?.username || '—'
  const chu3Name = /[a-z]/i.test(chu3NameRaw) ? chu3NameRaw.toUpperCase() : chu3NameRaw
  const chu3Avatar = chu3CharacterImageUrl(num1(chu3Profile?.characterId), '02')
  const chu3Rating = formatDisplayRating(num1(chu3Profile?.playerRating) || chu3Row?.rating || 0, 'chu3')
  const chu3Level = num1(chu3Profile?.level)
  const chu3Complete = formatChu3Complete(num1(chu3Profile?.totalMapNum))
  const chu3LastPlay = formatDate1(chu3Profile?.lastPlayDate || chu3Row?.lastLogin, locale)
  const chu3CardId = user?.ghostCard?.extId != null ? String(user.ghostCard.extId) : user?.ghostCard?.luid || '—'

  return (
    <div>
      <PageHeader title={t('home')} crumbs={[{ label: t('dashboard'), href: '/home' }]} />
      {showChu3CardSkeleton ? (
        <Chu3ProfileCardSkeleton />
      ) : showChu3Card ? (
        <LayerCard className="mt-6 overflow-hidden p-0">
          <div className="border-kumo-border border-b px-5 py-5">
            <div className="text-kumo-text truncate text-[clamp(1.5rem,4vw,2.35rem)] font-black tracking-[0.32em]">
              {chu3Name}
            </div>
          </div>
          <div className="grid gap-5 px-4 py-4 md:grid-cols-[116px_minmax(0,1fr)] md:items-center">
            <div className="border-kumo-border bg-kumo-recessed mx-auto flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
              {chu3Avatar ? (
                <img
                  src={chu3Avatar}
                  crossOrigin={imgCross1(chu3Avatar)}
                  alt={chu3NameRaw}
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="text-kumo-subtle text-xs">{locale === 'zh' ? '无头像' : 'No avatar'}</div>
              )}
            </div>
            <dl className="grid min-w-0 grid-cols-[max-content_1fr] gap-x-5 gap-y-2 text-sm sm:text-base">
              <dt className="font-semibold text-kumo-default">{locale === 'zh' ? 'ID' : 'ID'}</dt>
              <dd className="truncate text-kumo-text">{chu3CardId}</dd>
              <dt className="font-semibold text-kumo-default">{locale === 'zh' ? '等级' : 'Level'}</dt>
              <dd className="text-kumo-text">{chu3Level || '—'}</dd>
              <dt className="font-semibold text-kumo-default">{locale === 'zh' ? '评级' : 'Rating'}</dt>
              <dd className="text-kumo-text">{chu3Rating}</dd>
              <dt className="font-semibold text-kumo-default">{locale === 'zh' ? '完成度' : 'Completion'}</dt>
              <dd className="text-kumo-text">{chu3Complete}</dd>
            </dl>
          </div>
          <div className="border-kumo-border bg-kumo-recessed/50 flex justify-end border-t px-4 py-3">
            <Text DANGEROUS_className="text-right text-sm font-medium">
              {locale === 'zh' ? `上次游玩： ${chu3LastPlay}` : `Last played: ${chu3LastPlay}`}
            </Text>
          </div>
        </LayerCard>
      ) : null}
      <LayerCard className="mt-6 p-4">
        <LayerCard.Secondary>{locale === 'zh' ? '游戏概要' : 'Games'}</LayerCard.Secondary>
        {showSummarySkeleton ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SummaryCardSkeleton key={i} />
            ))}
          </div>
        ) : summaryQuery.error ? (
          <Text DANGEROUS_className="text-kumo-danger mt-2">
            {summaryQuery.error instanceof Error ? summaryQuery.error.message : 'Error'}
          </Text>
        ) : summary && hasSummary ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SUMMARY_KEYS.map((key) => {
              const row = summary[key] as CardSummaryGame | null | undefined
              if (!row) return null
              const title = gameTitle(key as GameName, locale === 'en' ? 'en' : 'zh')
              const g = cardSummaryKeyToGame(key)
              const ratingStr =
                g != null
                  ? formatDisplayRating(row.rating, g)
                  : Number.isFinite(row.rating)
                    ? String(Math.round(row.rating))
                    : '—'
              return (
                <div
                  key={String(key)}
                  className="border-kumo-border rounded-lg border px-4 py-3"
                >
                  <div className="text-kumo-text font-semibold">{title}</div>
                  <div className="text-kumo-subtle mt-2 text-sm">
                    {locale === 'zh' ? '游戏内名称' : 'Name'}: {row.name || '—'}
                  </div>
                  <div className="text-kumo-subtle mt-1 text-sm">
                    Rating: {ratingStr}
                  </div>
                  <div className="text-kumo-subtle mt-1 text-xs">
                    {locale === 'zh' ? '最近登录' : 'Last login'}: {formatLogin(row.lastLogin)}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <Text DANGEROUS_className="text-kumo-subtle mt-2">
            {locale === 'zh' ? '暂无游戏数据' : 'No game data yet'}
          </Text>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/cards">
            <Button variant="primary">{t('cards')}</Button>
          </Link>
          <Link to="/team">
            <Button variant="secondary">{t('team')}</Button>
          </Link>
          <Link to="/friends">
            <Button variant="secondary">{t('friends')}</Button>
          </Link>
          <Link to="/settings/profile">
            <Button variant="secondary">{t('settings')}</Button>
          </Link>
        </div>
      </LayerCard>
    </div>
  )
}
