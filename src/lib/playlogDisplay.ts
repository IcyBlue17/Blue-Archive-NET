import type { GameName } from './types'
import type { MusicMetaLite } from './scoring'

/** 与后端 `chu3DiffLvMap` 一致，在缺少 `all-music` 谱面定数时的回退显示 */
const CHU3_CHART_CONSTANT: Record<number, string> = {
  0: '1.5',
  1: '5.0',
  2: '9.0',
  3: '12.0',
  4: '13.5',
}

const CHU3_DIFF_SHORT = ['BASIC', 'ADV', 'EXP', 'MAS', 'ULT']

/**
 * 最近成绩卡片上的难度文案：优先谱面定数，其次中二常量图、WE 标签、难度简写。
 */
export function formatPlaylogLevelLabel(
  game: GameName,
  level: number,
  notes: MusicMetaLite['notes'] | undefined,
  worldsEndTag?: string,
): string {
  const idx = level === 10 ? 0 : level
  const lv = notes?.[idx]?.lv
  if (lv != null && Number.isFinite(lv)) return lv.toFixed(1)
  if (worldsEndTag) return worldsEndTag
  if (game === 'chu3') {
    const key = level === 10 ? 0 : level
    const c = CHU3_CHART_CONSTANT[key]
    if (c) return c
    if (idx >= 0 && idx < CHU3_DIFF_SHORT.length) return CHU3_DIFF_SHORT[idx]
  }
  return '—'
}
