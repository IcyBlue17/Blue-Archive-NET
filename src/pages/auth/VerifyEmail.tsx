import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as userApi from '@/api/user'
import { useAppTexts } from '@/content/texts'
import { Spin } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { Text } from '@/components/ui/Text'

export function VerifyEmailPage() {
  const texts = useAppTexts()
  const [params] = useSearchParams()
  const token = params.get('token') ?? params.get('code') ?? ''
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('err')
      setMsg(texts.authPages.missingVerifyParams)
      return
    }
    void userApi
      .confirmEmail(token)
      .then(() => {
        setStatus('ok')
        setMsg(texts.authPages.emailVerified)
      })
      .catch((e) => {
        setStatus('err')
        setMsg(e instanceof Error ? e.message : texts.authPages.verifyFailed)
      })
  }, [
    texts.authPages.emailVerified,
    texts.authPages.missingVerifyParams,
    texts.authPages.verifyFailed,
    token,
  ])

  return (
    <SectionCard title={<>{texts.authPages.verifyEmail}</>}>
      <div className="mt-4 flex items-center gap-3">
        {status === 'loading' ? <Spin /> : null}
        <Text>{msg}</Text>
      </div>
      <Link to="/login" className="mt-4 inline-block">
        <Text className="text-sm text-app-brand">
          {texts.authPages.login}
        </Text>
      </Link>
    </SectionCard>
  )
}
