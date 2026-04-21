import { useEffect, useMemo, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { ClipboardText } from '@cloudflare/kumo/components/clipboard-text'
import { useKumoToastManager } from '@cloudflare/kumo'
import { PageHeader } from '../../components/common/PageHeader'
import { useAppTexts } from '../../content/texts'
import { AQUA_CONNECTION } from '../../lib/config'
import * as userApi from '../../api/user'

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
  const copy = useAppTexts()
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
    () => buildSampleIni(AQUA_CONNECTION || copy.setup.dnsPlaceholder, keychip ?? ''),
    [copy.setup.dnsPlaceholder, keychip],
  )

  async function allocate() {
    setErr(null)
    try {
      const k = await userApi.allocateKeychip()
      setKeychip(k)
      toast.add({
        title: copy.setup.allocateSuccessTitle,
        description: copy.setup.allocateSuccessDesc,
        variant: 'success',
      })
    } catch (e) {
      const m = e instanceof Error ? e.message : copy.common.failed
      setErr(m)
      toast.add({ title: copy.setup.allocateFailedTitle, description: m, variant: 'error' })
    }
  }

  return (
    <div>
      <PageHeader title={copy.nav.setup} crumbs={[{ label: copy.nav.home, href: '/home' }]} />
      <LayerCard className="mb-6 p-4">
        <LayerCard.Secondary>{copy.setup.connectionAddress}</LayerCard.Secondary>
        <Text DANGEROUS_className="mt-2">
          {AQUA_CONNECTION || copy.setup.connectionEnvHint}
        </Text>
      </LayerCard>
      <LayerCard className="mb-6 p-4">
        <LayerCard.Secondary>{copy.setup.iniExample}</LayerCard.Secondary>
        <blockquote className="border-kumo-border text-kumo-subtle mt-3 border-l-2 pl-3 text-sm">
          {copy.setup.iniHint}
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
          {copy.setup.copyAll}
        </Button>
      </LayerCard>
      <LayerCard className="p-4">
        <LayerCard.Secondary>{copy.setup.keychip}</LayerCard.Secondary>
        <Text DANGEROUS_className="text-kumo-subtle mt-2 text-sm">
          {copy.setup.keychipHint}
        </Text>
        {keychip ? (
          <div className="mt-4">
            <ClipboardText text={formatKeychip(keychip)} />
          </div>
        ) : (
          <Text DANGEROUS_className="mt-2">{copy.setup.notAllocated}</Text>
        )}
        {err ? <Text DANGEROUS_className="text-kumo-danger mt-2">{err}</Text> : null}
        <Button type="button" className="mt-4" onClick={() => void allocate()}>
          {copy.setup.allocate}
        </Button>
      </LayerCard>
    </div>
  )
}
