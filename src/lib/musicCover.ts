import { dataUrl } from '@/lib/config'
import { imgUrlOnHost } from '@/lib/imgSign'
import { chu3AssetUrl } from '@/lib/chu3Assets'
import type { GameName } from '@/lib/types'

export function musicJacketUrl(game: GameName, musicId: number): string {
  const sub = musicId.toString().padStart(6, '0').substring(2)
  if (game === 'chu3') return chu3AssetUrl(`d/chu3/music/00${sub}.png`)
  const raw = dataUrl(`/d/${game}/music/00${sub}.png`).toString()
  return imgUrlOnHost(raw)
}
