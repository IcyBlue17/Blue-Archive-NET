import { useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Textarea } from '@cloudflare/kumo/components/input'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { PageHeader } from '../../components/common/PageHeader'
import * as transferApi from '../../api/transfer'
import type { AllNetClient, TrStreamMessage } from '../../lib/types'
import { useI18n } from '../../lib/i18n'

export function TransferPage() {
  const { t } = useI18n()
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
      setLog((l) => [...l, '连接检测成功'])
    } catch (e) {
      setErr(e instanceof Error ? e.message : '失败')
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
      setErr(e instanceof Error ? e.message : '失败')
    } finally {
      setPending(false)
    }
  }

  async function push() {
    setErr(null)
    setPending(true)
    try {
      await transferApi.push(client(), pushJson || exported)
      setLog((l) => [...l, '推送完成'])
    } catch (e) {
      setErr(e instanceof Error ? e.message : '失败')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <PageHeader title={t('transfer')} crumbs={[{ label: t('home'), href: '/home' }]} />
      <LayerCard className="mb-6 p-4">
        <LayerCard.Secondary>源服务器 / 目标服务器参数</LayerCard.Secondary>
        <Text DANGEROUS_className="text-kumo-subtle mt-2 text-sm">
          dns 为机台可访问的 AquaDX URL；card 为卡号；keychip、game、version 与 ALL.Net 配置一致。
        </Text>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <Text size="sm">DNS (URL)</Text>
            <Input value={dns} onChange={(e) => setDns(e.target.value)} placeholder="https://..." />
          </label>
          <label className="flex flex-col gap-1">
            <Text size="sm">Card</Text>
            <Input value={card} onChange={(e) => setCard(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text size="sm">Keychip</Text>
            <Input value={keychip} onChange={(e) => setKeychip(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Text size="sm">Game code</Text>
            <Input value={game} onChange={(e) => setGame(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <Text size="sm">Version</Text>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={test} disabled={pending}>
            检测连接
          </Button>
          <Button onClick={pull} disabled={pending}>
            拉取导出 (SSE)
          </Button>
          <Button variant="primary" onClick={push} disabled={pending}>
            推送 JSON
          </Button>
        </div>
        {err ? <Text DANGEROUS_className="text-kumo-danger mt-2">{err}</Text> : null}
      </LayerCard>
      <LayerCard className="mb-6 p-4">
        <LayerCard.Secondary>日志</LayerCard.Secondary>
        <pre className="text-kumo-subtle mt-2 max-h-40 overflow-auto text-xs">{log.join('\n') || '—'}</pre>
      </LayerCard>
      <LayerCard className="p-4">
        <LayerCard.Secondary>导出数据 / 手动粘贴推送</LayerCard.Secondary>
        <Textarea
          className="mt-2 min-h-32 font-mono text-xs"
          value={pushJson || exported}
          onChange={(e) => setPushJson(e.target.value)}
          placeholder="pull 成功后自动填入，或可粘贴 JSON"
        />
      </LayerCard>
    </div>
  )
}
