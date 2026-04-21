import { apiUrl } from '../lib/config'
import { syncImgJwtCookie } from '../lib/imgSign'

export const TOKEN_KEY = 'token'

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  syncImgJwtCookie(token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  syncImgJwtCookie(null)
}

export function syncImageJwtCookie() {
  syncImgJwtCookie(getToken())
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

function withTokenParams(params: Record<string, string>): Record<string, string> {
  const token = getToken()
  if (token && !('token' in params)) return { ...params, token }
  return params
}

function handleInvalidToken(text: string) {
  if (text === 'Invalid token') {
    clearToken()
    window.location.href = '/login'
  }
}

function parseError(text: string): Error {
  try {
    const j = JSON.parse(text) as { error?: string; message?: string }

    const msg = (j.error || j.message || text).replace(/<[^>]*>/g, '').slice(0, 500)
    return new Error(msg)
  } catch {

    return new Error(text.replace(/<[^>]*>/g, '').slice(0, 500))
  }
}

export async function publicGet(path: string): Promise<unknown> {
  const url = path.startsWith('http') ? path : apiUrl(path).toString()
  const res = await fetch(url)
  const text = await res.text()
  if (!res.ok) throw parseError(text)
  if (!text) return null
  return JSON.parse(text) as unknown
}

export async function userGet(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const merged = withTokenParams(params)
  const url = apiUrl(path)
  url.search = new URLSearchParams(merged).toString()
  const res = await fetch(url.toString())
  const text = await res.text()
  if (!res.ok) {
    handleInvalidToken(text)
    throw parseError(text)
  }
  if (!text) return null
  return JSON.parse(text) as unknown
}

export async function userPost(
  path: string,
  params: Record<string, string> = {},
  init?: { json?: unknown },
): Promise<unknown> {
  const merged = withTokenParams(params)
  const url = path.startsWith('http') ? new URL(path) : apiUrl(path)
  url.search = new URLSearchParams(merged).toString()

  const headers: HeadersInit = {}
  let body: BodyInit | undefined
  if (init?.json !== undefined) {
    body = JSON.stringify(init.json)
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url.toString(), { method: 'POST', headers, body })
  const text = await res.text()

  if (!res.ok) {
    handleInvalidToken(text)
    throw parseError(text)
  }

  if (!text) return null
  return JSON.parse(text) as unknown
}

export async function userPostForm(path: string, formData: FormData) {
  const token = getToken()
  const url = apiUrl(path)
  if (token) url.searchParams.set('token', token)

  const res = await fetch(url.toString(), { method: 'POST', body: formData })
  const text = await res.text()
  if (!res.ok) {
    handleInvalidToken(text)
    throw parseError(text)
  }
  if (!text) return null
  return JSON.parse(text) as unknown
}

export async function userPostStream(
  path: string,
  params: Record<string, string>,
  onChunk: (data: unknown) => void,
  init?: { json?: unknown },
): Promise<void> {
  const merged = withTokenParams(params)
  const url = apiUrl(path)
  url.search = new URLSearchParams(merged).toString()

  const headers: HeadersInit = {}
  let body: BodyInit | undefined
  if (init?.json !== undefined) {
    body = JSON.stringify(init.json)
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url.toString(), { method: 'POST', headers, body })
  if (!res.ok) {
    const text = await res.text()
    handleInvalidToken(text)
    throw parseError(text)
  }
  if (!res.body) return

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        onChunk(JSON.parse(line) as unknown)
      }
    }
    if (buffer.trim()) onChunk(JSON.parse(buffer.trim()) as unknown)
  } finally {
    reader.releaseLock()
  }
}

function adminHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  }
}

function adminAuthHeaders(init?: HeadersInit): Headers {
  const token = getToken()
  if (!token) throw new Error('Not logged in')
  const headers = new Headers(init)
  headers.set('Authorization', `Bearer ${token}`)
  return headers
}

function adminUrl(path: string): URL {
  const token = getToken()
  if (!token) throw new Error('Not logged in')
  const url = apiUrl(path)
  url.searchParams.set('token', token)
  return url
}

export async function adminGet(path: string): Promise<unknown> {
  const res = await fetch(adminUrl(path).toString())
  const text = await res.text()
  if (!res.ok) throw parseError(text)
  if (!text) return null
  return JSON.parse(text) as unknown
}

export async function adminJson(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<unknown> {
  const head = body !== undefined ? adminHeaders() : undefined
  const res = await fetch(adminUrl(path).toString(), {
    method,
    headers: head,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw parseError(text)
  if (!text) return null
  return JSON.parse(text) as unknown
}

export async function adminAuthJson(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<unknown> {
  const headers = body !== undefined
    ? adminAuthHeaders({ 'Content-Type': 'application/json' })
    : adminAuthHeaders()
  const res = await fetch(apiUrl(path).toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw parseError(text)
  if (!text) return null
  return JSON.parse(text) as unknown
}

export async function publicFetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<unknown>
}
