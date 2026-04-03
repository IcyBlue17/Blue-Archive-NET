import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import { setToken } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { useI18n } from '../../lib/i18n'

export function OAuthCallbackPage() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { refresh } = useAuth()
  const { t } = useI18n()
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const token = params.get('token')
    const err = params.get('error') ?? params.get('error_description')
    const onceKey = `oauth-callback:${token || err || 'none'}`
    if (sessionStorage.getItem(onceKey)) return
    sessionStorage.setItem(onceKey, '1')

    if (err) {
      setNote(String(err))
      const tId = window.setTimeout(() => nav('/login', { replace: true }), 2000)
      return () => window.clearTimeout(tId)
    }
    if (token) {
      setToken(token)
      void refresh().then(() => nav('/home', { replace: true }))
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
