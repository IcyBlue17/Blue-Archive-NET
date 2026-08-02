import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { SkeletonBox } from '@/components/ui/Skeleton'
import * as gameApi from '@/api/game'
import { on9CardImageUrl } from '@/lib/on9Assets'
import { imgCross } from '@/lib/imgSign'
import { formatDisplayRating } from '@/lib/gameRatingDisplay'
import { qk } from '@/lib/query'
import type { OngekiRivalEntry } from '@/lib/types'
import { useAppTexts } from '@/content/texts'
import { Button, Input } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { useToast } from '@/components/ui/toast'
import { Text } from '@/components/ui/Text'

function RivalCardSkeleton() {
  return (
    <div className="border-app-line rounded-lg border p-4">
      <div className="flex items-start gap-4">
        <SkeletonBox className="size-20 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBox className="h-5 w-40 rounded-md" />
          <SkeletonBox className="h-4 w-24 rounded-md" />
          <SkeletonBox className="h-4 w-32 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export function On9FriendsPage() {
  const texts = useAppTexts()
  const copy = texts.on9FriendsPage
  const toast = useToast()
  const qc = useQueryClient()
  const [addName, setAddName] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)

  const rivalQuery = useQuery<OngekiRivalEntry[]>({
    queryKey: qk.ongekiRivals,
    placeholderData: (old) => old,
    queryFn: gameApi.ongekiRivalList,
  })
  const rows = useMemo(
    () => [...(rivalQuery.data ?? [])].sort((a, b) => a.userName.localeCompare(b.userName)),
    [rivalQuery.data],
  )

  async function addOne() {
    const username = addName.trim()
    if (!username || adding) return
    setAdding(true)
    try {
      const row = await gameApi.ongekiRivalAdd(username)
      qc.setQueryData(qk.ongekiRivals, (old: OngekiRivalEntry[] | undefined) => [
        row,
        ...(old ?? []).filter((it) => it.rivalExtId !== row.rivalExtId),
      ])
      setAddName('')
      toast.add({ title: copy.addSuccessTitle, description: copy.addSuccessDesc(row.userName) })
    } catch (e) {
      toast.add({
        title: copy.addFailedTitle,
        description: e instanceof Error ? e.message : texts.common.requestFailed,
        variant: 'error',
      })
    } finally {
      setAdding(false)
    }
  }

  async function removeOne(row: OngekiRivalEntry) {
    if (removingId != null) return
    setRemovingId(row.rivalExtId)
    try {
      await gameApi.ongekiRivalRemove(row.rivalExtId)
      qc.setQueryData(qk.ongekiRivals, (old: OngekiRivalEntry[] | undefined) =>
        (old ?? []).filter((it) => it.rivalExtId !== row.rivalExtId),
      )
      toast.add({ title: copy.removeSuccessTitle, description: copy.removeSuccessDesc(row.userName) })
    } catch (e) {
      toast.add({
        title: copy.removeFailedTitle,
        description: e instanceof Error ? e.message : texts.common.requestFailed,
        variant: 'error',
      })
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title={texts.nav.on9Friends}
        crumbs={[{ label: texts.nav.dashboard, href: '/home' }, { label: texts.nav.on9Friends }]}
      />

      <SectionCard title={<>{copy.addSection}</>}>
        <Text className="text-app-subtle mt-2 block text-sm">{copy.addHint}</Text>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder={copy.usernamePlaceholder}
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
            {adding ? copy.adding : copy.add}
          </Button>
        </div>
      </SectionCard>

      <SectionCard className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text strong>{copy.list}</Text>
          <Text className="text-app-subtle text-sm">{copy.count(rows.length)}</Text>
        </div>

        {rivalQuery.isPending && !rivalQuery.data ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <RivalCardSkeleton key={i} />)}
          </div>
        ) : rivalQuery.error ? (
          <Text className="text-app-danger mt-3">
            {rivalQuery.error instanceof Error ? rivalQuery.error.message : texts.common.error}
          </Text>
        ) : rows.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {rows.map((row) => {
              const img = on9CardImageUrl(row.cardId, true)
              const removing = removingId === row.rivalExtId
              return (
                <div key={row.rivalExtId} className="border-app-line rounded-lg border p-4">
                  <div className="flex items-start gap-4">
                    <div className="border-app-line bg-app-recessed flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
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
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-app-default">{row.userName}</div>
                          <div className="text-app-subtle mt-1 text-sm">{copy.level(row.level)}</div>
                        </div>
                        <Button size="small" onClick={() => void removeOne(row)} disabled={removing}>
                          {removing ? copy.removing : copy.remove}
                        </Button>
                      </div>
                      <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                        <dt className="text-app-subtle">{copy.rating}</dt>
                        <dd className="text-app-default">{formatDisplayRating(row.playerRating, 'ongeki')}</dd>
                        <dt className="text-app-subtle">{copy.best}</dt>
                        <dd className="text-app-default">{formatDisplayRating(row.highestRating, 'ongeki')}</dd>
                        <dt className="text-app-subtle">{copy.battlePoint}</dt>
                        <dd className="text-app-default">{row.battlePoint.toLocaleString()}</dd>
                        <dt className="text-app-subtle">{copy.id}</dt>
                        <dd className="text-app-default">{row.rivalExtId}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <Text className="text-app-subtle mt-4 block text-sm">{copy.empty}</Text>
        )}
      </SectionCard>
    </div>
  )
}
