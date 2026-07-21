import { adminGet, adminJson } from '../client'

export interface AllNetTitleTlsSnapshot {
  games: Record<string, boolean>
}

export async function getAllNetTitleTls() {
  return adminGet('/api/v2/admin/allnet/title-tls') as Promise<AllNetTitleTlsSnapshot>
}

export async function setAllNetTitleTls(gameId: string, enabled: boolean) {
  return adminJson('POST', '/api/v2/admin/allnet/title-tls', { gameId, enabled }) as Promise<AllNetTitleTlsSnapshot>
}
