import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import { useI18n } from '../../lib/i18n'
import * as userApi from '../../api/user'

/** Route: /reset-password with ?token= from email (legacy path compatibility) */
export function ChangePasswordFromEmailPage() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      setError('缺少 token')
      return
    }
    setPending(true)
    setError(null)
    try {
      await userApi.changePassword({ token, password })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setPending(false)
    }
  }

  if (!token) {
    return (
      <LayerCard className="p-6">
        <Text>无效的密码重置链接。</Text>
        <Link to="/reset-password">
          <Text DANGEROUS_className="text-kumo-accent mt-4">请求新链接</Text>
        </Link>
      </LayerCard>
    )
  }

  return (
    <LayerCard className="p-6">
      <LayerCard.Secondary>{t('resetPassword')}</LayerCard.Secondary>
      {done ? (
        <Text DANGEROUS_className="mt-4 text-kumo-success">密码已更新，请登录。</Text>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
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
          {error ? <Text DANGEROUS_className="text-kumo-danger">{error}</Text> : null}
          <Button type="submit" disabled={pending}>
            {t('submit')}
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-4 inline-block">
        <Text size="sm" DANGEROUS_className="text-kumo-accent">
          {t('login')}
        </Text>
      </Link>
    </LayerCard>
  )
}
