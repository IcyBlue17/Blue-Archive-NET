import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser'
import { userPost } from './client'

function unwrapCreationOptions(data: unknown): PublicKeyCredentialCreationOptionsJSON {
  if (data && typeof data === 'object' && 'optionsJSON' in data) {
    return (data as { optionsJSON: PublicKeyCredentialCreationOptionsJSON }).optionsJSON
  }
  if (data && typeof data === 'object' && 'options' in data) {
    return (data as { options: PublicKeyCredentialCreationOptionsJSON }).options
  }
  return data as PublicKeyCredentialCreationOptionsJSON
}

function unwrapRequestOptions(data: unknown): PublicKeyCredentialRequestOptionsJSON {
  if (data && typeof data === 'object' && 'optionsJSON' in data) {
    return (data as { optionsJSON: PublicKeyCredentialRequestOptionsJSON }).optionsJSON
  }
  if (data && typeof data === 'object' && 'options' in data) {
    return (data as { options: PublicKeyCredentialRequestOptionsJSON }).options
  }
  return data as PublicKeyCredentialRequestOptionsJSON
}

export type PasskeyCredentialRow = {
  credentialId: string
  label?: string
  createdAt?: string
}

function parseCredentialList(raw: unknown): PasskeyCredentialRow[] {
  if (Array.isArray(raw)) {
    const out: PasskeyCredentialRow[] = []
    for (const x of raw) {
      if (!x || typeof x !== 'object') continue
      const o = x as Record<string, unknown>
      const id = o.credentialId ?? o.credential_id
      if (typeof id !== 'string') continue
      const label = o.label
      const createdAt = o.createdAt ?? o.created_at
      const row: PasskeyCredentialRow = { credentialId: id }
      if (typeof label === 'string') row.label = label
      if (typeof createdAt === 'string') row.createdAt = createdAt
      out.push(row)
    }
    return out
  }
  if (raw && typeof raw === 'object' && 'credentials' in raw) {
    return parseCredentialList((raw as { credentials: unknown }).credentials)
  }
  return []
}

export async function passkeyRegisterOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const raw = await userPost('/api/v2/user/passkey/register/options', {})
  return unwrapCreationOptions(raw)
}

export async function passkeyRegisterVerify(response: RegistrationResponseJSON): Promise<unknown> {
  return userPost('/api/v2/user/passkey/register/verify', {}, { json: response })
}

export async function passkeyLoginOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const raw = await userPost('/api/v2/user/passkey/login/options', {})
  return unwrapRequestOptions(raw)
}

export async function passkeyLoginVerify(response: AuthenticationResponseJSON): Promise<{ token?: string }> {
  const raw = await userPost('/api/v2/user/passkey/login/verify', {}, { json: response })
  if (raw && typeof raw === 'object' && 'token' in raw && typeof (raw as { token: unknown }).token === 'string') {
    return { token: (raw as { token: string }).token }
  }
  return {}
}

export async function passkeyList(): Promise<PasskeyCredentialRow[]> {
  const raw = await userPost('/api/v2/user/passkey/list', {})
  return parseCredentialList(raw)
}

export async function passkeyRemove(credentialId: string): Promise<void> {
  await userPost('/api/v2/user/passkey/remove', {}, { json: { credentialId } })
}
