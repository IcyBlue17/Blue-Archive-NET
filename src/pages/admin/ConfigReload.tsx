import { useState } from 'react'
import { useKumoToastManager } from '@cloudflare/kumo'
import { Button } from '@cloudflare/kumo/components/button'
import { Text } from '@cloudflare/kumo/components/text'
import * as configReloadApi from '../../api/admin/configReload'
import { AdminSection } from '../../components/admin/AdminSection'
import { useAppTexts } from '../../content/texts'

function ValueRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid grid-cols-[minmax(0,190px)_1fr] gap-3 border-b border-kumo-line px-3 py-2 text-sm last:border-b-0">
      <div className="text-kumo-subtle">{label}</div>
      <div className="break-all font-medium text-kumo-default">{value}</div>
    </div>
  )
}

function BoolRow({
  label,
  value,
  yes,
  no,
}: {
  label: string
  value: boolean
  yes: string
  no: string
}) {
  return <ValueRow label={label} value={value ? yes : no} />
}

export function AdminConfigReloadPage() {
  const texts = useAppTexts()
  const toast = useKumoToastManager()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<configReloadApi.ConfigReloadResponse | null>(null)

  async function runReload() {
    setLoading(true)
    setError(null)
    try {
      const next = await configReloadApi.reloadServerConfig()
      setResult(next)
      toast.add({
        title: texts.admin.configReload.successTitle,
        variant: 'success',
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : texts.common.failed
      setError(message)
      toast.add({
        title: texts.admin.configReload.failedTitle,
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminSection title={texts.admin.configReload.title} bodyClassName="mt-4">
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={loading} onClick={() => void runReload()}>
            {loading ? texts.admin.configReload.running : texts.admin.configReload.run}
          </Button>
        </div>
        {error ? <Text DANGEROUS_className="text-kumo-danger mt-3">{error}</Text> : null}
      </AdminSection>

      {result ? (
        <>
          <AdminSection title={texts.admin.configReload.summary} bodyClassName="mt-4">
            <div className="overflow-hidden rounded-xl border border-kumo-line">
              <ValueRow label={texts.admin.configReload.status} value={result.status} />
              <ValueRow
                label={texts.admin.configReload.sourcePath}
                value={result.sourcePath || texts.admin.configReload.emptyValue}
              />
              <ValueRow
                label={texts.admin.configReload.reloadedPrefixes}
                value={result.reloadedPrefixes.length}
              />
            </div>
          </AdminSection>

          <AdminSection title={texts.admin.configReload.reloadedPrefixesTitle} bodyClassName="mt-4">
            <div className="flex flex-wrap gap-2">
              {result.reloadedPrefixes.map((prefix) => (
                <span
                  key={prefix}
                  className="rounded-md bg-kumo-fill px-2 py-1 text-xs text-kumo-default"
                >
                  {prefix}
                </span>
              ))}
            </div>
          </AdminSection>

          <div className="grid gap-6 xl:grid-cols-2">
            <AdminSection title={texts.admin.configReload.chusanTitle} bodyClassName="mt-4">
              <div className="overflow-hidden rounded-xl border border-kumo-line">
                <ValueRow
                  label={texts.admin.configReload.teamName}
                  value={result.chusan.teamName || texts.admin.configReload.emptyValue}
                />
                <ValueRow
                  label={texts.admin.configReload.defaultTeamId}
                  value={result.chusan.defaultTeamId}
                />
                <BoolRow
                  label={texts.admin.configReload.loginBonusEnable}
                  value={result.chusan.loginBonusEnable}
                  yes={texts.common.yes}
                  no={texts.common.no}
                />
                <ValueRow
                  label={texts.admin.configReload.allMusicUrl}
                  value={result.chusan.allMusicUrl || texts.admin.configReload.emptyValue}
                />
                <ValueRow
                  label={texts.admin.configReload.remoteMusicCount}
                  value={result.chusan.remoteMusicCount}
                />
              </div>
            </AdminSection>

            <AdminSection title={texts.admin.configReload.oauthTitle} bodyClassName="mt-4">
              <div className="overflow-hidden rounded-xl border border-kumo-line">
                <ValueRow
                  label={texts.admin.configReload.frontendBaseUrl}
                  value={result.oauth.frontendBaseUrl || texts.admin.configReload.emptyValue}
                />
                <ValueRow
                  label={texts.admin.configReload.backendBaseUrl}
                  value={result.oauth.backendBaseUrl || texts.admin.configReload.emptyValue}
                />
                <ValueRow
                  label={texts.admin.configReload.allowedOrigins}
                  value={result.oauth.allowedOrigins.length}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.oauth.allowedOrigins.map((origin) => (
                  <span
                    key={origin}
                    className="rounded-md bg-kumo-fill px-2 py-1 text-xs text-kumo-default"
                  >
                    {origin}
                  </span>
                ))}
              </div>
            </AdminSection>

            <AdminSection title={texts.admin.configReload.censorTitle} bodyClassName="mt-4">
              <div className="overflow-hidden rounded-xl border border-kumo-line">
                <BoolRow
                  label={texts.admin.configReload.enabled}
                  value={result.censor.enabled}
                  yes={texts.common.yes}
                  no={texts.common.no}
                />
                <BoolRow
                  label={texts.admin.configReload.failOpen}
                  value={result.censor.failOpen}
                  yes={texts.common.yes}
                  no={texts.common.no}
                />
                <BoolRow
                  label={texts.admin.configReload.baiduEnabled}
                  value={result.censor.baiduEnabled}
                  yes={texts.common.yes}
                  no={texts.common.no}
                />
                <BoolRow
                  label={texts.admin.configReload.openAiEnabled}
                  value={result.censor.openAiEnabled}
                  yes={texts.common.yes}
                  no={texts.common.no}
                />
                <ValueRow
                  label={texts.admin.configReload.openAiModel}
                  value={result.censor.openAiModel || texts.admin.configReload.emptyValue}
                />
              </div>
            </AdminSection>

            <AdminSection title={texts.admin.configReload.gameDataTitle} bodyClassName="mt-4">
              <div className="overflow-hidden rounded-xl border border-kumo-line">
                <ValueRow
                  label={texts.admin.configReload.chu3Events}
                  value={result.gameData.chu3Events}
                />
                <ValueRow
                  label={texts.admin.configReload.chu3LoginBonusPresets}
                  value={result.gameData.chu3LoginBonusPresets}
                />
                <ValueRow
                  label={texts.admin.configReload.chu3LoginBonuses}
                  value={result.gameData.chu3LoginBonuses}
                />
              </div>
            </AdminSection>
          </div>

          <AdminSection title={texts.admin.configReload.rawResponse} bodyClassName="mt-4">
            <pre className="max-h-96 overflow-auto rounded-xl border border-kumo-line bg-kumo-base px-3 py-3 text-xs leading-6">
              {JSON.stringify(result, null, 2)}
            </pre>
          </AdminSection>
        </>
      ) : null}
    </div>
  )
}
