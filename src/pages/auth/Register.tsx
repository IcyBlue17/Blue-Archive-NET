import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Turnstile } from '@marsidev/react-turnstile'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import { TURNSTILE_SITE_KEY } from '../../lib/config'
import { fmtNameErr1 } from '../../lib/censor'
import { useI18n } from '../../lib/i18n'
import * as userApi from '../../api/user'

export function RegisterPage() {
  const { t } = useI18n()
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [turnstile, setTurnstile] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await userApi.register({
        username,
        email,
        password,
        turnstile: turnstile || 'dev-bypass',
      })
      nav('/login', { replace: true, state: { registered: true } })
    } catch (err) {
      setError(fmtNameErr1(err, t('register')))
    } finally {
      setPending(false)
    }
  }

  return (
    <LayerCard className="p-6">
      <LayerCard.Secondary>{t('register')}</LayerCard.Secondary>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <Text size="sm">{t('username')}</Text>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1">
          <Text size="sm">Email</Text>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1">
          <Text size="sm">{t('password')}</Text>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {TURNSTILE_SITE_KEY ? (
          <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={setTurnstile} />
        ) : (
          <Text size="sm" DANGEROUS_className="text-kumo-warning">
            VITE_TURNSTILE_SITE_KEY 未配置。
          </Text>
        )}
        {error ? (
          <Text size="sm" DANGEROUS_className="text-kumo-danger">
            {error}
          </Text>
        ) : null}
        <Button type="submit" disabled={pending || (!!TURNSTILE_SITE_KEY && !turnstile)}>
          {t('register')}
        </Button>
      </form>
      <Link to="/login" className="mt-4 inline-block">
        <Text size="sm" DANGEROUS_className="text-kumo-accent">
          {t('login')}
        </Text>
      </Link>
    </LayerCard>
  )
}
