import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKumoToastManager } from '@cloudflare/kumo'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import { PageHeader } from '../../components/common/PageHeader'
import { SkeletonBox } from '../../components/common/Skeleton'
import * as gameApi from '../../api/game'
import { formatDisplayRating } from '../../lib/gameRatingDisplay'
import { useI18n } from '../../lib/i18n'
import { qk } from '../../lib/query'
import { chu3CharacterImageUrl } from '../../lib/chu3Assets'
import { imgCross1 } from '../../lib/imgSign'
import type { Chu3RivalEntry } from '../../lib/types'

function formatTime1(iso: string, locale: 'zh' | 'en') {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')
}

function RivalCardSkeleton() {
  return (
    <div className="border-kumo-border rounded-xl border p-4">
      <div className="flex items-start gap-4">
        <SkeletonBox className="size-20 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBox className="h-5 w-40 rounded-md" />
          <SkeletonBox className="h-4 w-24 rounded-md" />
          <SkeletonBox className="h-4 w-32 rounded-md" />
          <SkeletonBox className="h-4 w-48 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export function Chu3FriendsPage() {
  const { locale, t } = useI18n()
  const toast = useKumoToastManager()
  const qc = useQueryClient()
  const [addName, setAddName] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [favBusyId, setFavBusyId] = useState<number | null>(null)

  const rivalQuery = useQuery<Chu3RivalEntry[]>({
    queryKey: qk.chu3Rivals,
    placeholderData: (old) => old,
    queryFn: async () => gameApi.chu3RivalList(),
  })

  const rows = useMemo(() => {
    const list = [...(rivalQuery.data ?? [])]
    list.sort((a, b) => {
      if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1
      const ta = new Date(a.addedAt).getTime()
      const tb = new Date(b.addedAt).getTime()
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0)
    })
    return list
  }, [rivalQuery.data])
  const favCount = rows.filter((it) => it.isFavorite).length

  async function addOne() {
    const username = addName.trim()
    if (!username || adding) return
    setAdding(true)
    try {
      const row = await gameApi.chu3RivalAdd(username)
      qc.setQueryData(qk.chu3Rivals, (old: Chu3RivalEntry[] | undefined) => {
        const list = old?.filter((it) => it.rivalExtId !== row.rivalExtId) ?? []
        return [row, ...list]
      })
      setAddName('')
      toast.add({
        title: locale === 'zh' ? '好友已添加' : 'Friend added',
        description: locale === 'zh' ? `${row.userName} 已加入好友列表` : `${row.userName} was added`,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : locale === 'zh' ? '添加失败' : 'Request failed'
      toast.add({
        title: locale === 'zh' ? '添加好友失败' : 'Add friend failed',
        description: msg,
        variant: 'error',
      })
    } finally {
      setAdding(false)
    }
  }

  async function removeOne(row: Chu3RivalEntry) {
    if (removingId != null) return
    setRemovingId(row.rivalExtId)
    try {
      await gameApi.chu3RivalRemove(row.rivalExtId)
      qc.setQueryData(qk.chu3Rivals, (old: Chu3RivalEntry[] | undefined) =>
        (old ?? []).filter((it) => it.rivalExtId !== row.rivalExtId),
      )
      toast.add({
        title: locale === 'zh' ? '好友已移除' : 'Friend removed',
        description: locale === 'zh' ? `${row.userName} 已从列表移除` : `${row.userName} was removed`,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : locale === 'zh' ? '移除失败' : 'Request failed'
      toast.add({
        title: locale === 'zh' ? '移除好友失败' : 'Remove friend failed',
        description: msg,
        variant: 'error',
      })
    } finally {
      setRemovingId(null)
    }
  }

  async function toggleFav(row: Chu3RivalEntry) {
    if (favBusyId != null) return
    const isAdd = !row.isFavorite
    setFavBusyId(row.rivalExtId)
    try {
      if (isAdd) {
        const next = await gameApi.chu3RivalFavoriteAdd(row.rivalExtId)
        qc.setQueryData(qk.chu3Rivals, (old: Chu3RivalEntry[] | undefined) =>
          (old ?? []).map((it) => (it.rivalExtId === row.rivalExtId ? { ...it, isFavorite: !!next.isFavorite } : it)),
        )
      } else {
        await gameApi.chu3RivalFavoriteRemove(row.rivalExtId)
        qc.setQueryData(qk.chu3Rivals, (old: Chu3RivalEntry[] | undefined) =>
          (old ?? []).map((it) => (it.rivalExtId === row.rivalExtId ? { ...it, isFavorite: false } : it)),
        )
      }
      toast.add({
        title: locale === 'zh' ? (isAdd ? '已登录到喜爱' : '已取消喜爱') : isAdd ? 'Pinned to favorites' : 'Removed from favorites',
        description:
          locale === 'zh'
            ? `${row.userName} ${isAdd ? '现在会作为劲敌槽位返回给客户端' : '已从劲敌槽位移除'}`
            : `${row.userName} ${isAdd ? 'is now in rival favorites' : 'was removed from rival favorites'}`,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : locale === 'zh' ? '操作失败' : 'Request failed'
      toast.add({
        title: locale === 'zh' ? '喜爱设置失败' : 'Favorite action failed',
        description: msg,
        variant: 'error',
      })
    } finally {
      setFavBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader title={t('friends')} crumbs={[{ label: t('dashboard'), href: '/home' }, { label: t('friends') }]} />

      <LayerCard className="p-4">
        <LayerCard.Secondary>{locale === 'zh' ? '添加 CHUNITHM 好友' : 'Add CHUNITHM friend'}</LayerCard.Secondary>
        <Text DANGEROUS_className="text-kumo-subtle mt-2 block text-sm">
          {locale === 'zh' ? '这里填写 Aqua 用户名，不是游戏内昵称。' : 'Use Aqua username here, not the in-game display name.'}
        </Text>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder={locale === 'zh' ? '输入 Aqua 用户名' : 'Enter Aqua username'}
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void addOne()
              }
            }}
          />
          <Button variant="primary" onClick={() => void addOne()} disabled={adding || !addName.trim()}>
            {adding ? (locale === 'zh' ? '添加中…' : 'Adding…') : (locale === 'zh' ? '添加好友' : 'Add friend')}
          </Button>
        </div>
      </LayerCard>

      <LayerCard className="mt-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LayerCard.Secondary>{locale === 'zh' ? '好友列表' : 'Friend list'}</LayerCard.Secondary>
          <Text DANGEROUS_className="text-kumo-subtle text-sm">
            {locale === 'zh' ? `共 ${rows.length} 位好友` : `${rows.length} friends`}
          </Text>
        </div>
        <Text DANGEROUS_className="text-kumo-subtle mt-2 block text-sm">
          {locale === 'zh'
            ? `已登录到喜爱 ${favCount} / 4。只有这 4 位会作为游戏内劲敌槽位返回，客户端才会去拉他们的成绩。`
            : `${favCount} / 4 pinned. Only these four are returned as in-game rival slots for score lookup.`}
        </Text>

        {rivalQuery.isPending && !rivalQuery.data ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <RivalCardSkeleton key={i} />
            ))}
          </div>
        ) : rivalQuery.error ? (
          <Text DANGEROUS_className="text-kumo-danger mt-3">
            {rivalQuery.error instanceof Error ? rivalQuery.error.message : 'Error'}
          </Text>
        ) : rows.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {rows.map((row) => {
              const img = chu3CharacterImageUrl(row.characterId, '02')
              const removing = removingId === row.rivalExtId
              const favBusy = favBusyId === row.rivalExtId
              const canAddFav = !!row.isFavorite || favCount < 4
              return (
                <div key={row.rivalExtId} className="border-kumo-border rounded-xl border p-4">
                  <div className="flex items-start gap-4">
                    <div className="border-kumo-border bg-kumo-recessed flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
                      {img ? (
                        <img
                          src={img}
                          crossOrigin={imgCross1(img)}
                          alt={row.userName}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Text size="sm">{row.userName.slice(0, 1)}</Text>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-kumo-text">
                            {row.userName}
                            {row.isFavorite ? (
                              <span className="bg-kumo-recessed text-kumo-text ml-2 rounded-full px-2 py-0.5 text-xs">
                                {locale === 'zh' ? '喜爱中' : 'Pinned'}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-kumo-subtle mt-1 text-sm">
                            {locale === 'zh' ? `等级 ${row.level}` : `Level ${row.level}`}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant={row.isFavorite ? 'secondary' : 'primary'}
                            size="sm"
                            onClick={() => void toggleFav(row)}
                            disabled={favBusy || !canAddFav}
                          >
                            {favBusy
                              ? (locale === 'zh' ? '处理中…' : 'Working…')
                              : row.isFavorite
                                ? (locale === 'zh' ? '取消喜爱' : 'Unpin')
                                : (locale === 'zh' ? '登录到喜爱' : 'Pin as rival')}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => void removeOne(row)} disabled={removing}>
                            {removing ? (locale === 'zh' ? '移除中…' : 'Removing…') : (locale === 'zh' ? '删除' : 'Remove')}
                          </Button>
                        </div>
                      </div>
                      <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                        <dt className="text-kumo-subtle">{locale === 'zh' ? 'Rating' : 'Rating'}</dt>
                        <dd className="text-kumo-text">{formatDisplayRating(row.playerRating, 'chu3')}</dd>
                        <dt className="text-kumo-subtle">{locale === 'zh' ? '最高' : 'Best'}</dt>
                        <dd className="text-kumo-text">{formatDisplayRating(row.highestRating, 'chu3')}</dd>
                        <dt className="text-kumo-subtle">{locale === 'zh' ? 'ID' : 'ID'}</dt>
                        <dd className="text-kumo-text">{row.rivalExtId}</dd>
                        <dt className="text-kumo-subtle">{locale === 'zh' ? '战队' : 'Team'}</dt>
                        <dd className="truncate text-kumo-text">{row.teamName || '—'}</dd>
                        <dt className="text-kumo-subtle">{locale === 'zh' ? '添加时间' : 'Added at'}</dt>
                        <dd className="text-kumo-text">{formatTime1(row.addedAt, locale)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <Text DANGEROUS_className="text-kumo-subtle mt-4 block text-sm">
            {locale === 'zh' ? '还没有 CHUNITHM 好友，先加一个试试。' : 'No CHUNITHM friends yet. Add one to start.'}
          </Text>
        )}
      </LayerCard>
    </div>
  )
}
