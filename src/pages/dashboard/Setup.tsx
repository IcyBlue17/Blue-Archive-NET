import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAppTexts } from '@/content/texts'
import { AQUA_CONNECTION, AQUA_CONNECTION_ACCEL } from '@/lib/config'
import * as userApi from '@/api/user'
import { Button, Tag } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { useToast } from '@/components/ui/toast'
import { ClipboardField } from '@/components/ui/ClipboardField'
import { Text } from '@/components/ui/Text'
import { LabeledSwitch } from '@/components/ui/LabeledSwitch'

function formatKeychip(raw: string) {
  const normalized = raw.replace(/[^0-9A-Z]/gi, '').toUpperCase()
  if (!normalized) return ''
  if (normalized.length <= 4) return normalized
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 15)}`
}

function stripScheme(url: string) {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '')
}

/** 旧版 segatools 没有 replaceHost，只能靠 startup 把流量指到加速入口。 */
function buildSampleIni(dns: string, accel: string, keychipId: string, legacy: boolean) {
  const idLine = formatKeychip(keychipId) || 'A39E-01R94432534'
  const host = stripScheme(dns) || 'your-aquadx-host.example'
  const accelHost = stripScheme(accel) || host
  return `[dns]
default=${host}
${legacy ? `startup=${accelHost}` : 'replaceHost=1'}

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
  const [legacySegatools, setLegacySegatools] = useState(false)

  useEffect(() => {
    void userApi
      .listKeychips()
      .then((keychips) => setKeychip(keychips[0] ?? null))
      .catch(() => setKeychip(null))
  }, [])

  const iniText = useMemo(
    () =>
      buildSampleIni(
        AQUA_CONNECTION || copy.setup.dnsPlaceholder,
        AQUA_CONNECTION_ACCEL,
        keychip ?? '',
        legacySegatools,
      ),
    [copy.setup.dnsPlaceholder, keychip, legacySegatools],
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
        {AQUA_CONNECTION ? (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Text>{AQUA_CONNECTION}</Text>
              <Tag color="processing">{copy.setup.connectionPrimary}</Tag>
            </div>
            {AQUA_CONNECTION_ACCEL ? (
              <div className="flex items-center gap-2">
                <Text>{AQUA_CONNECTION_ACCEL}</Text>
                <Tag>{copy.setup.connectionAccel}</Tag>
              </div>
            ) : null}
          </div>
        ) : (
          <Text className="mt-2">{copy.setup.connectionEnvHint}</Text>
        )}
      </SectionCard>
      <SectionCard title={<>{copy.setup.iniExample}</>} className="mb-6">
        <blockquote className="border-app-line text-app-subtle mt-3 border-l-2 pl-3 text-sm">
          {copy.setup.iniHint}
        </blockquote>
        <div className="mt-4">
          <LabeledSwitch
            label={copy.setup.legacySegatools}
            checked={legacySegatools}
            onChange={(on) => setLegacySegatools(Boolean(on))}
          />
        </div>
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
