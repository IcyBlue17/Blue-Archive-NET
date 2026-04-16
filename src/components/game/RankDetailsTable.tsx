import { Table } from '@cloudflare/kumo/components/table'
import type { GenericGameSummary } from '../../lib/types'
import { useAppTexts } from '../../content/texts'

export function RankDetailsTable({ summary }: { summary: GenericGameSummary }) {
  const texts = useAppTexts()
  const levels = Object.entries(summary.detailedRanks).sort((a, b) => +b[0] - +a[0])
  const rankCols = summary.ranks ?? []

  return (
    <div className="overflow-x-auto">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head>{texts.gamesPage.level}</Table.Head>
            {rankCols.map((c) => (
              <Table.Head key={c.name}>{c.name}</Table.Head>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {levels.map(([level, row]) => (
            <Table.Row key={level}>
              <Table.Cell>{level}</Table.Cell>
              {rankCols.map((c) => (
                <Table.Cell key={c.name}>{row[c.name] ?? '—'}</Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}
