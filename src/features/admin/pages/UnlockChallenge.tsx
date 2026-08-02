import { useCallback, useEffect, useState } from 'react'
import * as api from '@/features/admin/api/unlockChallenge'
import type { UnlockChallengeRow } from '@/features/admin/api/unlockChallenge'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useAppTexts } from '@/content/texts'
import { Button, Input } from 'antd'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import { Text } from '@/components/ui/Text'

const emptyRow: Omit<UnlockChallengeRow, 'id'> = {
  unlockChallengeId: 0,
  challengeName: '',
  courseId1: 0,
  courseId2: 0,
  courseId3: 0,
  courseId4: 0,
  courseId5: 0,
  borderScore: 0,
  rewardId: 0,
  rewardType: 0,
  version: 1,
}

export function AdminUnlockChallengePage() {
  const texts = useAppTexts()
  const [rows, setRows] = useState<UnlockChallengeRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState(emptyRow)
  const [editing, setEditing] = useState<UnlockChallengeRow | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      setRows(await api.listUnlockChallenges())
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }, [texts.common.error])

  useEffect(() => {
    void load()
  }, [load])

  async function create() {
    setErr(null)
    try {
      await api.createUnlockChallenge(form)
      setForm(emptyRow)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function saveEdit() {
    if (!editing) return
    setErr(null)
    try {
      await api.updateUnlockChallenge(editing.id, {
        unlockChallengeId: editing.unlockChallengeId,
        challengeName: editing.challengeName,
        courseId1: editing.courseId1,
        courseId2: editing.courseId2,
        courseId3: editing.courseId3,
        courseId4: editing.courseId4,
        courseId5: editing.courseId5,
        borderScore: editing.borderScore,
        rewardId: editing.rewardId,
        rewardType: editing.rewardType,
        version: editing.version,
      })
      setEditing(null)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function remove(id: number) {
    if (!confirm(texts.admin.deleteUnlockConfirm)) return
    try {
      await api.deleteUnlockChallenge(id)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  function numField(
    key: keyof typeof form,
    label: string,
    state: typeof form | UnlockChallengeRow,
    setState: (u: typeof form | UnlockChallengeRow) => void,
  ) {
    return (
      <label key={label} className="flex flex-col gap-1 text-sm">
        {label}
        <Input
          type="number"
          value={Number((state as never)[key])}
          onChange={(e) => setState({ ...state, [key]: Number(e.target.value) } as never)}
        />
      </label>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {err ? <Text className="text-app-danger">{err}</Text> : null}
      <AdminSection title={texts.admin.newItem} bodyClassName="mt-4">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            challengeName
            <Input
              value={form.challengeName}
              onChange={(e) => setForm({ ...form, challengeName: e.target.value })}
            />
          </label>
          {numField('unlockChallengeId', 'unlockChallengeId', form, setForm)}
          {numField('courseId1', 'courseId1', form, setForm)}
          {numField('courseId2', 'courseId2', form, setForm)}
          {numField('courseId3', 'courseId3', form, setForm)}
          {numField('courseId4', 'courseId4', form, setForm)}
          {numField('courseId5', 'courseId5', form, setForm)}
          {numField('borderScore', 'borderScore', form, setForm)}
          {numField('rewardId', 'rewardId', form, setForm)}
          {numField('rewardType', 'rewardType', form, setForm)}
          {numField('version', 'version', form, setForm)}
        </div>
        <Button className="mt-4" onClick={create}>
          {texts.common.create}
        </Button>
      </AdminSection>
      {editing ? (
        <AdminSection title={texts.admin.editItem(editing.id)} bodyClassName="mt-4">
          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              challengeName
              <Input
                value={editing.challengeName}
                onChange={(e) => setEditing({ ...editing, challengeName: e.target.value })}
              />
            </label>
            {(
              [
                'unlockChallengeId',
                'courseId1',
                'courseId2',
                'courseId3',
                'courseId4',
                'courseId5',
                'borderScore',
                'rewardId',
                'rewardType',
                'version',
              ] as const
            ).map((k) =>
              numField(k, k, editing, (u) => setEditing(u as UnlockChallengeRow)),
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => setEditing(null)}>
              {texts.common.cancel}
            </Button>
            <Button onClick={saveEdit}>{texts.common.save}</Button>
          </div>
        </AdminSection>
      ) : null}
      <AdminSection title={texts.admin.list} bodyClassName="mt-4 overflow-x-auto">
          <ResponsiveTable<api.UnlockChallengeRow>
            rowKey={(r) => r.id}
            dataSource={rows}
            columns={[
              { title: 'id', dataIndex: 'id', key: 'id', width: 72, fixed: 'left' },
              { title: 'ucId', dataIndex: 'unlockChallengeId', key: 'unlockChallengeId' },
              { title: texts.common.name, dataIndex: 'challengeName', key: 'challengeName' },
              { title: 'border', dataIndex: 'borderScore', key: 'borderScore' },
              {
                title: '',
                key: 'action',
                align: 'end',
                render: (_, r) => (
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button size="small" onClick={() => setEditing({ ...r })}>
                      {texts.common.edit}
                    </Button>
                    <Button size="small" danger onClick={() => remove(r.id)}>
                      {texts.common.delete}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
      </AdminSection>
    </div>
  )
}
