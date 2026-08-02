import { adminGet, adminJson } from '@/api/client'

const base = '/api/v2/admin/chusan/music-ranking'

/** 中二的热门乐曲榜。和音击那张表同构，但少一个 userName——榜上只有曲目和分数。 */
export interface Chu3RankingEntry {
  id: number
  musicId: number
  point: number
  type: number
  sortOrder: number
  enable: boolean
}

export interface Chu3RankingWrite {
  musicId: number
  point?: number
  type?: number
  sortOrder?: number
  enable?: boolean
}

export async function listRanking(type?: number, enable?: boolean) {
  const params = new URLSearchParams()
  if (type !== undefined) params.set('type', String(type))
  if (enable !== undefined) params.set('enable', String(enable))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return adminGet(`${base}${suffix}`) as Promise<Chu3RankingEntry[]>
}

export async function getRanking(id: number) {
  return adminGet(`${base}/${id}`) as Promise<Chu3RankingEntry>
}

export async function createRanking(body: Chu3RankingWrite) {
  return adminJson('POST', base, body) as Promise<Chu3RankingEntry>
}

export async function updateRanking(id: number, body: Partial<Chu3RankingWrite>) {
  return adminJson('POST', `${base}/${id}`, body) as Promise<Chu3RankingEntry>
}

export async function deleteRanking(id: number) {
  return adminJson('POST', `${base}/${id}/delete`) as Promise<{ status: string; id: number }>
}

export async function clearRanking(type?: number) {
  const suffix = type !== undefined ? `?type=${type}` : ''
  return adminJson('POST', `${base}/clear-all${suffix}`) as Promise<{ status: string; id?: number }>
}
