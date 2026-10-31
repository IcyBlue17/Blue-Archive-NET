export type GameName = 'mai2' | 'chu3' | 'ongeki' | 'wacca'

export interface GameOption {
  key: string
  value: string | number | boolean | null
  type: string
  game: string
}

/** CHUNITHM `userGameOption` row returned by `/game/chu3/user-option`. */
export type Chu3UserGameOption = Record<string, number | string | null | undefined>

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

  // ONGEKI-specific playlog fields
  techScore?: number
  techScoreRank?: number
  battleScore?: number
  battleScoreRank?: number
  platinumScore?: number
  judgeMiss?: number
  judgeHit?: number
  judgeBreak?: number
  judgeCriticalBreak?: number
  rateSideTap?: number
  rateSideHold?: number
  bellCount?: number
  totalBellCount?: number
  damageCount?: number
  overDamage?: number
  isFullBell?: boolean
  isAllBreak?: boolean
  isTechNewRecord?: boolean
  isBattleNewRecord?: boolean
  isOverDamageNewRecord?: boolean
  clearStatus?: number
  eventName?: string
  battlePoint?: number

  // maimai DX-specific playlog fields
  deluxscore?: number
  maxDeluxscore?: number
  totalDeluxscore?: number
  syncStatus?: number
  comboStatus?: number
  tapCriticalPerfect?: number
  tapPerfect?: number
  tapGreat?: number
  tapGood?: number
  tapMiss?: number
  holdCriticalPerfect?: number
  holdPerfect?: number
  holdGreat?: number
  holdGood?: number
  holdMiss?: number
  touchCriticalPerfect?: number
  touchPerfect?: number
  touchGreat?: number
  touchGood?: number
  touchMiss?: number
  breakCriticalPerfect?: number
  breakPerfect?: number
  breakGreat?: number
  breakGood?: number
  breakMiss?: number
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

export interface OngekiUserMusicDetail {
  musicId: number
  level: number
  playCount: number
  techScoreMax: number
  techScoreRank: number
  battleScoreMax: number
  battleScoreRank: number
  platinumScoreMax: number
  maxComboCount: number
  maxOverKill: number
  maxTeamOverKill: number
  isFullBell?: boolean
  isFullCombo?: boolean
  isAllBreake?: boolean
  isLock?: boolean
  clearStatus?: number
  isStoryWatched?: boolean
  platinumScoreStar?: number
}

export interface Mai2UserMusicDetail {
  musicId: number
  level: number
  playCount: number
  achievement: number
  deluxscoreMax: number
  scoreRank: number
  comboStatus: number
  syncStatus: number
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

/** 中二的「喜爱」清单。乐曲存在玩家 misc 里，角色是 chusan_user_favorite 的行。 */
export interface Chu3FavoriteBox {
  music: number[]
  musicMax: number
  character: number[]
  characterMax: number
}

export type Chu3FavoriteKind = 1 | 3

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

export interface OngekiRivalEntry {
  rivalExtId: number
  userName: string
  playerRating: number
  highestRating: number
  level: number
  battlePoint: number
  bestBattlePoint: number
  cardId: number
  characterId: number
  nameplateId: number
  trophyId: number
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

// maimai DX circle (SDGB 1.70), mirroring the chu3 team suite.
// circleClass follows the in-game CircleClassID: 0 White, 1 Green, 2 Yellow, 3 Red,
// 4 Violet, 5 Bronze, 6 Silver, 7 Gold, 8 Rainbow.
export type Mai2CircleClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface Mai2CircleSummary {
  circleId: number
  circleName?: string
  circleRank?: number
  circlePoint?: number
  circleClass?: Mai2CircleClass
  myPoint?: number
  memberCount?: number
  leaderExtId?: number
  leaderName?: string
}

export interface Mai2CircleMember {
  extId: number
  userName: string
  playerRating: number
  highestRating: number
  iconId: number
  plateId: number
  titleId: number
  circlePoint: number
  lastPlayDate: string
  isLeader: boolean
}

export interface Mai2CircleDetail extends Mai2CircleSummary {
  leaderExtId?: number
  leaderName?: string
  isLeader?: boolean
  canManage?: boolean
  isMember?: boolean
  createdAt?: string
  updatedAt?: string
  members?: Mai2CircleMember[]
}

export interface Mai2CircleRankEntry {
  rank: number
  circleId: number
  circleName: string
  circleClass?: Mai2CircleClass
  leaderExtId?: number
  leaderName?: string
  circlePoint: number
  memberCount: number
}

export interface Mai2CircleJoinResult {
  status: 'pending'
  id: number
  circleId: number
  circleName: string
  createdAt: string
}

export interface Mai2CircleJoinIncoming {
  id: number
  circleId: number
  circleName: string
  applicantExtId: number
  applicantName: string
  applicantRating: number
  applicantIconId: number
  createdAt: string
}

export interface Mai2CircleJoinOutgoing {
  id: number
  circleId: number
  circleName: string
  leaderExtId: number
  leaderName: string
  createdAt: string
}

export interface Mai2CircleRequestBox {
  incoming: Mai2CircleJoinIncoming[]
  outgoing?: Mai2CircleJoinOutgoing | null
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

// 段位認定 dan id (userData.courseRank); 11 is unused by maimai DX.
export type Mai2CourseRankId = number

// 友人对战 class id (userData.classRank): 0 = B5 .. 25 = LEGEND.
export type Mai2ClassRankId = number

// maimai2_user_udemae counters, served by /api/v2/game/mai2/friend-battle.
export interface Mai2UserUdemae {
  rate: number
  maxRate: number
  classValue: number
  maxClassValue: number
  totalWinNum: number
  totalLoseNum: number
  maxWinNum: number
  maxLoseNum: number
  winNum: number
  loseNum: number
  npcTotalWinNum: number
  npcTotalLoseNum: number
  npcMaxWinNum: number
  npcMaxLoseNum: number
  npcWinNum: number
  npcLoseNum: number
}

export interface Mai2FriendBattle {
  classRank: Mai2ClassRankId
  udemae: Mai2UserUdemae
}

// maimai2_user_friend_season_ranking row, served by /api/v2/game/mai2/friend-season.
export interface Mai2FriendSeasonRanking {
  seasonId: number
  point: number
  rank: number
  rewardGet: boolean
  userName: string
  recordDate: string
}

// One row of udemaeSeason.json: a オトモダチ対戦 season + its reward table.
export interface Mai2UdemaeSeasonReward {
  kind: 'Point' | 'Ranking'
  param: number
  itemType: string
  itemId: number
}

export interface Mai2UdemaeSeason {
  id: number
  seasonNo: number
  name: string
  openEventId: number
  openEventName: string
  resultEventId: number
  resultEventName: string
  netOpenName: string
  rewards: Mai2UdemaeSeasonReward[]
}
