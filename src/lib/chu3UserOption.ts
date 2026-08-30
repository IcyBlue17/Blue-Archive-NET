import type { Chu3UserGameOption } from '@/lib/types'

export const CHU3_OPTION_SKIP_KEYS = new Set(['id', 'user'])

export type Chu3OptionControl = 'slider' | 'select' | 'switch' | 'number'

export type Chu3OptionGroupId = 'play' | 'display' | 'judge' | 'sound' | 'music' | 'extra'

export type Chu3OptionField = {
  key: string
  group: Chu3OptionGroupId
  control: Chu3OptionControl
  min?: number
  max?: number
  /** Named choices; index is the stored value. */
  choices?: string
}

export const CHU3_OPTION_FIELDS: Chu3OptionField[] = [
  { key: 'speed', group: 'play', control: 'slider', min: 0, max: 61 },
  { key: 'speed_120', group: 'play', control: 'slider', min: 0, max: 61 },
  { key: 'fieldWallPosition', group: 'play', control: 'slider', min: 0, max: 10 },
  { key: 'fieldWallPosition_120', group: 'play', control: 'slider', min: 0, max: 10 },
  { key: 'playTimingOffset', group: 'play', control: 'slider', min: 0, max: 40 },
  { key: 'playTimingOffset_120', group: 'play', control: 'slider', min: 0, max: 40 },
  { key: 'judgeTimingOffset', group: 'play', control: 'slider', min: 0, max: 40 },
  { key: 'judgeTimingOffset_120', group: 'play', control: 'slider', min: 0, max: 40 },
  { key: 'mirrorFumen', group: 'play', control: 'switch' },
  { key: 'hardJudge', group: 'play', control: 'switch' },
  { key: 'trackSkip', group: 'play', control: 'select', choices: 'trackSkip' },
  { key: 'matching', group: 'play', control: 'select', choices: 'matching' },

  { key: 'bgInfo', group: 'display', control: 'select', choices: 'bgInfo' },
  { key: 'fieldColor', group: 'display', control: 'select', choices: 'fieldColor' },
  { key: 'guideLine', group: 'display', control: 'select', choices: 'guideLine' },
  { key: 'judgePos', group: 'display', control: 'select', choices: 'judgePos' },
  { key: 'notesThickness', group: 'display', control: 'select', choices: 'notesThickness' },
  { key: 'categoryDetail', group: 'display', control: 'switch' },
  { key: 'rating', group: 'display', control: 'switch' },
  { key: 'playerLevel', group: 'display', control: 'switch' },
  { key: 'privacy', group: 'display', control: 'switch' },
  { key: 'resultVoiceShort', group: 'display', control: 'switch' },

  { key: 'judgeCritical', group: 'judge', control: 'select', choices: 'judgeDisplay' },
  { key: 'judgeJustice', group: 'judge', control: 'select', choices: 'judgeDisplay' },
  { key: 'judgeAttack', group: 'judge', control: 'select', choices: 'judgeDisplay' },

  { key: 'headphone', group: 'sound', control: 'slider', min: 0, max: 60 },
  { key: 'guideSound', group: 'sound', control: 'slider', min: 0, max: 11 },
  { key: 'soundEffect', group: 'sound', control: 'slider', min: 0, max: 11 },
  { key: 'successTap', group: 'sound', control: 'slider', min: 0, max: 11 },
  { key: 'successExTap', group: 'sound', control: 'slider', min: 0, max: 11 },
  { key: 'successSlideHold', group: 'sound', control: 'slider', min: 0, max: 11 },
  { key: 'successAir', group: 'sound', control: 'slider', min: 0, max: 11 },
  { key: 'successFlick', group: 'sound', control: 'slider', min: 0, max: 11 },
  { key: 'successSkill', group: 'sound', control: 'slider', min: 0, max: 11 },
  { key: 'successTapTimbre', group: 'sound', control: 'slider', min: 0, max: 10 },
  { key: 'judgeAppendSe', group: 'sound', control: 'select', choices: 'judgeAppendSe' },

  { key: 'optionSet', group: 'music', control: 'select', choices: 'optionSet' },
  { key: 'selectMusicFilterLv', group: 'music', control: 'number', min: 0, max: 1023 },
  { key: 'sortMusicFilterLv', group: 'music', control: 'select', choices: 'sortMusicFilterLv' },
  { key: 'sortMusicGenre', group: 'music', control: 'select', choices: 'sortMusicGenre' },

  { key: 'ext1', group: 'extra', control: 'number' },
  { key: 'ext2', group: 'extra', control: 'number' },
  { key: 'ext3', group: 'extra', control: 'number' },
  { key: 'ext4', group: 'extra', control: 'number' },
  { key: 'ext5', group: 'extra', control: 'number' },
  { key: 'ext6', group: 'extra', control: 'number' },
  { key: 'ext7', group: 'extra', control: 'number' },
  { key: 'ext8', group: 'extra', control: 'number' },
  { key: 'ext9', group: 'extra', control: 'number' },
  { key: 'ext10', group: 'extra', control: 'number' },
]

export const CHU3_OPTION_GROUP_ORDER: Chu3OptionGroupId[] = [
  'play',
  'display',
  'judge',
  'sound',
  'music',
  'extra',
]

export function chu3OptionInt(raw: unknown, fallback = 0): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw)
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw)
    if (Number.isFinite(n)) return Math.trunc(n)
  }
  return fallback
}

export function parseChu3UserOption(raw: unknown): Chu3UserGameOption | null {
  if (!raw || typeof raw !== 'object') return null
  const src = raw as Record<string, unknown>
  const out: Chu3UserGameOption = {}
  for (const [key, value] of Object.entries(src)) {
    if (CHU3_OPTION_SKIP_KEYS.has(key)) continue
    out[key] = chu3OptionInt(value)
  }
  return out
}

export function formatChu3Speed(value: number): string {
  if (value >= 61) return 'SONIC'
  if (value < 55) return (value / 4 + 1).toFixed(2)
  return String(value - 40)
}

export function formatChu3Offset(value: number): string {
  return ((value - 20) / 2).toFixed(1)
}

export function formatChu3Volume(value: number, max: number): string {
  if (max <= 0) return String(value)
  return `${Math.round((value / max) * 100)}%`
}

export function sliderMax(field: Chu3OptionField, current: number): number {
  const base = field.max ?? 0
  return Math.max(base, current)
}

export function sliderMin(field: Chu3OptionField, current: number): number {
  const base = field.min ?? 0
  return Math.min(base, current)
}
