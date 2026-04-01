import { dataUrl } from './config'
import { imgUrl1, imgUrlOnHost1 } from './imgSign'
import type { GameName } from './types'

/** Jacket URL on AquaDX CDN — same path pattern as aquaNet `UserHome.svelte`. */
export function musicJacketUrl(game: GameName, musicId: number, useImgHost = false): string {
  const sub = musicId.toString().padStart(6, '0').substring(2)
  const raw1 = dataUrl(`/d/${game}/music/00${sub}.png`).toString()
  return useImgHost ? imgUrlOnHost1(raw1) : imgUrl1(raw1)
}
