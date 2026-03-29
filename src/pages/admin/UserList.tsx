import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table } from '@cloudflare/kumo/components/table'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import * as adminUsers from '../../api/admin/users'

export function AdminUserListPage() {
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
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }, [page, size])

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
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  const rows = searchHits ?? data?.content ?? []

  return (
    <div className="flex flex-col gap-4">
      <LayerCard className="p-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="搜索用户名或邮箱" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="secondary" onClick={search}>
            搜索
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setQ('')
              void load()
            }}
          >
            清除
          </Button>
        </div>
      </LayerCard>
      {err ? <Text DANGEROUS_className="text-kumo-danger">{err}</Text> : null}
      <div className="overflow-x-auto">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>ID</Table.Head>
              <Table.Head>用户名</Table.Head>
              <Table.Head>显示名</Table.Head>
              <Table.Head>邮箱</Table.Head>
              <Table.Head>卡片数</Table.Head>
              <Table.Head />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((u) => (
              <Table.Row key={u.id}>
                <Table.Cell>{u.id}</Table.Cell>
                <Table.Cell>{u.username}</Table.Cell>
                <Table.Cell>{u.displayName}</Table.Cell>
                <Table.Cell>{u.email}</Table.Cell>
                <Table.Cell>{u.cardCount}</Table.Cell>
                <Table.Cell>
                  <Button size="sm" variant="secondary" onClick={() => nav(`/admin/users/${u.id}`)}>
                    详情
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
      {data && !searchHits ? (
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            上一页
          </Button>
          <Text size="sm">
            {page + 1} / {data.totalPages || 1}（共 {data.totalElements}）
          </Text>
          <Button
            variant="secondary"
            disabled={page + 1 >= (data.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      ) : null}
    </div>
  )
}
