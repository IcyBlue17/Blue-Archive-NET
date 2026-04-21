import { adminGet } from '../client'

export async function getAdminStatus() {
  return adminGet('/api/v2/admin/status') as Promise<{ isAdmin: boolean; username: string }>
}
