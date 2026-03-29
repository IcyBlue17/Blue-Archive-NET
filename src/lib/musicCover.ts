import { dataUrl } from './config'
import type { GameName } from './types'

/** Jacket URL on AquaDX CDN — same path pattern as aquaNet `UserHome.svelte`. */
export function musicJacketUrl(game: GameName, musicId: number): string {
  const sub = musicId.toString().padStart(6, '0').substring(2)
  return dataUrl(`/d/${game}/music/00${sub}.png`).toString()
}
