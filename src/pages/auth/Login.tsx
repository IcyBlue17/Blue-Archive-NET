import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Moon, Sun } from '@phosphor-icons/react'
import { Turnstile } from '@marsidev/react-turnstile'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Link } from '@cloudflare/kumo/components/link'
import { Text } from '@cloudflare/kumo/components/text'
import { TURNSTILE_SITE_KEY } from '../../lib/config'
import { useI18n } from '../../lib/i18n'
import { useTheme } from '../../lib/theme'
import { useAuth } from '../../hooks/useAuth'
import * as userApi from '../../api/user'

export function LoginPage() {
  const { t, locale } = useI18n()
  const { theme, toggle } = useTheme()
  const { refresh } = useAuth()
  const nav = useNavigate()
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
      await userApi.login({
        email,
        password,
        turnstile: turnstile || 'dev-bypass',
      })
      await refresh()
      nav('/home', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <LayerCard className="p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <Text size="sm">{t('email')}</Text>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label className="flex flex-col gap-1">
          <Text size="sm">{t('password')}</Text>
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
            VITE_TURNSTILE_SITE_KEY 未配置；生产环境必须配置 Turnstile。
          </Text>
        )}
        {error ? (
          <Text size="sm" DANGEROUS_className="text-kumo-danger">
            {error}
          </Text>
        ) : null}
        <Button type="submit" variant="primary" disabled={pending || (!!TURNSTILE_SITE_KEY && !turnstile)}>
          {t('login')}
        </Button>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Link render={<RouterLink to="/register" />} variant="inline" className="text-sm">
          {t('register')}
        </Link>
        <Link render={<RouterLink to="/reset-password" />} variant="inline" className="text-sm">
          {t('resetPassword')}
        </Link>
        <Button
          type="button"
          variant="ghost"
          shape="square"
          size="sm"
          aria-label={
            locale === 'zh'
              ? theme === 'dark'
                ? '切换到浅色模式'
                : '切换到深色模式'
              : theme === 'dark'
                ? 'Switch to light mode'
                : 'Switch to dark mode'
          }
          onClick={toggle}
        >
          {theme === 'dark' ? <Sun className="size-5" weight="regular" /> : <Moon className="size-5" weight="regular" />}
        </Button>
      </div>
    </LayerCard>
  )
}
