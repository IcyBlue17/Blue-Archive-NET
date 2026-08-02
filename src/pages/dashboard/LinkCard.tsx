import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CardSummaryGrid } from '@/components/common/CardSummaryGrid'
import { PageHeader } from '@/components/ui/PageHeader'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { useAppTexts } from '@/content/texts'
import { useAuth } from '@/hooks/useAuth'
import { qk } from '@/lib/query'
import * as cardApi from '@/api/card'
import type { Card, CardSummary } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { Button, Input, Tag } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import { Text } from '@/components/ui/Text'

const DEFAULT_MIGRATE = 'mai2,chu3'

function aimeDigits(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 20)
}

function aimeCardFmt(raw: string) {
  const digits = aimeDigits(raw)
  return digits.replace(/(.{4})(?=.)/g, '$1 ').trim()
}

export function LinkCardPage() {
  const { locale } = useI18n()
  const copy = useAppTexts()
  const { user: me, refresh, loading } = useAuth()
  const qc = useQueryClient()
  const [cardId, setCardId] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const ghostQuery = useQuery<CardSummary | null>({
    queryKey: qk.cardSummary(me?.ghostCard?.luid ?? ''),
    enabled: !!me?.ghostCard?.luid,
    placeholderData: (old) => old,
    queryFn: async () => {
      const s = await cardApi.summary(me!.ghostCard!.luid)
      return s.summary
    },
  })
  const ghostSummary = ghostQuery.data ?? null
  const loadingSummary = ghostQuery.isPending && !ghostSummary

  async function link() {
    setErr(null)
    setMsg(null)
    try {
      await cardApi.link({ cardId: aimeCardFmt(cardId), migrate: DEFAULT_MIGRATE })
      setMsg(copy.linkCard.bindSuccess)
      await refresh()
      setCardId('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.common.failed)
    }
  }

  async function unlink(card: Card) {
    if (!card.luid || card.isGhost) return
    setErr(null)
    setMsg(null)
    try {
      await cardApi.unlink(card.luid)
      setMsg(copy.linkCard.unlinkSuccess)
      await refresh()
      qc.removeQueries({ queryKey: qk.cardSummary(card.luid) })
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.common.failed)
    }
  }

  return (
    <div>
      <PageHeader title={copy.nav.cards} crumbs={[{ label: copy.nav.home, href: '/home' }]} />
      <SectionCard title={<>{copy.linkCard.summary}</>} className="mb-6">
        {loadingSummary && !ghostSummary ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border-app-line rounded-md border px-3 py-2">
                <SkeletonBox className="h-5 w-24 rounded-md" />
                <SkeletonBox className="mt-3 h-4 w-28 rounded-md" />
                <SkeletonBox className="mt-2 h-3 w-36 rounded-md" />
              </div>
            ))}
          </div>
        ) : !ghostSummary ? (
          <Text className="text-app-subtle mt-2">{copy.common.empty}</Text>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CardSummaryGrid
              summary={ghostSummary}
              locale={locale === 'en' ? 'en' : 'zh'}
              texts={copy}
              itemClassName="border-app-line rounded-md border px-3 py-2"
              nameClassName="text-app-subtle text-sm"
              detailClassName="text-app-subtle text-xs"
              ratingLabel={copy.linkCard.rating}
              lastLoginLabel={copy.homePage.lastLogin}
            />
          </div>
        )}
      </SectionCard>
      <SectionCard title={<>{copy.linkCard.bindCard}</>} className="mb-6">
        <div className="mt-4 flex max-w-md flex-col gap-3">
          <label className="flex flex-col gap-1">
            <Text className="text-sm">{copy.linkCard.accessCode}</Text>
            <Input
              value={cardId}
              inputMode="numeric"
              maxLength={24}
              onChange={(e) => setCardId(aimeCardFmt(e.target.value))}
              placeholder={copy.linkCard.accessCodePlaceholder}
            />
          </label>
          {msg ? <Text className="text-app-success">{msg}</Text> : null}
          {err ? <Text className="text-app-danger">{err}</Text> : null}
          <Button htmlType="button" onClick={link}>
            {copy.linkCard.bind}
          </Button>
        </div>
      </SectionCard>
      <SectionCard className="overflow-hidden">
        <div className="border-app-line bg-app-recessed border-b px-4 py-3">
          <Text className="text-sm font-medium">
            {copy.linkCard.linkedCards}
          </Text>
        </div>
        <div className="p-2">
          {loading && !me ? (
            <div className="space-y-3 px-2 py-4">
              <SkeletonBox className="h-10 w-full rounded-lg" />
              <SkeletonBox className="h-10 w-full rounded-lg" />
            </div>
          ) : (me?.cards ?? []).length === 0 ? (
            <Text className="text-app-subtle px-2 py-6 text-center text-sm">{copy.linkCard.noCards}</Text>
          ) : (
            <ResponsiveTable<Card>
              rowKey={(c) => c.luid}
              dataSource={me?.cards ?? []}
              columns={[
                {
                  title: copy.linkCard.cardNumber,
                  key: 'luid',
                  render: (_, c) => <span className="font-mono text-sm">{c.luid}</span>,
                },
                {
                  title: copy.linkCard.status,
                  key: 'status',
                  render: (_, c) => (
                    <div className="flex flex-wrap gap-1">
                      {c.isGhost ? (
                        <Tag>{copy.linkCard.ghost}</Tag>
                      ) : (
                        <Tag color="success">{copy.linkCard.linked}</Tag>
                      )}
                      {c.rankingBanned ? <Tag color="error">{copy.linkCard.rankingBanned}</Tag> : null}
                    </div>
                  ),
                },
                {
                  title: copy.linkCard.action,
                  key: 'action',
                  align: 'end',
                  render: (_, c) =>
                    !c.isGhost ? (
                      <Button htmlType="button" danger size="small" onClick={() => unlink(c)}>
                        {copy.linkCard.unlink}
                      </Button>
                    ) : (
                      <span className="text-app-subtle text-xs">{copy.common.empty}</span>
                    ),
                },
              ]}
            />
          )}
        </div>
      </SectionCard>
    </div>
  )
}
