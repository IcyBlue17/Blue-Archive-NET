import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAppTexts } from '@/content/texts'
import * as transferApi from '@/api/transfer'
import type { AllNetClient, TrStreamMessage } from '@/lib/types'
import { Button, Input } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { Text } from '@/components/ui/Text'

export function TransferPage() {
  const copy = useAppTexts()
  const [dns, setDns] = useState('')
  const [card, setCard] = useState('')
  const [keychip, setKeychip] = useState('')
  const [game, setGame] = useState('SDHD')
  const [version, setVersion] = useState('2.30')
  const [log, setLog] = useState<string[]>([])
  const [exported, setExported] = useState('')
  const [pushJson, setPushJson] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function client(): AllNetClient {
    return { dns, card, keychip, game, version }
  }

  async function test() {
    setErr(null)
    setPending(true)
    try {
      await transferApi.check(client())
      setLog((l) => [...l, copy.transfer.connectionSuccess])
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.common.failed)
    } finally {
      setPending(false)
    }
  }

  async function pull() {
    setErr(null)
    setPending(true)
    setLog([])
    try {
      await transferApi.pull(client(), (msg: TrStreamMessage) => {
        const m = msg as { message?: string; error?: string; data?: string }
        if (m.message) setLog((l) => [...l, m.message!])
        if (m.error) setErr(m.error)
        if (m.data) setExported(m.data)
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.common.failed)
    } finally {
      setPending(false)
    }
  }

  async function push() {
    setErr(null)
    setPending(true)
    try {
      await transferApi.push(client(), pushJson || exported)
      setLog((l) => [...l, copy.transfer.pushDone])
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.common.failed)
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <PageHeader title={copy.nav.transfer} crumbs={[{ label: copy.nav.home, href: '/home' }]} />
      <SectionCard title={<>{copy.transfer.serverParams}</>} className="mb-6">
        <Text className="text-app-subtle mt-2 text-sm">
          {copy.transfer.serverParamsHint}
        </Text>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <Text className="text-sm">{copy.transfer.dns}</Text>
            <Input value={dns} onChange={(e) => setDns(e.target.value)} placeholder="https://..." />
          </label>
          <label className="flex flex-col gap-1">
            <Text className="text-sm">{copy.transfer.card}</Text>
            <Input value={card} onChange={(e) => setCard(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text className="text-sm">{copy.transfer.keychip}</Text>
            <Input value={keychip} onChange={(e) => setKeychip(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text className="text-sm">{copy.transfer.gameCode}</Text>
            <Input value={game} onChange={(e) => setGame(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <Text className="text-sm">{copy.transfer.version}</Text>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={test} disabled={pending}>
            {copy.transfer.testConnection}
          </Button>
          <Button onClick={pull} disabled={pending}>
            {copy.transfer.pullExport}
          </Button>
          <Button type="primary" onClick={push} disabled={pending}>
            {copy.transfer.pushJson}
          </Button>
        </div>
        {err ? <Text className="text-app-danger mt-2">{err}</Text> : null}
      </SectionCard>
      <SectionCard title={<>{copy.transfer.logs}</>} className="mb-6">
        <pre className="text-app-subtle mt-2 max-h-40 overflow-auto text-xs">{log.join('\n') || copy.common.empty}</pre>
      </SectionCard>
      <SectionCard title={<>{copy.transfer.exportData}</>}>
        <Input.TextArea
          className="mt-2 min-h-32 font-mono text-xs"
          value={pushJson || exported}
          onChange={(e) => setPushJson(e.target.value)}
          placeholder={copy.transfer.exportPlaceholder}
        />
      </SectionCard>
    </div>
  )
}
