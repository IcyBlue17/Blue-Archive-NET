import type { GameName } from '../lib/types'
import type { GameOption } from '../lib/types'
import { userPost } from './client'

export async function getSettings(): Promise<GameOption[]> {
  return userPost('/api/v2/settings/get', {}) as Promise<GameOption[]>
}

export async function setSetting(key: string, value: string | number | boolean) {
  return userPost('/api/v2/settings/set', { key, value: String(value) })
}

export async function detailSet(game: GameName | string, field: string, value: unknown) {
  return userPost(`/api/v2/game/${game}/user-detail-set`, {
    field,
    value: String(value),
  })
}
