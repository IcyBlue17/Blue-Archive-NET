import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import {
  chartRating,
  diffLabel,
  fmtRate,
  fmtScore,
  fmtTime,
  formatLv,
  playTime,
  rank,
  recordKey,
  score,
  type OngekiMusicMetaLite,
} from '../../lib/on9PlaylogView'
import { imgCross } from '../../lib/imgSign'
import { musicJacketUrl } from '../../lib/musicCover'
import { buildPageNumbers } from '../../lib/pagination'
import { getAppTexts } from '../../content/texts'
import type { GamePlayRecord } from '../../lib/types'

const PAGE_SIZE = 12

export function On9PlaylogExplorer({
  musicById,
  records,
  loading = false,
  error = null,
  locale = 'zh',
}: {
  musicById: Record<number, OngekiMusicMetaLite>
  records: GamePlayRecord[]
  loading?: boolean
  error?: string | null
  locale?: 'zh' | 'en'
}) {
  const texts = getAppTexts(locale)
  const t = texts.on9PlaylogExplorer
  const [key, setKey] = useState('')
  const [page, setPage] = useState(1)
  const [pickKey, setPickKey] = useState<string | null>(null)
  const keySlow = useDeferredValue(key.trim().toLowerCase())

  const rows = useMemo(() => {
    return [...records]
      .sort((a, b) => {
        const sortA = Number(a.sortNumber ?? 0)
        const sortB = Number(b.sortNumber ?? 0)
        if (sortA !== sortB) return sortB - sortA
        const timeA = playTime(a)
        const timeB = playTime(b)
        if (timeA !== timeB) return timeB.localeCompare(timeA)
        return 0
      })
      .map((row) => {
        const meta = musicById[row.musicId] ?? {}
        const search = `${row.musicId} ${meta.name ?? ''} ${meta.composer ?? ''} ${playTime(row)}`.toLowerCase()
        return { row, meta, key: recordKey(row), search }
      })
  }, [musicById, records])

  const filtered = useMemo(() => (!keySlow ? rows : rows.filter((one) => one.search.includes(keySlow))), [keySlow, rows])
  const totalPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const list = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const picked = filtered.find((one) => one.key === pickKey) ?? filtered[0] ?? null
  const prevRtMap = useMemo(() => {
    const map = new Map<string, number>()
    rows.forEach((one, idx) => {
      const older = rows[idx + 1]?.row
      map.set(one.key, older?.afterRating ?? older?.playerRating ?? one.row.afterRating)
    })
    return map
  }, [rows])

  useEffect(() => {
    setPage(1)
  }, [keySlow])

  useEffect(() => {
    if (page > totalPage) setPage(totalPage)
  }, [page, totalPage])

  useEffect(() => {
    if (!picked) {
      setPickKey(null)
      return
    }
    if (pickKey !== picked.key) setPickKey(picked.key)
  }, [pickKey, picked])

  const row = picked?.row ?? null
  const meta = picked?.meta ?? undefined
  const cover = row ? musicJacketUrl('ongeki', row.musicId) : ''
  const scoreNow = row ? score(row) : 0
  const chartRt = row ? chartRating(meta, row.level, row) : '—'
  const rankNow = row ? rank(scoreNow) : '—'
  const delta =
    row && picked && Number.isFinite(row.afterRating)
      ? ((row.afterRating - (prevRtMap.get(picked.key) ?? row.afterRating)) / 100).toFixed(2)
      : '—'

  const judgeRows = row
    ? [
        { label: t.criticalBreak, value: row.judgeCriticalBreak },
        { label: t.break, value: row.judgeBreak },
        { label: t.hit, value: row.judgeHit },
        { label: t.miss, value: row.judgeMiss },
      ]
    : []

  const bellRows = row
    ? [
        { label: t.bellCounts, value: `${row.bellCount ?? 0}/${row.totalBellCount ?? 0}` },
      ]
    : []

  const rateRows = row
    ? [
        { label: t.tap, value: row.rateTap },
        { label: t.hold, value: row.rateHold },
        { label: t.flick, value: row.rateFlick },
        { label: t.sideTap, value: row.rateSideTap },
        { label: t.sideHold, value: row.rateSideHold },
      ]
    : []

  const infoRows = row
    ? [
        { label: t.score, value: fmtScore(scoreNow) },
        { label: t.rank, value: rankNow },
        { label: t.chartRating, value: chartRt },
        { label: t.ratingDelta, value: delta },
        { label: t.battleScore, value: row.battleScore != null ? String(row.battleScore) : '—' },
        { label: t.platinumScore, value: row.platinumScore != null ? String(row.platinumScore) : '—' },
        { label: t.time, value: fmtTime(playTime(row), locale) },
      ]
    : []

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.32fr)_minmax(320px,0.88fr)]">
      <LayerCard className="min-w-0 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Text variant="heading3">{t.title}</Text>
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder={t.searchPlaceholder} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((x) => Math.max(1, x - 1))}>
              {texts.common.previousPage}
            </Button>
            {buildPageNumbers(page, totalPage).map((n) => (
              <Button key={n} size="sm" variant={n === page ? 'primary' : 'secondary'} onClick={() => setPage(n)}>
                {n}
              </Button>
            ))}
            <Button size="sm" variant="secondary" disabled={page >= totalPage} onClick={() => setPage((x) => Math.min(totalPage, x + 1))}>
              {texts.common.nextPage}
            </Button>
          </div>
        </div>

        {error ? <Text DANGEROUS_className="text-kumo-danger mt-4 text-sm">{error}</Text> : null}

        <div className="mt-4 flex flex-col gap-3">
          {loading && !records.length ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="aq-skeleton h-24 rounded-xl" />)
          ) : list.length ? (
            list.map(({ row, meta, key }) => {
              const cover = musicJacketUrl('ongeki', row.musicId)
              const scoreNow = score(row)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPickKey(key)}
                  className={`border-kumo-line rounded-xl border p-3 text-left transition-colors ${
                    key === picked?.key ? 'bg-kumo-fill' : 'bg-kumo-recessed hover:bg-kumo-tint'
                  }`}
                >
                  <div className="flex gap-3">
                    <img src={cover} crossOrigin={imgCross(cover)} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{meta.name ?? texts.common.musicWithId(row.musicId)}</div>
                      <div className="text-kumo-subtle mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        <span>{diffLabel(row.level)}</span>
                        <span>Lv {formatLv(meta, row.level)}</span>
                        <span>{fmtScore(scoreNow)}</span>
                        <span>{rank(scoreNow)}</span>
                      </div>
                      <div className="text-kumo-subtle mt-1 text-xs">{fmtTime(playTime(row), locale)}</div>
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <Text DANGEROUS_className="text-kumo-subtle py-6 text-center">{t.noMatches}</Text>
          )}
        </div>
      </LayerCard>

      <LayerCard className="min-w-0 p-4 xl:self-start">
        {row ? (
          <>
            <div className="flex gap-3">
              <img src={cover} crossOrigin={imgCross(cover)} alt="" width={88} height={88} className="h-[88px] w-[88px] shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="text-kumo-subtle text-xs">#{row.musicId}</div>
                <Text variant="heading3" DANGEROUS_className="mt-1 break-words text-[1.35rem]">
                  {meta?.name ?? texts.common.musicWithId(row.musicId)}
                </Text>
                <Text DANGEROUS_className="text-kumo-subtle mt-1 text-sm">{meta?.composer || t.unknownComposer}</Text>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-kumo-fill px-2 py-1">{diffLabel(row.level)}</span>
                  <span className="rounded-full bg-kumo-fill px-2 py-1">Lv {formatLv(meta, row.level)}</span>
                  <span className="rounded-full bg-kumo-fill px-2 py-1">{fmtTime(playTime(row), locale)}</span>
                </div>
              </div>
            </div>

            <div className="border-kumo-line mt-4 overflow-hidden rounded-xl border">
              {infoRows.map((item) => (
                <div key={item.label} className="border-kumo-line grid grid-cols-[92px_1fr] gap-3 border-b px-3 py-2 text-sm sm:grid-cols-[130px_1fr] last:border-b-0">
                  <div className="text-kumo-subtle">{item.label}</div>
                  <div className="font-medium text-kumo-default">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {row.isTechNewRecord ? <span className="rounded-full bg-pink-500/15 px-2 py-1 text-pink-700 dark:text-pink-300">{t.newRecord}</span> : null}
              {row.isAllPerfect ? <span className="rounded-full bg-sky-500/15 px-2 py-1 text-sky-700 dark:text-sky-300">AB</span> : null}
              {row.isFullCombo ? <span className="rounded-full bg-kumo-fill px-2 py-1 text-kumo-brand">FC</span> : null}
              {row.isFullBell ? <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-700 dark:text-amber-300">FB</span> : null}
              {(row.clearStatus ?? 0) > 0 ? <span className="rounded-full bg-kumo-fill px-2 py-1">{t.clear}</span> : null}
            </div>

            <div className="mt-5">
              <Text DANGEROUS_className="mb-2 text-sm font-medium">{t.judgeCounts}</Text>
              <div className="border-kumo-line overflow-hidden rounded-xl border">
                {judgeRows.map((item) => (
                  <div key={item.label} className="border-kumo-line grid grid-cols-[92px_1fr] gap-3 border-b px-3 py-2 text-sm sm:grid-cols-[130px_1fr] last:border-b-0">
                    <div className="text-kumo-subtle">{item.label}</div>
                    <div className="font-medium text-kumo-default">{item.value ?? '—'}</div>
                  </div>
                ))}
                {bellRows.map((item) => (
                  <div key={item.label} className="border-kumo-line grid grid-cols-[92px_1fr] gap-3 border-b px-3 py-2 text-sm sm:grid-cols-[130px_1fr] last:border-b-0">
                    <div className="text-kumo-subtle">{item.label}</div>
                    <div className="font-medium text-kumo-default">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <Text DANGEROUS_className="mb-2 text-sm font-medium">{t.laneRates}</Text>
              <div className="border-kumo-line overflow-hidden rounded-xl border">
                {rateRows.map((item) => (
                  <div key={item.label} className="border-kumo-line grid grid-cols-[92px_1fr] gap-3 border-b px-3 py-2 text-sm sm:grid-cols-[130px_1fr] last:border-b-0">
                    <div className="text-kumo-subtle">{item.label}</div>
                    <div className="font-medium text-kumo-default">{fmtRate(item.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <Text DANGEROUS_className="text-kumo-subtle">{t.pickPlay}</Text>
        )}
      </LayerCard>
    </div>
  )
}
