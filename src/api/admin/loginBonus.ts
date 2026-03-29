import { adminGet, adminJson } from '../client'

export interface LoginBonusPreset {
  id: number
  version: number
  presetName: string
  isEnabled: boolean
}

export interface LoginBonusEntry {
  id: number
  presetId: number
  loginBonusName: string
  presentId: number
  presentName: string
  itemNum: number
  needLoginDayCount: number
  loginBonusCategoryType: number
}

export async function listPresets() {
  return adminGet('/api/v2/admin/chusan/login-bonus/presets') as Promise<LoginBonusPreset[]>
}

export async function createPreset(body: {
  presetName: string
  presetId?: number
  isEnabled: boolean
  isRepeatable: boolean
}) {
  return adminJson('POST', '/api/v2/admin/chusan/login-bonus/presets', body) as Promise<LoginBonusPreset>
}

export async function updatePreset(id: number, body: Partial<{ presetName: string; isEnabled: boolean }>) {
  return adminJson('PUT', `/api/v2/admin/chusan/login-bonus/presets/${id}`, body) as Promise<LoginBonusPreset>
}

export async function deletePreset(id: number) {
  return adminJson('DELETE', `/api/v2/admin/chusan/login-bonus/presets/${id}`) as Promise<{
    status: string
    id: number
  }>
}

export async function listEntries(presetId: number) {
  return adminGet(
    `/api/v2/admin/chusan/login-bonus/presets/${presetId}/entries`,
  ) as Promise<LoginBonusEntry[]>
}

export async function createEntry(
  presetId: number,
  body: {
    loginBonusName: string
    presentId: number
    presentName: string
    itemNum: number
    needLoginDayCount: number
    loginBonusCategoryType: number
  },
) {
  return adminJson(
    'POST',
    `/api/v2/admin/chusan/login-bonus/presets/${presetId}/entries`,
    body,
  ) as Promise<LoginBonusEntry>
}

export async function updateEntry(id: number, body: Partial<Omit<LoginBonusEntry, 'id' | 'presetId'>>) {
  return adminJson('PUT', `/api/v2/admin/chusan/login-bonus/entries/${id}`, body) as Promise<LoginBonusEntry>
}

export async function deleteEntry(id: number) {
  return adminJson('DELETE', `/api/v2/admin/chusan/login-bonus/entries/${id}`) as Promise<{
    status: string
    id: number
  }>
}
