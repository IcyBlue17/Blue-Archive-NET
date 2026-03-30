import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Table } from '@cloudflare/kumo/components/table'
import { Text } from '@cloudflare/kumo/components/text'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { Button } from '@cloudflare/kumo/components/button'
import { PageHeader } from '../../components/common/PageHeader'
import * as gameApi from '../../api/game'
import type { Chu3TeamRankEntry, GameName, GenericRankingPlayer } from '../../lib/types'
import { formatDisplayRating } from '../../lib/gameRatingDisplay'
import { gameTitle } from '../../lib/gameTitles'
import { useI18n } from '../../lib/i18n'

const GAMES: GameName[] = ['chu3', 'mai2', 'ongeki', 'wacca']
const TABS = [...GAMES, 'team'] as const
type RankTab = (typeof TABS)[number]
const TEAM_LIMIT = 50

export function RankingPage() {
  const { game: gameParam } = useParams<{ game?: string }>()
  const nav = useNavigate()
  const { t, locale } = useI18n()
  const loc = locale === 'en' ? 'en' : 'zh'
  const tab = (TABS.includes(gameParam as RankTab) ? gameParam : 'chu3') as RankTab
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<GenericRankingPlayer[]>([])
  const [teamRows, setTeamRows] = useState<Chu3TeamRankEntry[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!gameParam) nav(`/ranking/${tab}`, { replace: true })
  }, [tab, gameParam, nav])

  useEffect(() => {
    setErr(null)
    if (tab === 'team') {
      void gameApi
        .chu3TeamRanking(TEAM_LIMIT)
        .then((list) => {
          setTeamRows(list)
          setRows([])
        })
        .catch((e) => setErr(e instanceof Error ? e.message : 'Error'))
      return
    }

    void gameApi
      .ranking(tab, page)
      .then((list) => {
        setRows(list)
        setTeamRows([])
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Error'))
  }, [tab, page])

  return (
    <div>
      <PageHeader title={t('ranking')} crumbs={[{ label: t('home'), href: '/home' }]} />
      <Tabs
        className="mb-6"
        variant="underline"
        tabs={TABS.map((one) => ({
          value: one,
          label: one === 'team' ? t('team') : gameTitle(one, loc),
        }))}
        value={tab}
        onValueChange={(v) => {
          setPage(0)
          nav(`/ranking/${v}`)
        }}
      />
      {err ? <Text DANGEROUS_className="text-kumo-danger">{err}</Text> : null}
      <div className="overflow-x-auto">
        <Table>
          {tab === 'team' ? (
            <>
              <Table.Header>
                <Table.Row>
                  <Table.Head>#</Table.Head>
                  <Table.Head>{locale === 'zh' ? '战队' : 'Team'}</Table.Head>
                  <Table.Head>ID</Table.Head>
                  <Table.Head>{locale === 'zh' ? '队长' : 'Leader'}</Table.Head>
                  <Table.Head>{locale === 'zh' ? '成员' : 'Members'}</Table.Head>
                  <Table.Head>EXP</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {teamRows.map((row) => (
                  <Table.Row key={row.teamId}>
                    <Table.Cell>{row.rank}</Table.Cell>
                    <Table.Cell>{row.teamName || `Team ${row.teamId}`}</Table.Cell>
                    <Table.Cell>{row.teamId}</Table.Cell>
                    <Table.Cell>{row.leaderName || '—'}</Table.Cell>
                    <Table.Cell>{row.memberCount}</Table.Cell>
                    <Table.Cell>{row.teamPoint.toLocaleString()}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </>
          ) : (
            <>
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
                    <Table.Cell>{formatDisplayRating(r.rating, tab)}</Table.Cell>
                    <Table.Cell>{r.accuracy?.toFixed?.(2) ?? r.accuracy}</Table.Cell>
                    <Table.Cell>{r.fullCombo}</Table.Cell>
                    <Table.Cell>{r.allPerfect}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </>
          )}
        </Table>
      </div>
      {tab === 'team' ? null : (
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            上一页
          </Button>
          <Button variant="secondary" disabled={rows.length < 100} onClick={() => setPage((p) => p + 1)}>
            下一页
          </Button>
          <Text DANGEROUS_className="text-kumo-subtle self-center text-sm">Page {page}</Text>
        </div>
      )}
    </div>
  )
}
