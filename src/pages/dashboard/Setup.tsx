import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAppTexts } from '@/content/texts'
import { AQUA_CONNECTION } from '@/lib/config'
import * as userApi from '@/api/user'
import { Button } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { useToast } from '@/components/ui/toast'
import { ClipboardField } from '@/components/ui/ClipboardField'
import { Text } from '@/components/ui/Text'

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
  const toast = useToast()
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
      <SectionCard title={<>{copy.setup.connectionAddress}</>} className="mb-6">
        <Text className="mt-2">
          {AQUA_CONNECTION || copy.setup.connectionEnvHint}
        </Text>
      </SectionCard>
      <SectionCard title={<>{copy.setup.iniExample}</>} className="mb-6">
        <blockquote className="border-app-line text-app-subtle mt-3 border-l-2 pl-3 text-sm">
          {copy.setup.iniHint}
        </blockquote>
        <pre className="bg-app-recessed border-app-line mt-4 max-h-80 overflow-auto rounded-lg border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {iniText}
        </pre>
        <Button
          htmlType="button"
          size="small"
          className="mt-3"
          onClick={() => void navigator.clipboard.writeText(iniText)}
        >
          {copy.setup.copyAll}
        </Button>
      </SectionCard>
      <SectionCard title={<>{copy.setup.keychip}</>}>
        <Text className="text-app-subtle mt-2 text-sm">
          {copy.setup.keychipHint}
        </Text>
        {keychip ? (
          <div className="mt-4">
            <ClipboardField text={formatKeychip(keychip)} />
          </div>
        ) : (
          <Text className="mt-2">{copy.setup.notAllocated}</Text>
        )}
        {err ? <Text className="text-app-danger mt-2">{err}</Text> : null}
        <Button htmlType="button" className="mt-4" onClick={() => void allocate()}>
          {copy.setup.allocate}
        </Button>
      </SectionCard>
    </div>
  )
}
