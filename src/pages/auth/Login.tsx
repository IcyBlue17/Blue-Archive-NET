import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Key, Moon, Sun } from '@phosphor-icons/react'
import { startAuthentication } from '@simplewebauthn/browser'
import { Turnstile } from '@marsidev/react-turnstile'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Link } from '@cloudflare/kumo/components/link'
import { Text } from '@cloudflare/kumo/components/text'
import * as oauthApi from '../../api/oauth'
import * as passkeyApi from '../../api/passkey'
import { setToken } from '../../api/client'
import { OAuthButtons } from '../../components/auth/OAuthButtons'
import { TURNSTILE_SITE_KEY } from '../../lib/config'
import { qk } from '../../lib/query'
import { useTheme } from '../../lib/theme'
import { useAuth } from '../../hooks/useAuth'
import * as userApi from '../../api/user'
import { useAppTexts } from '../../content/texts'

export function LoginPage() {
  const texts = useAppTexts()
  const { theme, toggle } = useTheme()
  const { refresh } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [turnstile, setTurnstile] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [pkErr, setPkErr] = useState<string | null>(null)
  const [pkPending, setPkPending] = useState(false)

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
      await userApi.login({
        email,
        password,
        turnstile: turnstile || 'dev-bypass',
      })
      await refresh()
      nav('/home', { replace: true })
    } catch (err) {
      // Sanitize error message for display
      const msg = err instanceof Error ? err.message : texts.authPages.loginFailed
      setError(msg.replace(/<[^>]*>/g, '').slice(0, 200))
    } finally {
      setPending(false)
    }
  }

  async function onPasskeyLogin() {
    setPkErr(null)
    setPkPending(true)
    try {
      const optionsJSON = await passkeyApi.passkeyLoginOptions()
      const assertion = await startAuthentication({ optionsJSON })
      const { token } = await passkeyApi.passkeyLoginVerify(assertion)
      if (!token) throw new Error(texts.authPages.passkeyNoToken)
      setToken(token)
      await refresh()
      nav('/home', { replace: true })
    } catch (err) {
      // Sanitize error message for display
      const msg = err instanceof Error ? err.message : texts.authPages.passkeyError
      setPkErr(msg.replace(/<[^>]*>/g, '').slice(0, 200))
    } finally {
      setPkPending(false)
    }
  }

  return (
    <LayerCard className="p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <Text size="sm">{texts.authPages.email}</Text>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label className="flex flex-col gap-1">
          <Text size="sm">{texts.authPages.password}</Text>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {TURNSTILE_SITE_KEY ? (
          <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={setTurnstile} />
        ) : (
          <Text size="sm" DANGEROUS_className="text-kumo-warning">
            {texts.authPages.turnstileRequired}
          </Text>
        )}
        {error ? (
          <Text size="sm" DANGEROUS_className="text-kumo-danger">
            {error}
          </Text>
        ) : null}
        <Button type="submit" variant="primary" disabled={pending || (!!TURNSTILE_SITE_KEY && !turnstile)}>
          {texts.authPages.login}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="border-kumo-border flex-1 border-t" />
        <Text size="sm" DANGEROUS_className="shrink-0 text-kumo-subtle">
          {texts.authPages.dividerOr}
        </Text>
        <div className="border-kumo-border flex-1 border-t" />
      </div>
      <OAuthButtons mode="login" enabledProviderIds={oauthProviders} />

      <div className="my-5 flex items-center gap-3">
        <div className="border-kumo-border flex-1 border-t" />
        <Text size="sm" DANGEROUS_className="shrink-0 text-kumo-subtle">
          {texts.authPages.dividerOr}
        </Text>
        <div className="border-kumo-border flex-1 border-t" />
      </div>

      <div>
        {pkErr ? (
          <Text size="sm" DANGEROUS_className="text-kumo-danger mb-2">
            {pkErr}
          </Text>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className="w-full gap-2"
          disabled={pkPending}
          onClick={() => void onPasskeyLogin()}
        >
          <Key className="size-5" weight="duotone" aria-hidden />
          {texts.authPages.passkeyLogin}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Link render={<RouterLink to="/register" />} variant="inline" className="text-sm">
          {texts.authPages.register}
        </Link>
        <Link render={<RouterLink to="/reset-password" />} variant="inline" className="text-sm">
          {texts.authPages.resetPassword}
        </Link>
        <Button
          type="button"
          variant="ghost"
          shape="square"
          size="sm"
          aria-label={theme === 'dark' ? texts.authPages.switchLightMode : texts.authPages.switchDarkMode}
          onClick={toggle}
        >
          {theme === 'dark' ? <Sun className="size-5" weight="regular" /> : <Moon className="size-5" weight="regular" />}
        </Button>
      </div>
    </LayerCard>
  )
}
