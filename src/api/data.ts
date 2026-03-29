import { dataUrl } from '../lib/config'
import type { GameName } from '../lib/types'
import { publicFetchJson } from './client'

export async function allMusic(game: GameName) {
  return publicFetchJson(dataUrl(`/d/${game}/00/all-music.json`).toString())
}

export async function allItems(game: GameName) {
  return publicFetchJson(dataUrl(`/d/${game}/00/all-items.json`).toString())
}
