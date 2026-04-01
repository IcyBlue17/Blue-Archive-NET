import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import { chartRating1, diffLabel1, fmtRate1, fmtScore1, fmtTime1, formatLv1, playTime1, rank1, recordKey1, score1 } from '../../lib/chu3PlaylogView'
import { imgCross1 } from '../../lib/imgSign'
import { musicJacketUrl } from '../../lib/musicCover'
import type { MusicMetaLite } from '../../lib/scoring'
import type { GamePlayRecord } from '../../lib/types'

const PAGE_SIZE = 40

function pageNums1(page: number, total: number): number[] {
  const start1 = Math.max(1, page - 2)
  const end1 = Math.min(total, start1 + 4)
  const out1: number[] = []
  for (let i1 = start1; i1 <= end1; i1++) out1.push(i1)
  return out1
}

export function Chu3PlaylogExplorer({
  musicById,
  records,
  loading = false,
  error = null,
  locale = 'zh',
}: {
  musicById: Record<number, MusicMetaLite>
  records: GamePlayRecord[]
  loading?: boolean
  error?: string | null
  locale?: 'zh' | 'en'
}) {
  const [key1, setKey1] = useState('')
  const [page1, setPage1] = useState(1)
  const [pickKey1, setPickKey1] = useState<string | null>(null)
  const keySlow1 = useDeferredValue(key1.trim().toLowerCase())

  const rows1 = useMemo(() => {
    return [...records]
      .sort((a1, b1) => {
        const sortA1 = Number(a1.sortNumber ?? 0)
        const sortB1 = Number(b1.sortNumber ?? 0)
        if (sortA1 !== sortB1) return sortB1 - sortA1
        const timeA1 = playTime1(a1)
        const timeB1 = playTime1(b1)
        if (timeA1 !== timeB1) return timeB1.localeCompare(timeA1)
        return Number(b1.track ?? 0) - Number(a1.track ?? 0)
      })
      .map((row1) => {
        const meta1 = musicById[row1.musicId] ?? {}
        const search1 = `${row1.musicId} ${meta1.name ?? ''} ${meta1.composer ?? ''} ${playTime1(row1)}`.toLowerCase()
        return { row1, meta1, key1: recordKey1(row1), search1 }
      })
  }, [musicById, records])

  const filtered1 = useMemo(() => (!keySlow1 ? rows1 : rows1.filter((one1) => one1.search1.includes(keySlow1))), [keySlow1, rows1])
  const totalPage1 = Math.max(1, Math.ceil(filtered1.length / PAGE_SIZE))
  const list1 = filtered1.slice((page1 - 1) * PAGE_SIZE, page1 * PAGE_SIZE)
  const picked1 = filtered1.find((one1) => one1.key1 === pickKey1) ?? filtered1[0] ?? null
  const prevRtMap1 = useMemo(() => {
    const map1 = new Map<string, number>()
    rows1.forEach((one1, idx1) => {
      const older1 = rows1[idx1 + 1]?.row1
      map1.set(one1.key1, older1?.afterRating ?? older1?.playerRating ?? one1.row1.afterRating)
    })
    return map1
  }, [rows1])

  useEffect(() => {
    setPage1(1)
  }, [keySlow1])

  useEffect(() => {
    if (page1 > totalPage1) setPage1(totalPage1)
  }, [page1, totalPage1])

  useEffect(() => {
    if (!picked1) {
      setPickKey1(null)
      return
    }
    if (pickKey1 !== picked1.key1) setPickKey1(picked1.key1)
  }, [pickKey1, picked1])

  const row1 = picked1?.row1 ?? null
  const meta1 = picked1?.meta1 ?? undefined
  const cover1 = row1 ? musicJacketUrl('chu3', row1.musicId) : ''
  const scoreNow1 = row1 ? score1(row1) : 0
  const chartRt1 = row1 ? chartRating1(meta1, row1.level, row1) : '—'
  const rankNow1 = row1 ? rank1(scoreNow1) : '—'
  const delta1 =
    row1 && picked1 && Number.isFinite(row1.afterRating)
      ? ((row1.afterRating - (prevRtMap1.get(picked1.key1) ?? row1.afterRating)) / 100).toFixed(2)
      : '—'

  const judgeRows1 = row1
    ? [
        { label: 'Justice Heaven', value: row1.judgeHeaven },
        { label: 'Justice Critical', value: row1.judgeCritical },
        { label: 'Justice', value: row1.judgeJustice },
        { label: 'Attack', value: row1.judgeAttack },
        { label: locale === 'zh' ? 'Miss / Guilty' : 'Miss / Guilty', value: row1.judgeGuilty },
      ]
    : []

  const rateRows1 = row1
    ? [
        { label: 'Tap', value: row1.rateTap },
        { label: 'Hold', value: row1.rateHold },
        { label: 'Slide', value: row1.rateSlide },
        { label: 'Air', value: row1.rateAir },
        { label: 'Flick', value: row1.rateFlick },
      ]
    : []

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.95fr)]">
      <LayerCard className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Text variant="heading3">{locale === 'zh' ? '游玩记录' : 'Play history'}</Text>
            <Input value={key1} onChange={(e) => setKey1(e.target.value)} placeholder={locale === 'zh' ? '搜索歌曲 / 时间 / ID' : 'Search song / time / ID'} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" disabled={page1 <= 1} onClick={() => setPage1((x1) => Math.max(1, x1 - 1))}>
              {locale === 'zh' ? '上一页' : 'Prev'}
            </Button>
            {pageNums1(page1, totalPage1).map((n1) => (
              <Button key={n1} size="sm" variant={n1 === page1 ? 'primary' : 'secondary'} onClick={() => setPage1(n1)}>
                {n1}
              </Button>
            ))}
            <Button size="sm" variant="secondary" disabled={page1 >= totalPage1} onClick={() => setPage1((x1) => Math.min(totalPage1, x1 + 1))}>
              {locale === 'zh' ? '下一页' : 'Next'}
            </Button>
          </div>
        </div>

        {error ? <Text DANGEROUS_className="text-kumo-danger mt-4 text-sm">{error}</Text> : null}

        <div className="mt-4 flex flex-col gap-3">
          {loading && !records.length ? (
            Array.from({ length: 6 }).map((_, i1) => <div key={i1} className="aq-skeleton h-24 rounded-xl" />)
          ) : list1.length ? (
            list1.map(({ row1, meta1, key1 }) => {
              const cover2 = musicJacketUrl('chu3', row1.musicId)
              const scoreNow2 = score1(row1)
              return (
                <button
                  key={key1}
                  type="button"
                  onClick={() => setPickKey1(key1)}
                  className={`border-kumo-border rounded-xl border p-3 text-left transition-colors ${
                    key1 === picked1?.key1 ? 'bg-kumo-fill/70' : 'bg-kumo-surface-secondary/30 hover:bg-kumo-surface-secondary/60'
                  }`}
                >
                  <div className="flex gap-3">
                    <img src={cover2} crossOrigin={imgCross1(cover2)} alt="" width={64} height={64} loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{meta1.name ?? `Music ${row1.musicId}`}</div>
                      <div className="text-kumo-subtle mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        <span>{diffLabel1(row1.level, meta1)}</span>
                        <span>Lv {formatLv1(meta1, row1.level)}</span>
                        <span>{fmtScore1(scoreNow2)}</span>
                        <span>{rank1(scoreNow2)}</span>
                      </div>
                      <div className="text-kumo-subtle mt-1 text-xs">{fmtTime1(playTime1(row1), locale)}</div>
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <Text DANGEROUS_className="text-kumo-subtle py-6 text-center">{locale === 'zh' ? '没有匹配的记录。' : 'No records matched.'}</Text>
          )}
        </div>
      </LayerCard>

      <LayerCard className="p-4">
        {row1 ? (
          <>
            <div className="flex gap-4">
              <img src={cover1} crossOrigin={imgCross1(cover1)} alt="" width={120} height={120} className="h-[120px] w-[120px] shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="text-kumo-subtle text-xs">#{row1.musicId}</div>
                <Text variant="heading3" DANGEROUS_className="mt-1 break-words">
                  {meta1?.name ?? `Music ${row1.musicId}`}
                </Text>
                <Text DANGEROUS_className="text-kumo-subtle mt-1 text-sm">{meta1?.composer || (locale === 'zh' ? '未知作曲' : 'Unknown composer')}</Text>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-kumo-fill px-2 py-1">{diffLabel1(row1.level, meta1)}</span>
                  <span className="rounded-full bg-kumo-fill px-2 py-1">Lv {formatLv1(meta1, row1.level)}</span>
                  <span className="rounded-full bg-kumo-fill px-2 py-1">{fmtTime1(playTime1(row1), locale)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-kumo-surface-secondary/50 p-3">
                <div className="text-kumo-subtle text-xs">{locale === 'zh' ? '成绩 / 段位' : 'Score / Rank'}</div>
                <div className="mt-1 text-2xl font-semibold">{fmtScore1(scoreNow1)}</div>
                <div className="text-kumo-subtle mt-1 text-sm">{rankNow1}</div>
              </div>
              <div className="rounded-xl bg-kumo-surface-secondary/50 p-3">
                <div className="text-kumo-subtle text-xs">{locale === 'zh' ? '单曲 Rating' : 'Chart rating'}</div>
                <div className="mt-1 text-2xl font-semibold">{chartRt1}</div>
                <div className="text-kumo-subtle mt-1 text-sm">{locale === 'zh' ? `玩家 Rating 变化 ${delta1}` : `Player rating delta ${delta1}`}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {row1.isNewRecord ? <span className="rounded-full bg-pink-500/15 px-2 py-1 text-pink-700 dark:text-pink-300">New Record</span> : null}
              {row1.isAllJustice ? <span className="rounded-full bg-sky-500/15 px-2 py-1 text-sky-700 dark:text-sky-300">AJ</span> : null}
              {row1.isFullCombo ? <span className="rounded-full bg-kumo-accent/15 px-2 py-1 text-kumo-accent">FC</span> : null}
              {row1.isClear ? <span className="rounded-full bg-kumo-fill px-2 py-1">{locale === 'zh' ? '通关' : 'Clear'}</span> : null}
              {row1.isFreeToPlay ? <span className="rounded-full bg-kumo-fill px-2 py-1">{locale === 'zh' ? '免费曲' : 'Free play'}</span> : null}
              {row1.track != null ? <span className="rounded-full bg-kumo-fill px-2 py-1">{`Track ${row1.track}`}</span> : null}
            </div>

            <div className="mt-5">
              <Text DANGEROUS_className="mb-2 text-sm font-medium">{locale === 'zh' ? '判定统计' : 'Judge counts'}</Text>
              <div className="grid gap-3 sm:grid-cols-2">
                {judgeRows1.map((item1) => (
                  <div key={item1.label} className="rounded-xl bg-kumo-surface-secondary/50 p-3">
                    <div className="text-kumo-subtle text-xs">{item1.label}</div>
                    <div className="mt-1 text-lg font-semibold">{item1.value ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <Text DANGEROUS_className="mb-2 text-sm font-medium">{locale === 'zh' ? '各键型比率' : 'Lane rates'}</Text>
              <div className="grid gap-3 sm:grid-cols-2">
                {rateRows1.map((item1) => (
                  <div key={item1.label} className="rounded-xl bg-kumo-surface-secondary/50 p-3">
                    <div className="text-kumo-subtle text-xs">{item1.label}</div>
                    <div className="mt-1 text-lg font-semibold">{fmtRate1(item1.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <Text DANGEROUS_className="text-kumo-subtle">{locale === 'zh' ? '请选择左侧记录。' : 'Pick a play from the list.'}</Text>
        )}
      </LayerCard>
    </div>
  )
}
