import { useCallback, useEffect, useState } from 'react'
import * as api from '@/features/admin/api/loginBonus'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useAppTexts } from '@/content/texts'
import { Button, Checkbox, Input } from 'antd'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import { Text } from '@/components/ui/Text'

export function AdminLoginBonusPage() {
  const texts = useAppTexts()
  const [presets, setPresets] = useState<api.LoginBonusPreset[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [entries, setEntries] = useState<api.LoginBonusEntry[]>([])
  const [err, setErr] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newPresetId, setNewPresetId] = useState('')
  const [newEnabled, setNewEnabled] = useState(true)
  const [newRepeat, setNewRepeat] = useState(false)

  const [entryForm, setEntryForm] = useState({
    loginBonusName: '',
    presentId: 0,
    presentName: '',
    itemNum: 1,
    needLoginDayCount: 1,
    loginBonusCategoryType: 0,
  })

  const refreshPresets = useCallback(async () => {
    setErr(null)
    try {
      setPresets(await api.listPresets())
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }, [texts.common.error])

  useEffect(() => {
    void refreshPresets()
  }, [refreshPresets])

  useEffect(() => {
    if (selected == null) return
    void api
      .listEntries(selected)
      .then(setEntries)
      .catch(() => setEntries([]))
  }, [selected])

  async function createPreset() {
    setErr(null)
    try {
      await api.createPreset({
        presetName: newName,
        presetId: newPresetId.trim() ? Number(newPresetId) : undefined,
        isEnabled: newEnabled,
        isRepeatable: newRepeat,
      })
      setNewName('')
      setNewPresetId('')
      await refreshPresets()
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function removePreset(id: number) {
    if (!confirm(texts.admin.deletePresetConfirm)) return
    try {
      await api.deletePreset(id)
      if (selected === id) setSelected(null)
      await refreshPresets()
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function createEntry() {
    if (selected == null) return
    setErr(null)
    try {
      await api.createEntry(selected, entryForm)
      setEntryForm({
        loginBonusName: '',
        presentId: 0,
        presentName: '',
        itemNum: 1,
        needLoginDayCount: 1,
        loginBonusCategoryType: 0,
      })
      setEntries(await api.listEntries(selected))
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function delEntry(id: number) {
    if (!confirm(texts.admin.deleteEntryConfirm)) return
    try {
      await api.deleteEntry(id)
      if (selected != null) setEntries(await api.listEntries(selected))
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {err ? <Text className="text-app-danger">{err}</Text> : null}
      <AdminSection title={texts.admin.createPreset} bodyClassName="mt-4 flex flex-wrap items-end gap-2">
          <Input placeholder={texts.common.name} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input
            type="number"
            placeholder={texts.admin.optionalPresetId}
            value={newPresetId}
            onChange={(e) => setNewPresetId(e.target.value)}
          />
          <Checkbox className="text-sm" checked={newEnabled} onChange={(e) => setNewEnabled(e.target.checked)}>{texts.common.enabled}</Checkbox>
          <Checkbox className="text-sm" checked={newRepeat} onChange={(e) => setNewRepeat(e.target.checked)}>{texts.admin.repeatable}</Checkbox>
          <Button onClick={createPreset}>{texts.common.create}</Button>
      </AdminSection>
      <AdminSection title={texts.admin.presetList} bodyClassName="mt-4">
        <ResponsiveTable<api.LoginBonusPreset>
          rowKey={(p) => p.id}
          dataSource={presets}
          columns={[
            { title: 'ID', dataIndex: 'id', key: 'id', width: 72, fixed: 'left' },
            { title: texts.common.name, dataIndex: 'presetName', key: 'presetName' },
            {
              title: texts.common.enabled,
              key: 'isEnabled',
              render: (_, p) => (p.isEnabled ? texts.common.yes : texts.common.no),
            },
            {
              title: '',
              key: 'action',
              align: 'end',
              render: (_, p) => (
                <div className="flex flex-wrap justify-end gap-1">
                  <Button size="small" onClick={() => setSelected(Number(p.id))}>
                    {texts.admin.entries}
                  </Button>
                  <Button size="small" danger onClick={() => removePreset(Number(p.id))}>
                    {texts.common.delete}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </AdminSection>
      {selected != null ? (
        <AdminSection title={texts.admin.newEntryForPreset(selected)} bodyClassName="mt-4">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              loginBonusName
              <Input
                value={entryForm.loginBonusName}
                onChange={(e) => setEntryForm({ ...entryForm, loginBonusName: e.target.value })}
              />
            </label>
            <label className="text-sm">
              presentName
              <Input
                value={entryForm.presentName}
                onChange={(e) => setEntryForm({ ...entryForm, presentName: e.target.value })}
              />
            </label>
            {(
              [
                ['presentId', 'presentId'],
                ['itemNum', 'itemNum'],
                ['needLoginDayCount', 'needLoginDayCount'],
                ['loginBonusCategoryType', 'loginBonusCategoryType'],
              ] as const
            ).map(([k, lab]) => (
              <label key={k} className="text-sm">
                {lab}
                <Input
                  type="number"
                  value={entryForm[k]}
                  onChange={(e) =>
                    setEntryForm({ ...entryForm, [k]: Number(e.target.value) || 0 })
                  }
                />
              </label>
            ))}
          </div>
          <Button className="mt-4" onClick={createEntry}>
            {texts.admin.addEntry}
          </Button>
          <ResponsiveTable<api.LoginBonusEntry>
            rowKey={(e) => e.id}
            dataSource={entries}
            columns={[
              { title: 'ID', dataIndex: 'id', key: 'id', width: 72, fixed: 'left' },
              { title: texts.common.name, dataIndex: 'loginBonusName', key: 'loginBonusName' },
              { title: 'presentId', dataIndex: 'presentId', key: 'presentId' },
              { title: texts.admin.days, dataIndex: 'needLoginDayCount', key: 'needLoginDayCount' },
              {
                title: '',
                key: 'action',
                align: 'end',
                render: (_, e) => (
                  <Button size="small" danger onClick={() => delEntry(e.id)}>
                    {texts.common.delete}
                  </Button>
                ),
              },
            ]}
          />
        </AdminSection>
      ) : null}
    </div>
  )
}
