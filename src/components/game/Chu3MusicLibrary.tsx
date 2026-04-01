import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Checkbox } from '@cloudflare/kumo/components/checkbox'
import { Input } from '@cloudflare/kumo/components/input'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import { chartRating1, diffLabelByIdx1, fmtScore1, formatLv1, rank1 } from '../../lib/chu3PlaylogView'
import { imgCross1 } from '../../lib/imgSign'
import { musicJacketUrl } from '../../lib/musicCover'
import type { MusicMetaLite } from '../../lib/scoring'
import type { Chu3UserMusicDetail } from '../../lib/types'

const PAGE_SIZE = 36
const DIFF_IDS1 = [0, 1, 2, 3, 4, 10] as const

type SongRow1 = {
  musicId: number
  meta: MusicMetaLite
  bestMap1: Map<number, Chu3UserMusicDetail>
  playCount1: number
  search1: string
}

function pageNums1(page: number, total: number): number[] {
  const start1 = Math.max(1, page - 2)
  const end1 = Math.min(total, start1 + 4)
  const out1: number[] = []
  for (let i1 = start1; i1 <= end1; i1++) out1.push(i1)
  return out1
}

function showDiff1(meta: MusicMetaLite, bestMap1: Map<number, Chu3UserMusicDetail>, diffId: number) {
  if (diffId === 10) return !!meta.worldsEndTag || bestMap1.has(10)
  return meta.notes?.[diffId] != null || bestMap1.has(diffId)
}

export function Chu3MusicLibrary({
  musicById,
  detailRows,
  loading = false,
  error = null,
  locale = 'zh',
}: {
  musicById: Record<number, MusicMetaLite>
  detailRows: Chu3UserMusicDetail[]
  loading?: boolean
  error?: string | null
  locale?: 'zh' | 'en'
}) {
  const [key1, setKey1] = useState('')
  const [onlyPlayed1, setOnlyPlayed1] = useState(false)
  const [page1, setPage1] = useState(1)
  const [pickMusicId1, setPickMusicId1] = useState<number | null>(null)
  const keySlow1 = useDeferredValue(key1.trim().toLowerCase())

  const rows1 = useMemo(() => {
    const bestBySong1 = new Map<number, Map<number, Chu3UserMusicDetail>>()
    const countBySong1 = new Map<number, number>()

    for (const row1 of detailRows) {
      const musicId1 = Number(row1.musicId)
      if (!Number.isFinite(musicId1)) continue
      const diff1 = Math.max(0, Number(row1.level ?? 0))
      const scoreNow1 = Number(row1.scoreMax ?? 0)
      const bestMap1 = bestBySong1.get(musicId1) ?? new Map<number, Chu3UserMusicDetail>()
      const old1 = bestMap1.get(diff1)
      const oldScore1 = Number(old1?.scoreMax ?? -1)
      if (!old1 || scoreNow1 > oldScore1) bestMap1.set(diff1, row1)
      bestBySong1.set(musicId1, bestMap1)
      countBySong1.set(musicId1, (countBySong1.get(musicId1) ?? 0) + Number(row1.playCount ?? 0))
    }

    return Object.entries(musicById)
      .map(([id1, meta1]) => {
        const musicId1 = parseInt(id1, 10)
        const search1 = `${musicId1} ${meta1.name ?? ''} ${meta1.composer ?? ''} ${meta1.ver ?? ''}`.toLowerCase()
        return {
          musicId: musicId1,
          meta: meta1,
          bestMap1: bestBySong1.get(musicId1) ?? new Map<number, Chu3UserMusicDetail>(),
          playCount1: countBySong1.get(musicId1) ?? 0,
          search1,
        } satisfies SongRow1
      })
      .sort((a1, b1) => a1.musicId - b1.musicId)
  }, [detailRows, musicById])

  const filtered1 = useMemo(() => {
    return rows1.filter((row1) => {
      if (onlyPlayed1 && row1.playCount1 <= 0) return false
      if (!keySlow1) return true
      return row1.search1.includes(keySlow1)
    })
  }, [keySlow1, onlyPlayed1, rows1])

  const totalPage1 = Math.max(1, Math.ceil(filtered1.length / PAGE_SIZE))
  const list1 = filtered1.slice((page1 - 1) * PAGE_SIZE, page1 * PAGE_SIZE)
  const picked1 = filtered1.find((row1) => row1.musicId === pickMusicId1) ?? filtered1[0] ?? null
  const pickedDiffs1 = useMemo(() => {
    if (!picked1) return [] as number[]
    const diffSet1 = new Set<number>()
    ;(picked1.meta.notes ?? []).forEach((_, idx1) => diffSet1.add(idx1))
    picked1.bestMap1.forEach((_, level1) => diffSet1.add(level1))
    return [...diffSet1].sort((a1, b1) => {
      if (a1 === 10) return 1
      if (b1 === 10) return -1
      return a1 - b1
    })
  }, [picked1])

  useEffect(() => {
    setPage1(1)
  }, [keySlow1, onlyPlayed1])

  useEffect(() => {
    if (page1 > totalPage1) setPage1(totalPage1)
  }, [page1, totalPage1])

  useEffect(() => {
    if (!picked1) {
      setPickMusicId1(null)
      return
    }
    if (pickMusicId1 !== picked1.musicId) setPickMusicId1(picked1.musicId)
  }, [pickMusicId1, picked1])

  const pickCover1 = picked1 ? musicJacketUrl('chu3', picked1.musicId) : ''

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)]">
      <LayerCard className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Text variant="heading3">{locale === 'zh' ? '乐曲列表' : 'Song list'}</Text>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input value={key1} onChange={(e) => setKey1(e.target.value)} placeholder={locale === 'zh' ? '搜索歌曲 / 作曲 / ID' : 'Search song / composer / ID'} />
              <Checkbox controlFirst checked={onlyPlayed1} onCheckedChange={setOnlyPlayed1} label={locale === 'zh' ? '只看有记录' : 'Only played'} />
            </div>
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
          {loading && !detailRows.length ? (
            Array.from({ length: 6 }).map((_, i1) => <div key={i1} className="aq-skeleton h-24 rounded-xl" />)
          ) : list1.length ? (
            list1.map((row1) => {
              const cover1 = musicJacketUrl('chu3', row1.musicId)
              return (
                <button
                  key={row1.musicId}
                  type="button"
                  onClick={() => setPickMusicId1(row1.musicId)}
                  className={`border-kumo-border rounded-xl border p-3 text-left transition-colors ${
                    row1.musicId === picked1?.musicId ? 'bg-kumo-fill/70' : 'bg-kumo-surface-secondary/30 hover:bg-kumo-surface-secondary/60'
                  }`}
                >
                  <div className="flex gap-3">
                    <img src={cover1} crossOrigin={imgCross1(cover1)} alt="" width={72} height={72} loading="lazy" decoding="async" className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-kumo-subtle text-xs">#{row1.musicId}</span>
                        {row1.playCount1 > 0 ? <span className="rounded-full bg-kumo-accent/12 px-2 py-0.5 text-xs text-kumo-accent">{locale === 'zh' ? `${row1.playCount1} 次游玩` : `${row1.playCount1} plays`}</span> : null}
                      </div>
                      <div className="mt-1 truncate text-base font-semibold">{row1.meta.name ?? `Music ${row1.musicId}`}</div>
                      <div className="text-kumo-subtle mt-1 truncate text-sm">{row1.meta.composer || (locale === 'zh' ? '未知作曲' : 'Unknown composer')}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {DIFF_IDS1.filter((diffId1) => showDiff1(row1.meta, row1.bestMap1, diffId1)).map((idx1) => (
                          <span key={`${row1.musicId}-${idx1}`} className="rounded-full bg-kumo-background px-2 py-1 text-xs">
                            {diffLabelByIdx1(idx1, row1.meta)} {formatLv1(row1.meta, idx1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <Text DANGEROUS_className="text-kumo-subtle py-6 text-center">{locale === 'zh' ? '没有匹配的乐曲。' : 'No songs matched.'}</Text>
          )}
        </div>
      </LayerCard>

      <LayerCard className="p-4">
        {picked1 ? (
          <>
            <div className="flex gap-4">
              <img src={pickCover1} crossOrigin={imgCross1(pickCover1)} alt="" width={112} height={112} className="h-28 w-28 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="text-kumo-subtle text-xs">#{picked1.musicId}</div>
                <Text variant="heading3" DANGEROUS_className="mt-1 break-words">
                  {picked1.meta.name ?? `Music ${picked1.musicId}`}
                </Text>
                <Text DANGEROUS_className="text-kumo-subtle mt-2 text-sm">{picked1.meta.composer || (locale === 'zh' ? '未知作曲' : 'Unknown composer')}</Text>
                <Text DANGEROUS_className="text-kumo-subtle mt-1 text-sm">{picked1.meta.ver || '—'}</Text>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-kumo-fill px-2 py-1">{locale === 'zh' ? `总游玩 ${picked1.playCount1}` : `Plays ${picked1.playCount1}`}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {pickedDiffs1.map((idx1) => {
                const best1 = picked1.bestMap1.get(idx1)
                const scoreNow1 = Number(best1?.scoreMax ?? 0)
                const chartRt1 = best1 ? chartRating1(picked1.meta, idx1, { score: scoreNow1 }) : '—'
                return (
                  <div key={`${picked1.musicId}-${idx1}`} className="border-kumo-border rounded-xl border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{diffLabelByIdx1(idx1, picked1.meta)}</div>
                        <div className="text-kumo-subtle text-xs">Lv {formatLv1(picked1.meta, idx1)}</div>
                      </div>
                      {best1 ? (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {best1.isAllJustice ? <span className="rounded-full bg-sky-500/15 px-2 py-1 text-sky-700 dark:text-sky-300">AJ</span> : null}
                          {best1.isFullCombo ? <span className="rounded-full bg-kumo-accent/15 px-2 py-1 text-kumo-accent">FC</span> : null}
                        </div>
                      ) : null}
                    </div>
                    {best1 ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-kumo-surface-secondary/50 p-3">
                          <div className="text-kumo-subtle text-xs">{locale === 'zh' ? '最好成绩' : 'Best score'}</div>
                          <div className="mt-1 text-lg font-semibold">{fmtScore1(scoreNow1)}</div>
                          <div className="text-kumo-subtle mt-1 text-xs">{rank1(scoreNow1)}</div>
                        </div>
                        <div className="rounded-lg bg-kumo-surface-secondary/50 p-3">
                          <div className="text-kumo-subtle text-xs">{locale === 'zh' ? '单曲 Rating' : 'Chart rating'}</div>
                          <div className="mt-1 text-lg font-semibold">{chartRt1}</div>
                          <div className="text-kumo-subtle mt-1 text-xs">
                            {locale === 'zh' ? `游玩 ${best1.playCount ?? 0} 次 · Miss ${best1.missCount ?? 0}` : `${best1.playCount ?? 0} plays · Miss ${best1.missCount ?? 0}`}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Text DANGEROUS_className="text-kumo-subtle mt-3 text-sm">{locale === 'zh' ? '暂无记录' : 'No record'}</Text>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <Text DANGEROUS_className="text-kumo-subtle">{locale === 'zh' ? '请选择左侧乐曲。' : 'Pick a song from the list.'}</Text>
        )}
      </LayerCard>
    </div>
  )
}
