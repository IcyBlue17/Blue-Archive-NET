import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Text } from '@cloudflare/kumo/components/text'
import { Table } from '@cloudflare/kumo/components/table'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Checkbox } from '@cloudflare/kumo/components/checkbox'
import * as adminUsers from '../../api/admin/users'

export function AdminUserDetailPage() {
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
      .catch((e) => setErr(e instanceof Error ? e.message : 'Error'))
    void adminUsers
      .listUserCards(auId)
      .then(setCards)
      .catch(() => setCards([]))
  }, [auId])

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
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  async function toggleEmailConfirmed(checked: boolean) {
    if (!user) return
    try {
      const u = await adminUsers.updateUser(auId, { emailConfirmed: checked })
      setUser(u)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  async function toggleOptOut(checked: boolean) {
    if (!user) return
    try {
      const u = await adminUsers.updateUser(auId, { optOutOfLeaderboard: checked })
      setUser(u)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  async function banCard(cardId: number, banned: boolean) {
    try {
      await adminUsers.updateCardBan(cardId, banned)
      setCards(await adminUsers.listUserCards(auId))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  if (!Number.isFinite(auId)) return <Text>无效用户</Text>

  return (
    <div className="flex flex-col gap-4">
      <Button variant="secondary" onClick={() => nav('/admin/users')}>
        返回列表
      </Button>
      {err ? <Text DANGEROUS_className="text-kumo-danger">{err}</Text> : null}
      <LayerCard className="p-4">
        <LayerCard.Secondary>编辑用户 #{auId}</LayerCard.Secondary>
        <div className="mt-4 grid max-w-xl gap-3">
          <label className="flex flex-col gap-1">
            <Text size="sm">显示名</Text>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text size="sm">国家 (≤3)</Text>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text size="sm">地区 (≤2)</Text>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text size="sm">位置</Text>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text size="sm">简介</Text>
            <Input value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!user?.emailConfirmed}
              onCheckedChange={(c) => void toggleEmailConfirmed(c)}
            />
            <Text size="sm">邮箱已验证</Text>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!user?.optOutOfLeaderboard}
              onCheckedChange={(c) => void toggleOptOut(c)}
            />
            <Text size="sm">不参与排行榜</Text>
          </div>
          <Button onClick={save}>保存</Button>
          <Text DANGEROUS_className="text-kumo-subtle text-sm">邮箱（只读）: {user?.email}</Text>
        </div>
      </LayerCard>
      <LayerCard className="p-4">
        <LayerCard.Secondary>卡片</LayerCard.Secondary>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>ID</Table.Head>
              <Table.Head>LUID</Table.Head>
              <Table.Head>Ghost</Table.Head>
              <Table.Head>排行封禁</Table.Head>
              <Table.Head />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {cards.map((c) => (
              <Table.Row key={c.id}>
                <Table.Cell>{c.id}</Table.Cell>
                <Table.Cell>{c.luid}</Table.Cell>
                <Table.Cell>{c.isGhost ? '是' : '否'}</Table.Cell>
                <Table.Cell>{c.rankingBanned ? '是' : '否'}</Table.Cell>
                <Table.Cell>
                  <Button
                    size="sm"
                    variant={c.rankingBanned ? 'secondary' : 'destructive'}
                    onClick={() => banCard(c.id, !c.rankingBanned)}
                  >
                    {c.rankingBanned ? '解除封禁' : '封禁排行'}
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </LayerCard>
    </div>
  )
}
