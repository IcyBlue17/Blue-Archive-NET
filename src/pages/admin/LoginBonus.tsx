import { useEffect, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Checkbox } from '@cloudflare/kumo/components/checkbox'
import { Input } from '@cloudflare/kumo/components/input'
import { Text } from '@cloudflare/kumo/components/text'
import { Table } from '@cloudflare/kumo/components/table'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import * as api from '../../api/admin/loginBonus'

export function AdminLoginBonusPage() {
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

  async function refreshPresets() {
    setErr(null)
    try {
      setPresets(await api.listPresets())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  useEffect(() => {
    void refreshPresets()
  }, [])

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
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  async function removePreset(id: number) {
    if (!confirm('删除预设及其所有条目？')) return
    try {
      await api.deletePreset(id)
      if (selected === id) setSelected(null)
      await refreshPresets()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
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
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  async function delEntry(id: number) {
    if (!confirm('删除条目？')) return
    try {
      await api.deleteEntry(id)
      if (selected != null) setEntries(await api.listEntries(selected))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {err ? <Text DANGEROUS_className="text-kumo-danger">{err}</Text> : null}
      <LayerCard className="border-kumo-warning/40 bg-kumo-warning/8 p-4">
        <LayerCard.Secondary>注意</LayerCard.Secondary>
        <Text DANGEROUS_className="mt-3 text-sm leading-6 text-kumo-subtle">
          CHUNITHM 客户端更稳的是吃游戏资源里原本就存在的签到 preset / entry ID。
          这里直接新建任意自定义签到，后端可以发奖，但客户端不一定会弹出签到内容。
          想让街机端稳定显示，最好复用游戏资源里已有的签到数据，或者给客户端补对应的 LoginBonus 资源。
        </Text>
      </LayerCard>
      <LayerCard className="p-4">
        <LayerCard.Secondary>新建预设</LayerCard.Secondary>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Input placeholder="名称" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input
            type="number"
            placeholder="可选 presetId"
            value={newPresetId}
            onChange={(e) => setNewPresetId(e.target.value)}
          />
          <Checkbox
            controlFirst
            label="启用"
            className="text-sm"
            checked={newEnabled}
            onCheckedChange={setNewEnabled}
          />
          <Checkbox
            controlFirst
            label="可重复 (ID < 3000)"
            className="text-sm"
            checked={newRepeat}
            onCheckedChange={setNewRepeat}
          />
          <Button onClick={createPreset}>创建</Button>
        </div>
      </LayerCard>
      <LayerCard className="p-4">
        <LayerCard.Secondary>预设列表</LayerCard.Secondary>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>ID</Table.Head>
              <Table.Head>名称</Table.Head>
              <Table.Head>启用</Table.Head>
              <Table.Head />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {presets.map((p) => (
              <Table.Row key={p.id}>
                <Table.Cell>{p.id}</Table.Cell>
                <Table.Cell>{p.presetName}</Table.Cell>
                <Table.Cell>{p.isEnabled ? '是' : '否'}</Table.Cell>
                <Table.Cell>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setSelected(Number(p.id))}>
                      条目
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removePreset(Number(p.id))}>
                      删除
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </LayerCard>
      {selected != null ? (
        <LayerCard className="p-4">
          <LayerCard.Secondary>预设 {selected} — 新建条目</LayerCard.Secondary>
          <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
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
            添加条目
          </Button>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>ID</Table.Head>
                <Table.Head>名称</Table.Head>
                <Table.Head>presentId</Table.Head>
                <Table.Head>天数</Table.Head>
                <Table.Head />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {entries.map((e) => (
                <Table.Row key={e.id}>
                  <Table.Cell>{e.id}</Table.Cell>
                  <Table.Cell>{e.loginBonusName}</Table.Cell>
                  <Table.Cell>{e.presentId}</Table.Cell>
                  <Table.Cell>{e.needLoginDayCount}</Table.Cell>
                  <Table.Cell>
                    <Button size="sm" variant="destructive" onClick={() => delEntry(e.id)}>
                      删除
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </LayerCard>
      ) : null}
    </div>
  )
}
