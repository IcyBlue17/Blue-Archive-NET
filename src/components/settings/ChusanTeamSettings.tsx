import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Text } from '@cloudflare/kumo/components/text'
import * as gameApi from '../../api/game'
import { qk } from '../../lib/query'
import type { SettingFieldLocale } from '../../lib/settingsFieldLabels'
import { useAppTexts } from '../../content/texts'

const RANK_LIMIT = 10

export function ChusanTeamSettings({ username }: { username: string; locale: SettingFieldLocale }) {
  const texts = useAppTexts()
  const qc = useQueryClient()
  const [teamId, setTeamId] = useState('')
  const [teamName, setTeamName] = useState('')
  const [emblemId, setEmblemId] = useState('0')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const summaryQuery = useQuery({
    queryKey: qk.chu3Team,
    queryFn: () => gameApi.chu3Team(),
  })
  const rankQuery = useQuery({
    queryKey: qk.chu3TeamRanking(RANK_LIMIT),
    queryFn: () => gameApi.chu3TeamRanking(RANK_LIMIT),
  })

  useEffect(() => {
    const x = summaryQuery.data
    if (!x) return
    setTeamId(x.teamId > 0 ? String(x.teamId) : '')
    setTeamName(x.teamName || '')
    setEmblemId(String(x.emblemId || 0))
  }, [summaryQuery.data])

  async function save() {
    setMsg(null)
    setErr(null)
    const idNum = Number.parseInt(teamId, 10)
    const emblemNum = Number.parseInt(emblemId || '0', 10)
    if (!Number.isFinite(idNum) || idNum <= 0) {
      setErr(texts.chusanTeamSettings.invalidTeamId)
      return
    }
    if (!Number.isFinite(emblemNum) || emblemNum < 0) {
      setErr(texts.chusanTeamSettings.invalidEmblem)
      return
    }

    setSaving(true)
    try {
      await gameApi.chu3TeamSet(idNum, teamName.trim(), emblemNum)
      await Promise.all([
        summaryQuery.refetch(),
        rankQuery.refetch(),
        qc.invalidateQueries({ queryKey: qk.homeSummary(username) }),
        qc.invalidateQueries({ queryKey: qk.gameDash(username, 'chu3') }),
        qc.invalidateQueries({ queryKey: qk.chu3Rivals }),
      ])
      setMsg(texts.chusanTeamSettings.saved)
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.common.failed)
    } finally {
      setSaving(false)
    }
  }

  const summary = summaryQuery.data
  const ranking = rankQuery.data ?? []

  return (
    <section>
      <h3 className="text-kumo-text mb-2 text-base font-semibold">
        {texts.chusanTeamSettings.team}
      </h3>
      <Text DANGEROUS_className="text-kumo-subtle mb-3 text-sm">
        {texts.chusanTeamSettings.hint}
      </Text>

      {summaryQuery.isPending && !summary ? (
        <Text DANGEROUS_className="text-kumo-subtle text-sm">
          {texts.chusanTeamSettings.loading}
        </Text>
      ) : (
        <div className="border-kumo-border bg-kumo-background-alt mb-4 grid gap-3 rounded-xl border p-4 md:grid-cols-3">
          <div>
            <div className="text-kumo-subtle text-xs">{texts.chusanTeamSettings.currentTeam}</div>
            <div className="text-kumo-text mt-1 text-lg font-semibold">{summary?.teamName || '—'}</div>
            <div className="text-kumo-subtle mt-1 text-sm">{texts.common.id} {summary?.teamId || 0}</div>
          </div>
          <div>
            <div className="text-kumo-subtle text-xs">{texts.chusanTeamSettings.teamExpRank}</div>
            <div className="text-kumo-text mt-1 text-lg font-semibold">
              {(summary?.teamPoint ?? 0).toLocaleString()} / #{summary?.teamRank || 0}
            </div>
            <div className="text-kumo-subtle mt-1 text-sm">
              {texts.chusanTeamSettings.members(summary?.memberCount || 0)}
            </div>
          </div>
          <div>
            <div className="text-kumo-subtle text-xs">{texts.chusanTeamSettings.myExpEmblem}</div>
            <div className="text-kumo-text mt-1 text-lg font-semibold">
              {(summary?.myPoint ?? 0).toLocaleString()} / {summary?.emblemId ?? 0}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 grid max-w-3xl gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{texts.chusanTeamSettings.teamId}</span>
          <Input type="number" value={teamId} onChange={(e) => setTeamId(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm font-medium">{texts.chusanTeamSettings.teamName}</span>
          <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{texts.chusanTeamSettings.emblemId}</span>
          <Input type="number" value={emblemId} onChange={(e) => setEmblemId(e.target.value)} />
        </label>
      </div>

      {msg ? <Text DANGEROUS_className="text-kumo-success mb-2 text-sm">{msg}</Text> : null}
      {err ? <Text DANGEROUS_className="text-kumo-danger mb-2 text-sm">{err}</Text> : null}

      <Button variant="secondary" disabled={saving} onClick={() => void save()}>
        {texts.chusanTeamSettings.save}
      </Button>

      <div className="mt-6">
        <h4 className="text-kumo-text mb-2 text-sm font-semibold">
          {texts.chusanTeamSettings.ranking}
        </h4>
        <div className="border-kumo-border divide-kumo-border overflow-hidden rounded-xl border">
          {ranking.length ? (
            ranking.map((row) => (
              <div
                key={row.teamId}
                className="bg-kumo-background-alt flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-kumo-text flex items-center gap-2 font-medium">
                    <span>#{row.rank}</span>
                    <span className="truncate">{row.teamName || texts.common.teamWithId(row.teamId)}</span>
                  </div>
                  <div className="text-kumo-subtle text-xs">
                    {texts.common.id} {row.teamId} · {texts.chusanTeamSettings.emblem(row.emblemId)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-kumo-text font-semibold">{row.teamPoint.toLocaleString()}</div>
                  <div className="text-kumo-subtle text-xs">
                    {texts.chusanTeamSettings.members(row.memberCount)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-kumo-background-alt px-4 py-3 text-sm text-kumo-subtle">
              {texts.chusanTeamSettings.noData}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
