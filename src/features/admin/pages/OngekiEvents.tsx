import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/features/admin/api/ongekiEvent'
import type { OngekiEventEntry, OngekiEventWrite } from '@/features/admin/api/ongekiEvent'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { useAppTexts } from '@/content/texts'
import { qk } from '@/lib/query'
import { Button, Input, Switch } from 'antd'
import { useToast } from '@/components/ui/toast'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import { Text } from '@/components/ui/Text'
import { nowLocalIso } from '@/lib/datetime'

// EventType=Movie ids that control the title/attract-screen MV. Among these, the client plays
// whichever enabled event's [startDate, endDate] currently contains "now" with the latest
// startDate; if all 25 are disabled, no MV plays at all.
const MOVIE_EVENT_IDS = Array.from({ length: 25 }, (_, i) => 1359910205 + i)

// id -> "year + song title + (movie id)" label table. The 25 events only reuse 8 underlying
// videos, so the trailing movie id makes it visible when two rows play the identical MV.
const MOVIE_EVENT_LABELS: Record<number, string> = {
  1359910205: '2024 STARTLINER (10002)',
  1359910206: '2024 Jump!! Jump!! Jump!! セガフェス版 (10504)',
  1359910207: '2024 最強 the サマータイム!!!!! (11001)',
  1359910208: '2024 Splash Dance!! (11504)',
  1359910209: '2024 No Limit RED Force (12001)',
  1359910210: '2024 STARRED HEART Ending Ver (12502)',
  1359910211: '2024 Transcend Lights (13001)',
  1359910212: '2024 フィナーレ曲 (13505)',
  1359910213: '2025 STARTLINER (10002)',
  1359910214: '2025 Jump!! Jump!! Jump!! セガフェス版 (10504)',
  1359910215: '2025 最強 the サマータイム!!!!! (11001)',
  1359910216: '2025 Splash Dance!! (11504)',
  1359910217: '2025 No Limit RED Force (12001)',
  1359910218: '2025 STARRED HEART Ending Ver (12502)',
  1359910219: '2025 Transcend Lights (13001)',
  1359910220: '2025 フィナーレ曲 (13505)',
  1359910221: '2026 STARTLINER (10002)',
  1359910222: '2026 Jump!! Jump!! Jump!! セガフェス版 (10504)',
  1359910223: '2026 最強 the サマータイム!!!!! (11001)',
  1359910224: '2026 Splash Dance!! (11504)',
  1359910225: '2026 No Limit RED Force (12001)',
  1359910226: '2026 STARRED HEART Ending Ver (12502)',
  1359910227: '2026 Transcend Lights (13001)',
  1359910228: '2026 フィナーレ曲 (13505)',
  1359910229: 'フィナーレ曲(通用) (13505)',
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
const PAGE_SIZE = 50



type EditForm = { type: string; startDate: string; endDate: string; enable: boolean }

function rowToForm(row: OngekiEventEntry): EditForm {
  return { type: String(row.type), startDate: row.startDate, endDate: row.endDate, enable: row.enable }
}

export function AdminOngekiEventsPage() {
  const texts = useAppTexts()
  const t = texts.admin.ongekiEvents
  const toast = useToast()
  const [err, setErr] = useState<string | null>(null)

  const eventsQuery = useQuery({
    queryKey: qk.adminOngekiEvents,
    queryFn: () => api.listEvents(),
  })

  const unscheduledQuery = useQuery({
    queryKey: qk.adminOngekiEventsUnscheduled,
    queryFn: () => api.unscheduledIds(),
  })

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data])
  const eventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events])

  function reportError(e: unknown) {
    const message = e instanceof Error ? e.message : texts.common.error
    setErr(message)
    toast.add({ title: texts.common.failed, variant: 'error' })
  }

  async function refreshAll() {
    await Promise.all([eventsQuery.refetch(), unscheduledQuery.refetch()])
  }

  async function upsertEvent(id: number, body: OngekiEventWrite) {
    if (eventsById.has(id)) {
      await api.updateEvent(id, body)
    } else {
      await api.createEvent({ id, ...body })
    }
  }

  // Movie MV section -----------------------------------------------------
  const [moviePending, setMoviePending] = useState<number | 'all' | null>(null)

  async function setMovieEnable(id: number, next: boolean) {
    setErr(null)
    setMoviePending(id)
    try {
      await upsertEvent(id, { enable: next })
      await refreshAll()
    } catch (e) {
      reportError(e)
    } finally {
      setMoviePending(null)
    }
  }

  async function setCurrentMovie(id: number) {
    setErr(null)
    setMoviePending(id)
    try {
      await upsertEvent(id, { enable: true, startDate: nowLocalIso() })
      await refreshAll()
      toast.add({ title: t.setCurrentToast(MOVIE_EVENT_LABELS[id] ?? String(id)), variant: 'success' })
    } catch (e) {
      reportError(e)
    } finally {
      setMoviePending(null)
    }
  }

  async function disableAllMovies() {
    if (!confirm(t.disableAllMoviesConfirm)) return
    setErr(null)
    setMoviePending('all')
    try {
      for (const id of MOVIE_EVENT_IDS) {
        const existing = eventsById.get(id)
        if (existing?.enable) await api.updateEvent(id, { enable: false })
      }
      await refreshAll()
      toast.add({ title: t.disabledAllToast, variant: 'success' })
    } catch (e) {
      reportError(e)
    } finally {
      setMoviePending(null)
    }
  }

  // Event editor section --------------------------------------------------
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ type: '1', startDate: '', endDate: '', enable: true })
  const [newId, setNewId] = useState('')
  const [togglePending, setTogglePending] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return events
    return events.filter((e) => String(e.id).startsWith(q))
  }, [events, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function onSearchChange(v: string) {
    setSearch(v)
    setPage(0)
  }

  function startEdit(row: OngekiEventEntry) {
    setEditingId(row.id)
    setEditForm(rowToForm(row))
  }

  async function saveEdit() {
    if (editingId == null) return
    const type = Number(editForm.type)
    if (!Number.isFinite(type)) {
      setErr(t.invalidType)
      return
    }
    if (!DATE_RE.test(editForm.startDate) || !DATE_RE.test(editForm.endDate)) {
      setErr(t.invalidDate)
      return
    }
    setErr(null)
    try {
      await api.updateEvent(editingId, {
        type,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        enable: editForm.enable,
      })
      setEditingId(null)
      await refreshAll()
      toast.add({ title: t.updatedToast, variant: 'success' })
    } catch (e) {
      reportError(e)
    }
  }

  async function toggleRowEnable(row: OngekiEventEntry) {
    setErr(null)
    setTogglePending(row.id)
    try {
      await api.updateEvent(row.id, { enable: !row.enable })
      await refreshAll()
    } catch (e) {
      reportError(e)
    } finally {
      setTogglePending(null)
    }
  }

  async function createRow() {
    const id = Number(newId)
    if (!Number.isFinite(id) || id <= 0) {
      setErr(t.invalidId)
      return
    }
    setErr(null)
    try {
      await api.createEvent({ id })
      setNewId('')
      await refreshAll()
      toast.add({ title: t.createdToast, variant: 'success' })
    } catch (e) {
      reportError(e)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {err ? <Text className="text-app-danger">{err}</Text> : null}

      <AdminSection title={t.moviesTitle} bodyClassName="mt-4 flex flex-col gap-3">
        <Text className="text-app-subtle text-sm">{t.movieHint}</Text>
        <div className="flex justify-end">
          <Button
            danger
            size="small"
            disabled={moviePending !== null}
            onClick={() => void disableAllMovies()}
          >
            {t.disableAllMovies}
          </Button>
        </div>
        {eventsQuery.isLoading ? (
          <SkeletonBox className="h-40" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-app-line">
            {MOVIE_EVENT_IDS.map((id) => {
              const row = eventsById.get(id)
              const label = MOVIE_EVENT_LABELS[id] ?? `Movie ${id}`
              const pending = moviePending === id || moviePending === 'all'
              return (
                <div
                  key={id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line px-3 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-app-default">{label}</div>
                    <div className="text-app-subtle text-xs">
                      {row ? `${row.startDate} ~ ${row.endDate}` : t.notCreated}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="small" disabled={pending} onClick={() => void setCurrentMovie(id)}>
                      {t.setCurrent}
                    </Button>
                    <Switch checked={row?.enable ?? false} disabled={pending} onChange={(v) => void setMovieEnable(id, v)} size="small" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </AdminSection>

      <AdminSection title={t.eventsTitle} bodyClassName="mt-4 flex flex-col gap-3">
        <Text className="text-app-subtle text-sm">
          {t.unscheduledCount(unscheduledQuery.data?.length ?? 0)}
        </Text>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            {t.idLabel}
            <Input placeholder={t.idPlaceholder} value={newId} onChange={(e) => setNewId(e.target.value)} />
          </label>
          <Button size="small" onClick={() => void createRow()}>
            {t.createRowForId}
          </Button>
        </div>

        <label className="flex max-w-sm flex-col gap-1 text-sm">
          {texts.common.search}
          <Input placeholder={t.searchPlaceholder} value={search} onChange={(e) => onSearchChange(e.target.value)} />
        </label>

        {eventsQuery.isLoading ? (
          <div className="flex flex-col gap-2">
            <SkeletonBox className="h-10" />
            <SkeletonBox className="h-10" />
            <SkeletonBox className="h-10" />
          </div>
        ) : pageRows.length === 0 ? (
          <Text className="text-app-subtle text-sm">{t.empty}</Text>
        ) : (
          <div className="overflow-x-auto">
            <ResponsiveTable<OngekiEventEntry>
              rowKey={(row) => row.id}
              dataSource={pageRows}
              columns={[
                { title: 'ID', dataIndex: 'id', key: 'id', width: 80, fixed: 'left' },
                { title: t.type, dataIndex: 'type', key: 'type' },
                { title: t.startDate, dataIndex: 'startDate', key: 'startDate' },
                { title: t.endDate, dataIndex: 'endDate', key: 'endDate' },
                {
                  title: texts.common.enabled,
                  key: 'enable',
                  render: (_, row) => (
                    <Switch
                      checked={row.enable}
                      disabled={togglePending === row.id}
                      onChange={() => void toggleRowEnable(row)}
                      size="small"
                    />
                  ),
                },
                {
                  title: texts.common.edit,
                  key: 'action',
                  align: 'end',
                  render: (_, row) => (
                    <Button size="small" onClick={() => startEdit(row)}>
                      {texts.common.edit}
                    </Button>
                  ),
                },
              ]}
              // 编辑表单原来是一整行 colSpan=6 的单元格；antd 里对应的就是展开行，
              // 隐掉展开箭头，仍由「编辑」按钮控制展开哪一行。
              expandable={{
                showExpandColumn: false,
                expandedRowKeys: editingId != null ? [editingId] : [],
                expandedRowRender: (row) => (
                  <div className="flex flex-col gap-3 py-2">
                    <Text className="font-medium">{t.editEntry(row.id)}</Text>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <label className="flex flex-col gap-1 text-sm">
                        {t.type}
                        <Input
                          type="number"
                          value={editForm.type}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        {t.startDate}
                        <Input
                          value={editForm.startDate}
                          onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        {t.endDate}
                        <Input
                          value={editForm.endDate}
                          onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                        />
                      </label>
                    </div>
                    <Switch
                      checked={editForm.enable}
                      onChange={(v) => setEditForm({ ...editForm, enable: v })}
                      size="small"
                    />
                    <div className="flex gap-2">
                      <Button size="small" onClick={() => setEditingId(null)}>
                        {texts.common.cancel}
                      </Button>
                      <Button size="small" onClick={() => void saveEdit()}>
                        {texts.common.save}
                      </Button>
                    </div>
                  </div>
                ),
              }}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button size="small" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            {texts.common.previousPage}
          </Button>
          <Text className="text-sm">{texts.admin.totalPages(page + 1, totalPages, filtered.length)}</Text>
          <Button
            size="small"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {texts.common.nextPage}
          </Button>
        </div>
      </AdminSection>
    </div>
  )
}
