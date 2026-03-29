import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import { Loader } from '@cloudflare/kumo/components/loader'
import { useI18n } from '../../lib/i18n'
import * as userApi from '../../api/user'

export function VerifyEmailPage() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const token = params.get('token') ?? params.get('code') ?? ''
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('err')
      setMsg('缺少验证参数')
      return
    }
    void userApi
      .confirmEmail(token)
      .then(() => {
        setStatus('ok')
        setMsg('邮箱已验证，请登录。')
      })
      .catch((e) => {
        setStatus('err')
        setMsg(e instanceof Error ? e.message : '验证失败')
      })
  }, [token])

  return (
    <LayerCard className="p-6">
      <LayerCard.Secondary>{t('verifyEmail')}</LayerCard.Secondary>
      <div className="mt-4 flex items-center gap-3">
        {status === 'loading' ? <Loader /> : null}
        <Text>{msg}</Text>
      </div>
      <Link to="/login" className="mt-4 inline-block">
        <Text size="sm" DANGEROUS_className="text-kumo-accent">
          {t('login')}
        </Text>
      </Link>
    </LayerCard>
  )
}
