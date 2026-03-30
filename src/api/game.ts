import type {
  Chu3RivalEntry,
  Chu3TeamRankEntry,
  Chu3TeamSummary,
  GameName,
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
  return userPost(`/api/v2/game/${game}/recent`, { username }) as Promise<unknown[]>
}

export async function playlog(username: string, game: GameName) {
  return userPost(`/api/v2/game/${game}/playlog`, { username }) as Promise<unknown[]>
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
    /** 已解锁角色 ID（`chusan_user_character`），名称见 CDN `all-items.json` → `chara` */
    characters?: number[]
    characterRows?: Array<{
      characterId: number
      level: number
    }>
  }>
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
