import { adminGet, adminJson } from '../client'

export interface UnlockChallengeRow {
  id: number
  unlockChallengeId: number
  challengeName: string
  courseId1: number
  courseId2: number
  courseId3: number
  courseId4: number
  courseId5: number
  borderScore: number
  rewardId: number
  rewardType: number
  version: number
}

export async function listUnlockChallenges() {
  return adminGet('/api/v2/admin/chusan/unlock-challenge') as Promise<UnlockChallengeRow[]>
}

export async function createUnlockChallenge(body: Omit<UnlockChallengeRow, 'id'>) {
  return adminJson('POST', '/api/v2/admin/chusan/unlock-challenge', body) as Promise<UnlockChallengeRow>
}

export async function updateUnlockChallenge(id: number, body: Partial<UnlockChallengeRow>) {
  return adminJson('PUT', `/api/v2/admin/chusan/unlock-challenge/${id}`, body) as Promise<UnlockChallengeRow>
}

export async function deleteUnlockChallenge(id: number) {
  return adminJson('DELETE', `/api/v2/admin/chusan/unlock-challenge/${id}`) as Promise<{
    status: string
    id: number
  }>
}
