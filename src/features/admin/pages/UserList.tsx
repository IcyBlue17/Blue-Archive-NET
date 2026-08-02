import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as adminUsers from '@/features/admin/api/users'
import { useAppTexts } from '@/content/texts'
import { Button, Input } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import { Text } from '@/components/ui/Text'

export function AdminUserListPage() {
  const texts = useAppTexts()
  const nav = useNavigate()
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [data, setData] = useState<adminUsers.UserListResponse | null>(null)
  const [q, setQ] = useState('')
  const [searchHits, setSearchHits] = useState<adminUsers.AdminUserSummary[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    setSearchHits(null)
    try {
      const r = await adminUsers.listUsers(page, size, 'auId,desc')
      setData(r)
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }, [page, size, texts.common.error])

  useEffect(() => {
    void load()
  }, [load])

  async function search() {
    if (!q.trim()) return
    setErr(null)
    try {
      const r = await adminUsers.searchUsers(q.trim())
      setSearchHits(r)
      setData(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.error)
    }
  }

  const rows = searchHits ?? data?.content ?? []

  return (
    <div className="flex flex-col gap-4">
      <SectionCard>
        <div className="flex flex-wrap gap-2">
          <Input placeholder={texts.admin.userSearchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={search}>
            {texts.common.search}
          </Button>
          <Button
            type="text"
            onClick={() => {
              setQ('')
              void load()
            }}
          >
            {texts.common.clear}
          </Button>
        </div>
      </SectionCard>
      {err ? <Text className="text-app-danger">{err}</Text> : null}
      <div className="overflow-x-auto">
        <ResponsiveTable<adminUsers.AdminUserSummary>
          rowKey={(u) => u.id}
          dataSource={rows}
          columns={[
            { title: 'ID', dataIndex: 'id', key: 'id', width: 80, fixed: 'left' },
            { title: texts.common.player, dataIndex: 'username', key: 'username' },
            { title: texts.admin.displayName, dataIndex: 'displayName', key: 'displayName' },
            { title: texts.admin.email, dataIndex: 'email', key: 'email' },
            { title: texts.admin.cards, dataIndex: 'cardCount', key: 'cardCount' },
            {
              title: '',
              key: 'action',
              align: 'end',
              render: (_, u) => (
                <Button size="small" onClick={() => nav(`/admin/users/${u.id}`)}>
                  {texts.admin.detail}
                </Button>
              ),
            },
          ]}
        />
      </div>
      {data && !searchHits ? (
        <div className="flex items-center gap-2">
          <Button disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            {texts.common.previousPage}
          </Button>
          <Text className="text-sm">
            {texts.admin.totalPages(page + 1, data.totalPages || 1, data.totalElements)}
          </Text>
          <Button
            disabled={page + 1 >= (data.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            {texts.common.nextPage}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
