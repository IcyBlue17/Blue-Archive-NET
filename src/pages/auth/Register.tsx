import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Turnstile } from '@marsidev/react-turnstile'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Link } from '@cloudflare/kumo/components/link'
import { Text } from '@cloudflare/kumo/components/text'
import * as oauthApi from '../../api/oauth'
import { OAuthButtons } from '../../components/auth/OAuthButtons'
import { TURNSTILE_SITE_KEY } from '../../lib/config'
import { fmtNameErr } from '../../lib/censor'
import { qk } from '../../lib/query'
import * as userApi from '../../api/user'
import { useAppTexts } from '../../content/texts'

export function RegisterPage() {
  const texts = useAppTexts()
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [turnstile, setTurnstile] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const providersQuery = useQuery({
    queryKey: qk.oauthProviders,
    queryFn: () => oauthApi.getProviders(),
    staleTime: 60_000,
  })
  const oauthProviders = providersQuery.data ?? []

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
      setError(fmtNameErr(err, texts.authPages.register))
    } finally {
      setPending(false)
    }
  }

  return (
    <LayerCard className="p-6">
      <LayerCard.Secondary>{texts.authPages.register}</LayerCard.Secondary>
      <OAuthButtons mode="login" enabledProviderIds={oauthProviders} />
      <div className="my-5 flex items-center gap-3">
        <div className="border-kumo-line flex-1 border-t" />
        <Text size="sm" DANGEROUS_className="shrink-0 text-kumo-subtle">
          {texts.authPages.dividerOr}
        </Text>
        <div className="border-kumo-line flex-1 border-t" />
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <Text size="sm">{texts.authPages.username}</Text>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1">
          <Text size="sm">{texts.authPages.email}</Text>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1">
          <Text size="sm">{texts.authPages.password}</Text>
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
            {texts.authPages.turnstileMissing}
          </Text>
        )}
        {error ? (
          <Text size="sm" DANGEROUS_className="text-kumo-danger">
            {error}
          </Text>
        ) : null}
        <Button type="submit" disabled={pending || (!!TURNSTILE_SITE_KEY && !turnstile)}>
          {texts.authPages.register}
        </Button>
      </form>
      <div className="mt-4">
        <Link render={<RouterLink to="/login" />} variant="inline" className="text-sm">
          {texts.authPages.login}
        </Link>
      </div>
    </LayerCard>
  )
}
