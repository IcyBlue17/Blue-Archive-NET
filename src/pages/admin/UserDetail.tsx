import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Text } from '@cloudflare/kumo/components/text'
import { Table } from '@cloudflare/kumo/components/table'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Checkbox } from '@cloudflare/kumo/components/checkbox'
import * as adminUsers from '../../api/admin/users'
import { useAppTexts } from '../../content/texts'

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
      <Button variant="secondary" onClick={() => nav('/admin/users')}>
        {texts.admin.backToList}
      </Button>
      {err ? <Text DANGEROUS_className="text-kumo-danger">{err}</Text> : null}
      <LayerCard className="p-4">
        <LayerCard.Secondary>{texts.admin.editUser(auId)}</LayerCard.Secondary>
        <div className="mt-4 grid max-w-xl gap-3">
          <label className="flex flex-col gap-1">
            <Text size="sm">{texts.admin.displayName}</Text>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text size="sm">{texts.admin.country}</Text>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text size="sm">{texts.admin.region}</Text>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text size="sm">{texts.admin.place}</Text>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text size="sm">{texts.admin.bio}</Text>
            <Input value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!user?.emailConfirmed}
              onCheckedChange={(c) => void toggleEmailConfirmed(c)}
            />
            <Text size="sm">{texts.admin.emailVerified}</Text>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!user?.optOutOfLeaderboard}
              onCheckedChange={(c) => void toggleOptOut(c)}
            />
            <Text size="sm">{texts.admin.rankingDisabled}</Text>
          </div>
          <Button onClick={save}>{texts.common.save}</Button>
          <Text DANGEROUS_className="text-kumo-subtle text-sm">{texts.admin.emailReadonly(user?.email)}</Text>
        </div>
      </LayerCard>
      <LayerCard className="p-4">
        <LayerCard.Secondary>{texts.admin.cards}</LayerCard.Secondary>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>ID</Table.Head>
              <Table.Head>LUID</Table.Head>
              <Table.Head>Ghost</Table.Head>
              <Table.Head>{texts.admin.rankingBanned}</Table.Head>
              <Table.Head />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {cards.map((c) => (
              <Table.Row key={c.id}>
                <Table.Cell>{c.id}</Table.Cell>
                <Table.Cell>{c.luid}</Table.Cell>
                <Table.Cell>{c.isGhost ? texts.common.yes : texts.common.no}</Table.Cell>
                <Table.Cell>{c.rankingBanned ? texts.common.yes : texts.common.no}</Table.Cell>
                <Table.Cell>
                  <Button
                    size="sm"
                    variant={c.rankingBanned ? 'secondary' : 'destructive'}
                    onClick={() => banCard(c.id, !c.rankingBanned)}
                  >
                    {c.rankingBanned ? texts.admin.unbanRanking : texts.admin.banRanking}
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
