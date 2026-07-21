import { adminGet, adminJson } from '../client'

const base = '/api/v2/admin/ongeki/music-ranking'

export interface MusicRankingEntry {
  id: number
  musicId: number
  point: number
  userName: string | null
  type: number
  sortOrder: number
  enable: boolean
}

export interface MusicRankingWrite {
  musicId: number
  point?: number
  userName?: string
  type?: number
  sortOrder?: number
  enable?: boolean
}

export async function listRanking(type?: number, enable?: boolean) {
  const params = new URLSearchParams()
  if (type !== undefined) params.set('type', String(type))
  if (enable !== undefined) params.set('enable', String(enable))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return adminGet(`${base}${suffix}`) as Promise<MusicRankingEntry[]>
}

export async function getRanking(id: number) {
  return adminGet(`${base}/${id}`) as Promise<MusicRankingEntry>
}

export async function createRanking(body: MusicRankingWrite) {
  return adminJson('POST', base, body) as Promise<MusicRankingEntry>
}

export async function updateRanking(id: number, body: Partial<MusicRankingWrite>) {
  return adminJson('POST', `${base}/${id}`, body) as Promise<MusicRankingEntry>
}

export async function deleteRanking(id: number) {
  return adminJson('POST', `${base}/${id}/delete`) as Promise<{ status: string; id: number }>
}

export async function clearRanking(type?: number) {
  const suffix = type !== undefined ? `?type=${type}` : ''
  return adminJson('POST', `${base}/clear-all${suffix}`) as Promise<{ status: string; id?: number }>
}
