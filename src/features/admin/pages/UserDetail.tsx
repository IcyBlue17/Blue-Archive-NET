import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as adminUsers from '@/features/admin/api/users'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useAppTexts } from '@/content/texts'
import { Button, Checkbox, Input } from 'antd'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import { Text } from '@/components/ui/Text'

export function AdminUserDetailPage() {
  const texts = useAppTexts()
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const auId = Number(id)
  const [user, setUser] = useState<adminUsers.AdminUserDetail | null>(null)
  const [cards, setCards] = useState<adminUsers.AdminCard[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')

  useEffect(() => {
    if (!Number.isFinite(auId)) return
    void adminUsers
      .getUserDetail(auId)
      .then((u) => {
        setUser(u)
        setDisplayName(u.displayName || '')
        setCountry(u.country || '')
        setRegion(u.region || '')
        setBio(u.profileBio || '')
        setLocation(u.profileLocation || '')
      })
      .catch((e) => setErr(e instanceof Error ? e.message : texts.common.error))
    void adminUsers
      .listUserCards(auId)
      .then(setCards)
      .catch(() => setCards([]))
  }, [auId, texts.common.error])

  async function save() {
    if (!user) return
    setErr(null)
    try {
      const u = await adminUsers.updateUser(auId, {
        displayName,
        country,
        region,
        profileBio: bio,
        profileLocation: location,
      })
      setUser(u)
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function toggleEmailConfirmed(checked: boolean) {
    if (!user) return
    try {
      const u = await adminUsers.updateUser(auId, { emailConfirmed: checked })
      setUser(u)
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function toggleOptOut(checked: boolean) {
    if (!user) return
    try {
      const u = await adminUsers.updateUser(auId, { optOutOfLeaderboard: checked })
      setUser(u)
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  async function banCard(cardId: number, banned: boolean) {
    try {
      await adminUsers.updateCardBan(cardId, banned)
      setCards(await adminUsers.listUserCards(auId))
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  if (!Number.isFinite(auId)) return <Text>{texts.admin.invalidUser}</Text>

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => nav('/admin/users')}>
        {texts.admin.backToList}
      </Button>
      {err ? <Text className="text-app-danger">{err}</Text> : null}
      <AdminSection title={texts.admin.editUser(auId)} bodyClassName="mt-4 grid max-w-xl gap-3">
          <label className="flex flex-col gap-1">
            <Text className="text-sm">{texts.admin.displayName}</Text>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text className="text-sm">{texts.admin.country}</Text>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text className="text-sm">{texts.admin.region}</Text>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text className="text-sm">{texts.admin.place}</Text>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text className="text-sm">{texts.admin.bio}</Text>
            <Input value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>
          <div className="flex items-center gap-2">
            <Checkbox checked={!!user?.emailConfirmed} onChange={(e) => ((c) => void toggleEmailConfirmed(c))(e.target.checked)} />
            <Text className="text-sm">{texts.admin.emailVerified}</Text>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={!!user?.optOutOfLeaderboard} onChange={(e) => ((c) => void toggleOptOut(c))(e.target.checked)} />
            <Text className="text-sm">{texts.admin.rankingDisabled}</Text>
          </div>
          <Button onClick={save}>{texts.common.save}</Button>
      </AdminSection>
      <AdminSection title={texts.admin.cards} bodyClassName="mt-4">
        <ResponsiveTable<adminUsers.AdminCard>
          rowKey={(c) => c.id}
          dataSource={cards}
          columns={[
            { title: 'ID', dataIndex: 'id', key: 'id', width: 80, fixed: 'left' },
            { title: 'LUID', dataIndex: 'luid', key: 'luid' },
            {
              title: 'Ghost',
              key: 'isGhost',
              render: (_, c) => (c.isGhost ? texts.common.yes : texts.common.no),
            },
            {
              title: texts.admin.rankingBanned,
              key: 'rankingBanned',
              render: (_, c) => (c.rankingBanned ? texts.common.yes : texts.common.no),
            },
            {
              title: '',
              key: 'action',
              align: 'end',
              render: (_, c) => (
                <Button
                  size="small"
                  danger={!c.rankingBanned}
                  onClick={() => banCard(c.id, !c.rankingBanned)}
                >
                  {c.rankingBanned ? texts.admin.unbanRanking : texts.admin.banRanking}
                </Button>
              ),
            },
          ]}
        />
      </AdminSection>
    </div>
  )
}
