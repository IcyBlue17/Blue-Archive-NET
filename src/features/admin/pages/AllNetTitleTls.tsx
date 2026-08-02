import { useEffect, useState } from 'react'
import * as api from '@/features/admin/api/allnetTitleTls'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useAppTexts } from '@/content/texts'
import { Switch } from 'antd'
import { useToast } from '@/components/ui/toast'
import { Text } from '@/components/ui/Text'

const MANAGED_GAMES = ['SDDT'] as const

export function AdminAllNetTitleTlsPage() {
  const texts = useAppTexts()
  const t = texts.admin.allnetTitleTls
  const toast = useToast()
  const [games, setGames] = useState<Record<string, boolean> | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setError(null)
    try {
      const res = await api.getAllNetTitleTls()
      setGames(res.games)
    } catch (e) {
      setError(e instanceof Error ? e.message : texts.common.failed)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function toggle(gameId: string, next: boolean) {
    setPending(gameId)
    setError(null)
    try {
      const res = await api.setAllNetTitleTls(gameId, next)
      setGames(res.games)
      toast.add({
        title: next ? t.enabledToast(gameId) : t.disabledToast(gameId),
        variant: 'success',
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : texts.common.failed
      setError(message)
      toast.add({ title: texts.common.failed, variant: 'error' })
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminSection title={t.title} bodyClassName="mt-4">
        <Text className="text-app-subtle text-sm">{t.description}</Text>
        <Text className="text-app-danger mt-2 text-sm">{t.warning}</Text>
        {error ? <Text className="text-app-danger mt-3">{error}</Text> : null}

        <div className="mt-4 overflow-hidden rounded-xl border border-app-line">
          {MANAGED_GAMES.map((gameId) => {
            const enabled = games?.[gameId] ?? false
            return (
              <div
                key={gameId}
                className="flex items-center justify-between gap-3 border-b border-app-line px-3 py-3 last:border-b-0"
              >
                <div>
                  <div className="font-medium text-app-default">{gameId}</div>
                  <div className="text-app-subtle text-xs">
                    {enabled ? t.statusEnabled : t.statusDisabled}
                  </div>
                </div>
                <Switch checked={enabled} disabled={games === null || pending === gameId} onChange={(v) => void toggle(gameId, v)} />
              </div>
            )
          })}
        </div>
      </AdminSection>
    </div>
  )
}
