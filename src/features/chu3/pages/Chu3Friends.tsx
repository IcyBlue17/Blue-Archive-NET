import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { SkeletonBox } from '@/components/ui/Skeleton'
import * as gameApi from '@/api/game'
import { formatDateTimeMaybe } from '@/lib/format'
import { formatDisplayRating } from '@/lib/gameRatingDisplay'
import { useI18n } from '@/lib/i18n'
import { qk } from '@/lib/query'
import { chu3CharacterImageUrl } from '@/lib/chu3Assets'
import { imgCross } from '@/lib/imgSign'
import type { Chu3RivalEntry } from '@/lib/types'
import { useAppTexts } from '@/content/texts'
import { Button, Input } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { useToast } from '@/components/ui/toast'
import { Text } from '@/components/ui/Text'
import { timeValue } from '@/lib/datetime'

function RivalCardSkeleton() {
  return (
    <div className="border-app-line rounded-xl border p-4">
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
  const { locale } = useI18n()
  const texts = useAppTexts()
  const toast = useToast()
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
      const ta = timeValue(a.addedAt)
      const tb = timeValue(b.addedAt)
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
        title: texts.friendsPage.addSuccessTitle,
        description: texts.friendsPage.addSuccessDesc(row.userName),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : texts.friendsPage.addFailed
      toast.add({
        title: texts.friendsPage.addFailedTitle,
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
        title: texts.friendsPage.removeSuccessTitle,
        description: texts.friendsPage.removeSuccessDesc(row.userName),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : texts.friendsPage.removeFailed
      toast.add({
        title: texts.friendsPage.removeFailedTitle,
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
        title: isAdd ? texts.friendsPage.favoriteAddedTitle : texts.friendsPage.favoriteRemovedTitle,
        description: texts.friendsPage.favoriteDesc(row.userName, isAdd),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : texts.friendsPage.actionFailed
      toast.add({
        title: texts.friendsPage.favoriteFailedTitle,
        description: msg,
        variant: 'error',
      })
    } finally {
      setFavBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader title={texts.nav.friends} crumbs={[{ label: texts.nav.dashboard, href: '/home' }, { label: texts.nav.friends }]} />

      <SectionCard title={<>{texts.friendsPage.addSection}</>}>
        <Text className="text-app-subtle mt-2 block text-sm">
          {texts.friendsPage.addHint}
        </Text>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder={texts.friendsPage.usernamePlaceholder}
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void addOne()
              }
            }}
          />
          <Button type="primary" onClick={() => void addOne()} disabled={adding || !addName.trim()}>
            {adding ? texts.friendsPage.adding : texts.friendsPage.add}
          </Button>
        </div>
      </SectionCard>

      <SectionCard className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text strong>{texts.friendsPage.list}</Text>
          <Text className="text-app-subtle text-sm">
            {texts.friendsPage.count(rows.length)}
          </Text>
        </div>
        <Text className="text-app-subtle mt-2 block text-sm">
          {texts.friendsPage.favoriteCount(favCount)}
        </Text>

        {rivalQuery.isPending && !rivalQuery.data ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <RivalCardSkeleton key={i} />
            ))}
          </div>
        ) : rivalQuery.error ? (
          <Text className="text-app-danger mt-3">
            {rivalQuery.error instanceof Error ? rivalQuery.error.message : texts.common.error}
          </Text>
        ) : rows.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {rows.map((row) => {
              const img = chu3CharacterImageUrl(row.characterId, '02')
              const removing = removingId === row.rivalExtId
              const favBusy = favBusyId === row.rivalExtId
              const canAddFav = !!row.isFavorite || favCount < 4
              return (
                <div key={row.rivalExtId} className="border-app-line rounded-xl border p-4">
                  <div className="flex items-start gap-4">
                    <div className="border-app-line bg-app-recessed flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
                      {img ? (
                        <img
                          src={img}
                          crossOrigin={imgCross(img)}
                          alt={row.userName}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Text className="text-sm">{row.userName.slice(0, 1)}</Text>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-app-default">
                            {row.userName}
                            {row.isFavorite ? (
                              <span className="bg-app-recessed text-app-default ml-2 rounded-full px-2 py-0.5 text-xs">
                                {texts.friendsPage.pinned}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-app-subtle mt-1 text-sm">
                            {texts.friendsPage.level(row.level)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type={row.isFavorite ? 'default' : 'primary'}
                            size="small"
                            onClick={() => void toggleFav(row)}
                            disabled={favBusy || !canAddFav}
                          >
                            {favBusy
                              ? texts.friendsPage.working
                              : row.isFavorite
                                ? texts.friendsPage.unpin
                                : texts.friendsPage.pin}
                          </Button>
                          <Button size="small" onClick={() => void removeOne(row)} disabled={removing}>
                            {removing ? texts.friendsPage.removing : texts.friendsPage.remove}
                          </Button>
                        </div>
                      </div>
                      <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                        <dt className="text-app-subtle">{texts.friendsPage.rating}</dt>
                        <dd className="text-app-default">{formatDisplayRating(row.playerRating, 'chu3')}</dd>
                        <dt className="text-app-subtle">{texts.friendsPage.best}</dt>
                        <dd className="text-app-default">{formatDisplayRating(row.highestRating, 'chu3')}</dd>
                        <dt className="text-app-subtle">{texts.friendsPage.id}</dt>
                        <dd className="text-app-default">{row.rivalExtId}</dd>
                        <dt className="text-app-subtle">{texts.friendsPage.team}</dt>
                        <dd className="truncate text-app-default">{row.teamName || '—'}</dd>
                        <dt className="text-app-subtle">{texts.friendsPage.addedAt}</dt>
                        <dd className="text-app-default">{formatDateTimeMaybe(row.addedAt, locale)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <Text className="text-app-subtle mt-4 block text-sm">
            {texts.friendsPage.empty}
          </Text>
        )}
      </SectionCard>
    </div>
  )
}
