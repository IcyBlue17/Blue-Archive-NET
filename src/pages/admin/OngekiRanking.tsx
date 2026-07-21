import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useKumoToastManager } from '@cloudflare/kumo'
import { Button } from '@cloudflare/kumo/components/button'
import { Checkbox } from '@cloudflare/kumo/components/checkbox'
import { Input } from '@cloudflare/kumo/components/input'
import { Switch } from '@cloudflare/kumo/components/switch'
import { Table } from '@cloudflare/kumo/components/table'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { Text } from '@cloudflare/kumo/components/text'
import * as api from '../../api/admin/ongekiRanking'
import type { MusicRankingEntry } from '../../api/admin/ongekiRanking'
import * as dataApi from '../../api/data'
import { AdminSection } from '../../components/admin/AdminSection'
import { SkeletonBox } from '../../components/common/Skeleton'
import { useAppTexts } from '../../content/texts'
import { imgCross } from '../../lib/imgSign'
import { musicJacketUrl } from '../../lib/musicCover'
import { qk } from '../../lib/query'

type RankingForm = {
  musicId: string
  point: string
  userName: string
  sortOrder: string
  enable: boolean
}

const emptyForm: RankingForm = { musicId: '', point: '', userName: '', sortOrder: '', enable: true }

function formToWrite(form: RankingForm): api.MusicRankingWrite | null {
  const musicId = Number(form.musicId)
  if (!Number.isFinite(musicId) || musicId <= 0) return null
  return {
    musicId,
    point: form.point.trim() ? Number(form.point) || 0 : undefined,
    userName: form.userName.trim() || undefined,
    sortOrder: form.sortOrder.trim() ? Number(form.sortOrder) || 0 : undefined,
    enable: form.enable,
  }
}

function rowToForm(row: MusicRankingEntry): RankingForm {
  return {
    musicId: String(row.musicId),
    point: String(row.point ?? ''),
    userName: row.userName ?? '',
    sortOrder: String(row.sortOrder ?? ''),
    enable: row.enable,
  }
}

export function AdminOngekiRankingPage() {
  const texts = useAppTexts()
  const t = texts.admin.ongekiRanking
  const toast = useKumoToastManager()
  const [type, setType] = useState<1 | 2>(1)
  const [err, setErr] = useState<string | null>(null)

  const rankingQuery = useQuery({
    queryKey: qk.adminOngekiRanking(type),
    queryFn: () => api.listRanking(type),
  })

  const musicQuery = useQuery({
    queryKey: qk.gameAllMusic('ongeki'),
    queryFn: () => dataApi.allMusic('ongeki'),
    retry: 0,
  })

  const musicMap = useMemo(() => musicQuery.data ?? {}, [musicQuery.data])

  const musicName = useMemo(() => {
    return (musicId: number): string | undefined => musicMap[String(musicId)]?.name ?? undefined
  }, [musicMap])

  const musicOptions = useMemo(() => {
    return Object.entries(musicMap)
      .map(([id, meta]) => ({ id: Number(id), name: meta?.name ?? '' }))
      .filter((m) => Number.isFinite(m.id))
      .sort((a, b) => a.id - b.id)
  }, [musicMap])

  function suggestionsFor(query: string) {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return musicOptions.filter((m) => String(m.id).includes(q) || m.name.toLowerCase().includes(q)).slice(0, 8)
  }

  const rows = useMemo(
    () => [...(rankingQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [rankingQuery.data],
  )

  // The attract-mode board (ADT_Ranking) reads exactly the first 10 enabled entries with no bounds
  // check: 1-9 entries indexes out of range, and any entry whose musicId the cabinet doesn't have
  // makes the client discard the whole board and fall back to its built-in default list. So a board
  // only takes effect at 10+ enabled, valid songs (and only after a full game restart re-downloads).
  const enabledCount = useMemo(() => rows.filter((r) => r.enable).length, [rows])
  const countWarning = enabledCount > 0 && enabledCount < 10

  const [form, setForm] = useState<RankingForm>(emptyForm)
  const [formSearch, setFormSearch] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<RankingForm>(emptyForm)

  function reportError(e: unknown) {
    setErr(e instanceof Error ? e.message : texts.common.error)
  }

  async function createEntry() {
    setErr(null)
    const body = formToWrite(form)
    if (!body) {
      setErr(t.musicIdPlaceholder)
      return
    }
    try {
      await api.createRanking({ ...body, type })
      setForm(emptyForm)
      setFormSearch('')
      await rankingQuery.refetch()
      toast.add({ title: t.createdTitle, variant: 'success' })
    } catch (e) {
      reportError(e)
    }
  }

  function startEdit(row: MusicRankingEntry) {
    setEditingId(row.id)
    setEditForm(rowToForm(row))
  }

  async function saveEdit() {
    if (editingId == null) return
    setErr(null)
    const body = formToWrite(editForm)
    if (!body) {
      setErr(t.musicIdPlaceholder)
      return
    }
    try {
      await api.updateRanking(editingId, body)
      setEditingId(null)
      await rankingQuery.refetch()
      toast.add({ title: t.updatedTitle, variant: 'success' })
    } catch (e) {
      reportError(e)
    }
  }

  async function toggleEnable(row: MusicRankingEntry) {
    setErr(null)
    try {
      await api.updateRanking(row.id, { enable: !row.enable })
      await rankingQuery.refetch()
    } catch (e) {
      reportError(e)
    }
  }

  async function removeEntry(id: number) {
    if (!confirm(t.deleteConfirm)) return
    setErr(null)
    try {
      await api.deleteRanking(id)
      if (editingId === id) setEditingId(null)
      await rankingQuery.refetch()
      toast.add({ title: t.deletedTitle, variant: 'success' })
    } catch (e) {
      reportError(e)
    }
  }

  async function clearAll() {
    if (!confirm(t.clearConfirm)) return
    setErr(null)
    try {
      await api.clearRanking(type)
      setEditingId(null)
      await rankingQuery.refetch()
      toast.add({ title: t.clearedTitle, variant: 'success' })
    } catch (e) {
      reportError(e)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {err ? <Text DANGEROUS_className="text-kumo-danger">{err}</Text> : null}

      <Tabs
        variant="segmented"
        tabs={[
          { value: '1', label: t.currentPeriod },
          { value: '2', label: t.previousPeriod },
        ]}
        value={String(type)}
        onValueChange={(v) => setType(v === '2' ? 2 : 1)}
      />

      <AdminSection title={t.newEntry} bodyClassName="mt-4 flex flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            {t.musicId}
            <Input
              type="number"
              placeholder={t.musicIdPlaceholder}
              value={form.musicId}
              onChange={(e) => setForm({ ...form, musicId: e.target.value })}
            />
            <span className="text-kumo-subtle text-xs">
              {form.musicId.trim() && Number.isFinite(Number(form.musicId))
                ? (musicName(Number(form.musicId)) ?? t.musicNotFound)
                : '—'}
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t.point}
            <Input type="number" value={form.point} onChange={(e) => setForm({ ...form, point: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t.displayName}
            <Input value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t.sortOrder}
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </label>
        </div>
        <label className="flex max-w-sm flex-col gap-1 text-sm">
          {texts.common.search}
          <Input
            placeholder={texts.common.search}
            value={formSearch}
            onChange={(e) => setFormSearch(e.target.value)}
          />
        </label>
        {formSearch.trim() ? (
          <div className="flex flex-wrap gap-1">
            {suggestionsFor(formSearch).map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant="secondary"
                onClick={() => {
                  setForm((old) => ({ ...old, musicId: String(m.id) }))
                  setFormSearch('')
                }}
              >
                {m.id} · {m.name}
              </Button>
            ))}
          </div>
        ) : null}
        <Checkbox
          controlFirst
          label={texts.common.enabled}
          className="text-sm"
          checked={form.enable}
          onCheckedChange={(v) => setForm({ ...form, enable: v })}
        />
        <div>
          <Button onClick={() => void createEntry()}>{texts.common.create}</Button>
        </div>
      </AdminSection>

      <AdminSection title={type === 1 ? t.currentPeriod : t.previousPeriod} bodyClassName="mt-4">
        <div className="mb-3 rounded-md border border-kumo-line bg-kumo-recessed px-3 py-2 text-xs text-kumo-subtle">
          {t.effectHint}
        </div>
        {countWarning ? (
          <div className="mb-3 rounded-md border border-kumo-warning bg-kumo-warning-tint px-3 py-2 text-sm text-kumo-warning">
            {t.countWarning(enabledCount)}
          </div>
        ) : null}
        <div className="mb-3 flex justify-end">
          <Button variant="destructive" size="sm" onClick={() => void clearAll()}>
            {t.clearAll}
          </Button>
        </div>
        {rankingQuery.isLoading ? (
          <div className="flex flex-col gap-2">
            <SkeletonBox className="h-10" />
            <SkeletonBox className="h-10" />
            <SkeletonBox className="h-10" />
          </div>
        ) : rows.length === 0 ? (
          <Text DANGEROUS_className="text-kumo-subtle text-sm">{t.empty}</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>{t.sortOrder}</Table.Head>
                <Table.Head>{t.music}</Table.Head>
                <Table.Head>{t.point}</Table.Head>
                <Table.Head>{t.displayName}</Table.Head>
                <Table.Head>{texts.common.enabled}</Table.Head>
                <Table.Head>{t.actions}</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((row) => {
                if (editingId === row.id) {
                  return (
                    <Table.Row key={row.id}>
                      <Table.Cell colSpan={6}>
                        <div className="flex flex-col gap-3 py-2">
                          <Text DANGEROUS_className="font-medium">{t.editEntry(row.id)}</Text>
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <label className="flex flex-col gap-1 text-sm">
                              {t.musicId}
                              <Input
                                type="number"
                                value={editForm.musicId}
                                onChange={(e) => setEditForm({ ...editForm, musicId: e.target.value })}
                              />
                              <span className="text-kumo-subtle text-xs">
                                {editForm.musicId.trim() && Number.isFinite(Number(editForm.musicId))
                                  ? (musicName(Number(editForm.musicId)) ?? t.musicNotFound)
                                  : '—'}
                              </span>
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                              {t.point}
                              <Input
                                type="number"
                                value={editForm.point}
                                onChange={(e) => setEditForm({ ...editForm, point: e.target.value })}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                              {t.displayName}
                              <Input
                                value={editForm.userName}
                                onChange={(e) => setEditForm({ ...editForm, userName: e.target.value })}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                              {t.sortOrder}
                              <Input
                                type="number"
                                value={editForm.sortOrder}
                                onChange={(e) => setEditForm({ ...editForm, sortOrder: e.target.value })}
                              />
                            </label>
                          </div>
                          <Checkbox
                            controlFirst
                            label={texts.common.enabled}
                            className="text-sm"
                            checked={editForm.enable}
                            onCheckedChange={(v) => setEditForm({ ...editForm, enable: v })}
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

                const jacket = musicJacketUrl('ongeki', row.musicId)
                const name = musicName(row.musicId)
                return (
                  <Table.Row key={row.id}>
                    <Table.Cell>{row.sortOrder}</Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <img
                          src={jacket}
                          crossOrigin={imgCross(jacket)}
                          alt=""
                          width={32}
                          height={32}
                          loading="lazy"
                          decoding="async"
                          className="h-8 w-8 shrink-0 rounded object-cover"
                          onError={(e) => {
                            e.currentTarget.style.visibility = 'hidden'
                          }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm">{name ?? `#${row.musicId}`}</div>
                          <div className="text-kumo-subtle text-xs">#{row.musicId}</div>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>{row.point}</Table.Cell>
                    <Table.Cell>{row.userName || '—'}</Table.Cell>
                    <Table.Cell>
                      <Switch checked={row.enable} onCheckedChange={() => void toggleEnable(row)} size="sm" />
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>
                          {texts.common.edit}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void removeEntry(row.id)}>
                          {texts.common.delete}
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        )}
      </AdminSection>
    </div>
  )
}
