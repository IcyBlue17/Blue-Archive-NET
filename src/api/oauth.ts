import { publicGet, userGet, userPost } from './client'

export type OAuthLinkedAccount = {
  provider: string
  providerUserId?: string
  providerEmail?: string
  providerName?: string
}

function parseProviders(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string')
  if (raw && typeof raw === 'object' && 'providers' in raw) {
    const p = (raw as { providers: unknown }).providers
    if (Array.isArray(p)) return p.filter((x): x is string => typeof x === 'string')
  }
  return []
}

function parseLinked(raw: unknown): OAuthLinkedAccount[] {
  if (Array.isArray(raw)) {
    const out: OAuthLinkedAccount[] = []
    for (const x of raw) {
      if (!x || typeof x !== 'object') continue
      const o = x as Record<string, unknown>
      const provider = o.provider
      if (typeof provider !== 'string') continue
      const providerUserId = o.providerUserId
      const providerEmail = o.providerEmail
      const providerName = o.providerName
      out.push({
        provider,
        ...(typeof providerUserId === 'string' ? { providerUserId } : {}),
        ...(typeof providerEmail === 'string' ? { providerEmail } : {}),
        ...(typeof providerName === 'string' ? { providerName } : {}),
      })
    }
    return out
  }
  if (raw && typeof raw === 'object') {
    const accounts = (raw as { accounts?: unknown }).accounts
    const linked = (raw as { linked?: unknown }).linked
    if (Array.isArray(accounts)) return parseLinked(accounts)
    if (Array.isArray(linked)) return parseLinked(linked)
  }
  return []
}

export async function getProviders(): Promise<string[]> {
  try {
    const raw = await publicGet('/api/v2/user/oauth/providers')
    return parseProviders(raw)
  } catch {
    return []
  }
}

export async function getLinkedAccounts(): Promise<OAuthLinkedAccount[]> {
  const raw = await userGet('/api/v2/user/oauth/accounts')
  return parseLinked(raw)
}

export async function unlinkAccount(provider: string): Promise<void> {
  await userPost('/api/v2/user/oauth/unlink', { provider })
}
