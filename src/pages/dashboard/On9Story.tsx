import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useKumoToastManager } from '@cloudflare/kumo'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Switch } from '@cloudflare/kumo/components/switch'
import { Text } from '@cloudflare/kumo/components/text'
import { PageHeader } from '../../components/common/PageHeader'
import { SkeletonBox } from '../../components/common/Skeleton'
import * as gameApi from '../../api/game'
import { qk } from '../../lib/query'
import {
  fetchOn9AssetJson,
  type On9ChapterJsonEntry,
  type On9MemoryChapterJsonEntry,
  type On9StoryJsonEntry,
} from '../../lib/on9Assets'
import { useAppTexts } from '../../content/texts'

function buildPaginationItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 1) return []
  if (total <= 9) return Array.from({ length: total }, (_, i) => i)
  const want = new Set<number>()
  want.add(0)
  want.add(total - 1)
  for (let d = -2; d <= 2; d++) {
    const p = current + d
    if (p >= 0 && p < total) want.add(p)
  }
  const sorted = [...want].sort((a, b) => a - b)
  const out: (number | 'ellipsis')[] = []
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!
    if (i > 0 && cur > sorted[i - 1]! + 1) out.push('ellipsis')
    out.push(cur)
  }
  return out
}

// Static catalog files are CDN-hosted and may not exist for every deployment — degrade to an
// empty list instead of failing the whole page load.
async function fetchOn9CatalogSafe<T>(file: string): Promise<T[]> {
  try {
    return await fetchOn9AssetJson<T[]>(file)
  } catch {
    return []
  }
}

type On9StoryChapterRow = {
  chapterId: number
  name: string
  type: string
  storyId: number
  jewelCount: number
  isStoryWatched: number
  isClear: number
  hasProgress: boolean
}

type On9StoryStoryRow = {
  storyId: number
  name: string
  lastChapterId: number
  jewelCount: number
}

type On9StoryMemoryRow = {
  chapterId: number
  name: string
  type: string
  jewelCount: number
  isDialogWatched: number
  isStoryWatched: number
  isBossWatched: number
  isClear: number
  isEndingWatched: number
  gaugeId: number
  gaugeNum: number
}

type On9StoryLoad = {
  chapterRows: On9StoryChapterRow[]
  storyRows: On9StoryStoryRow[]
  memoryRows: On9StoryMemoryRow[]
}

const CHAPTER_PAGE_SIZE = 24

export function On9StoryPage() {
  const texts = useAppTexts()
  const toast = useKumoToastManager()

  const [chapterRows, setChapterRows] = useState<On9StoryChapterRow[]>([])
  const [storyRows, setStoryRows] = useState<On9StoryStoryRow[]>([])
  const [memoryRows, setMemoryRows] = useState<On9StoryMemoryRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  const [chapterSearch, setChapterSearch] = useState('')
  const [chapterTypeFilter, setChapterTypeFilter] = useState('')
  const [chapterPage, setChapterPage] = useState(0)
  const [chapterDraft, setChapterDraft] = useState<
    Record<number, { jewelCount: string; isStoryWatched: boolean; isClear: boolean }>
  >({})
  const [chapterSavingId, setChapterSavingId] = useState<number | null>(null)
  const [bulkChapterProgress, setBulkChapterProgress] = useState<{ done: number; total: number } | null>(null)

  const [storyDraft, setStoryDraft] = useState<Record<number, { lastChapterId: string; jewelCount: string }>>({})
  const [storySavingId, setStorySavingId] = useState<number | null>(null)

  const [memoryDraft, setMemoryDraft] = useState<
    Record<
      number,
      {
        jewelCount: string
        gaugeNum: string
        isDialogWatched: boolean
        isStoryWatched: boolean
        isBossWatched: boolean
        isClear: boolean
        isEndingWatched: boolean
      }
    >
  >({})
  const [memorySavingId, setMemorySavingId] = useState<number | null>(null)
  const [bulkMemoryProgress, setBulkMemoryProgress] = useState<{ done: number; total: number } | null>(null)

  const loadQuery = useQuery<On9StoryLoad>({
    queryKey: qk.on9Story,
    placeholderData: (old) => old,
    queryFn: async () => {
      const [chapterCatalog, storyCatalog, memoryCatalog, progress] = await Promise.all([
        fetchOn9CatalogSafe<On9ChapterJsonEntry>('chapter.json'),
        fetchOn9CatalogSafe<On9StoryJsonEntry>('story.json'),
        fetchOn9CatalogSafe<On9MemoryChapterJsonEntry>('memorychapter.json'),
        gameApi.ongekiUserProgress(),
      ])
      const chapterMap = new Map(progress.chapters.map((c) => [c.chapterId, c]))
      const nextChapterRows: On9StoryChapterRow[] = chapterCatalog.map((c) => {
        const p = chapterMap.get(c.id)
        return {
          chapterId: c.id,
          name: c.name,
          type: c.type ?? '',
          storyId: c.storyId ?? 0,
          jewelCount: p?.jewelCount ?? 0,
          isStoryWatched: p?.isStoryWatched ?? 0,
          isClear: p?.isClear ?? 0,
          hasProgress: !!p,
        }
      })
      const storyMap = new Map(progress.stories.map((s) => [s.storyId, s]))
      const nextStoryRows: On9StoryStoryRow[] = storyCatalog.map((s) => {
        const p = storyMap.get(s.id)
        return {
          storyId: s.id,
          name: s.name && s.name.trim() ? s.name : '',
          lastChapterId: p?.lastChapterId ?? 0,
          jewelCount: p?.jewelCount ?? 0,
        }
      })
      const memoryMap = new Map(progress.memoryChapters.map((m) => [m.chapterId, m]))
      const nextMemoryRows: On9StoryMemoryRow[] = memoryCatalog.map((m) => {
        const p = memoryMap.get(m.id)
        return {
          chapterId: m.id,
          name: m.name,
          type: m.type ?? '',
          jewelCount: p?.jewelCount ?? 0,
          isDialogWatched: p?.isDialogWatched ?? 0,
          isStoryWatched: p?.isStoryWatched ?? 0,
          isBossWatched: p?.isBossWatched ?? 0,
          isClear: p?.isClear ?? 0,
          isEndingWatched: p?.isEndingWatched ?? 0,
          gaugeId: p?.gaugeId ?? 0,
          gaugeNum: p?.gaugeNum ?? 0,
        }
      })
      return { chapterRows: nextChapterRows, storyRows: nextStoryRows, memoryRows: nextMemoryRows }
    },
  })

  useEffect(() => {
    if (!loadQuery.data) return
    setChapterRows(loadQuery.data.chapterRows)
    setStoryRows(loadQuery.data.storyRows)
    setMemoryRows(loadQuery.data.memoryRows)
    setChapterDraft({})
    setStoryDraft({})
    setMemoryDraft({})
  }, [loadQuery.data])

  const chapterTypes = useMemo(() => {
    const set = new Set<string>()
    chapterRows.forEach((r) => {
      if (r.type) set.add(r.type)
    })
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [chapterRows])

  const deferredChapterSearch = useDeferredValue(chapterSearch.trim().toLowerCase())

  const filteredChapterRows = useMemo(() => {
    return chapterRows.filter((r) => {
      if (chapterTypeFilter && r.type !== chapterTypeFilter) return false
      if (!deferredChapterSearch) return true
      return (
        r.name.toLowerCase().includes(deferredChapterSearch) || String(r.chapterId).includes(deferredChapterSearch)
      )
    })
  }, [chapterRows, chapterTypeFilter, deferredChapterSearch])

  const chapterTotalPages = Math.max(1, Math.ceil(filteredChapterRows.length / CHAPTER_PAGE_SIZE))
  const safeChapterPage = Math.min(chapterPage, chapterTotalPages - 1)
  const chapterPageSlice = filteredChapterRows.slice(
    safeChapterPage * CHAPTER_PAGE_SIZE,
    safeChapterPage * CHAPTER_PAGE_SIZE + CHAPTER_PAGE_SIZE,
  )
  const chapterPageItems = useMemo(
    () => buildPaginationItems(safeChapterPage, chapterTotalPages),
    [safeChapterPage, chapterTotalPages],
  )

  useEffect(() => {
    setChapterPage(0)
  }, [deferredChapterSearch, chapterTypeFilter])

  const saveChapter = useCallback(
    async (row: On9StoryChapterRow) => {
      const d = chapterDraft[row.chapterId]
      const jewelCount = d ? parseInt(d.jewelCount, 10) || 0 : row.jewelCount
      const isStoryWatched = (d ? (d.isStoryWatched ? 1 : 0) : row.isStoryWatched) as 0 | 1
      const isClear = (d ? (d.isClear ? 1 : 0) : row.isClear) as 0 | 1
      setChapterSavingId(row.chapterId)
      setErr(null)
      try {
        await gameApi.setOngekiChapter({ chapterId: row.chapterId, jewelCount, isStoryWatched, isClear })
        setChapterRows((rows) =>
          rows.map((r) =>
            r.chapterId === row.chapterId ? { ...r, jewelCount, isStoryWatched, isClear, hasProgress: true } : r,
          ),
        )
        setChapterDraft((m) => {
          const next = { ...m }
          delete next[row.chapterId]
          return next
        })
        toast.add({ title: texts.common.saved, variant: 'success' })
      } catch (e) {
        setErr(e instanceof Error ? e.message : texts.story.saveFailed)
      } finally {
        setChapterSavingId(null)
      }
    },
    [chapterDraft, texts.story.saveFailed, texts.common.saved, toast],
  )

  const clearAllChapters = useCallback(async () => {
    const rows = chapterRows
    if (rows.length === 0) return
    setErr(null)
    setBulkChapterProgress({ done: 0, total: rows.length })
    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!
        await gameApi.setOngekiChapter({
          chapterId: row.chapterId,
          jewelCount: row.jewelCount,
          isStoryWatched: 1,
          isClear: 1,
        })
        setBulkChapterProgress({ done: i + 1, total: rows.length })
      }
      await loadQuery.refetch()
      toast.add({ title: texts.common.saved, variant: 'success' })
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.story.saveFailed)
    } finally {
      setBulkChapterProgress(null)
    }
  }, [chapterRows, loadQuery, texts.story.saveFailed, texts.common.saved, toast])

  const saveStory = useCallback(
    async (row: On9StoryStoryRow) => {
      const d = storyDraft[row.storyId]
      const lastChapterId = d ? parseInt(d.lastChapterId, 10) || 0 : row.lastChapterId
      const jewelCount = d ? parseInt(d.jewelCount, 10) || 0 : row.jewelCount
      setStorySavingId(row.storyId)
      setErr(null)
      try {
        await gameApi.setOngekiStory({ storyId: row.storyId, lastChapterId, jewelCount })
        setStoryRows((rows) => rows.map((r) => (r.storyId === row.storyId ? { ...r, lastChapterId, jewelCount } : r)))
        setStoryDraft((m) => {
          const next = { ...m }
          delete next[row.storyId]
          return next
        })
        toast.add({ title: texts.common.saved, variant: 'success' })
      } catch (e) {
        setErr(e instanceof Error ? e.message : texts.story.saveFailed)
      } finally {
        setStorySavingId(null)
      }
    },
    [storyDraft, texts.story.saveFailed, texts.common.saved, toast],
  )

  const saveMemory = useCallback(
    async (row: On9StoryMemoryRow) => {
      const d = memoryDraft[row.chapterId]
      const jewelCount = d ? parseInt(d.jewelCount, 10) || 0 : row.jewelCount
      const gaugeNum = d ? parseInt(d.gaugeNum, 10) || 0 : row.gaugeNum
      const isDialogWatched = (d ? (d.isDialogWatched ? 1 : 0) : row.isDialogWatched) as 0 | 1
      const isStoryWatched = (d ? (d.isStoryWatched ? 1 : 0) : row.isStoryWatched) as 0 | 1
      const isBossWatched = (d ? (d.isBossWatched ? 1 : 0) : row.isBossWatched) as 0 | 1
      const isClear = (d ? (d.isClear ? 1 : 0) : row.isClear) as 0 | 1
      const isEndingWatched = (d ? (d.isEndingWatched ? 1 : 0) : row.isEndingWatched) as 0 | 1
      setMemorySavingId(row.chapterId)
      setErr(null)
      try {
        await gameApi.setOngekiMemoryChapter({
          chapterId: row.chapterId,
          jewelCount,
          isDialogWatched,
          isStoryWatched,
          isBossWatched,
          isClear,
          isEndingWatched,
          gaugeId: row.gaugeId,
          gaugeNum,
        })
        setMemoryRows((rows) =>
          rows.map((r) =>
            r.chapterId === row.chapterId
              ? { ...r, jewelCount, gaugeNum, isDialogWatched, isStoryWatched, isBossWatched, isClear, isEndingWatched }
              : r,
          ),
        )
        setMemoryDraft((m) => {
          const next = { ...m }
          delete next[row.chapterId]
          return next
        })
        toast.add({ title: texts.common.saved, variant: 'success' })
      } catch (e) {
        setErr(e instanceof Error ? e.message : texts.story.saveFailed)
      } finally {
        setMemorySavingId(null)
      }
    },
    [memoryDraft, texts.story.saveFailed, texts.common.saved, toast],
  )

  const clearAllMemory = useCallback(async () => {
    const rows = memoryRows
    if (rows.length === 0) return
    setErr(null)
    setBulkMemoryProgress({ done: 0, total: rows.length })
    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!
        await gameApi.setOngekiMemoryChapter({
          chapterId: row.chapterId,
          jewelCount: row.jewelCount,
          isDialogWatched: 1,
          isStoryWatched: 1,
          isBossWatched: 1,
          isClear: 1,
          isEndingWatched: 1,
          gaugeId: row.gaugeId,
          gaugeNum: row.gaugeNum,
        })
        setBulkMemoryProgress({ done: i + 1, total: rows.length })
      }
      await loadQuery.refetch()
      toast.add({ title: texts.common.saved, variant: 'success' })
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.story.saveFailed)
    } finally {
      setBulkMemoryProgress(null)
    }
  }, [memoryRows, loadQuery, texts.story.saveFailed, texts.common.saved, toast])

  const loadErr =
    loadQuery.error instanceof Error ? loadQuery.error.message : loadQuery.error ? texts.common.loadingFailed : null

  if (loadQuery.isPending && !loadQuery.data) {
    return (
      <div className="pb-10">
        <PageHeader title={texts.nav.on9Story} crumbs={[{ label: texts.nav.home, href: '/home' }]} />
        <div className="flex flex-col gap-3">
          <SkeletonBox className="h-11 w-full max-w-md rounded-lg" />
          <SkeletonBox className="h-64 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10">
      <PageHeader title={texts.nav.on9Story} crumbs={[{ label: texts.nav.home, href: '/home' }]} />

      {err || loadErr ? <Text DANGEROUS_className="text-kumo-danger mb-4 text-sm">{err ?? loadErr}</Text> : null}

      <section>
        <h2 className="text-kumo-default mb-1 text-lg font-semibold">{texts.story.chaptersTitle}</h2>
        <Text DANGEROUS_className="text-kumo-subtle mb-3 block text-sm">{texts.story.chaptersHint}</Text>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex max-w-sm flex-1 flex-col gap-1">
            <span className="text-kumo-subtle text-xs">{texts.story.searchLabel}</span>
            <Input
              className="h-10"
              value={chapterSearch}
              onChange={(e) => setChapterSearch(e.target.value)}
              placeholder={texts.story.searchPlaceholder}
            />
          </label>
          <label className="flex w-full flex-col gap-1 sm:w-48">
            <span className="text-kumo-subtle text-xs">{texts.story.typeFilterLabel}</span>
            <select
              value={chapterTypeFilter}
              onChange={(e) => setChapterTypeFilter(e.target.value)}
              className="border-kumo-line bg-kumo-base h-10 rounded-lg border px-3 text-sm text-kumo-default"
            >
              <option value="">{texts.story.allTypes}</option>
              {chapterTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            disabled={bulkChapterProgress != null || chapterRows.length === 0}
            onClick={() => void clearAllChapters()}
          >
            {bulkChapterProgress
              ? texts.story.clearingAllProgress(bulkChapterProgress.done, bulkChapterProgress.total)
              : texts.story.clearAllChapters}
          </Button>
        </div>
        {chapterRows.length === 0 ? (
          <Text DANGEROUS_className="text-kumo-subtle text-sm">{texts.story.noChapters}</Text>
        ) : filteredChapterRows.length === 0 ? (
          <Text DANGEROUS_className="text-kumo-subtle text-sm">{texts.story.noMatches}</Text>
        ) : (
          <>
            <div className="border-kumo-line overflow-hidden rounded-lg border">
              {chapterPageSlice.map((row) => {
                const d = chapterDraft[row.chapterId]
                const jewelCount = d?.jewelCount ?? String(row.jewelCount)
                const isStoryWatched = d ? d.isStoryWatched : row.isStoryWatched === 1
                const isClear = d ? d.isClear : row.isClear === 1
                const dirty =
                  d != null &&
                  ((parseInt(d.jewelCount, 10) || 0) !== row.jewelCount ||
                    isStoryWatched !== (row.isStoryWatched === 1) ||
                    isClear !== (row.isClear === 1))
                const busy = chapterSavingId === row.chapterId || bulkChapterProgress != null
                return (
                  <div
                    key={row.chapterId}
                    className="border-kumo-line flex flex-wrap items-center gap-3 border-b p-3 last:border-b-0"
                  >
                    <div className="text-kumo-subtle w-14 shrink-0 text-xs">#{row.chapterId}</div>
                    <div className="text-kumo-default min-w-[160px] flex-1 truncate text-sm font-medium">
                      {row.name}
                    </div>
                    {row.type ? (
                      <span className="bg-kumo-tint text-kumo-subtle shrink-0 rounded-md px-2 py-1 text-xs">
                        {row.type}
                      </span>
                    ) : null}
                    {!row.hasProgress ? (
                      <span className="bg-kumo-warning-tint text-kumo-warning shrink-0 rounded-md px-2 py-1 text-xs">
                        {texts.story.notStarted}
                      </span>
                    ) : null}
                    <label className="flex items-center gap-1 text-xs">
                      <span className="text-kumo-subtle">{texts.story.jewelCountLabel}</span>
                      <Input
                        className="h-9 w-20"
                        type="number"
                        min={0}
                        value={jewelCount}
                        onChange={(e) =>
                          setChapterDraft((m) => ({
                            ...m,
                            [row.chapterId]: { jewelCount: e.target.value, isStoryWatched, isClear },
                          }))
                        }
                      />
                    </label>
                    <Switch
                      controlFirst={false}
                      size="sm"
                      label={texts.story.storyWatchedLabel}
                      checked={isStoryWatched}
                      onCheckedChange={(on) =>
                        setChapterDraft((m) => ({ ...m, [row.chapterId]: { jewelCount, isStoryWatched: on, isClear } }))
                      }
                    />
                    <Switch
                      controlFirst={false}
                      size="sm"
                      label={texts.story.clearedLabel}
                      checked={isClear}
                      onCheckedChange={(on) =>
                        setChapterDraft((m) => ({
                          ...m,
                          [row.chapterId]: { jewelCount, isStoryWatched, isClear: on },
                        }))
                      }
                    />
                    {dirty ? (
                      <Button size="sm" disabled={busy} onClick={() => void saveChapter(row)}>
                        {texts.common.save}
                      </Button>
                    ) : null}
                  </div>
                )
              })}
            </div>
            {chapterTotalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safeChapterPage <= 0}
                  onClick={() => setChapterPage((p) => Math.max(0, p - 1))}
                >
                  {texts.common.previousPage}
                </Button>
                {chapterPageItems.map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`ce-${idx}`} className="text-kumo-subtle px-2 text-sm">
                      …
                    </span>
                  ) : (
                    <Button
                      key={item}
                      size="sm"
                      variant={item === safeChapterPage ? 'primary' : 'secondary'}
                      onClick={() => setChapterPage(item)}
                    >
                      {item + 1}
                    </Button>
                  ),
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safeChapterPage >= chapterTotalPages - 1}
                  onClick={() => setChapterPage((p) => Math.min(chapterTotalPages - 1, p + 1))}
                >
                  {texts.common.nextPage}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-kumo-default mb-1 text-lg font-semibold">{texts.story.storiesTitle}</h2>
        <Text DANGEROUS_className="text-kumo-subtle mb-3 block text-sm">{texts.story.storiesHint}</Text>
        {storyRows.length === 0 ? (
          <Text DANGEROUS_className="text-kumo-subtle text-sm">{texts.story.noStories}</Text>
        ) : (
          <div className="border-kumo-line overflow-hidden rounded-lg border">
            {storyRows.map((row) => {
              const d = storyDraft[row.storyId]
              const lastChapterId = d?.lastChapterId ?? String(row.lastChapterId)
              const jewelCount = d?.jewelCount ?? String(row.jewelCount)
              const dirty =
                (parseInt(lastChapterId, 10) || 0) !== row.lastChapterId ||
                (parseInt(jewelCount, 10) || 0) !== row.jewelCount
              const busy = storySavingId === row.storyId
              return (
                <div
                  key={row.storyId}
                  className="border-kumo-line flex flex-wrap items-center gap-3 border-b p-3 last:border-b-0"
                >
                  <div className="text-kumo-subtle w-14 shrink-0 text-xs">#{row.storyId}</div>
                  <div className="text-kumo-default min-w-[160px] flex-1 truncate text-sm font-medium">
                    {row.name || texts.story.storyFallbackName(row.storyId)}
                  </div>
                  <label className="flex items-center gap-1 text-xs">
                    <span className="text-kumo-subtle">{texts.story.lastChapterLabel}</span>
                    <Input
                      className="h-9 w-24"
                      type="number"
                      min={0}
                      value={lastChapterId}
                      onChange={(e) =>
                        setStoryDraft((m) => ({ ...m, [row.storyId]: { lastChapterId: e.target.value, jewelCount } }))
                      }
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <span className="text-kumo-subtle">{texts.story.jewelCountLabel}</span>
                    <Input
                      className="h-9 w-20"
                      type="number"
                      min={0}
                      value={jewelCount}
                      onChange={(e) =>
                        setStoryDraft((m) => ({ ...m, [row.storyId]: { lastChapterId, jewelCount: e.target.value } }))
                      }
                    />
                  </label>
                  {dirty ? (
                    <Button size="sm" disabled={busy} onClick={() => void saveStory(row)}>
                      {texts.common.save}
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-kumo-default mb-1 text-lg font-semibold">{texts.story.memoryTitle}</h2>
        <Text DANGEROUS_className="text-kumo-subtle mb-3 block text-sm">{texts.story.memoryHint}</Text>
        <div className="mb-4">
          <Button
            variant="secondary"
            disabled={bulkMemoryProgress != null || memoryRows.length === 0}
            onClick={() => void clearAllMemory()}
          >
            {bulkMemoryProgress
              ? texts.story.clearingAllProgress(bulkMemoryProgress.done, bulkMemoryProgress.total)
              : texts.story.clearAllMemory}
          </Button>
        </div>
        {memoryRows.length === 0 ? (
          <Text DANGEROUS_className="text-kumo-subtle text-sm">{texts.story.noMemoryChapters}</Text>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {memoryRows.map((row) => {
              const d = memoryDraft[row.chapterId]
              const jewelCount = d?.jewelCount ?? String(row.jewelCount)
              const gaugeNum = d?.gaugeNum ?? String(row.gaugeNum)
              const isDialogWatched = d ? d.isDialogWatched : row.isDialogWatched === 1
              const isStoryWatched = d ? d.isStoryWatched : row.isStoryWatched === 1
              const isBossWatched = d ? d.isBossWatched : row.isBossWatched === 1
              const isClear = d ? d.isClear : row.isClear === 1
              const isEndingWatched = d ? d.isEndingWatched : row.isEndingWatched === 1
              const dirty =
                d != null &&
                ((parseInt(d.jewelCount, 10) || 0) !== row.jewelCount ||
                  (parseInt(d.gaugeNum, 10) || 0) !== row.gaugeNum ||
                  isDialogWatched !== (row.isDialogWatched === 1) ||
                  isStoryWatched !== (row.isStoryWatched === 1) ||
                  isBossWatched !== (row.isBossWatched === 1) ||
                  isClear !== (row.isClear === 1) ||
                  isEndingWatched !== (row.isEndingWatched === 1))
              const busy = memorySavingId === row.chapterId || bulkMemoryProgress != null
              const setPatch = (
                patch: Partial<{
                  jewelCount: string
                  gaugeNum: string
                  isDialogWatched: boolean
                  isStoryWatched: boolean
                  isBossWatched: boolean
                  isClear: boolean
                  isEndingWatched: boolean
                }>,
              ) =>
                setMemoryDraft((m) => ({
                  ...m,
                  [row.chapterId]: {
                    jewelCount,
                    gaugeNum,
                    isDialogWatched,
                    isStoryWatched,
                    isBossWatched,
                    isClear,
                    isEndingWatched,
                    ...patch,
                  },
                }))
              return (
                <div
                  key={row.chapterId}
                  className="border-kumo-line bg-kumo-base flex flex-col gap-2 rounded-lg border p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="text-kumo-default text-sm font-medium">{row.name}</div>
                    {row.type ? (
                      <span className="bg-kumo-tint text-kumo-subtle rounded-md px-2 py-1 text-xs">{row.type}</span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-1 text-xs">
                      <span className="text-kumo-subtle">{texts.story.jewelCountLabel}</span>
                      <Input
                        className="h-9 w-20"
                        type="number"
                        min={0}
                        value={jewelCount}
                        onChange={(e) => setPatch({ jewelCount: e.target.value })}
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <span className="text-kumo-subtle">{texts.story.gaugeNumLabel}</span>
                      <Input
                        className="h-9 w-20"
                        type="number"
                        min={0}
                        value={gaugeNum}
                        onChange={(e) => setPatch({ gaugeNum: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <Switch
                      controlFirst={false}
                      size="sm"
                      label={texts.story.dialogWatchedLabel}
                      checked={isDialogWatched}
                      onCheckedChange={(on) => setPatch({ isDialogWatched: on })}
                    />
                    <Switch
                      controlFirst={false}
                      size="sm"
                      label={texts.story.storyWatchedLabel}
                      checked={isStoryWatched}
                      onCheckedChange={(on) => setPatch({ isStoryWatched: on })}
                    />
                    <Switch
                      controlFirst={false}
                      size="sm"
                      label={texts.story.bossWatchedLabel}
                      checked={isBossWatched}
                      onCheckedChange={(on) => setPatch({ isBossWatched: on })}
                    />
                    <Switch
                      controlFirst={false}
                      size="sm"
                      label={texts.story.clearedLabel}
                      checked={isClear}
                      onCheckedChange={(on) => setPatch({ isClear: on })}
                    />
                    <Switch
                      controlFirst={false}
                      size="sm"
                      label={texts.story.endingWatchedLabel}
                      checked={isEndingWatched}
                      onCheckedChange={(on) => setPatch({ isEndingWatched: on })}
                    />
                  </div>
                  {dirty ? (
                    <Button size="sm" disabled={busy} onClick={() => void saveMemory(row)}>
                      {texts.common.save}
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
