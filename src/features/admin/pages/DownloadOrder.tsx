import { useCallback, useEffect, useState } from 'react'
import * as api from '@/features/admin/api/downloadOrder'
import type { DownloadAssignment, DownloadIni } from '@/features/admin/api/downloadOrder'
import { useAppTexts } from '@/content/texts'
import { Button, Checkbox, Input } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import { Text } from '@/components/ui/Text'
import { formatDateTime, nowLocalIso } from '@/lib/datetime'
import { useI18n } from '@/lib/i18n'

const nowLocal = () => nowLocalIso()

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
  const { locale } = useI18n()
  const loc = locale === 'en' ? 'en' : 'zh'
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

  const loadAll = useCallback(async () => {
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
  }, [assignmentForm.iniId, texts.common.error])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

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
      {err ? <Text className="text-app-danger">{err}</Text> : null}

      <SectionCard title={<>{texts.admin.downloadOrder.newIni}</>}>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {input(texts.admin.downloadOrder.fileName, form.fileName, (v) => setIniField('fileName', v))}
          {input(texts.admin.downloadOrder.title, form.title, (v) => setIniField('title', v))}
          {input('GAME_ID', form.gameId, (v) => setIniField('gameId', v.toUpperCase()))}
          {input('optVersion', form.optVersion, (v) => setIniField('optVersion', v))}
          {input('GAME_DESC', form.gameDesc, (v) => setIniField('gameDesc', v))}
          {input(texts.admin.downloadOrder.partSize, form.partSize, (v) => setIniField('partSize', v))}
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
            className="min-h-24 rounded-md border border-app-line bg-app-base p-2 font-mono text-sm"
            value={form.optionalInstallUrls ?? ''}
            onChange={(e) => setIniField('optionalInstallUrls', e.target.value)}
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void refreshPreview()}>
            {texts.admin.downloadOrder.preview}
          </Button>
          <Button onClick={() => void createIni()}>{texts.common.create}</Button>
        </div>
        {preview ? (
          <pre className="mt-4 max-h-96 overflow-auto rounded-md border border-app-line p-3 text-xs">
            {preview}
          </pre>
        ) : null}
      </SectionCard>

      {editingIni ? (
        <SectionCard title={<>{texts.admin.downloadOrder.editIni(editingIni.id)}</>}>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {input(texts.admin.downloadOrder.fileName, editingIni.fileName, (v) => setEditingIni({ ...editingIni, fileName: v }))}
            {input(texts.admin.downloadOrder.title, editingIni.title, (v) => setEditingIni({ ...editingIni, title: v }))}
            {input('GAME_ID', editingIni.gameId, (v) => setEditingIni({ ...editingIni, gameId: v.toUpperCase() }))}
            {input('optVersion', editingIni.optVersion, (v) => setEditingIni({ ...editingIni, optVersion: v }))}
            {input('GAME_DESC', editingIni.gameDesc, (v) => setEditingIni({ ...editingIni, gameDesc: v }))}
            {input(texts.admin.downloadOrder.partSize, editingIni.partSize, (v) => setEditingIni({ ...editingIni, partSize: v }))}
            {input('ORDER_TIME', editingIni.orderTime, (v) => setEditingIni({ ...editingIni, orderTime: v }))}
            {input('RELEASE_TIME', editingIni.releaseTime, (v) => setEditingIni({ ...editingIni, releaseTime: v }))}
            {input('REPORT', editingIni.reportUrl, (v) => setEditingIni({ ...editingIni, reportUrl: v }))}
            {input(
              'REPORT_INTERVAL',
              editingIni.reportInterval,
              (v) => setEditingIni({ ...editingIni, reportInterval: Number(v) }),
              'number',
            )}
            {input(
              'RELEASE_TYPE',
              editingIni.releaseType,
              (v) => setEditingIni({ ...editingIni, releaseType: Number(v) }),
              'number',
            )}
            {input(
              'IMMEDIATELY_RELEASE',
              editingIni.immediatelyRelease,
              (v) => setEditingIni({ ...editingIni, immediatelyRelease: Number(v) }),
              'number',
            )}
          </div>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            INSTALL1
            <Input value={editingIni.imageUrl} onChange={(e) => setEditingIni({ ...editingIni, imageUrl: e.target.value })} />
          </label>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            {texts.admin.downloadOrder.optionalInstallUrls}
            <textarea
              className="min-h-24 rounded-md border border-app-line bg-app-base p-2 font-mono text-sm"
              value={editingIni.optionalInstallUrls ?? ''}
              onChange={(e) => setEditingIni({ ...editingIni, optionalInstallUrls: e.target.value })}
            />
          </label>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => setEditingIni(null)}>
              {texts.common.cancel}
            </Button>
            <Button onClick={() => void saveIni()}>{texts.common.save}</Button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title={<>{texts.admin.downloadOrder.iniList}</>}>
        <ResponsiveTable<api.DownloadIni>
          rowKey={(row) => row.id}
          dataSource={inis}
          columns={[
            { title: 'ID', dataIndex: 'id', key: 'id', width: 72, fixed: 'left' },
            { title: texts.admin.downloadOrder.file, dataIndex: 'fileName', key: 'fileName' },
            { title: texts.admin.downloadOrder.game, dataIndex: 'gameId', key: 'gameId' },
            {
              title: texts.admin.downloadOrder.partSize,
              key: 'partSize',
              render: (_, row) => <span className="font-mono text-xs whitespace-nowrap">{row.partSize}</span>,
            },
            { title: texts.admin.downloadOrder.description, dataIndex: 'gameDesc', key: 'gameDesc' },
            {
              title: '',
              key: 'action',
              align: 'end',
              render: (_, row) => (
                <div className="flex flex-wrap justify-end gap-1">
                  <Button size="small" onClick={() => setEditingIni({ ...row })}>
                    {texts.common.edit}
                  </Button>
                  <Button size="small" danger onClick={() => void removeIni(row.id)}>
                    {texts.common.delete}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </SectionCard>

      <SectionCard title={<>{texts.admin.downloadOrder.assignment}</>}>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {input('serial', assignmentForm.serial, (v) => setAssignmentForm({ ...assignmentForm, serial: v.toUpperCase() }))}
          {input('GAME_ID', assignmentForm.gameId, (v) => setAssignmentForm({ ...assignmentForm, gameId: v.toUpperCase() }))}
          {input(texts.admin.downloadOrder.clientVersion, assignmentForm.version, (v) => setAssignmentForm({ ...assignmentForm, version: v }))}
          <label className="flex flex-col gap-1 text-sm">
            INI
            <select
              className="rounded-md border border-app-line bg-app-base p-2"
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
          <Checkbox className="self-end text-sm" checked={assignmentForm.enabled} onChange={(e) => ((v) => setAssignmentForm({ ...assignmentForm, enabled: v }))(e.target.checked)}>{texts.common.enabled}</Checkbox>
        </div>
        <Button className="mt-4" onClick={() => void createAssignment()}>
          {texts.admin.downloadOrder.createAssignment}
        </Button>
      </SectionCard>

      {editingAssignment ? (
        <SectionCard title={<>{texts.admin.downloadOrder.editAssignment(editingAssignment.id)}</>}>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {input('serial', editingAssignment.serial, (v) => setEditingAssignment({ ...editingAssignment, serial: v.toUpperCase() }))}
            {input('GAME_ID', editingAssignment.gameId, (v) => setEditingAssignment({ ...editingAssignment, gameId: v.toUpperCase() }))}
            {input(texts.admin.downloadOrder.clientVersion, editingAssignment.version, (v) => setEditingAssignment({ ...editingAssignment, version: v }))}
            <label className="flex flex-col gap-1 text-sm">
              INI
              <select
                className="rounded-md border border-app-line bg-app-base p-2"
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
            <Checkbox className="self-end text-sm" checked={editingAssignment.enabled} onChange={(e) => ((v) => setEditingAssignment({ ...editingAssignment, enabled: v }))(e.target.checked)}>{texts.common.enabled}</Checkbox>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => setEditingAssignment(null)}>
              {texts.common.cancel}
            </Button>
            <Button onClick={() => void saveAssignment()}>{texts.common.save}</Button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title={<>{texts.admin.downloadOrder.assignmentList}</>}>
        <ResponsiveTable<api.DownloadAssignment>
          rowKey={(row) => row.id}
          dataSource={assignments}
          columns={[
            { title: 'serial', dataIndex: 'serial', key: 'serial', fixed: 'left' },
            { title: texts.admin.downloadOrder.game, dataIndex: 'gameId', key: 'gameId' },
            { title: 'ver', dataIndex: 'version', key: 'version' },
            { title: 'INI', dataIndex: 'iniFileName', key: 'iniFileName' },
            {
              title: texts.common.enabled,
              key: 'enabled',
              render: (_, row) => (row.enabled ? texts.common.yes : texts.common.no),
            },
            {
              title: '',
              key: 'action',
              align: 'end',
              render: (_, row) => (
                <div className="flex flex-wrap justify-end gap-1">
                  <Button size="small" onClick={() => setEditingAssignment({ ...row })}>
                    {texts.common.edit}
                  </Button>
                  <Button size="small" danger onClick={() => void removeAssignment(row.id)}>
                    {texts.common.delete}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </SectionCard>

      <SectionCard title={<>{texts.admin.downloadOrder.downloadReports}</>}>
        <ResponsiveTable<api.DownloadReport>
          rowKey={(row) => row.id}
          dataSource={reports}
          columns={[
            {
              title: texts.common.time,
              key: 'createdAt',
              fixed: 'left',
              render: (_, row) => formatDateTime(row.createdAt, loc),
            },
            { title: 'serial', dataIndex: 'serial', key: 'serial' },
            { title: texts.admin.downloadOrder.game, dataIndex: 'gameId', key: 'gameId' },
            { title: texts.admin.downloadOrder.type, dataIndex: 'imageType', key: 'imageType' },
            { title: texts.admin.downloadOrder.status, dataIndex: 'state', key: 'state' },
            {
              title: texts.admin.downloadOrder.progress,
              key: 'progress',
              render: (_, row) => `${row.downloadedSegmentCount}/${row.totalSegmentCount}`,
            },
          ]}
        />
      </SectionCard>

      <SectionCard title={<>LoaderStateRecorder</>}>
        <ResponsiveTable<api.LoaderState>
          rowKey={(row) => row.id}
          dataSource={loaderStates}
          columns={[
            {
              title: texts.common.time,
              key: 'createdAt',
              fixed: 'left',
              render: (_, row) => formatDateTime(row.createdAt, loc),
            },
            { title: 'serial', dataIndex: 'serial', key: 'serial' },
            { title: texts.admin.downloadOrder.status, dataIndex: 'downloadState', key: 'downloadState' },
            {
              title: texts.admin.downloadOrder.file,
              key: 'files',
              render: (_, row) => `${row.numFilesDownloaded}/${row.numFilesToDownload}`,
            },
          ]}
        />
      </SectionCard>
    </div>
  )
}
