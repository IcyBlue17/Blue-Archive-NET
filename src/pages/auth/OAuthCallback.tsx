import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import { setToken } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { useI18n } from '../../lib/i18n'

// Validate JWT format (header.payload.signature)
function isValidJwtFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  // Each part should be valid base64url
  const base64urlRegex = /^[A-Za-z0-9_-]+$/
  return parts.every((part) => part.length > 0 && base64urlRegex.test(part))
}

// Sanitize error message to prevent XSS
function sanitizeError(err: unknown): string {
  if (!err) return 'Unknown error'
  const msg = err instanceof Error ? err.message : String(err)
  // Remove any HTML tags and limit length
  return msg.replace(/<[^>]*>/g, '').slice(0, 200)
}

export function OAuthCallbackPage() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { refresh } = useAuth()
  const { t } = useI18n()
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const token = params.get('token')
    const err = params.get('error') ?? params.get('error_description')
    const onceKey = `oauth-callback:${(token || err || 'none').slice(0, 32)}`
    if (sessionStorage.getItem(onceKey)) return
    sessionStorage.setItem(onceKey, '1')

    // Clear sensitive params from URL immediately
    if (token || err) {
      window.history.replaceState({}, '', '/oauth/callback')
    }

    if (err) {
      setNote(sanitizeError(err))
      const tId = window.setTimeout(() => nav('/login', { replace: true }), 2000)
      return () => window.clearTimeout(tId)
    }

    if (token) {
      // Validate token format before storing
      if (!isValidJwtFormat(token)) {
        setNote('Invalid token format')
        const tId = window.setTimeout(() => nav('/login', { replace: true }), 2000)
        return () => window.clearTimeout(tId)
      }

      setToken(token)
      void refresh()
        .then(() => nav('/home', { replace: true }))
        .catch((e) => {
          setNote(sanitizeError(e))
          window.setTimeout(() => nav('/login', { replace: true }), 2000)
        })
      return
    }

    setNote(t('auth.oauthCallbackMissing'))
    const tId = window.setTimeout(() => nav('/login', { replace: true }), 2000)
    return () => window.clearTimeout(tId)
  }, [params, nav, refresh, t])

  return (
    <LayerCard className="p-6">
      <Text size="sm">{note ?? t('auth.oauthCallbackWorking')}</Text>
    </LayerCard>
  )
}
