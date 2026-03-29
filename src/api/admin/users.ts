import { adminGet, adminJson } from '../client'

export interface AdminUserSummary {
  id: number
  username: string
  displayName: string
  email: string
  lastLogin: number
  regTime: number
  cardCount: number
}

export interface AdminUserDetail extends AdminUserSummary {
  country: string
  region: string
  profileLocation: string | null
  profileBio: string | null
  profilePicture: string | null
  optOutOfLeaderboard: boolean
  emailConfirmed: boolean
  ghostCard: AdminCard
}

export interface AdminCard {
  id: number
  extId: number
  luid: string
  registerTime: string
  accessTime: string
  isGhost: boolean
  rankingBanned: boolean
}

export interface UserListResponse {
  content: AdminUserSummary[]
  totalPages: number
  totalElements: number
}

export async function listUsers(page: number, size: number, sort?: string) {
  const q = new URLSearchParams({ page: String(page), size: String(size) })
  if (sort) q.set('sort', sort)
  return adminGet(`/api/v2/admin/user/list?${q}`) as Promise<UserListResponse>
}

export async function searchUsers(q: string) {
  return adminGet(`/api/v2/admin/user/search?q=${encodeURIComponent(q)}`) as Promise<AdminUserSummary[]>
}

export async function getUserDetail(auId: number) {
  return adminGet(`/api/v2/admin/user/${auId}`) as Promise<AdminUserDetail>
}

export async function updateUser(
  auId: number,
  body: Partial<{
    displayName: string
    country: string
    region: string
    profileLocation: string
    profileBio: string
    optOutOfLeaderboard: boolean
    emailConfirmed: boolean
  }>,
) {
  return adminJson('PUT', `/api/v2/admin/user/${auId}`, body) as Promise<AdminUserDetail>
}

export async function listUserCards(auId: number) {
  return adminGet(`/api/v2/admin/user/${auId}/cards`) as Promise<AdminCard[]>
}

export async function updateCardBan(cardId: number, rankingBanned: boolean) {
  return adminJson('PUT', `/api/v2/admin/user/card/${cardId}/ban`, { rankingBanned }) as Promise<AdminCard>
}
