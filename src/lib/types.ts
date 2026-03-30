export type GameName = 'mai2' | 'chu3' | 'ongeki' | 'wacca'

/** Backend `/api/v2/settings/get` item shape (SettingsApi.kt). */
export interface GameOption {
  key: string
  value: string | number | boolean | null
  type: string
  game: string
}

export interface AquaNetUser {
  auId?: number
  username: string
  displayName: string
  email?: string
  country: string
  region?: string
  regTime: number
  lastLogin?: number
  profileLocation?: string | null
  profileBio?: string | null
  profilePicture?: string | null
  optOutOfLeaderboard?: boolean
  emailConfirmed?: boolean
  ghostCard?: Card
  cards?: Card[]
  keychip?: string | null
}

export interface Card {
  id?: number
  extId?: number
  luid: string
  registerTime?: string
  accessTime?: string
  isGhost?: boolean
  rankingBanned?: boolean
}

export interface CardSummaryGame {
  name: string
  rating: number
  lastLogin: string
}

export interface CardSummary {
  mai2?: CardSummaryGame | null
  chu3?: CardSummaryGame | null
  ongeki?: CardSummaryGame | null
  wacca?: CardSummaryGame | null
  diva?: CardSummaryGame | null
}

export interface TrendEntry {
  date: string
  rating: number
  plays?: number
}

export interface GenericGamePlaylog {
  musicId: number
  level: number
  playDate: string
  achievement: number
  maxCombo: number
  totalCombo: number
  afterRating: number
  beforeRating: number
  isFullCombo?: boolean
  isAllPerfect?: boolean
  isAllJustice?: boolean
  worldsEndTag?: string
}

export interface RankCount {
  name: string
  count: number
}

export interface GenericGameSummary {
  name: string
  iconId?: number
  aquaUser?: AquaNetUser
  serverRank: number
  accuracy: number
  rating: number
  ratingHighest: number
  ranks: RankCount[]
  /** Level → rank name → count (JSON keys are strings). */
  detailedRanks: Record<string, Record<string, number>>
  maxCombo: number
  fullCombo: number
  allPerfect: number
  totalScore: number
  plays: number
  totalPlayTime: number
  joined: string
  lastSeen: string
  lastVersion: string
  ratingComposition?: Record<string, unknown>
  recent: GenericGamePlaylog[]
  rival?: boolean
  rivalExtId?: number | null
  favorites?: number[]
}

export interface Chu3RivalEntry {
  rivalExtId: number
  userName: string
  playerRating: number
  highestRating: number
  level: number
  teamId: number
  teamName: string
  characterId: number
  charaIllustId: number
  nameplateId: number
  frameId: number
  trophyId: number
  classEmblemBase: number
  classEmblemMedal: number
  avatarWear: number
  avatarHead: number
  avatarFace: number
  avatarSkin: number
  avatarItem: number
  avatarFront: number
  avatarBack: number
  isFavorite?: boolean
  addedAt: string
}

export interface GenericRankingPlayer {
  rank: number
  name: string
  rating: number
  lastSeen: string
  accuracy: number
  fullCombo: number
  allPerfect: number
  username: string
}

export interface AllNetClient {
  dns: string
  card: string
  keychip: string
  game: string
  version: string
  [key: string]: unknown
}

export interface TrCheckGood {
  ok?: boolean
  [key: string]: unknown
}

export interface TrStreamMessage {
  type?: string
  message?: string
  [key: string]: unknown
}

export interface UserBox {
  [key: string]: unknown
}

export interface UserItem {
  [key: string]: unknown
}

export interface ChusanMatchingOption {
  name: string
  ui: string
  guide: string
  matching: string
  reflector: string
  coop: string[]
}
