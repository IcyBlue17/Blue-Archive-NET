import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import { Loader } from '@cloudflare/kumo/components/loader'
import * as userApi from '../../api/user'
import { useAppTexts } from '../../content/texts'

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
  }, [token])

  return (
    <LayerCard className="p-6">
      <LayerCard.Secondary>{texts.authPages.verifyEmail}</LayerCard.Secondary>
      <div className="mt-4 flex items-center gap-3">
        {status === 'loading' ? <Loader /> : null}
        <Text>{msg}</Text>
      </div>
      <Link to="/login" className="mt-4 inline-block">
        <Text size="sm" DANGEROUS_className="text-kumo-accent">
          {texts.authPages.login}
        </Text>
      </Link>
    </LayerCard>
  )
}
