import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Table } from '@cloudflare/kumo/components/table'
import { Text } from '@cloudflare/kumo/components/text'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { Button } from '@cloudflare/kumo/components/button'
import { PageHeader } from '../../components/common/PageHeader'
import * as gameApi from '../../api/game'
import type { GameName, GenericRankingPlayer } from '../../lib/types'
import { formatDisplayRating } from '../../lib/gameRatingDisplay'
import { gameTitle } from '../../lib/gameTitles'
import { useI18n } from '../../lib/i18n'

const GAMES: GameName[] = ['chu3', 'mai2', 'ongeki', 'wacca']

export function RankingPage() {
  const { game: gameParam } = useParams<{ game?: string }>()
  const nav = useNavigate()
  const { t, locale } = useI18n()
  const loc = locale === 'en' ? 'en' : 'zh'
  const game = (GAMES.includes(gameParam as GameName) ? gameParam : 'chu3') as GameName
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<GenericRankingPlayer[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!gameParam) nav(`/ranking/${game}`, { replace: true })
  }, [game, gameParam, nav])

  useEffect(() => {
    setErr(null)
    void gameApi
      .ranking(game, page)
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Error'))
  }, [game, page])

  return (
    <div>
      <PageHeader title={t('ranking')} crumbs={[{ label: t('home'), href: '/home' }]} />
      <Tabs
        className="mb-6"
        variant="underline"
        tabs={GAMES.map((g) => ({ value: g, label: gameTitle(g, loc) }))}
        value={game}
        onValueChange={(v) => {
          setPage(0)
          nav(`/ranking/${v}`)
        }}
      />
      {err ? <Text DANGEROUS_className="text-kumo-danger">{err}</Text> : null}
      <div className="overflow-x-auto">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>#</Table.Head>
              <Table.Head>玩家</Table.Head>
              <Table.Head>Rating</Table.Head>
              <Table.Head>ACC</Table.Head>
              <Table.Head>FC</Table.Head>
              <Table.Head>AP</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((r) => (
              <Table.Row key={`${r.rank}-${r.username}`}>
                <Table.Cell>{r.rank}</Table.Cell>
                <Table.Cell>{r.name}</Table.Cell>
                <Table.Cell>{formatDisplayRating(r.rating, game)}</Table.Cell>
                <Table.Cell>{r.accuracy?.toFixed?.(2) ?? r.accuracy}</Table.Cell>
                <Table.Cell>{r.fullCombo}</Table.Cell>
                <Table.Cell>{r.allPerfect}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          上一页
        </Button>
        <Button variant="secondary" disabled={rows.length < 100} onClick={() => setPage((p) => p + 1)}>
          下一页
        </Button>
        <Text DANGEROUS_className="text-kumo-subtle self-center text-sm">Page {page}</Text>
      </div>
    </div>
  )
}
