import type {
  Chu3FavoriteBox,
  Chu3FavoriteKind,
  Chu3RivalEntry,
  OngekiRivalEntry,
  Chu3TeamDetail,
  Chu3TeamJoinResult,
  Chu3LxnsImportResult,
  Chu3TeamRankEntry,
  Chu3TeamRequestBox,
  Chu3TeamSummary,
  Mai2CircleDetail,
  Mai2CircleJoinResult,
  Mai2CircleRankEntry,
  Mai2CircleRequestBox,
  Mai2CircleSummary,
  Chu3UserGameOption,
  Chu3UserMusicDetail,
  Mai2FriendBattle,
  Mai2FriendSeasonRanking,
  Mai2UserUdemae,
  GameName,
  GamePlayRecord,
  GenericGameSummary,
  GenericRankingPlayer,
  TrendEntry,
} from '@/lib/types'
import { userPost } from '@/api/client'

export async function trend(username: string, game: GameName) {
  return userPost(`/api/v2/game/${game}/trend`, { username }) as Promise<TrendEntry[]>
}

export async function userSummary(username: string, game: GameName) {
  return userPost(`/api/v2/game/${game}/user-summary`, { username }) as Promise<GenericGameSummary>
}

export async function ranking(game: GameName, page?: number) {
  const params: Record<string, string> = {}
  if (typeof page === 'number') params.page = String(page)
  return userPost(`/api/v2/game/${game}/ranking`, params) as Promise<GenericRankingPlayer[]>
}

export async function recent(username: string, game: GameName) {
  return userPost(`/api/v2/game/${game}/recent`, { username }) as Promise<GamePlayRecord[]>
}

export async function userMusicFromList<T = Chu3UserMusicDetail>(username: string, game: GameName, musicList: number[]) {
  return userPost(`/api/v2/game/${game}/user-music-from-list`, { username }, { json: musicList }) as Promise<T[]>
}

export async function changeName(game: GameName, newName: string) {
  return userPost(`/api/v2/game/${game}/change-name`, { newName }) as Promise<{ newName: string }>
}

export async function exportGame(game: GameName) {
  return userPost(`/api/v2/game/${game}/export`, {}) as Promise<Record<string, unknown>>
}

export async function importGame(game: GameName, data: unknown) {
  return userPost(`/api/v2/game/${game}/import`, {}, { json: data }) as Promise<Record<string, unknown>>
}

export async function importChu3Lxns(body: {
  lxnsToken: string
  friendCode?: string
  importRecent?: boolean
}) {
  return userPost('/api/v2/game/chu3/import-lxns', {}, { json: body }) as Promise<Chu3LxnsImportResult>
}

export async function importMusicDetail(game: GameName, data: unknown) {
  return userPost(`/api/v2/game/${game}/import-music-detail`, {}, { json: data }) as Promise<
    Record<string, unknown>
  >
}

export async function setRival(game: GameName, rivalUserName: string, isAdd: boolean) {
  return userPost(`/api/v2/game/${game}/set-rival`, {
    rivalUserName,
    isAdd: String(isAdd),
  })
}

export async function photos() {
  return userPost('/api/v2/game/mai2/my-photo', {}) as Promise<string[]>
}

export async function mai2UserBox() {
  return userPost('/api/v2/game/mai2/user-box', {}) as Promise<{
    user: unknown
    items: unknown[]
    characters?: number[]
    characterRows?: Array<{
      characterId: number
      level?: number
      awakening?: number
      useCount?: number
    }>
    intimateRows?: Array<{
      partnerId: number
      intimateLevel?: number
      intimateCountRewarded?: number
    }>
  }>
}

export async function userBox() {
  return userPost('/api/v2/game/chu3/user-box', {}) as Promise<{
    user: unknown
    items: unknown[]
    
    characters?: number[]
    characterRows?: Array<{
      characterId: number
      level: number
    }>
  }>
}

export async function ongekiUserBox() {
  return userPost('/api/v2/game/ongeki/user-box', {}) as Promise<{
    user: unknown
    items: unknown[]
    cards?: Array<{
      cardId: number
      level?: number
      maxLevel?: number
      exp?: number
      digitalStock?: number
      kaikaDate?: string
      choKaikaDate?: string
      skillId?: number
    }>
    characters?: number[]
    characterRows?: Array<{
      characterId: number
      intimateLevel?: number
      costumeId?: number
      attachmentId?: number
    }>
    decks?: Array<{
      deckId: number
      cardId1: number
      cardId2: number
      cardId3: number
    }>
  }>
}

export async function unlockOngekiCard(cardId: number) {
  return userPost('/api/v2/game/ongeki/user-card-unlock', {
    cardId: String(cardId),
  }) as Promise<{ cardId: number; isNewUnlock: boolean }>
}

export async function unlockOngekiCharacter(characterId: number) {
  return userPost('/api/v2/game/ongeki/user-character-unlock', {
    characterId: String(characterId),
  }) as Promise<{ characterId: number; isNewUnlock: boolean }>
}

export async function setOngekiIntimate(characterId: number, intimateLevel: number) {
  return userPost('/api/v2/game/ongeki/user-character-intimate-set', {
    characterId: String(characterId),
    intimateLevel: String(intimateLevel),
  }) as Promise<{ characterId: number; intimateLevel: number }>
}

export async function setOngekiCardTraining(params: {
  cardId: number
  level: number
  maxLevel: number
  exp: number
  digitalStock: number
  skillId: number
  kaika: 0 | 1
  choKaika: 0 | 1
}) {
  return userPost('/api/v2/game/ongeki/user-card-training-set', {
    cardId: String(params.cardId),
    level: String(params.level),
    maxLevel: String(params.maxLevel),
    exp: String(params.exp),
    digitalStock: String(params.digitalStock),
    skillId: String(params.skillId),
    kaika: String(params.kaika),
    choKaika: String(params.choKaika),
  }) as Promise<{
    cardId: number
    level: number
    maxLevel: number
    exp: number
    digitalStock: number
    skillId: number
    kaikaDate: string
    choKaikaDate: string
  }>
}

export async function setOngekiOutfit(characterId: number, costumeId: number, attachmentId: number) {
  return userPost('/api/v2/game/ongeki/user-character-outfit-set', {
    characterId: String(characterId),
    costumeId: String(costumeId),
    attachmentId: String(attachmentId),
  }) as Promise<{ characterId: number; costumeId: number; attachmentId: number }>
}

export async function ongekiUserProgress() {
  return userPost('/api/v2/game/ongeki/user-progress', {}) as Promise<{
    chapters: Array<{ chapterId: number; jewelCount: number; isStoryWatched: number; isClear: number }>
    stories: Array<{ storyId: number; lastChapterId: number; jewelCount: number }>
    memoryChapters: Array<{
      chapterId: number
      jewelCount: number
      isDialogWatched: number
      isStoryWatched: number
      isBossWatched: number
      isClear: number
      isEndingWatched: number
      gaugeId: number
      gaugeNum: number
    }>
  }>
}

export async function setOngekiChapter(params: {
  chapterId: number
  jewelCount: number
  isStoryWatched: 0 | 1
  isClear: 0 | 1
}) {
  return userPost('/api/v2/game/ongeki/user-chapter-set', {
    chapterId: String(params.chapterId),
    jewelCount: String(params.jewelCount),
    isStoryWatched: String(params.isStoryWatched),
    isClear: String(params.isClear),
  }) as Promise<{ chapterId: number; jewelCount: number; isStoryWatched: number; isClear: number }>
}

export async function setOngekiStory(params: { storyId: number; lastChapterId: number; jewelCount: number }) {
  return userPost('/api/v2/game/ongeki/user-story-set', {
    storyId: String(params.storyId),
    lastChapterId: String(params.lastChapterId),
    jewelCount: String(params.jewelCount),
  }) as Promise<{ storyId: number; lastChapterId: number; jewelCount: number }>
}

export async function setOngekiMemoryChapter(params: {
  chapterId: number
  jewelCount: number
  isDialogWatched: 0 | 1
  isStoryWatched: 0 | 1
  isBossWatched: 0 | 1
  isClear: 0 | 1
  isEndingWatched: 0 | 1
  gaugeId: number
  gaugeNum: number
}) {
  return userPost('/api/v2/game/ongeki/user-memory-chapter-set', {
    chapterId: String(params.chapterId),
    jewelCount: String(params.jewelCount),
    isDialogWatched: String(params.isDialogWatched),
    isStoryWatched: String(params.isStoryWatched),
    isBossWatched: String(params.isBossWatched),
    isClear: String(params.isClear),
    isEndingWatched: String(params.isEndingWatched),
    gaugeId: String(params.gaugeId),
    gaugeNum: String(params.gaugeNum),
  }) as Promise<{
    chapterId: number
    jewelCount: number
    isDialogWatched: number
    isStoryWatched: number
    isBossWatched: number
    isClear: number
    isEndingWatched: number
    gaugeId: number
    gaugeNum: number
  }>
}

export async function setOngekiDeck(deckId: number, cardId1: number, cardId2: number, cardId3: number) {
  return userPost('/api/v2/game/ongeki/user-deck-set', {
    deckId: String(deckId),
    cardId1: String(cardId1),
    cardId2: String(cardId2),
    cardId3: String(cardId3),
  }) as Promise<{ deckId: number; cardId1: number; cardId2: number; cardId3: number }>
}

export async function unlockChu3Character(characterId: number, level: number) {
  return userPost('/api/v2/game/chu3/user-character-unlock', {
    characterId: String(characterId),
    level: String(level),
  }) as Promise<{ characterId: number; level: number; isNewUnlock: boolean }>
}

export async function chu3UserDetail(username: string) {
  return userPost('/api/v2/game/chu3/user-detail', { username })
}

export async function userOption(game: GameName) {
  return userPost(`/api/v2/game/${game}/user-option`, {}) as Promise<Chu3UserGameOption | null>
}

export async function userOptionSet(game: GameName, field: string, value: number) {
  return userPost(`/api/v2/game/${game}/user-option-set`, {
    field,
    value: String(value),
  })
}

export async function chu3RivalList() {
  return userPost('/api/v2/game/chu3/rival/list', {}) as Promise<Chu3RivalEntry[]>
}

export async function chu3RivalAdd(username: string) {
  return userPost('/api/v2/game/chu3/rival/add', { username }) as Promise<Chu3RivalEntry>
}

export async function chu3RivalRemove(rivalExtId: number) {
  return userPost('/api/v2/game/chu3/rival/remove', {
    rivalExtId: String(rivalExtId),
  }) as Promise<void>
}

export async function chu3RivalFavoriteAdd(rivalExtId: number) {
  return userPost('/api/v2/game/chu3/rival/favorite-add', {
    rivalExtId: String(rivalExtId),
  }) as Promise<Chu3RivalEntry>
}

export async function chu3RivalFavoriteRemove(rivalExtId: number) {
  return userPost('/api/v2/game/chu3/rival/favorite-remove', {
    rivalExtId: String(rivalExtId),
  }) as Promise<void>
}

export async function chu3FavoriteList() {
  return userPost('/api/v2/game/chu3/favorite/list', {}) as Promise<Chu3FavoriteBox>
}

export async function chu3FavoriteAdd(kind: Chu3FavoriteKind, id: number) {
  return userPost('/api/v2/game/chu3/favorite/add', {
    kind: String(kind),
    id: String(id),
  }) as Promise<Chu3FavoriteBox>
}

export async function chu3FavoriteRemove(kind: Chu3FavoriteKind, id: number) {
  return userPost('/api/v2/game/chu3/favorite/remove', {
    kind: String(kind),
    id: String(id),
  }) as Promise<Chu3FavoriteBox>
}

export async function ongekiRivalList() {
  return userPost('/api/v2/game/ongeki/rival/list', {}) as Promise<OngekiRivalEntry[]>
}

export async function ongekiRivalAdd(username: string) {
  return userPost('/api/v2/game/ongeki/rival/add', { username }) as Promise<OngekiRivalEntry>
}

export async function ongekiRivalRemove(rivalExtId: number) {
  return userPost('/api/v2/game/ongeki/rival/remove', {
    rivalExtId: String(rivalExtId),
  }) as Promise<void>
}

export async function chu3Team() {
  return userPost('/api/v2/game/chu3/team', {}) as Promise<Chu3TeamSummary>
}

export async function chu3TeamDetail(teamId?: number) {
  return userPost('/api/v2/game/chu3/team-detail', teamId ? { teamId: String(teamId) } : {}) as Promise<Chu3TeamDetail>
}

export async function chu3TeamCreate(teamName: string, emblemId: number) {
  return userPost('/api/v2/game/chu3/team-create', {
    teamName,
    emblemId: String(emblemId),
  }) as Promise<Chu3TeamDetail>
}

export async function chu3TeamJoin(teamId: number) {
  return userPost('/api/v2/game/chu3/team-join', {
    teamId: String(teamId),
  }) as Promise<Chu3TeamJoinResult>
}

export async function chu3TeamUpdate(teamName: string, emblemId: number) {
  return userPost('/api/v2/game/chu3/team-update', {
    teamName,
    emblemId: String(emblemId),
  }) as Promise<Chu3TeamDetail>
}

export async function chu3TeamLeave() {
  return userPost('/api/v2/game/chu3/team-leave', {}) as Promise<{ status: string }>
}

export async function chu3TeamDisband() {
  return userPost('/api/v2/game/chu3/team-disband', {}) as Promise<{ status: string }>
}

export async function chu3TeamSet(teamId: number, teamName: string, emblemId: number) {
  return userPost('/api/v2/game/chu3/team-set', {
    teamId: String(teamId),
    teamName,
    emblemId: String(emblemId),
  }) as Promise<Chu3TeamSummary>
}

export async function chu3TeamRanking(limit = 10) {
  return userPost('/api/v2/game/chu3/team-ranking', {
    limit: String(limit),
  }) as Promise<Chu3TeamRankEntry[]>
}

export async function chu3TeamRequests() {
  return userPost('/api/v2/game/chu3/team-requests', {}) as Promise<Chu3TeamRequestBox>
}

export async function chu3TeamRequestCancel() {
  return userPost('/api/v2/game/chu3/team-request-cancel', {}) as Promise<{ status: string }>
}

export async function chu3TeamRequestApprove(id: number) {
  return userPost('/api/v2/game/chu3/team-request-approve', {
    requestId: String(id),
  }) as Promise<Chu3TeamDetail>
}

export async function chu3TeamRequestReject(id: number) {
  return userPost('/api/v2/game/chu3/team-request-reject', {
    requestId: String(id),
  }) as Promise<{ status: string }>
}

export async function mai2Circle() {
  return userPost('/api/v2/game/mai2/circle', {}) as Promise<Mai2CircleSummary>
}

export async function mai2CircleDetail(circleId?: number) {
  return userPost('/api/v2/game/mai2/circle-detail', circleId ? { circleId: String(circleId) } : {}) as Promise<Mai2CircleDetail>
}

export async function mai2CircleCreate(circleName: string) {
  return userPost('/api/v2/game/mai2/circle-create', {
    circleName,
  }) as Promise<Mai2CircleDetail>
}

export async function mai2CircleJoin(circleId: number) {
  return userPost('/api/v2/game/mai2/circle-join', {
    circleId: String(circleId),
  }) as Promise<Mai2CircleJoinResult>
}

export async function mai2CircleUpdate(circleName: string) {
  return userPost('/api/v2/game/mai2/circle-update', {
    circleName,
  }) as Promise<Mai2CircleDetail>
}

// Pins the circle class (0..8) or restores the automatic computation with null/-1.
export async function mai2CircleClassSet(circleClass: number | null) {
  return userPost('/api/v2/game/mai2/circle-class-set', {
    circleClass: String(circleClass ?? -1),
  }) as Promise<Mai2CircleDetail>
}

export async function mai2CircleLeave() {
  return userPost('/api/v2/game/mai2/circle-leave', {}) as Promise<{ status: string }>
}

export async function mai2CircleDisband() {
  return userPost('/api/v2/game/mai2/circle-disband', {}) as Promise<{ status: string }>
}

export async function mai2CircleRanking(limit = 10) {
  return userPost('/api/v2/game/mai2/circle-ranking', {
    limit: String(limit),
  }) as Promise<Mai2CircleRankEntry[]>
}

export async function mai2CircleRequests() {
  return userPost('/api/v2/game/mai2/circle-requests', {}) as Promise<Mai2CircleRequestBox>
}

export async function mai2CircleRequestCancel() {
  return userPost('/api/v2/game/mai2/circle-request-cancel', {}) as Promise<{ status: string }>
}

export async function mai2CircleRequestApprove(id: number) {
  return userPost('/api/v2/game/mai2/circle-request-approve', {
    requestId: String(id),
  }) as Promise<Mai2CircleDetail>
}

export async function mai2CircleRequestReject(id: number) {
  return userPost('/api/v2/game/mai2/circle-request-reject', {
    requestId: String(id),
  }) as Promise<{ status: string }>
}

export async function mai2UserDetail(username: string) {
  return userPost('/api/v2/game/mai2/user-detail', { username }) as Promise<{
    classRank?: number
    courseRank?: number
    playerRating?: number
    [key: string]: unknown
  }>
}

export async function mai2FriendBattle() {
  return userPost('/api/v2/game/mai2/friend-battle', {}) as Promise<Mai2FriendBattle>
}

// The backend keeps classRank and udemae classValue in step: picking a class moves
// classValue into it (and raises maxClassValue), counters pass through untouched.
export async function mai2FriendBattleSet(body: {
  classRank?: number
} & Partial<Record<keyof Mai2UserUdemae, number>>) {
  return userPost('/api/v2/game/mai2/friend-battle-set', {}, { json: body }) as Promise<Mai2FriendBattle>
}

export async function mai2FriendSeason() {
  return userPost('/api/v2/game/mai2/friend-season', {}) as Promise<Mai2FriendSeasonRanking[]>
}

// The backend has no season reward tables, so with grantRewards the client sends the
// qualifying Ranking rewards it computed from udemaeSeason.json.
export async function mai2FriendSeasonSet(body: {
  seasonId: number
  point?: number
  rank?: number
  rewardGet?: boolean
  grantRewards?: boolean
  rewards?: { itemType: string; itemId: number }[]
}) {
  return userPost('/api/v2/game/mai2/friend-season-set', {}, { json: body }) as Promise<Mai2FriendSeasonRanking>
}
