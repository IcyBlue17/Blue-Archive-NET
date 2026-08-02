import { musicJacketUrl } from '@/lib/musicCover'
import type { GameName } from '@/lib/types'

const multTable: Record<GameName, (number | string)[][]> = {
  mai2: [
    [100.5, 22.4, 'SSSp'],
    [100.0, 21.6, 'SSS'],
    [99.5, 21.1, 'SSp'],
    [99, 20.8, 'SS'],
    [98, 20.3, 'Sp'],
    [97, 20, 'S'],
    [94, 16.8, 'AAA'],
    [90, 15.2, 'AA'],
    [80, 13.6, 'A'],
    [75, 12, 'BBB'],
    [70, 11.2, 'BB'],
    [60, 9.6, 'B'],
    [50, 8, 'C'],
    [40, 6.4, 'D'],
    [30, 4.8, 'D'],
    [20, 3.2, 'D'],
    [10, 1.6, 'D'],
    [0, 0, 'D'],
  ],
  chu3: [
    [100.9, 215, 'SSS+'],
    [100.75, 200, 'SSS'],
    [100.0, 0, 'SS'],
    [97.5, 0, 'S'],
    [95.0, 0, 'AAA'],
    [92.5, 0, 'AA'],
    [90.0, 0, 'A'],
    [80.0, 0, 'BBB'],
    [70.0, 0, 'BB'],
    [60.0, 0, 'B'],
    [50.0, 0, 'C'],
    [0.0, 0, 'D'],
  ],
  // オンゲキ のランクは A の下がいきなり B——BBB/BB は存在しない。
  ongeki: [
    [100.75, 0, 'SSS+'],
    [100.0, 0, 'SSS'],
    [99.0, 0, 'SS'],
    [97.0, 0, 'S'],
    [94.0, 0, 'AAA'],
    [90.0, 0, 'AA'],
    [85.0, 0, 'A'],
    [80.0, 0, 'B'],
    [50.0, 0, 'C'],
    [0.0, 0, 'D'],
  ],
  wacca: [
    [100.0, 0, 'AP'],
    [98.0, 0, 'SSS'],
    [95.0, 0, 'SS'],
    [90.0, 0, 'S'],
    [85.0, 0, 'AAA'],
    [80.0, 0, 'AA'],
    [70.0, 0, 'A'],
    [60.0, 0, 'B'],
    [1.0, 0, 'C'],
    [0.0, 0, 'D'],
  ],
}

export function getMult(achievement: number, game: GameName) {
  const ach = achievement / 10000
  const mt = multTable[game]
  for (let i = 0; i < mt.length; i++) {
    if (ach >= (mt[i][0] as number)) return mt[i]
  }
  return [0, 0, 0]
}

export function roundFloor(achievement: number, game: GameName, digits = 2) {
  const mult = getMult(achievement, game)
  const ach = achievement / 10000
  const rounded = ach.toFixed(digits)
  if (
    getMult(+rounded * 10000, game)[2] === mult[2] &&
    rounded !== '101.0'
  )
    return rounded
  return (+rounded - Math.pow(10, -digits)).toFixed(digits)
}

export function chusanRating(lv: number, score: number) {
  lv *= 100
  if (score >= 1009000) return lv + 215
  if (score >= 1007500) return lv + 200 + (score - 1007500) / 100
  if (score >= 1005000) return lv + 150 + (score - 1005000) / 50
  if (score >= 1000000) return lv + 100 + (score - 1000000) / 100
  if (score >= 975000) return lv + (score - 975000) / 250
  if (score >= 925000) return lv - 300 + ((score - 925000) * 3) / 500
  if (score >= 900000) return lv - 500 + ((score - 900000) * 4) / 500
  if (score >= 800000) return (lv - 500) / 2 + ((score - 800000) * ((lv - 500) / 2)) / 100000
  return 0
}

/**
 * オンゲキ Re:Fresh の単曲レーティング。CHUNITHM の式とは別物なので使い回せない
 * （chusanRating は内部で lv を 100 倍して返すが、こちらは素の値を返す）。
 *
 * テクニカルスコアの区切りと加算値は線形補間：
 * 1,010,000 → +2.00 / 1,007,500 → +1.75 / 1,000,000 → +1.25 /
 * 990,000 → +0.75 / 970,000 → ±0 / 900,000 → -4.00 / 800,000 → -6.00。
 * 500,000〜800,000 は (定数-6) を頭打ちにした比例、500,000 以下は 0。
 */
const ON9_TS_CURVE: [score: number, bonus: number][] = [
  [1010000, 2.0],
  [1007500, 1.75],
  [1000000, 1.25],
  [990000, 0.75],
  [970000, 0],
  [900000, -4.0],
  [800000, -6.0],
]

export interface OngekiRatingFlags {
  /** オールブレイク。AB+ は判定材料が playlog に無いので AB 扱い。 */
  allBreak?: boolean
  /** MISS 0（フルコンボ）。 */
  fullCombo?: boolean
  fullBell?: boolean
}

function on9TechBonus(techScore: number): number {
  const top = ON9_TS_CURVE[0]
  if (techScore >= top[0]) return top[1]
  for (let i = 1; i < ON9_TS_CURVE.length; i++) {
    const [lo, loBonus] = ON9_TS_CURVE[i]
    if (techScore >= lo) {
      const [hi, hiBonus] = ON9_TS_CURVE[i - 1]
      return loBonus + ((techScore - lo) * (hiBonus - loBonus)) / (hi - lo)
    }
  }
  return ON9_TS_CURVE[ON9_TS_CURVE.length - 1][1]
}

export function ongekiRating(lv: number, techScore: number, flags: OngekiRatingFlags = {}): number {
  if (!Number.isFinite(lv) || lv <= 0 || !Number.isFinite(techScore)) return 0
  if (techScore <= 500000) return 0
  if (techScore <= 800000) {
    return Math.max(0, ((lv - 6) * (techScore - 500000)) / 300000)
  }

  let rating = lv + on9TechBonus(techScore)
  if (techScore >= 1007500) rating += 0.3
  else if (techScore >= 1000000) rating += 0.2
  else if (techScore >= 990000) rating += 0.1

  if (flags.allBreak) rating += 0.3
  else if (flags.fullCombo) rating += 0.1
  if (flags.fullBell) rating += 0.05

  return Math.max(0, rating)
}

export interface MusicMetaLite {
  name?: string | null
  composer?: string | null
  ver?: string | number | null
  versionKey?: string | null
  netOpenVersionKey?: string | null
  genre?: string | null
  worldsEndTag?: string | null
  worldsEndStars?: number | null
  notes?: {
    lv?: number | null
    typeId?: number | null
    versionKey?: string | null
  }[]
}

export interface ParsedComposition {
  name?: string | null
  musicId: number
  diffId: number
  score: number
  cutoff: number
  mult: number
  rank: string
  difficulty?: number | null
  img: string
  ratingChange?: string
}

export function parseComposition(
  item: string,
  allMusics: Record<string, MusicMetaLite>,
  game: GameName,
): ParsedComposition {
  const mapData = item.split(':').map(Number)
  if (game === 'mai2') mapData.splice(2, 1)
  const [musicId, diffId, score] = mapData
  const meta = allMusics[musicId]

  const tup = getMult(score, game)
  const cutoff = +tup[0]
  const mult = +tup[1]
  const rank = String(tup[2])

  const diff = meta?.notes?.[diffId === 10 ? 0 : diffId]?.lv ?? undefined

  function calcDxChange(): string | undefined {
    if (diff === undefined || diff === null) return undefined
    if (game === 'mai2')
      return Math.floor(diff * mult * (Math.min(100.5, score / 10000) / 100)).toFixed(0)
    if (game === 'chu3') return (Math.floor(chusanRating(diff, score)) / 100).toFixed(2)
    if (game === 'ongeki') return (Math.floor(ongekiRating(diff, score) * 100) / 100).toFixed(2)
    return undefined
  }

  return {
    name: meta?.name,
    musicId,
    diffId,
    score,
    cutoff,
    mult,
    rank,
    difficulty: diff,
    img: musicJacketUrl(game, musicId),
    ratingChange: calcDxChange(),
  }
}
