import { adminAuthJson } from '../client'

export interface ConfigReloadResponse {
  status: 'ok'
  sourcePath: string | null
  reloadedPrefixes: string[]
  chusan: {
    teamName: string | null
    defaultTeamId: number
    loginBonusEnable: boolean
    allMusicUrl: string | null
    remoteMusicCount: number
  }
  oauth: {
    frontendBaseUrl: string
    backendBaseUrl: string
    allowedOrigins: string[]
  }
  censor: {
    enabled: boolean
    failOpen: boolean
    baiduEnabled: boolean
    openAiEnabled: boolean
    openAiModel: string
  }
  gameData: {
    chu3Events: number
    chu3LoginBonusPresets: number
    chu3LoginBonuses: number
  }
}

export interface AdminErrorResponse {
  status: 403
  message: string
}

export async function reloadServerConfig() {
  return adminAuthJson('POST', '/api/v2/admin/config/reload') as Promise<ConfigReloadResponse>
}
