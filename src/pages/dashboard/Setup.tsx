import { useEffect, useMemo, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { ClipboardText } from '@cloudflare/kumo/components/clipboard-text'
import { useKumoToastManager } from '@cloudflare/kumo'
import { PageHeader } from '../../components/common/PageHeader'
import { AQUA_CONNECTION } from '../../lib/config'
import * as userApi from '../../api/user'
import { useI18n } from '../../lib/i18n'

/** 与原版 `SetupInstructions.svelte` 一致的示例片段 + 可替换占位（便于对照 segatools）。 */
function formatKeychip(raw: string) {
  const normalized = raw.replace(/[^0-9A-Z]/gi, '').toUpperCase()
  if (!normalized) return ''
  if (normalized.length <= 4) return normalized
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 15)}`
}

function buildSampleIni(dns: string, keychipId: string) {
  const idLine = formatKeychip(keychipId) || 'A39E-01R94432534'
  return `[dns]
default=${dns || 'https://your-aquadx-host.example'}

[keychip]
enable=1
id=${idLine}
`
}

export function SetupPage() {
  const { t } = useI18n()
  const toast = useKumoToastManager()
  const [keychip, setKeychip] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void userApi
      .listKeychips()
      .then((keychips) => setKeychip(keychips[0] ?? null))
      .catch(() => setKeychip(null))
  }, [])

  const iniText = useMemo(
    () => buildSampleIni(AQUA_CONNECTION || 'https://你的服务器地址', keychip ?? ''),
    [keychip],
  )

  async function allocate() {
    setErr(null)
    try {
      const k = await userApi.allocateKeychip()
      setKeychip(k)
      toast.add({
        title: 'Keychip 已就绪',
        description: '已分配新的 keychip，旧编号已失效；可直接复制下方 segatools 示例。',
        variant: 'success',
      })
    } catch (e) {
      const m = e instanceof Error ? e.message : '失败'
      setErr(m)
      toast.add({ title: '分配失败', description: m, variant: 'error' })
    }
  }

  return (
    <div>
      <PageHeader title={t('setup')} crumbs={[{ label: t('home'), href: '/home' }]} />
      <LayerCard className="mb-6 p-4">
        <LayerCard.Secondary>连接地址</LayerCard.Secondary>
        <Text DANGEROUS_className="mt-2">
          {AQUA_CONNECTION || '请在环境变量配置 VITE_AQUA_CONNECTION（机台填写的 DNS / URL）'}
        </Text>
      </LayerCard>
      <LayerCard className="mb-6 p-4">
        <LayerCard.Secondary>segatools.ini 示例</LayerCard.Secondary>
        <blockquote className="border-kumo-border text-kumo-subtle mt-3 border-l-2 pl-3 text-sm">
          以下为参考原版 AquaNet 的示例片段：`[dns]` 与 `[keychip]` 会填入上方连接地址与当前账号
          keychip；其余分节为常见占位，请按你实际工具与服主说明修改。
        </blockquote>
        <pre className="bg-kumo-surface-secondary border-kumo-border mt-4 max-h-80 overflow-auto rounded-lg border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {iniText}
        </pre>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => void navigator.clipboard.writeText(iniText)}
        >
          复制全部
        </Button>
      </LayerCard>
      <LayerCard className="p-4">
        <LayerCard.Secondary>Keychip</LayerCard.Secondary>
        <Text DANGEROUS_className="text-kumo-subtle mt-2 text-sm">
          每个账号一个 keychip，用于机台识别。勿分享给他人。
        </Text>
        {keychip ? (
          <div className="mt-4">
            <ClipboardText text={formatKeychip(keychip)} />
          </div>
        ) : (
          <Text DANGEROUS_className="mt-2">尚未分配</Text>
        )}
        {err ? <Text DANGEROUS_className="text-kumo-danger mt-2">{err}</Text> : null}
        <Button type="button" className="mt-4" onClick={() => void allocate()}>
          分配Keychip
        </Button>
      </LayerCard>
    </div>
  )
}
