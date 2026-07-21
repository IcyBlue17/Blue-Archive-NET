import type {
  Chu3RivalEntry,
  Chu3TeamDetail,
  Chu3TeamJoinResult,
  Chu3LxnsImportResult,
  Chu3TeamRankEntry,
  Chu3TeamRequestBox,
  Chu3TeamSummary,
  Chu3UserMusicDetail,
  GameName,
  GamePlayRecord,
  GenericGameSummary,
  GenericRankingPlayer,
  TrendEntry,
} from '../lib/types'
import { userPost } from './client'

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
