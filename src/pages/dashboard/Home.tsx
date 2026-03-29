import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '@cloudflare/kumo/components/button'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { PageHeader } from '../../components/common/PageHeader'
import { SkeletonBox } from '../../components/common/Skeleton'
import { StatCard } from '../../components/common/StatCard'
import { useAuth } from '../../hooks/useAuth'
import { qk } from '../../lib/query'
import * as cardApi from '../../api/card'
import type { CardSummary, CardSummaryGame, GameName } from '../../lib/types'
import { cardSummaryKeyToGame, formatDisplayRating } from '../../lib/gameRatingDisplay'
import { gameTitle } from '../../lib/gameTitles'
import { useI18n } from '../../lib/i18n'

const SUMMARY_KEYS: (keyof CardSummary)[] = ['chu3', 'mai2', 'ongeki', 'wacca', 'diva']

function formatLogin(iso: string | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function StatCardSkeleton() {
  return (
    <LayerCard className="p-4">
      <SkeletonBox className="h-4 w-24 rounded-md" />
      <SkeletonBox className="mt-3 h-8 w-32 rounded-lg" />
    </LayerCard>
  )
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

export function HomePage() {
  const { t, locale } = useI18n()
  const { user, loading } = useAuth()
  const summaryQuery = useQuery<CardSummary>({
    queryKey: qk.homeSummary(user?.username ?? ''),
    enabled: !!user?.username,
    placeholderData: (old) => old,
    queryFn: async () => cardApi.userGames(user!.username),
  })

  const showUserSkeleton = loading && !user
  const summary = summaryQuery.data ?? null
  const showSummarySkeleton = summaryQuery.isPending && !summary
  const hasSummary = SUMMARY_KEYS.some((key) => Boolean(summary?.[key]))

  return (
    <div>
      <PageHeader title={t('home')} crumbs={[{ label: t('dashboard'), href: '/home' }]} />
      {showUserSkeleton ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard label={t('username')} value={user?.username ?? '—'} />
          <StatCard label={t('settings.profile.displayName')} value={user?.displayName || user?.username || '—'} />
          <StatCard
            label={locale === 'zh' ? '国家 / 地区' : 'Country / region'}
            value={`${user?.country ?? ''} ${user?.region ?? ''}`.trim() || '—'}
          />
        </div>
      )}
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
          <Link to="/settings/profile">
            <Button variant="secondary">{t('settings')}</Button>
          </Link>
        </div>
      </LayerCard>
    </div>
  )
}
