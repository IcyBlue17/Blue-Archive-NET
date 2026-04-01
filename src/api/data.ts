import type { AllMusicMap } from '../lib/types'
import { dataUrl } from '../lib/config'
import { chu3AssetUrl1 } from '../lib/chu3Assets'
import type { GameName } from '../lib/types'
import { publicFetchJson } from './client'

export async function allMusic(game: GameName) {
  if (game === 'chu3') return publicFetchJson(chu3AssetUrl1('d/chu3/00/all-music.json')) as Promise<AllMusicMap>
  return publicFetchJson(dataUrl(`/d/${game}/00/all-music.json`).toString()) as Promise<AllMusicMap>
}

export async function allItems(game: GameName) {
  if (game === 'chu3') return publicFetchJson(chu3AssetUrl1('all-items.json'))
  return publicFetchJson(dataUrl(`/d/${game}/00/all-items.json`).toString())
}
