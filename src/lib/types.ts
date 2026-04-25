export type GameName = 'mai2' | 'chu3' | 'ongeki' | 'wacca'

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

export interface MusicMetaNote {
  lv?: number | null
  designer?: string | null
  lv_id?: number | null
  notes?: number | null
  typeId?: number | null
  versionKey?: string | null
}

export interface MusicMeta {
  name?: string | null
  composer?: string | null
  artist?: string | null
  bpm?: number | string | null
  genre?: string | null
  ver?: string | number | null
  versionKey?: string | null
  netOpenVersionKey?: string | null
  notes?: MusicMetaNote[]
  worldsEndTag?: string
  worldsEndStars?: number
}

export type AllMusicMap = Record<string, MusicMeta>

export interface GenericGamePlaylog {
  musicId: number
  level: number
  playDate: string
  achievement: number
  maxCombo: number
  totalCombo?: number
  afterRating: number
  beforeRating: number
  isFullCombo?: boolean
  isAllPerfect?: boolean
  isAllJustice?: boolean
  worldsEndTag?: string
}

export interface GamePlayRecord extends GenericGamePlaylog {
  id?: number
  romVersion?: string | null
  orderId?: number
  sortNumber?: number
  userPlayDate?: string
  placeId?: number
  customId?: number
  score?: number
  rank?: number
  track?: number
  maxChain?: number
  playerRating?: number
  judgeGuilty?: number
  judgeAttack?: number
  judgeJustice?: number
  judgeCritical?: number
  judgeHeaven?: number
  rateTap?: number
  rateHold?: number
  rateSlide?: number
  rateAir?: number
  rateFlick?: number
  isNewRecord?: boolean
  isContinue?: boolean
  isFreeToPlay?: boolean
  isClear?: boolean
  skillId?: number
  skillLevel?: number
  skillEffect?: number
  characterId?: number
  charaIllustId?: number
  playKind?: number
  placeName?: string
  commonId?: number
  regionId?: number
  machineType?: number
  ticketId?: number
  fullChainKind?: number
}

export interface Chu3UserMusicDetail {
  musicId: number
  level: number
  playCount: number
  scoreMax: number
  missCount: number
  maxComboCount: number
  isFullCombo?: boolean
  isAllJustice?: boolean
  isSuccess?: number | boolean
  fullChain: number
  maxChain: number
  scoreRank: number
  isLock?: boolean
  theoryCount: number
  ext1: number
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
  stageId?: number
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
  stageId: number
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

export interface Chu3TeamSummary {
  teamId: number
  teamName?: string
  emblemId?: number
  teamRank?: number
  teamPoint?: number
  myPoint?: number
  memberCount?: number
  leaderExtId?: number
  leaderName?: string
}

export interface Chu3TeamMember {
  extId: number
  userName: string
  level: number
  playerRating: number
  highestRating: number
  characterId: number
  charaIllustId: number
  teamPoint: number
  lastPlayDate: string
  isLeader: boolean
}

export interface Chu3TeamDetail extends Chu3TeamSummary {
  leaderExtId?: number
  leaderName?: string
  isLeader?: boolean
  canManage?: boolean
  isMember?: boolean
  createdAt?: string
  updatedAt?: string
  members?: Chu3TeamMember[]
}

export interface Chu3TeamRankEntry {
  rank: number
  teamId: number
  teamName: string
  emblemId: number
  leaderExtId?: number
  leaderName?: string
  teamPoint: number
  memberCount: number
}

export interface Chu3TeamJoinResult {
  status: 'pending'
  id: number
  teamId: number
  teamName: string
  emblemId: number
  createdAt: string
}

export interface Chu3TeamJoinIncoming {
  id: number
  teamId: number
  teamName: string
  emblemId: number
  applicantExtId: number
  applicantName: string
  applicantLevel: number
  applicantRating: number
  applicantCharacterId: number
  createdAt: string
}

export interface Chu3TeamJoinOutgoing {
  id: number
  teamId: number
  teamName: string
  emblemId: number
  leaderExtId: number
  leaderName: string
  createdAt: string
}

export interface Chu3TeamRequestBox {
  incoming: Chu3TeamJoinIncoming[]
  outgoing?: Chu3TeamJoinOutgoing | null
}

export interface Chu3LxnsImportResult {
  playerName?: string | null
  friendCodeUsed?: number | null
  createdLocalProfile: boolean
  scoresFetched: number
  scoresInserted: number
  scoresUpdated: number
  scoresUnchanged: number
  recentsFetched: number
  recentsInserted: number
  recentsSkipped: number
  currentRating: number
  highestRating: number
  lastPlayDate?: string | null
  warnings: string[]
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

export interface ChusanMatchingOption {
  id: string
  ui: string
  guide: string
  matching: string
  reflector: string
}
