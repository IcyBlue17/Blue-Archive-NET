import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Segmented } from 'antd'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/toast'
import * as dataApi from '@/api/data'
import * as gameApi from '@/api/game'
import { CHU3_FAV_CHARACTER, CHU3_FAV_MUSIC, useChu3Favorites } from '@/hooks/useChu3Favorites'
import { chu3CharacterImageUrl, fetchChu3AssetJson, type Chu3JsonEntry } from '@/lib/chu3Assets'
import { imgCross } from '@/lib/imgSign'
import { musicJacketUrl } from '@/lib/musicCover'
import { buildPageNumbers } from '@/lib/pagination'
import { qk } from '@/lib/query'
import type { MusicMetaLite } from '@/lib/scoring'
import type { AllMusicMap, Chu3FavoriteKind } from '@/lib/types'
import { useAppTexts } from '@/content/texts'

const PAGE_SIZE = 12
type FavTab = 'music' | 'character'

type PickRow = {
  id: number
  name: string
  sub: string
  image: string | null
  search: string
}

function musicRows(map: AllMusicMap | undefined): PickRow[] {
  if (!map) return []
  const out: PickRow[] = []
  for (const [key, raw] of Object.entries(map)) {
    const id = parseInt(key, 10)
    if (!Number.isFinite(id)) continue
    const meta = raw as MusicMetaLite
    const name = meta.name ?? String(id)
    const sub = meta.composer ?? ''
    out.push({
      id,
      name,
      sub,
      image: musicJacketUrl('chu3', id),
      search: `${id} ${name} ${sub}`.toLowerCase(),
    })
  }
  return out.sort((a, b) => a.id - b.id)
}

/** 只有已解锁的角色能被收藏——后端会拒绝没拥有的，见 Chusan.favoriteAdd。 */
function characterRows(owned: number[], names: Map<number, string>): PickRow[] {
  return owned
    .map((id) => {
      const name = names.get(id) ?? String(id)
      return {
        id,
        name,
        sub: `ID ${id}`,
        image: chu3CharacterImageUrl(id, '00'),
        search: `${id} ${name}`.toLowerCase(),
      }
    })
    .sort((a, b) => a.id - b.id)
}

export function Chu3FavoritesPage() {
  const texts = useAppTexts()
  const toast = useToast()
  const favorites = useChu3Favorites()
  const [tab, setTab] = useState<FavTab>('music')
  const [key, setKey] = useState('')
  const [page, setPage] = useState(1)
  const keySlow = useDeferredValue(key.trim().toLowerCase())

  const musicQuery = useQuery<AllMusicMap>({
    queryKey: qk.gameAllMusic('chu3'),
    placeholderData: (old) => old,
    queryFn: async () => dataApi.allMusic('chu3') as Promise<AllMusicMap>,
  })

  // 角色名和已解锁列表：character.json 只有 id→名字，拥有情况得问 userbox。
  const charaQuery = useQuery<{ owned: number[]; names: Map<number, string> }>({
    queryKey: qk.chu3FavoriteCharas,
    placeholderData: (old) => old,
    queryFn: async () => {
      const [box, catalog] = await Promise.all([
        gameApi.userBox(),
        fetchChu3AssetJson<Chu3JsonEntry[]>('character.json'),
      ])
      const raw = (box as { characters?: unknown }).characters
      const owned = Array.isArray(raw)
        ? raw
            .map((x) => (typeof x === 'number' ? x : parseInt(String(x), 10)))
            .filter((n) => Number.isFinite(n) && n > 0)
        : []
      return { owned, names: new Map(catalog.map((e) => [e.id, e.name])) }
    },
  })

  const allRows = useMemo(
    () =>
      tab === 'music'
        ? musicRows(musicQuery.data)
        : characterRows(charaQuery.data?.owned ?? [], charaQuery.data?.names ?? new Map()),
    [charaQuery.data, musicQuery.data, tab],
  )

  const rowById = useMemo(() => new Map(allRows.map((r) => [r.id, r])), [allRows])
  const kind: Chu3FavoriteKind = tab === 'music' ? CHU3_FAV_MUSIC : CHU3_FAV_CHARACTER
  const pinnedIds = tab === 'music' ? favorites.box.music : favorites.box.character
  const max = tab === 'music' ? favorites.box.musicMax : favorites.box.characterMax
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds])
  const full = max > 0 && pinnedIds.length >= max

  const filtered = useMemo(() => {
    const rest = allRows.filter((row) => !pinnedSet.has(row.id))
    if (!keySlow) return rest
    return rest.filter((row) => row.search.includes(keySlow))
  }, [allRows, keySlow, pinnedSet])

  const totalPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [keySlow, tab])

  useEffect(() => {
    if (page > totalPage) setPage(totalPage)
  }, [page, totalPage])

  async function toggle(id: number, name: string) {
    try {
      const isAdd = await favorites.toggle(kind, id)
      if (isAdd == null) return
      toast.add({
        title: isAdd ? texts.chu3Favorites.added : texts.chu3Favorites.removed,
        description: texts.chu3Favorites.toggleDesc(name, isAdd),
      })
    } catch (e) {
      toast.add({
        title: texts.chu3Favorites.failed,
        description: e instanceof Error ? e.message : texts.chu3Favorites.failed,
        variant: 'error',
      })
    }
  }

  const listErr =
    favorites.error ??
    (tab === 'music'
      ? musicQuery.error instanceof Error
        ? musicQuery.error.message
        : null
      : charaQuery.error instanceof Error
        ? charaQuery.error.message
        : null)
  const sourceLoading =
    tab === 'music'
      ? musicQuery.isPending && !musicQuery.data
      : charaQuery.isPending && !charaQuery.data

  return (
    <div className="pb-10">
      <PageHeader
        title={texts.nav.chu3Favorites}
        crumbs={[{ label: texts.nav.dashboard, href: '/home' }, { label: texts.nav.chu3Favorites }]}
      />

      <Text className="text-app-subtle mb-4 block text-sm">
        {texts.chu3Favorites.intro}
      </Text>

      <Segmented
        className="mb-6"
        options={[
          { value: 'music', label: texts.chu3Favorites.tabMusic },
          { value: 'character', label: texts.chu3Favorites.tabCharacter },
        ]}
        value={tab}
        onChange={(value) => setTab(value as FavTab)}
      />

      {listErr ? <Text className="text-app-danger mb-4 text-sm">{listErr}</Text> : null}

      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text className="font-semibold">{texts.chu3Favorites.pinnedSection}</Text>
          <Text className="text-app-subtle text-sm">
            {texts.chu3Favorites.count(pinnedIds.length, max)}
          </Text>
        </div>

        {favorites.loading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBox key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : pinnedIds.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pinnedIds.map((id) => {
              const row = rowById.get(id)
              const name = row?.name ?? String(id)
              const image = row?.image ?? (tab === 'music' ? musicJacketUrl('chu3', id) : chu3CharacterImageUrl(id, '00'))
              return (
                <div key={id} className="border-app-line flex items-center gap-3 rounded-xl border p-3">
                  <div className="bg-app-recessed flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                    {image ? (
                      <img
                        src={image}
                        crossOrigin={imgCross(image)}
                        alt=""
                        className="size-full object-contain"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{name}</div>
                    <div className="text-app-subtle truncate text-xs">{row?.sub || `ID ${id}`}</div>
                  </div>
                  <Button
                    size="small"
                    disabled={favorites.busy}
                    onClick={() => void toggle(id, name)}
                  >
                    {favorites.isBusy(kind, id) ? texts.chu3Favorites.working : texts.chu3Favorites.remove}
                  </Button>
                </div>
              )
            })}
          </div>
        ) : (
          <Text className="text-app-subtle mt-4 block text-sm">
            {texts.chu3Favorites.emptyPinned}
          </Text>
        )}
      </SectionCard>

      <SectionCard className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text className="font-semibold">{texts.chu3Favorites.addSection}</Text>
          <Input
            className="sm:w-72"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={
              tab === 'music' ? texts.chu3Favorites.searchMusic : texts.chu3Favorites.searchCharacter
            }
          />
        </div>

        {tab === 'character' ? (
          <Text className="text-app-subtle mt-2 block text-sm">
            {texts.chu3Favorites.characterHint}
          </Text>
        ) : null}

        {full ? (
          <Text className="text-app-warning mt-2 block text-sm">
            {texts.chu3Favorites.fullHint(max)}
          </Text>
        ) : null}

        {sourceLoading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBox key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : pageRows.length ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pageRows.map((row) => (
                <div key={row.id} className="border-app-line flex items-center gap-3 rounded-xl border p-3">
                  <div className="bg-app-recessed flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                    {row.image ? (
                      <img
                        src={row.image}
                        crossOrigin={imgCross(row.image)}
                        alt=""
                        className="size-full object-contain"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{row.name}</div>
                    <div className="text-app-subtle truncate text-xs">{row.sub}</div>
                  </div>
                  <Button
                    size="small"
                    type="primary"
                    disabled={favorites.busy || full}
                    onClick={() => void toggle(row.id, row.name)}
                  >
                    {favorites.isBusy(kind, row.id) ? texts.chu3Favorites.working : texts.chu3Favorites.add}
                  </Button>
                </div>
              ))}
            </div>

            {totalPage > 1 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button size="small" disabled={page <= 1} onClick={() => setPage((x) => Math.max(1, x - 1))}>
                  {texts.common.previousPage}
                </Button>
                {buildPageNumbers(page, totalPage).map((n) => (
                  <Button key={n} size="small" type={n === page ? 'primary' : 'default'} onClick={() => setPage(n)}>
                    {n}
                  </Button>
                ))}
                <Button
                  size="small"
                  disabled={page >= totalPage}
                  onClick={() => setPage((x) => Math.min(totalPage, x + 1))}
                >
                  {texts.common.nextPage}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <Text className="text-app-subtle mt-4 block text-sm">
            {tab === 'character' && !(charaQuery.data?.owned.length ?? 0)
              ? texts.chu3Favorites.noOwnedCharacters
              : texts.chu3Favorites.noMatches}
          </Text>
        )}
      </SectionCard>
    </div>
  )
}
