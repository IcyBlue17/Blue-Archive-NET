import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Table } from '@cloudflare/kumo/components/table'
import { PageHeader } from '../../components/common/PageHeader'
import { SkeletonBox } from '../../components/common/Skeleton'
import { useAuth } from '../../hooks/useAuth'
import { qk } from '../../lib/query'
import * as cardApi from '../../api/card'
import type { Card, CardSummary, CardSummaryGame } from '../../lib/types'
import { cardSummaryKeyToGame, formatDisplayRating } from '../../lib/gameRatingDisplay'
import { gameTitle } from '../../lib/gameTitles'
import { useI18n } from '../../lib/i18n'

const SUMMARY_KEYS: (keyof CardSummary)[] = ['chu3', 'mai2', 'ongeki', 'wacca', 'diva']

/** 与后端 `CardController` 默认迁移列表一致；不在 UI 暴露以免误填。 */
const DEFAULT_MIGRATE = 'mai2,chu3'

function aimeDigits1(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 20)
}

function aimeCardFmt1(raw: string) {
  const digits1 = aimeDigits1(raw)
  return digits1.replace(/(.{4})(?=.)/g, '$1 ').trim()
}

function formatLogin(iso: string | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

export function LinkCardPage() {
  const { t, locale } = useI18n()
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
      setMsg('绑卡成功')
      await refresh()
      setCardId('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : '失败')
    }
  }

  async function unlink(card: Card) {
    if (!card.luid || card.isGhost) return
    setErr(null)
    setMsg(null)
    try {
      await cardApi.unlink(card.luid)
      setMsg('已解绑')
      await refresh()
      qc.removeQueries({ queryKey: qk.cardSummary(card.luid) })
    } catch (e) {
      setErr(e instanceof Error ? e.message : '失败')
    }
  }

  return (
    <div>
      <PageHeader title={t('cards')} crumbs={[{ label: t('home'), href: '/home' }]} />
      <LayerCard className="mb-6 p-4">
        <LayerCard.Secondary>概要</LayerCard.Secondary>
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
          <Text DANGEROUS_className="text-kumo-subtle mt-2">—</Text>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SUMMARY_KEYS.map((key) => {
              const row = ghostSummary[key] as CardSummaryGame | null | undefined
              if (!row) return null
              const title = gameTitle(String(key), locale === 'en' ? 'en' : 'zh')
              const g = cardSummaryKeyToGame(key)
              const ratingStr =
                g != null
                  ? formatDisplayRating(row.rating, g)
                  : Number.isFinite(row.rating)
                    ? String(Math.round(row.rating))
                    : '—'
              return (
                <div key={String(key)} className="border-kumo-border rounded-md border px-3 py-2">
                  <div className="font-medium">{title}</div>
                  <div className="text-kumo-subtle text-sm">{row.name}</div>
                  <div className="text-kumo-subtle text-xs">
                    Rating {ratingStr} · {formatLogin(row.lastLogin)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </LayerCard>
      <LayerCard className="mb-6 p-4">
        <LayerCard.Secondary>绑定新的Aime卡</LayerCard.Secondary>
        <div className="mt-4 flex max-w-md flex-col gap-3">
          <label className="flex flex-col gap-1">
            <Text size="sm">Access Code</Text>
            <Input
              value={cardId}
              inputMode="numeric"
              maxLength={24}
              onChange={(e) => setCardId(aimeCardFmt1(e.target.value))}
              placeholder="1234 5678 9012 3456 7890"
            />
          </label>
          {msg ? <Text DANGEROUS_className="text-kumo-success">{msg}</Text> : null}
          {err ? <Text DANGEROUS_className="text-kumo-danger">{err}</Text> : null}
          <Button type="button" onClick={link}>
            绑定
          </Button>
        </div>
      </LayerCard>
      <LayerCard className="p-0 overflow-hidden">
        <div className="border-kumo-border bg-kumo-surface-secondary border-b px-4 py-3">
          <Text size="sm" DANGEROUS_className="font-medium">
            已绑定卡片
          </Text>
        </div>
        <div className="p-2">
          {loading && !me ? (
            <div className="space-y-3 px-2 py-4">
              <SkeletonBox className="h-10 w-full rounded-lg" />
              <SkeletonBox className="h-10 w-full rounded-lg" />
            </div>
          ) : (me?.cards ?? []).length === 0 ? (
            <Text DANGEROUS_className="text-kumo-subtle px-2 py-6 text-center text-sm">暂无卡片</Text>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>卡号</Table.Head>
                  <Table.Head>状态</Table.Head>
                  <Table.Head className="text-end">操作</Table.Head>
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
                            Ghost
                          </span>
                        ) : (
                          <span className="bg-kumo-success/15 text-kumo-success rounded-md px-2 py-0.5 text-xs">
                            已关联
                          </span>
                        )}
                        {c.rankingBanned ? (
                          <span className="bg-kumo-danger/15 text-kumo-danger rounded-md px-2 py-0.5 text-xs">
                            排行封禁
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
                          解绑
                        </Button>
                      ) : (
                        <span className="text-kumo-subtle text-xs">—</span>
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
