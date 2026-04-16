import { useEffect, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Checkbox } from '@cloudflare/kumo/components/checkbox'
import { Input } from '@cloudflare/kumo/components/input'
import { Text } from '@cloudflare/kumo/components/text'
import { Table } from '@cloudflare/kumo/components/table'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import * as api from '../../api/admin/downloadOrder'
import type { DownloadAssignment, DownloadIni } from '../../api/admin/downloadOrder'
import { useAppTexts } from '../../content/texts'

const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19)

const emptyIni: api.DownloadIniWrite = {
  fileName: '',
  title: '',
  gameId: 'SDGB',
  optVersion: '',
  orderTime: nowLocal(),
  gameDesc: '',
  partSize: '2048,8192,8192',
  imageUrl: '',
  optionalInstallUrls: '',
  imageSize: undefined,
  imageHash: '',
  releaseTime: nowLocal(),
  reportUrl: '',
  reportInterval: 3600,
  releaseType: 1,
  immediatelyRelease: 0,
  note: '',
}

const emptyAssignment: api.DownloadAssignmentWrite = {
  serial: '',
  gameId: 'SDGB',
  version: '',
  iniId: 0,
  enabled: true,
}

function asIniWrite(row: DownloadIni): api.DownloadIniWrite {
  return {
    fileName: row.fileName,
    title: row.title,
    gameId: row.gameId,
    optVersion: row.optVersion,
    orderTime: row.orderTime ?? '',
    gameDesc: row.gameDesc,
    partSize: row.partSize,
    imageUrl: row.imageUrl,
    optionalInstallUrls: row.optionalInstallUrls ?? '',
    imageSize: row.imageSize,
    imageHash: row.imageHash ?? '',
    releaseTime: row.releaseTime ?? '',
    reportUrl: row.reportUrl,
    reportInterval: row.reportInterval,
    releaseType: row.releaseType,
    immediatelyRelease: row.immediatelyRelease,
    note: row.note ?? '',
  }
}

export function AdminDownloadOrderPage() {
  const texts = useAppTexts()
  const [inis, setInis] = useState<DownloadIni[]>([])
  const [assignments, setAssignments] = useState<DownloadAssignment[]>([])
  const [reports, setReports] = useState<api.DownloadReport[]>([])
  const [loaderStates, setLoaderStates] = useState<api.LoaderState[]>([])
  const [form, setForm] = useState<api.DownloadIniWrite>(emptyIni)
  const [assignmentForm, setAssignmentForm] = useState<api.DownloadAssignmentWrite>(emptyAssignment)
  const [editingIni, setEditingIni] = useState<DownloadIni | null>(null)
  const [editingAssignment, setEditingAssignment] = useState<DownloadAssignment | null>(null)
  const [preview, setPreview] = useState('')
  const [err, setErr] = useState<string | null>(null)

  async function loadAll() {
    setErr(null)
    try {
      const [iniRows, assignmentRows, reportRows, loaderRows] = await Promise.all([
        api.listIni(),
        api.listAssignments(),
        api.listReports(),
        api.listLoaderStates(),
      ])
      setInis(iniRows)
      setAssignments(assignmentRows)
      setReports(reportRows)
      setLoaderStates(loaderRows)
      if (assignmentForm.iniId === 0 && iniRows[0]) {
        setAssignmentForm((old) => ({ ...old, iniId: iniRows[0].id }))
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  async function refreshPreview(next = form) {
    setErr(null)
    try {
      setPreview((await api.previewIni(next)).content)
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function createIni() {
    setErr(null)
    try {
      await api.createIni(form)
      setForm(emptyIni)
      setPreview('')
      await loadAll()
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function saveIni() {
    if (!editingIni) return
    setErr(null)
    try {
      await api.updateIni(editingIni.id, asIniWrite(editingIni))
      setEditingIni(null)
      await loadAll()
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function removeIni(id: number) {
    if (!confirm(texts.admin.downloadOrder.deleteIniConfirm)) return
    try {
      await api.deleteIni(id)
      await loadAll()
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function createAssignment() {
    setErr(null)
    try {
      await api.createAssignment(assignmentForm)
      setAssignmentForm({ ...emptyAssignment, iniId: assignmentForm.iniId })
      await loadAll()
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function saveAssignment() {
    if (!editingAssignment) return
    setErr(null)
    try {
      await api.updateAssignment(editingAssignment.id, {
        serial: editingAssignment.serial,
        gameId: editingAssignment.gameId,
        version: editingAssignment.version,
        iniId: editingAssignment.iniId,
        enabled: editingAssignment.enabled,
      })
      setEditingAssignment(null)
      await loadAll()
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function removeAssignment(id: number) {
    if (!confirm(texts.admin.downloadOrder.deleteAssignmentConfirm)) return
    try {
      await api.deleteAssignment(id)
      await loadAll()
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  function setIniField<K extends keyof api.DownloadIniWrite>(key: K, value: api.DownloadIniWrite[K]) {
    setForm((old) => ({ ...old, [key]: value }))
  }

  function input(
    label: string,
    value: string | number | undefined,
    onChange: (value: string) => void,
    type = 'text',
  ) {
    return (
      <label className="flex flex-col gap-1 text-sm">
        {label}
        <Input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      </label>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {err ? <Text DANGEROUS_className="text-kumo-danger">{err}</Text> : null}

      <LayerCard className="p-4">
        <LayerCard.Secondary>{texts.admin.downloadOrder.newIni}</LayerCard.Secondary>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {input(texts.admin.downloadOrder.fileName, form.fileName, (v) => setIniField('fileName', v))}
          {input(texts.admin.downloadOrder.title, form.title, (v) => setIniField('title', v))}
          {input('GAME_ID', form.gameId, (v) => setIniField('gameId', v.toUpperCase()))}
          {input('optVersion', form.optVersion, (v) => setIniField('optVersion', v))}
          {input('GAME_DESC', form.gameDesc, (v) => setIniField('gameDesc', v))}
          {input('PART_SIZE', form.partSize, (v) => setIniField('partSize', v))}
          {input('ORDER_TIME', form.orderTime, (v) => setIniField('orderTime', v))}
          {input('RELEASE_TIME', form.releaseTime, (v) => setIniField('releaseTime', v))}
          {input('REPORT', form.reportUrl, (v) => setIniField('reportUrl', v))}
          {input('REPORT_INTERVAL', form.reportInterval, (v) => setIniField('reportInterval', Number(v) || 3600), 'number')}
          {input('RELEASE_TYPE', form.releaseType, (v) => setIniField('releaseType', Number(v) || 1), 'number')}
          {input(
            'IMMEDIATELY_RELEASE',
            form.immediatelyRelease,
            (v) => setIniField('immediatelyRelease', Number(v) || 0),
            'number',
          )}
        </div>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          INSTALL1
          <Input value={form.imageUrl} onChange={(e) => setIniField('imageUrl', e.target.value)} />
        </label>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          {texts.admin.downloadOrder.optionalInstallUrls}
          <textarea
            className="min-h-24 rounded-md border border-kumo-line bg-kumo-bg p-2 font-mono text-sm"
            value={form.optionalInstallUrls ?? ''}
            onChange={(e) => setIniField('optionalInstallUrls', e.target.value)}
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void refreshPreview()}>
            {texts.admin.downloadOrder.preview}
          </Button>
          <Button onClick={() => void createIni()}>{texts.common.create}</Button>
        </div>
        {preview ? (
          <pre className="mt-4 max-h-96 overflow-auto rounded-md border border-kumo-line p-3 text-xs">
            {preview}
          </pre>
        ) : null}
      </LayerCard>

      {editingIni ? (
        <LayerCard className="p-4">
          <LayerCard.Secondary>{texts.admin.downloadOrder.editIni(editingIni.id)}</LayerCard.Secondary>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {input(texts.admin.downloadOrder.fileName, editingIni.fileName, (v) => setEditingIni({ ...editingIni, fileName: v }))}
            {input(texts.admin.downloadOrder.title, editingIni.title, (v) => setEditingIni({ ...editingIni, title: v }))}
            {input('GAME_ID', editingIni.gameId, (v) => setEditingIni({ ...editingIni, gameId: v.toUpperCase() }))}
            {input('optVersion', editingIni.optVersion, (v) => setEditingIni({ ...editingIni, optVersion: v }))}
            {input('GAME_DESC', editingIni.gameDesc, (v) => setEditingIni({ ...editingIni, gameDesc: v }))}
            {input('ORDER_TIME', editingIni.orderTime, (v) => setEditingIni({ ...editingIni, orderTime: v }))}
            {input('RELEASE_TIME', editingIni.releaseTime, (v) => setEditingIni({ ...editingIni, releaseTime: v }))}
            {input('REPORT', editingIni.reportUrl, (v) => setEditingIni({ ...editingIni, reportUrl: v }))}
          </div>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            INSTALL1
            <Input value={editingIni.imageUrl} onChange={(e) => setEditingIni({ ...editingIni, imageUrl: e.target.value })} />
          </label>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            {texts.admin.downloadOrder.optionalInstallUrls}
            <textarea
              className="min-h-24 rounded-md border border-kumo-line bg-kumo-bg p-2 font-mono text-sm"
              value={editingIni.optionalInstallUrls ?? ''}
              onChange={(e) => setEditingIni({ ...editingIni, optionalInstallUrls: e.target.value })}
            />
          </label>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => setEditingIni(null)}>
              {texts.common.cancel}
            </Button>
            <Button onClick={() => void saveIni()}>{texts.common.save}</Button>
          </div>
        </LayerCard>
      ) : null}

      <LayerCard className="p-4">
        <LayerCard.Secondary>{texts.admin.downloadOrder.iniList}</LayerCard.Secondary>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>ID</Table.Head>
              <Table.Head>{texts.admin.downloadOrder.file}</Table.Head>
              <Table.Head>{texts.admin.downloadOrder.game}</Table.Head>
              <Table.Head>{texts.admin.downloadOrder.description}</Table.Head>
              <Table.Head />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {inis.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.id}</Table.Cell>
                <Table.Cell>{row.fileName}</Table.Cell>
                <Table.Cell>{row.gameId}</Table.Cell>
                <Table.Cell>{row.gameDesc}</Table.Cell>
                <Table.Cell className="flex flex-wrap gap-1">
                  <Button size="sm" variant="secondary" onClick={() => setEditingIni({ ...row })}>
                    {texts.common.edit}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void removeIni(row.id)}>
                    {texts.common.delete}
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </LayerCard>

      <LayerCard className="p-4">
        <LayerCard.Secondary>{texts.admin.downloadOrder.assignment}</LayerCard.Secondary>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {input('serial', assignmentForm.serial, (v) => setAssignmentForm({ ...assignmentForm, serial: v.toUpperCase() }))}
          {input('GAME_ID', assignmentForm.gameId, (v) => setAssignmentForm({ ...assignmentForm, gameId: v.toUpperCase() }))}
          {input(texts.admin.downloadOrder.clientVersion, assignmentForm.version, (v) => setAssignmentForm({ ...assignmentForm, version: v }))}
          <label className="flex flex-col gap-1 text-sm">
            INI
            <select
              className="rounded-md border border-kumo-line bg-kumo-bg p-2"
              value={assignmentForm.iniId}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, iniId: Number(e.target.value) })}
            >
              <option value={0}>{texts.admin.downloadOrder.select}</option>
              {inis.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.fileName}
                </option>
              ))}
            </select>
          </label>
          <Checkbox
            controlFirst
            label={texts.common.enabled}
            className="self-end text-sm"
            checked={assignmentForm.enabled}
            onCheckedChange={(v) => setAssignmentForm({ ...assignmentForm, enabled: v })}
          />
        </div>
        <Button className="mt-4" onClick={() => void createAssignment()}>
          {texts.admin.downloadOrder.createAssignment}
        </Button>
      </LayerCard>

      {editingAssignment ? (
        <LayerCard className="p-4">
          <LayerCard.Secondary>{texts.admin.downloadOrder.editAssignment(editingAssignment.id)}</LayerCard.Secondary>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {input('serial', editingAssignment.serial, (v) => setEditingAssignment({ ...editingAssignment, serial: v.toUpperCase() }))}
            {input('GAME_ID', editingAssignment.gameId, (v) => setEditingAssignment({ ...editingAssignment, gameId: v.toUpperCase() }))}
            {input(texts.admin.downloadOrder.clientVersion, editingAssignment.version, (v) => setEditingAssignment({ ...editingAssignment, version: v }))}
            <label className="flex flex-col gap-1 text-sm">
              INI
              <select
                className="rounded-md border border-kumo-line bg-kumo-bg p-2"
                value={editingAssignment.iniId}
                onChange={(e) => setEditingAssignment({ ...editingAssignment, iniId: Number(e.target.value) })}
              >
                {inis.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.fileName}
                  </option>
                ))}
              </select>
            </label>
            <Checkbox
              controlFirst
              label={texts.common.enabled}
              className="self-end text-sm"
              checked={editingAssignment.enabled}
              onCheckedChange={(v) => setEditingAssignment({ ...editingAssignment, enabled: v })}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => setEditingAssignment(null)}>
              {texts.common.cancel}
            </Button>
            <Button onClick={() => void saveAssignment()}>{texts.common.save}</Button>
          </div>
        </LayerCard>
      ) : null}

      <LayerCard className="p-4">
        <LayerCard.Secondary>{texts.admin.downloadOrder.assignmentList}</LayerCard.Secondary>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>serial</Table.Head>
              <Table.Head>{texts.admin.downloadOrder.game}</Table.Head>
              <Table.Head>ver</Table.Head>
              <Table.Head>INI</Table.Head>
              <Table.Head>{texts.common.enabled}</Table.Head>
              <Table.Head />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {assignments.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.serial}</Table.Cell>
                <Table.Cell>{row.gameId}</Table.Cell>
                <Table.Cell>{row.version}</Table.Cell>
                <Table.Cell>{row.iniFileName}</Table.Cell>
                <Table.Cell>{row.enabled ? texts.common.yes : texts.common.no}</Table.Cell>
                <Table.Cell className="flex flex-wrap gap-1">
                  <Button size="sm" variant="secondary" onClick={() => setEditingAssignment({ ...row })}>
                    {texts.common.edit}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void removeAssignment(row.id)}>
                    {texts.common.delete}
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </LayerCard>

      <LayerCard className="p-4">
        <LayerCard.Secondary>{texts.admin.downloadOrder.downloadReports}</LayerCard.Secondary>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>{texts.common.time}</Table.Head>
              <Table.Head>serial</Table.Head>
              <Table.Head>{texts.admin.downloadOrder.game}</Table.Head>
              <Table.Head>{texts.admin.downloadOrder.type}</Table.Head>
              <Table.Head>{texts.admin.downloadOrder.status}</Table.Head>
              <Table.Head>{texts.admin.downloadOrder.progress}</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {reports.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{new Date(row.createdAt).toLocaleString()}</Table.Cell>
                <Table.Cell>{row.serial}</Table.Cell>
                <Table.Cell>{row.gameId}</Table.Cell>
                <Table.Cell>{row.imageType}</Table.Cell>
                <Table.Cell>{row.state}</Table.Cell>
                <Table.Cell>
                  {row.downloadedSegmentCount}/{row.totalSegmentCount}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </LayerCard>

      <LayerCard className="p-4">
        <LayerCard.Secondary>LoaderStateRecorder</LayerCard.Secondary>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>{texts.common.time}</Table.Head>
              <Table.Head>serial</Table.Head>
              <Table.Head>{texts.admin.downloadOrder.status}</Table.Head>
              <Table.Head>{texts.admin.downloadOrder.file}</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loaderStates.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{new Date(row.createdAt).toLocaleString()}</Table.Cell>
                <Table.Cell>{row.serial}</Table.Cell>
                <Table.Cell>{row.downloadState}</Table.Cell>
                <Table.Cell>
                  {row.numFilesDownloaded}/{row.numFilesToDownload}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </LayerCard>
    </div>
  )
}
