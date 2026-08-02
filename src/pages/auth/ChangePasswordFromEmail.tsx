import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as userApi from '@/api/user'
import { useAppTexts } from '@/content/texts'
import { Button, Input } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { Text } from '@/components/ui/Text'

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
      <SectionCard>
        <Text>{texts.authPages.invalidResetLink}</Text>
        <Link to="/reset-password">
          <Text className="text-app-brand mt-4">{texts.authPages.requestNewLink}</Text>
        </Link>
      </SectionCard>
    )
  }

  return (
    <SectionCard title={<>{texts.authPages.resetPassword}</>}>
      {done ? (
        <Text className="mt-4 text-app-success">{texts.authPages.passwordUpdated}</Text>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <Text className="text-sm">{texts.authPages.password}</Text>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          {error ? <Text className="text-app-danger">{error}</Text> : null}
          <Button htmlType="submit" disabled={pending}>
            {texts.authPages.submit}
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-4 inline-block">
        <Text className="text-sm text-app-brand">
          {texts.authPages.login}
        </Text>
      </Link>
    </SectionCard>
  )
}
