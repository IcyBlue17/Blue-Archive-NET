import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import * as userApi from '../../api/user'
import { useAppTexts } from '../../content/texts'

/** Route: /reset-password with ?token= from email (legacy path compatibility) */
export function ChangePasswordFromEmailPage() {
  const texts = useAppTexts()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      setError(texts.authPages.missingToken)
      return
    }
    setPending(true)
    setError(null)
    try {
      await userApi.changePassword({ token, password })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.common.failed)
    } finally {
      setPending(false)
    }
  }

  if (!token) {
    return (
      <LayerCard className="p-6">
        <Text>{texts.authPages.invalidResetLink}</Text>
        <Link to="/reset-password">
          <Text DANGEROUS_className="text-kumo-accent mt-4">{texts.authPages.requestNewLink}</Text>
        </Link>
      </LayerCard>
    )
  }

  return (
    <LayerCard className="p-6">
      <LayerCard.Secondary>{texts.authPages.resetPassword}</LayerCard.Secondary>
      {done ? (
        <Text DANGEROUS_className="mt-4 text-kumo-success">{texts.authPages.passwordUpdated}</Text>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
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
          {error ? <Text DANGEROUS_className="text-kumo-danger">{error}</Text> : null}
          <Button type="submit" disabled={pending}>
            {texts.authPages.submit}
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-4 inline-block">
        <Text size="sm" DANGEROUS_className="text-kumo-accent">
          {texts.authPages.login}
        </Text>
      </Link>
    </LayerCard>
  )
}
