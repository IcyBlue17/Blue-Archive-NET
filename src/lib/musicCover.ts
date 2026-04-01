import { dataUrl } from './config'
import { imgUrlOnHost1 } from './imgSign'
import type { GameName } from './types'

/** 乐曲封面统一保留 `/d/...` 目录，但优先挂到 IMAGE_HOST。 */
export function musicJacketUrl(game: GameName, musicId: number): string {
  const sub = musicId.toString().padStart(6, '0').substring(2)
  const raw1 = dataUrl(`/d/${game}/music/00${sub}.png`).toString()
  return imgUrlOnHost1(raw1)
}
