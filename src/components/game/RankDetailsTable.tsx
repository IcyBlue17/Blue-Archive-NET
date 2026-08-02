import { useMemo } from 'react'
import type { ColumnsType } from 'antd/es/table'
import type { GenericGameSummary } from '@/lib/types'
import { useAppTexts } from '@/content/texts'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'

type RankRow = { key: string; level: string } & Record<string, string | number>

export function RankDetailsTable({ summary }: { summary: GenericGameSummary }) {
  const texts = useAppTexts()
  const rankCols = useMemo(() => summary.ranks ?? [], [summary.ranks])

  const columns = useMemo<ColumnsType<RankRow>>(
    () => [
      // 等级列在窄屏横滚时钉住，不然滚两下就不知道在看哪一行了
      { title: texts.gamesPage.level, dataIndex: 'level', key: 'level', fixed: 'left', width: 72 },
      ...rankCols.map((c) => ({
        title: c.name,
        dataIndex: c.name,
        key: c.name,
        render: (v: unknown) => (v ?? '—') as React.ReactNode,
      })),
    ],
    [rankCols, texts.gamesPage.level],
  )

  const data = useMemo<RankRow[]>(
    () =>
      Object.entries(summary.detailedRanks)
        .sort((a, b) => +b[0] - +a[0])
        .map(([level, row]) => ({ key: level, level, ...row })),
    [summary.detailedRanks],
  )

  return <ResponsiveTable<RankRow> columns={columns} dataSource={data} />
}
