import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Table } from '@cloudflare/kumo/components/table'
import { CardSummaryGrid } from '../../components/common/CardSummaryGrid'
import { PageHeader } from '../../components/common/PageHeader'
import { SkeletonBox } from '../../components/common/Skeleton'
import { useAppTexts } from '../../content/texts'
import { useAuth } from '../../hooks/useAuth'
import { qk } from '../../lib/query'
import * as cardApi from '../../api/card'
import type { Card, CardSummary } from '../../lib/types'
import { useI18n } from '../../lib/i18n'

/** 与后端 `CardController` 默认迁移列表一致；不在 UI 暴露以免误填。 */
const DEFAULT_MIGRATE = 'mai2,chu3'

function aimeDigits1(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 20)
}

function aimeCardFmt1(raw: string) {
  const digits1 = aimeDigits1(raw)
  return digits1.replace(/(.{4})(?=.)/g, '$1 ').trim()
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
      await cardApi.link({ cardId: aimeCardFmt1(cardId), migrate: DEFAULT_MIGRATE })
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
      <LayerCard className="mb-6 p-4">
        <LayerCard.Secondary>{copy.linkCard.summary}</LayerCard.Secondary>
        {loadingSummary && !ghostSummary ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border-kumo-border rounded-md border px-3 py-2">
                <SkeletonBox className="h-5 w-24 rounded-md" />
                <SkeletonBox className="mt-3 h-4 w-28 rounded-md" />
                <SkeletonBox className="mt-2 h-3 w-36 rounded-md" />
              </div>
            ))}
          </div>
        ) : !ghostSummary ? (
          <Text DANGEROUS_className="text-kumo-subtle mt-2">{copy.common.empty}</Text>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CardSummaryGrid
              summary={ghostSummary}
              locale={locale === 'en' ? 'en' : 'zh'}
              texts={copy}
              itemClassName="border-kumo-border rounded-md border px-3 py-2"
              nameClassName="text-kumo-subtle text-sm"
              detailClassName="text-kumo-subtle text-xs"
              ratingLabel={copy.linkCard.rating}
              lastLoginLabel={copy.homePage.lastLogin}
            />
          </div>
        )}
      </LayerCard>
      <LayerCard className="mb-6 p-4">
        <LayerCard.Secondary>{copy.linkCard.bindCard}</LayerCard.Secondary>
        <div className="mt-4 flex max-w-md flex-col gap-3">
          <label className="flex flex-col gap-1">
            <Text size="sm">{copy.linkCard.accessCode}</Text>
            <Input
              value={cardId}
              inputMode="numeric"
              maxLength={24}
              onChange={(e) => setCardId(aimeCardFmt1(e.target.value))}
              placeholder={copy.linkCard.accessCodePlaceholder}
            />
          </label>
          {msg ? <Text DANGEROUS_className="text-kumo-success">{msg}</Text> : null}
          {err ? <Text DANGEROUS_className="text-kumo-danger">{err}</Text> : null}
          <Button type="button" onClick={link}>
            {copy.linkCard.bind}
          </Button>
        </div>
      </LayerCard>
      <LayerCard className="p-0 overflow-hidden">
        <div className="border-kumo-border bg-kumo-surface-secondary border-b px-4 py-3">
          <Text size="sm" DANGEROUS_className="font-medium">
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
            <Text DANGEROUS_className="text-kumo-subtle px-2 py-6 text-center text-sm">{copy.linkCard.noCards}</Text>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>{copy.linkCard.cardNumber}</Table.Head>
                  <Table.Head>{copy.linkCard.status}</Table.Head>
                  <Table.Head className="text-end">{copy.linkCard.action}</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {(me?.cards ?? []).map((c) => (
                  <Table.Row
                    key={c.luid}
                    className="hover:bg-kumo-surface-secondary/60 transition-colors"
                  >
                    <Table.Cell>
                      <span className="font-mono text-sm">{c.luid}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-wrap gap-1">
                        {c.isGhost ? (
                          <span className="bg-kumo-fill text-kumo-subtle rounded-md px-2 py-0.5 text-xs">
                            {copy.linkCard.ghost}
                          </span>
                        ) : (
                          <span className="bg-kumo-success/15 text-kumo-success rounded-md px-2 py-0.5 text-xs">
                            {copy.linkCard.linked}
                          </span>
                        )}
                        {c.rankingBanned ? (
                          <span className="bg-kumo-danger/15 text-kumo-danger rounded-md px-2 py-0.5 text-xs">
                            {copy.linkCard.rankingBanned}
                          </span>
                        ) : null}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-end">
                      {!c.isGhost ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => unlink(c)}
                        >
                          {copy.linkCard.unlink}
                        </Button>
                      ) : (
                        <span className="text-kumo-subtle text-xs">{copy.common.empty}</span>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </LayerCard>
    </div>
  )
}
