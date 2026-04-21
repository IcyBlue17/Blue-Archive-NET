import { useMemo } from 'react'
import { Text } from '@cloudflare/kumo/components/text'
import type { GameName, TrendEntry } from '../../lib/types'
import { useAppTexts } from '../../content/texts'

const TREND_DAYS = 60

function minDateStr() {
  const d = new Date()
  d.setDate(d.getDate() - TREND_DAYS)
  return d.toISOString().slice(0, 10)
}

function pickTrendPoints(trend: TrendEntry[]) {
  const min = minDateStr()
  const inWin = trend.filter((t) => t.date >= min)
  const withPlays = inWin.filter((t) => (t.plays ?? 0) > 0)
  const series = withPlays.length >= 2 ? withPlays : inWin
  return series.length >= 2 ? series : trend
}

function normRating(r: number, game: GameName) {
  if (game === 'wacca') return r / 10
  if (game === 'chu3' || game === 'ongeki') return r / 100
  return r
}

function fmtDateTick(iso: string) {
  const [, m, d] = iso.split('-')
  return m && d ? `${m}/${d}` : iso
}

function yAxisDecimals(game: GameName) {
  return game === 'wacca' || game === 'chu3' || game === 'ongeki' ? 2 : 0
}

export function TrendLineChart({ data, game }: { data: TrendEntry[]; game: GameName }) {
  const texts = useAppTexts()
  const pts = useMemo(() => pickTrendPoints(data), [data])

  const layout = useMemo(() => {
    if (pts.length < 2) return null

    const W = 640
    const H = 208
    const padL = 48
    const padR = 16
    const padT = 12
    const padB = 40
    const plotW = W - padL - padR
    const plotH = H - padT - padB

    const ys = pts.map((p) => normRating(p.rating, game))
    const yMin = Math.min(...ys)
    const yMax = Math.max(...ys)
    const ySpan = Math.max(yMax - yMin, 1e-6)
    const n = pts.length - 1
    const dec = yAxisDecimals(game)

    const pathD = pts
      .map((p, i) => {
        const x = padL + (i / n) * plotW
        const yNorm = (normRating(p.rating, game) - yMin) / ySpan
        const y = padT + (1 - yNorm) * plotH
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')

    const gridSteps = 4
    const horizontal: { y: number; label: string }[] = []
    for (let s = 0; s <= gridSteps; s++) {
      const t = s / gridSteps
      const val = yMin + (1 - t) * ySpan
      const y = padT + t * plotH
      horizontal.push({ y, label: val.toFixed(dec) })
    }

    const xTickIdx = Array.from(
      new Set([0, Math.floor(n / 2), n].filter((i) => i >= 0 && i <= n)),
    ).sort((a, b) => a - b)
    const xLabels = xTickIdx.map((i) => ({
      x: padL + (n === 0 ? 0 : (i / n) * plotW),
      label: fmtDateTick(pts[i].date),
    }))

    return { W, H, padL, padR, padT, padB, pathD, horizontal, xLabels }
  }, [pts, game])

  if (!layout) {
    return (
      <Text DANGEROUS_className="text-kumo-subtle">
        {texts.trendChart.insufficient(TREND_DAYS)}
      </Text>
    )
  }

  const { W, H, padL, padR, padT, padB, pathD, horizontal, xLabels } = layout

  return (
    <div className="w-full">
      <svg
        className="text-kumo-text w-full max-w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={texts.trendChart.ariaLabel}
      >
        <g className="text-kumo-border" opacity={0.35}>
          {horizontal.map((g, i) => (
            <line
              key={`h-${i}`}
              x1={padL}
              y1={g.y}
              x2={W - padR}
              y2={g.y}
              stroke="currentColor"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={H - padB}
          stroke="currentColor"
          className="text-kumo-border"
          strokeOpacity={0.55}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={padL}
          y1={H - padB}
          x2={W - padR}
          y2={H - padB}
          stroke="currentColor"
          className="text-kumo-border"
          strokeOpacity={0.55}
          vectorEffect="non-scaling-stroke"
        />
        {horizontal.map((g, i) => (
          <text
            key={`yl-${i}`}
            x={padL - 8}
            y={g.y}
            dominantBaseline="middle"
            textAnchor="end"
            className="fill-kumo-subtle"
            style={{ fontSize: 11 }}
          >
            {g.label}
          </text>
        ))}
        {xLabels.map((x) => (
          <text
            key={`xl-${x.label}-${x.x}`}
            x={x.x}
            y={H - 14}
            textAnchor="middle"
            className="fill-kumo-subtle"
            style={{ fontSize: 11 }}
          >
            {x.label}
          </text>
        ))}
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          className="text-kumo-accent"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="text-kumo-subtle mt-1 flex justify-between gap-4 text-xs">
        <span>{texts.trendChart.yAxis}</span>
        <span>{texts.trendChart.xAxis}</span>
      </div>
    </div>
  )
}
