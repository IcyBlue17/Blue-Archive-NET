import { Table } from '@cloudflare/kumo/components/table'
import { Text } from '@cloudflare/kumo/components/text'
import type { GameName, GenericGamePlaylog } from '../../lib/types'
import { useAppTexts } from '../../content/texts'

function asPlaylog(r: unknown): Partial<GenericGamePlaylog> {
  return typeof r === 'object' && r !== null ? (r as Partial<GenericGamePlaylog>) : {}
}

export function PlaylogTable({
  rows,
  musicById,
  game,
}: {
  rows: unknown[]
  musicById?: Record<number, { name?: string | null }>
  game?: GameName
}) {
  const texts = useAppTexts()
  if (!rows?.length) return <Text DANGEROUS_className="text-kumo-subtle">{texts.gamesPage.noPlaylog}</Text>

  const wacca = game === 'wacca'
  const chuOgk = game === 'chu3' || game === 'ongeki'

  return (
    <div className="overflow-x-auto">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head>{texts.common.time}</Table.Head>
            <Table.Head>{texts.common.music}</Table.Head>
            <Table.Head>{texts.common.difficulty}</Table.Head>
            <Table.Head>{texts.common.achievement}</Table.Head>
            <Table.Head>Max combo</Table.Head>
            <Table.Head>Rating ±</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.slice(0, 50).map((raw, i) => {
            const r = asPlaylog(raw)
            const name =
              r.musicId != null && musicById?.[r.musicId]?.name
                ? String(musicById[r.musicId]!.name)
                : r.musicId != null
                  ? `#${r.musicId}`
                  : '—'
            const ach = r.achievement != null ? (r.achievement / 10000).toFixed(2) + '%' : '—'
            let br = r.beforeRating
            let ar = r.afterRating
            if (wacca && typeof br === 'number') br = br / 10
            if (wacca && typeof ar === 'number') ar = ar / 10
            if (chuOgk && typeof br === 'number') br = br / 100
            if (chuOgk && typeof ar === 'number') ar = ar / 100
            const delta =
              typeof br === 'number' && typeof ar === 'number'
                ? (ar - br).toFixed(wacca || chuOgk ? 2 : 0)
                : '—'
            return (
              <Table.Row key={`${r.musicId}-${r.playDate}-${i}`}>
                <Table.Cell className="text-kumo-subtle whitespace-nowrap text-xs">
                  {r.playDate ?? '—'}
                </Table.Cell>
                <Table.Cell className="max-w-[14rem] truncate text-sm">{name}</Table.Cell>
                <Table.Cell>{r.level ?? '—'}</Table.Cell>
                <Table.Cell>{ach}</Table.Cell>
                <Table.Cell>{r.maxCombo ?? '—'}</Table.Cell>
                <Table.Cell>{delta}</Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>
    </div>
  )
}
