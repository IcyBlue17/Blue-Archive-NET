import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import * as gameApi from '@/api/game'
import type { Chu3TeamRankEntry, GameName, GenericRankingPlayer } from '@/lib/types'
import { formatDisplayRating } from '@/lib/gameRatingDisplay'
import { gameTitle } from '@/lib/gameTitles'
import { useI18n } from '@/lib/i18n'
import { useAppTexts } from '@/content/texts'
import { Button, Tabs } from 'antd'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import { Text } from '@/components/ui/Text'

const GAMES: GameName[] = ['chu3', 'mai2', 'ongeki', 'wacca']
const TABS = [...GAMES, 'team'] as const
type RankTab = (typeof TABS)[number]
const TEAM_LIMIT = 50

export function RankingPage() {
  const { game: gameParam } = useParams<{ game?: string }>()
  const nav = useNavigate()
  const { locale } = useI18n()
  const texts = useAppTexts()
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
        .catch((e) => setErr(e instanceof Error ? e.message : texts.common.error))
      return
    }

    void gameApi
      .ranking(tab, page)
      .then((list) => {
        setRows(list)
        setTeamRows([])
      })
      .catch((e) => setErr(e instanceof Error ? e.message : texts.common.error))
  }, [page, tab, texts.common.error])

  return (
    <div>
      <PageHeader title={texts.nav.ranking} crumbs={[{ label: texts.nav.home, href: '/home' }]} />
      <Tabs
        className="mb-6"
        items={TABS.map((one) => ({
          key: one,
          label: one === 'team' ? texts.nav.team : gameTitle(one, loc),
        }))}
        activeKey={tab}
        onChange={(v) => {
          setPage(0)
          nav(`/ranking/${v}`)
        }}
      />
      {err ? <Text className="text-app-danger">{err}</Text> : null}
      {tab === 'team' ? (
        <ResponsiveTable<Chu3TeamRankEntry>
          rowKey={(row) => row.teamId}
          dataSource={teamRows}
          columns={[
            { title: '#', dataIndex: 'rank', key: 'rank', width: 64, fixed: 'left' },
            {
              title: texts.gamesPage.team,
              key: 'teamName',
              render: (_, row) => row.teamName || texts.common.teamWithId(row.teamId),
            },
            { title: texts.common.id, dataIndex: 'teamId', key: 'teamId' },
            { title: texts.gamesPage.leader, key: 'leaderName', render: (_, row) => row.leaderName || '—' },
            { title: texts.gamesPage.members, dataIndex: 'memberCount', key: 'memberCount' },
            { title: 'EXP', key: 'teamPoint', render: (_, row) => row.teamPoint.toLocaleString() },
          ]}
        />
      ) : (
        <ResponsiveTable<GenericRankingPlayer>
          rowKey={(r) => `${r.rank}-${r.username}`}
          dataSource={rows}
          columns={[
            { title: '#', dataIndex: 'rank', key: 'rank', width: 64, fixed: 'left' },
            { title: texts.gamesPage.player, dataIndex: 'name', key: 'name' },
            { title: texts.common.rating, key: 'rating', render: (_, r) => formatDisplayRating(r.rating, tab) },
            { title: 'ACC', key: 'accuracy', render: (_, r) => r.accuracy?.toFixed?.(2) ?? r.accuracy },
            { title: 'FC', dataIndex: 'fullCombo', key: 'fullCombo' },
            { title: 'AP', dataIndex: 'allPerfect', key: 'allPerfect' },
          ]}
        />
      )}
      {tab === 'team' ? null : (
        <div className="mt-4 flex gap-2">
          <Button disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            {texts.gamesPage.previousPage}
          </Button>
          <Button disabled={rows.length < 100} onClick={() => setPage((p) => p + 1)}>
            {texts.gamesPage.nextPage}
          </Button>
          <Text className="text-app-subtle self-center text-sm">{texts.gamesPage.page(page)}</Text>
        </div>
      )}
    </div>
  )
}
