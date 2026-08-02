import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Turnstile } from '@marsidev/react-turnstile'
import { TURNSTILE_SITE_KEY } from '@/lib/config'
import * as userApi from '@/api/user'
import { useAppTexts } from '@/content/texts'
import { Button, Input } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { Text } from '@/components/ui/Text'

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
    <SectionCard title={<>{texts.authPages.resetPassword}</>}>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <Text className="text-sm">{texts.authPages.email}</Text>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {TURNSTILE_SITE_KEY ? (
          <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={setTurnstile} />
        ) : null}
        {message ? <Text className="text-app-success">{message}</Text> : null}
        {error ? <Text className="text-app-danger">{error}</Text> : null}
        <Button htmlType="submit" disabled={pending || (!!TURNSTILE_SITE_KEY && !turnstile)}>
          {texts.authPages.submit}
        </Button>
      </form>
      <Link to="/login" className="mt-4 inline-block">
        <Text className="text-sm text-app-brand">
          {texts.authPages.back}
        </Text>
      </Link>
    </SectionCard>
  )
}
