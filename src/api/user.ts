import type { AquaNetUser } from '../lib/types'
import { setToken, userPost, userPostForm } from './client'

export async function register(p: {
  username: string
  email: string
  password: string
  turnstile: string
}) {
  return userPost('/api/v2/user/register', {
    username: p.username,
    email: p.email,
    password: p.password,
    turnstile: p.turnstile,
  })
}

export async function login(p: { email: string; password: string; turnstile: string }) {
  const data = (await userPost('/api/v2/user/login', {
    email: p.email,
    password: p.password,
    turnstile: p.turnstile,
  })) as { token: string }
  setToken(data.token)
}

export async function resetPassword(p: { email: string; turnstile: string }) {
  return userPost('/api/v2/user/reset-password', {
    email: p.email,
    turnstile: p.turnstile,
  })
}

export async function changePassword(p: { token: string; password: string }) {
  return userPost('/api/v2/user/change-password', {
    token: p.token,
    password: p.password,
  })
}

export async function confirmEmail(token: string) {
  return userPost('/api/v2/user/confirm-email', { token })
}

export async function me(): Promise<AquaNetUser> {
  return userPost('/api/v2/user/me', {}) as Promise<AquaNetUser>
}

export async function userInfo(username: string) {
  return userPost('/api/v2/user/user-info', { username })
}

export async function setting(key: string, value: string) {
  const k = key === 'password' ? 'pwHash' : key
  return userPost('/api/v2/user/setting', { key: k, value })
}

export async function listKeychips(): Promise<string[]> {
  const r = (await userPost('/api/v2/user/keychip', {})) as { keychips?: string[] }
  return r.keychips ?? []
}

export async function allocateKeychip(): Promise<string> {
  const r = (await userPost('/api/v2/user/keychip/allocate', {})) as { keychipId: string }
  return r.keychipId
}

export async function uploadPfp(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return userPostForm('/api/v2/user/upload-pfp', fd)
}

export async function changeRegion(regionId: number) {
  return userPost('/api/v2/user/change-region', { regionId: String(regionId) })
}
