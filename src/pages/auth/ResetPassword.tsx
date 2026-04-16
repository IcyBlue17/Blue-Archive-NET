import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Turnstile } from '@marsidev/react-turnstile'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import { TURNSTILE_SITE_KEY } from '../../lib/config'
import * as userApi from '../../api/user'
import { useAppTexts } from '../../content/texts'

export function ResetPasswordPage() {
  const texts = useAppTexts()
  const [email, setEmail] = useState('')
  const [turnstile, setTurnstile] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setPending(true)
    try {
      await userApi.resetPassword({
        email,
        turnstile: turnstile || 'dev-bypass',
      })
      setMessage(texts.authPages.resetMailSent)
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.authPages.requestFailed)
    } finally {
      setPending(false)
    }
  }

  return (
    <LayerCard className="p-6">
      <LayerCard.Secondary>{texts.authPages.resetPassword}</LayerCard.Secondary>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <Text size="sm">{texts.authPages.email}</Text>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {TURNSTILE_SITE_KEY ? (
          <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={setTurnstile} />
        ) : null}
        {message ? <Text DANGEROUS_className="text-kumo-success">{message}</Text> : null}
        {error ? <Text DANGEROUS_className="text-kumo-danger">{error}</Text> : null}
        <Button type="submit" disabled={pending || (!!TURNSTILE_SITE_KEY && !turnstile)}>
          {texts.authPages.submit}
        </Button>
      </form>
      <Link to="/login" className="mt-4 inline-block">
        <Text size="sm" DANGEROUS_className="text-kumo-accent">
          {texts.authPages.back}
        </Text>
      </Link>
    </LayerCard>
  )
}
