import type { ReactNode } from 'react'
import { css } from '@emotion/react'

/**
 * 难度色沿用街机的配色：BASIC 绿、ADVANCED 橙、EXPERT 红、MASTER 紫、ULTIMA 黑红，
 * WORLD'S END 没有固定色，用彩虹渐变对应它花里胡哨的选曲框。
 */
const RAINBOW = 'linear-gradient(90deg, #f43f5e, #f59e0b, #22c55e, #38bdf8, #a855f7)'

const DIFF_BG: Record<number, string> = {
  0: '#16a34a',
  1: '#f59e0b',
  2: '#e11d48',
  3: '#9333ea',
  4: '#27272a',
  10: RAINBOW,
}

/** オンゲキ の 4 は ULTIMA ではなく LUNATIC——白抜きの紫。 */
const ON9_DIFF_BG: Record<number, string> = { ...DIFF_BG, 4: '#4c1d95' }

const badgeStyle = css`
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 0.75rem;
  line-height: 1.2;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
`

export function DifficultyBadge({
  level,
  game = 'chu3',
  children,
}: {
  level: number
  game?: 'chu3' | 'ongeki'
  children: ReactNode
}) {
  const bg = (game === 'ongeki' ? ON9_DIFF_BG : DIFF_BG)[level] ?? '#64748b'
  return (
    <span css={badgeStyle} style={{ background: bg }}>
      {children}
    </span>
  )
}

/** SSS 起金、S 段蓝、再往下紫。传进来的评级已经是 `SSS+` 这种展示形态。 */
function rankColor(rank: string, dark: boolean): string {
  const r = rank.trim().toUpperCase()
  if (r.startsWith('SSS')) return dark ? '#fbbf24' : '#d97706'
  if (r.startsWith('S')) return dark ? '#38bdf8' : '#0284c7'
  return dark ? '#c084fc' : '#9333ea'
}

const rankStyle = (rank: string) => css`
  font-weight: 600;
  color: ${rankColor(rank, false)};

  [data-mode='dark'] & {
    color: ${rankColor(rank, true)};
  }
`

export function RankText({ rank, className = '' }: { rank: string; className?: string }) {
  if (!rank || rank === '—') return <span className={className}>{rank || '—'}</span>
  return (
    <span css={rankStyle(rank)} className={className}>
      {rank}
    </span>
  )
}
