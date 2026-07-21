import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useKumoToastManager } from '@cloudflare/kumo'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Switch } from '@cloudflare/kumo/components/switch'
import { Table } from '@cloudflare/kumo/components/table'
import { Text } from '@cloudflare/kumo/components/text'
import * as api from '../../api/admin/ongekiEvent'
import type { OngekiEventEntry, OngekiEventWrite } from '../../api/admin/ongekiEvent'
import { AdminSection } from '../../components/admin/AdminSection'
import { SkeletonBox } from '../../components/common/Skeleton'
import { useAppTexts } from '../../content/texts'
import { qk } from '../../lib/query'

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

function nowLocalIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

type EditForm = { type: string; startDate: string; endDate: string; enable: boolean }

function rowToForm(row: OngekiEventEntry): EditForm {
  return { type: String(row.type), startDate: row.startDate, endDate: row.endDate, enable: row.enable }
}

export function AdminOngekiEventsPage() {
  const texts = useAppTexts()
  const t = texts.admin.ongekiEvents
  const toast = useKumoToastManager()
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
      {err ? <Text DANGEROUS_className="text-kumo-danger">{err}</Text> : null}

      <AdminSection title={t.moviesTitle} bodyClassName="mt-4 flex flex-col gap-3">
        <Text DANGEROUS_className="text-kumo-subtle text-sm">{t.movieHint}</Text>
        <div className="flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            disabled={moviePending !== null}
            onClick={() => void disableAllMovies()}
          >
            {t.disableAllMovies}
          </Button>
        </div>
        {eventsQuery.isLoading ? (
          <SkeletonBox className="h-40" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-kumo-line">
            {MOVIE_EVENT_IDS.map((id) => {
              const row = eventsById.get(id)
              const label = MOVIE_EVENT_LABELS[id] ?? `Movie ${id}`
              const pending = moviePending === id || moviePending === 'all'
              return (
                <div
                  key={id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-kumo-line px-3 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-kumo-default">{label}</div>
                    <div className="text-kumo-subtle text-xs">
                      {row ? `${row.startDate} ~ ${row.endDate}` : t.notCreated}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="secondary" disabled={pending} onClick={() => void setCurrentMovie(id)}>
                      {t.setCurrent}
                    </Button>
                    <Switch
                      checked={row?.enable ?? false}
                      disabled={pending}
                      onCheckedChange={(v) => void setMovieEnable(id, v)}
                      size="sm"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </AdminSection>

      <AdminSection title={t.eventsTitle} bodyClassName="mt-4 flex flex-col gap-3">
        <Text DANGEROUS_className="text-kumo-subtle text-sm">
          {t.unscheduledCount(unscheduledQuery.data?.length ?? 0)}
        </Text>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            {t.idLabel}
            <Input placeholder={t.idPlaceholder} value={newId} onChange={(e) => setNewId(e.target.value)} />
          </label>
          <Button size="sm" onClick={() => void createRow()}>
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
          <Text DANGEROUS_className="text-kumo-subtle text-sm">{t.empty}</Text>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>ID</Table.Head>
                  <Table.Head>{t.type}</Table.Head>
                  <Table.Head>{t.startDate}</Table.Head>
                  <Table.Head>{t.endDate}</Table.Head>
                  <Table.Head>{texts.common.enabled}</Table.Head>
                  <Table.Head>{texts.common.edit}</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {pageRows.map((row) => {
                  if (editingId === row.id) {
                    return (
                      <Table.Row key={row.id}>
                        <Table.Cell colSpan={6}>
                          <div className="flex flex-col gap-3 py-2">
                            <Text DANGEROUS_className="font-medium">{t.editEntry(row.id)}</Text>
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
                              onCheckedChange={(v) => setEditForm({ ...editForm, enable: v })}
                              size="sm"
                            />
                            <div className="flex gap-2">
                              <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                                {texts.common.cancel}
                              </Button>
                              <Button size="sm" onClick={() => void saveEdit()}>
                                {texts.common.save}
                              </Button>
                            </div>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )
                  }
                  return (
                    <Table.Row key={row.id}>
                      <Table.Cell>{row.id}</Table.Cell>
                      <Table.Cell>{row.type}</Table.Cell>
                      <Table.Cell>{row.startDate}</Table.Cell>
                      <Table.Cell>{row.endDate}</Table.Cell>
                      <Table.Cell>
                        <Switch
                          checked={row.enable}
                          disabled={togglePending === row.id}
                          onCheckedChange={() => void toggleRowEnable(row)}
                          size="sm"
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>
                          {texts.common.edit}
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            {texts.common.previousPage}
          </Button>
          <Text size="sm">{texts.admin.totalPages(page + 1, totalPages, filtered.length)}</Text>
          <Button
            variant="secondary"
            size="sm"
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
