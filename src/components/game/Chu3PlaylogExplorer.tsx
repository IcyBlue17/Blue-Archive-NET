import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import { chartRating1, diffLabel1, fmtRate1, fmtScore1, fmtTime1, formatLv1, playTime1, rank1, recordKey1, score1 } from '../../lib/chu3PlaylogView'
import { imgCross1 } from '../../lib/imgSign'
import { musicJacketUrl } from '../../lib/musicCover'
import { getAppTexts } from '../../content/texts'
import type { MusicMetaLite } from '../../lib/scoring'
import type { GamePlayRecord } from '../../lib/types'

const PAGE_SIZE = 12

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
  const texts = getAppTexts(locale)
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
        { label: texts.playlogExplorer.judgeHeaven, value: row1.judgeHeaven },
        { label: texts.playlogExplorer.judgeCritical, value: row1.judgeCritical },
        { label: texts.playlogExplorer.justice, value: row1.judgeJustice },
        { label: texts.playlogExplorer.attack, value: row1.judgeAttack },
        { label: texts.playlogExplorer.missGuilty, value: row1.judgeGuilty },
      ]
    : []

  const rateRows1 = row1
    ? [
        { label: texts.playlogExplorer.tap, value: row1.rateTap },
        { label: texts.playlogExplorer.hold, value: row1.rateHold },
        { label: texts.playlogExplorer.slide, value: row1.rateSlide },
        { label: texts.playlogExplorer.air, value: row1.rateAir },
        { label: texts.playlogExplorer.flick, value: row1.rateFlick },
      ]
    : []

  const infoRows1 = row1
    ? [
        { label: texts.playlogExplorer.score, value: fmtScore1(scoreNow1) },
        { label: texts.playlogExplorer.rank, value: rankNow1 },
        { label: texts.playlogExplorer.chartRating, value: chartRt1 },
        { label: texts.playlogExplorer.ratingDelta, value: delta1 },
        { label: texts.playlogExplorer.time, value: fmtTime1(playTime1(row1), locale) },
        { label: texts.playlogExplorer.track, value: row1.track != null ? String(row1.track) : '—' },
      ]
    : []

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.32fr)_minmax(320px,0.88fr)]">
      <LayerCard className="min-w-0 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Text variant="heading3">{texts.playlogExplorer.title}</Text>
            <Input value={key1} onChange={(e) => setKey1(e.target.value)} placeholder={texts.playlogExplorer.searchPlaceholder} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" disabled={page1 <= 1} onClick={() => setPage1((x1) => Math.max(1, x1 - 1))}>
              {texts.common.previousPage}
            </Button>
            {pageNums1(page1, totalPage1).map((n1) => (
              <Button key={n1} size="sm" variant={n1 === page1 ? 'primary' : 'secondary'} onClick={() => setPage1(n1)}>
                {n1}
              </Button>
            ))}
            <Button size="sm" variant="secondary" disabled={page1 >= totalPage1} onClick={() => setPage1((x1) => Math.min(totalPage1, x1 + 1))}>
              {texts.common.nextPage}
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
                    <img src={cover2} crossOrigin={imgCross1(cover2)} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{meta1.name ?? texts.common.musicWithId(row1.musicId)}</div>
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
            <Text DANGEROUS_className="text-kumo-subtle py-6 text-center">{texts.playlogExplorer.noMatches}</Text>
          )}
        </div>
      </LayerCard>

      <LayerCard className="min-w-0 p-4 xl:self-start">
        {row1 ? (
          <>
            <div className="flex gap-3">
              <img src={cover1} crossOrigin={imgCross1(cover1)} alt="" width={88} height={88} className="h-[88px] w-[88px] shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="text-kumo-subtle text-xs">#{row1.musicId}</div>
                <Text variant="heading3" DANGEROUS_className="mt-1 break-words text-[1.35rem]">
                  {meta1?.name ?? texts.common.musicWithId(row1.musicId)}
                </Text>
                <Text DANGEROUS_className="text-kumo-subtle mt-1 text-sm">{meta1?.composer || texts.playlogExplorer.unknownComposer}</Text>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-kumo-fill px-2 py-1">{diffLabel1(row1.level, meta1)}</span>
                  <span className="rounded-full bg-kumo-fill px-2 py-1">Lv {formatLv1(meta1, row1.level)}</span>
                  <span className="rounded-full bg-kumo-fill px-2 py-1">{fmtTime1(playTime1(row1), locale)}</span>
                </div>
              </div>
            </div>

            <div className="border-kumo-border mt-4 overflow-hidden rounded-xl border">
              {infoRows1.map((item1) => (
                <div key={item1.label} className="border-kumo-border grid grid-cols-[92px_1fr] gap-3 border-b px-3 py-2 text-sm sm:grid-cols-[130px_1fr] last:border-b-0">
                  <div className="text-kumo-subtle">{item1.label}</div>
                  <div className="font-medium text-kumo-text">{item1.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {row1.isNewRecord ? <span className="rounded-full bg-pink-500/15 px-2 py-1 text-pink-700 dark:text-pink-300">{texts.playlogExplorer.newRecord}</span> : null}
              {row1.isAllJustice ? <span className="rounded-full bg-sky-500/15 px-2 py-1 text-sky-700 dark:text-sky-300">AJ</span> : null}
              {row1.isFullCombo ? <span className="rounded-full bg-kumo-accent/15 px-2 py-1 text-kumo-accent">FC</span> : null}
              {row1.isClear ? <span className="rounded-full bg-kumo-fill px-2 py-1">{texts.playlogExplorer.clear}</span> : null}
              {row1.isFreeToPlay ? <span className="rounded-full bg-kumo-fill px-2 py-1">{texts.playlogExplorer.freePlay}</span> : null}
              {row1.track != null ? <span className="rounded-full bg-kumo-fill px-2 py-1">{texts.playlogExplorer.trackBadge(row1.track)}</span> : null}
            </div>

            <div className="mt-5">
              <Text DANGEROUS_className="mb-2 text-sm font-medium">{texts.playlogExplorer.judgeCounts}</Text>
              <div className="border-kumo-border overflow-hidden rounded-xl border">
                {judgeRows1.map((item1) => (
                  <div key={item1.label} className="border-kumo-border grid grid-cols-[92px_1fr] gap-3 border-b px-3 py-2 text-sm sm:grid-cols-[130px_1fr] last:border-b-0">
                    <div className="text-kumo-subtle">{item1.label}</div>
                    <div className="font-medium text-kumo-text">{item1.value ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <Text DANGEROUS_className="mb-2 text-sm font-medium">{texts.playlogExplorer.laneRates}</Text>
              <div className="border-kumo-border overflow-hidden rounded-xl border">
                {rateRows1.map((item1) => (
                  <div key={item1.label} className="border-kumo-border grid grid-cols-[92px_1fr] gap-3 border-b px-3 py-2 text-sm sm:grid-cols-[130px_1fr] last:border-b-0">
                    <div className="text-kumo-subtle">{item1.label}</div>
                    <div className="font-medium text-kumo-text">{fmtRate1(item1.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <Text DANGEROUS_className="text-kumo-subtle">{texts.playlogExplorer.pickPlay}</Text>
        )}
      </LayerCard>
    </div>
  )
}
