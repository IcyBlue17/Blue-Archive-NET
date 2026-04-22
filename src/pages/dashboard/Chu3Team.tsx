import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKumoToastManager } from '@cloudflare/kumo'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'
import { PageHeader } from '../../components/common/PageHeader'
import { SkeletonBox } from '../../components/common/Skeleton'
import * as gameApi from '../../api/game'
import { useAuth } from '../../hooks/useAuth'
import { chu3CharacterImageUrl } from '../../lib/chu3Assets'
import { formatDateTimeMaybe } from '../../lib/format'
import { formatDisplayRating } from '../../lib/gameRatingDisplay'
import { useI18n } from '../../lib/i18n'
import { imgCross } from '../../lib/imgSign'
import { qk } from '../../lib/query'
import type { Chu3TeamDetail, Chu3TeamJoinIncoming, Chu3TeamMember } from '../../lib/types'
import { useAppTexts } from '../../content/texts'

function int(raw: string) {
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : NaN
}

function TeamSkeleton() {
  return (
    <LayerCard className="p-4">
      <SkeletonBox className="h-6 w-40 rounded-md" />
      <SkeletonBox className="mt-3 h-4 w-64 rounded-md" />
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-kumo-line rounded-xl border p-3">
            <SkeletonBox className="h-4 w-16 rounded-md" />
            <SkeletonBox className="mt-2 h-6 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </LayerCard>
  )
}

function StatBox({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="border-kumo-line rounded-xl border p-3">
      <div className="text-kumo-subtle text-xs">{label}</div>
      <div className="text-kumo-default mt-2 text-xl font-semibold">{value}</div>
    </div>
  )
}

function MemberRow({
  row,
  locale,
}: {
  row: Chu3TeamMember
  locale: 'zh' | 'en'
}) {
  const texts = useAppTexts()
  const img = chu3CharacterImageUrl(row.characterId, '02')
  return (
    <div className="border-kumo-line rounded-xl border p-3">
      <div className="flex items-start gap-3">
        <div className="border-kumo-line bg-kumo-recessed flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
          {img ? (
            <img
              src={img}
              crossOrigin={imgCross(img)}
              alt={row.userName}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <Text size="sm">{row.userName.slice(0, 1) || '?'}</Text>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate font-semibold text-kumo-default">{row.userName}</div>
            {row.isLeader ? (
              <span className="bg-kumo-recessed rounded-full px-2 py-0.5 text-xs text-kumo-default">
                {texts.teamPage.leader}
              </span>
            ) : null}
          </div>
          <div className="text-kumo-subtle mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>{texts.teamPage.level(row.level)}</div>
            <div>{texts.common.rating} {formatDisplayRating(row.playerRating, 'chu3')}</div>
            <div>{texts.teamPage.exp(row.teamPoint)}</div>
            <div>{texts.teamPage.last(formatDateTimeMaybe(row.lastPlayDate, locale))}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function JoinReqRow({
  row,
  locale,
  busy,
  onApprove,
  onReject,
}: {
  row: Chu3TeamJoinIncoming
  locale: 'zh' | 'en'
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const texts = useAppTexts()
  const img = chu3CharacterImageUrl(row.applicantCharacterId, '02')
  return (
    <div className="border-kumo-line rounded-xl border p-3">
      <div className="flex items-start gap-3">
        <div className="border-kumo-line bg-kumo-recessed flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
          {img ? (
            <img
              src={img}
              crossOrigin={imgCross(img)}
              alt={row.applicantName}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <Text size="sm">{row.applicantName.slice(0, 1) || '?'}</Text>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-kumo-default">{row.applicantName}</div>
          <div className="text-kumo-subtle mt-1 text-sm">
            {texts.teamPage.level(row.applicantLevel)} · {texts.common.rating} {formatDisplayRating(row.applicantRating, 'chu3')}
          </div>
          <div className="text-kumo-subtle mt-1 text-xs">
            {texts.teamPage.requested(formatDateTimeMaybe(row.createdAt, locale))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={onApprove}>
              {texts.teamPage.approve}
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={onReject}>
              {texts.teamPage.reject}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Chu3TeamPage() {
  const { locale } = useI18n()
  const texts = useAppTexts()
  const toast = useKumoToastManager()
  const qc = useQueryClient()
  const { user } = useAuth()
  const username = user?.username ?? ''
  const [createName, setCreateName] = useState('')
  const [createEmblem, setCreateEmblem] = useState('0')
  const [editName, setEditName] = useState('')
  const [editEmblem, setEditEmblem] = useState('0')
  const [joinId, setJoinId] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const teamQuery = useQuery<Chu3TeamDetail>({
    queryKey: qk.chu3TeamDetail(),
    placeholderData: (old) => old,
    queryFn: () => gameApi.chu3TeamDetail(),
  })
  const reqQuery = useQuery({
    queryKey: qk.chu3TeamRequests,
    placeholderData: (old) => old,
    queryFn: () => gameApi.chu3TeamRequests(),
  })

  const myTeam = teamQuery.data && teamQuery.data.teamId > 0 ? teamQuery.data : null
  const incoming = myTeam?.canManage ? reqQuery.data?.incoming ?? [] : []
  const outgoing = !myTeam ? reqQuery.data?.outgoing ?? null : null

  const joinIdNum = useMemo(() => {
    const n = int(joinId)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [joinId])

  const previewQuery = useQuery<Chu3TeamDetail>({
    queryKey: qk.chu3TeamDetail(joinIdNum ?? 0),
    enabled: !myTeam && !!joinIdNum,
    placeholderData: (old) => old,
    queryFn: () => gameApi.chu3TeamDetail(joinIdNum ?? undefined),
  })

  useEffect(() => {
    if (!myTeam) {
      setEditName('')
      setEditEmblem('0')
      return
    }
    setEditName(myTeam.teamName || '')
    setEditEmblem(String(myTeam.emblemId ?? 0))
  }, [myTeam])

  async function refetch() {
    await Promise.all([
      teamQuery.refetch(),
      reqQuery.refetch(),
      qc.invalidateQueries({ queryKey: ['chu3-team-ranking'] }),
      qc.invalidateQueries({ queryKey: qk.chu3Team }),
      qc.invalidateQueries({ queryKey: qk.homeSummary(username) }),
      qc.invalidateQueries({ queryKey: qk.gameDash(username, 'chu3') }),
    ])
  }

  function errToast(title: string, err: unknown) {
    toast.add({
      title,
      description: err instanceof Error ? err.message : texts.teamPage.requestFailed,
      variant: 'error',
    })
  }

  async function createTeam() {
    const name = createName.trim()
    const emblem = int(createEmblem || '0')
    if (!name) {
      errToast(texts.teamPage.enterTeamNameTitle, new Error(texts.teamPage.enterTeamNameDesc))
      return
    }
    if (!Number.isFinite(emblem) || emblem < 0) {
      errToast(texts.teamPage.invalidEmblemTitle, new Error(texts.teamPage.invalidEmblemDesc))
      return
    }

    setBusy('create')
    try {
      const row = await gameApi.chu3TeamCreate(name, emblem)
      setCreateName('')
      setJoinId('')
      toast.add({
        title: texts.teamPage.createdTitle,
        description: texts.teamPage.createdDesc(row.teamName || name, row.teamId),
      })
      await refetch()
    } catch (err) {
      errToast(texts.teamPage.createFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function joinTeam(teamId: number) {
    setBusy('join')
    try {
      const row = await gameApi.chu3TeamJoin(teamId)
      toast.add({
        title: texts.teamPage.joinRequestedTitle,
        description: texts.teamPage.joinRequestedDesc(row.teamName),
      })
      setJoinId('')
      await refetch()
    } catch (err) {
      errToast(texts.teamPage.joinFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function cancelReq() {
    setBusy('cancel-request')
    try {
      await gameApi.chu3TeamRequestCancel()
      toast.add({
        title: texts.teamPage.requestCancelledTitle,
      })
      await refetch()
    } catch (err) {
      errToast(texts.teamPage.cancelRequestFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function approveReq(id: number) {
    setBusy(`approve-${id}`)
    try {
      await gameApi.chu3TeamRequestApprove(id)
      toast.add({
        title: texts.teamPage.approvedTitle,
      })
      await refetch()
    } catch (err) {
      errToast(texts.teamPage.approveFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function rejectReq(id: number) {
    setBusy(`reject-${id}`)
    try {
      await gameApi.chu3TeamRequestReject(id)
      toast.add({
        title: texts.teamPage.rejectedTitle,
      })
      await refetch()
    } catch (err) {
      errToast(texts.teamPage.rejectFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function updateTeam() {
    const name = editName.trim()
    const emblem = int(editEmblem || '0')
    if (!name) {
      errToast(texts.teamPage.enterTeamNameTitle, new Error(texts.teamPage.enterTeamNameDesc))
      return
    }
    if (!Number.isFinite(emblem) || emblem < 0) {
      errToast(texts.teamPage.invalidEmblemTitle, new Error(texts.teamPage.invalidEmblemDesc))
      return
    }

    setBusy('update')
    try {
      await gameApi.chu3TeamUpdate(name, emblem)
      toast.add({
        title: texts.teamPage.updatedTitle,
      })
      await refetch()
    } catch (err) {
      errToast(texts.teamPage.updateFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function leaveTeam() {
    if (!window.confirm(texts.teamPage.leaveConfirm)) return
    setBusy('leave')
    try {
      await gameApi.chu3TeamLeave()
      toast.add({
        title: texts.teamPage.leftTitle,
      })
      await refetch()
    } catch (err) {
      errToast(texts.teamPage.leaveFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function disbandTeam() {
    if (!window.confirm(texts.teamPage.disbandConfirm)) return
    setBusy('disband')
    try {
      await gameApi.chu3TeamDisband()
      toast.add({
        title: texts.teamPage.disbandedTitle,
        description: texts.teamPage.disbandedDesc,
      })
      await refetch()
    } catch (err) {
      errToast(texts.teamPage.disbandFailed, err)
    } finally {
      setBusy(null)
    }
  }

  const previewTeam = previewQuery.data && previewQuery.data.teamId > 0 ? previewQuery.data : null
  const members = myTeam?.members ?? []

  return (
    <div>
      <PageHeader title={texts.nav.team} crumbs={[{ label: texts.nav.dashboard, href: '/home' }, { label: texts.nav.team }]} />

      {teamQuery.isPending && !teamQuery.data ? (
        <TeamSkeleton />
      ) : myTeam ? (
        <>
          <LayerCard className="p-4">
            <LayerCard.Secondary>{texts.teamPage.currentTeam}</LayerCard.Secondary>
            <div className="mt-3">
              <div className="text-kumo-default text-2xl font-bold">{myTeam.teamName || texts.common.teamWithId(myTeam.teamId)}</div>
              <div className="text-kumo-subtle mt-1 text-sm">
                {texts.common.id} {myTeam.teamId} · {texts.teamPage.leaderValue(myTeam.leaderName || '—')}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <StatBox label={texts.teamPage.totalExp} value={(myTeam.teamPoint ?? 0).toLocaleString()} />
              <StatBox label={texts.teamPage.myExp} value={(myTeam.myPoint ?? 0).toLocaleString()} />
              <StatBox label={texts.teamPage.memberCount} value={myTeam.memberCount ?? 0} />
              <StatBox label={texts.teamPage.rank} value={myTeam.teamRank ? `#${myTeam.teamRank}` : '—'} />
            </div>
          </LayerCard>

          <LayerCard className="mt-6 p-4">
            <LayerCard.Secondary>{texts.teamPage.actions}</LayerCard.Secondary>
            {myTeam.canManage ? (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
                  <label className="flex flex-col gap-1">
                    <Text size="sm">{texts.teamPage.teamName}</Text>
                    <Input className="h-11" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={texts.teamPage.teamName} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <Text size="sm">{texts.teamPage.teamColorRank}</Text>
                    <Input className="h-11" value={editEmblem} type="number" onChange={(e) => setEditEmblem(e.target.value)} placeholder={texts.teamPage.teamRank} />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button disabled={busy === 'update'} onClick={() => void updateTeam()}>
                    {busy === 'update' ? texts.teamPage.saving : texts.teamPage.saveTeam}
                  </Button>
                  <Button variant="secondary" disabled={busy === 'leave'} onClick={() => void leaveTeam()}>
                    {texts.teamPage.leaveTeam}
                  </Button>
                  <Button variant="secondary" disabled={busy === 'disband'} onClick={() => void disbandTeam()}>
                    {texts.teamPage.disbandTeam}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Text DANGEROUS_className="text-kumo-subtle mt-2 block text-sm">
                  {texts.teamPage.memberViewHint(myTeam.leaderName || '—')}
                </Text>
                <div className="mt-4">
                  <Button variant="secondary" disabled={busy === 'leave'} onClick={() => void leaveTeam()}>
                    {texts.teamPage.leaveTeam}
                  </Button>
                </div>
              </>
            )}
          </LayerCard>

          {myTeam.canManage ? (
            <LayerCard className="mt-6 p-4">
              <div className="flex items-center justify-between gap-3">
                <LayerCard.Secondary>{texts.teamPage.joinRequests}</LayerCard.Secondary>
                <Text DANGEROUS_className="text-kumo-subtle text-sm">
                  {texts.teamPage.pendingRequests(incoming.length)}
                </Text>
              </div>
              {incoming.length ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {incoming.map((row) => (
                    <JoinReqRow
                      key={row.id}
                      row={row}
                      locale={locale}
                      busy={busy === `approve-${row.id}` || busy === `reject-${row.id}`}
                      onApprove={() => void approveReq(row.id)}
                      onReject={() => void rejectReq(row.id)}
                    />
                  ))}
                </div>
              ) : (
                <Text DANGEROUS_className="text-kumo-subtle mt-3 block text-sm">
                  {texts.teamPage.noRequests}
                </Text>
              )}
            </LayerCard>
          ) : null}

          <LayerCard className="mt-6 p-4">
            <div className="flex items-center justify-between gap-3">
              <LayerCard.Secondary>{texts.teamPage.memberList}</LayerCard.Secondary>
              <Text DANGEROUS_className="text-kumo-subtle text-sm">
                {texts.teamPage.membersCount(members.length)}
              </Text>
            </div>
            {members.length ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {members.map((row) => (
                  <MemberRow key={row.extId} row={row} locale={locale} />
                ))}
              </div>
            ) : (
              <Text DANGEROUS_className="text-kumo-subtle mt-3 block text-sm">
                {texts.teamPage.noMembers}
              </Text>
            )}
          </LayerCard>
        </>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <LayerCard className="p-4">
            <LayerCard.Secondary>{texts.teamPage.createTeam}</LayerCard.Secondary>
            <Text DANGEROUS_className="text-kumo-subtle mt-2 block text-sm">
              {texts.teamPage.createHint}
            </Text>
            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
              <label className="flex flex-col gap-1">
                <Text size="sm">{texts.teamPage.teamName}</Text>
                <Input className="h-11" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder={texts.teamPage.teamName} />
              </label>
              <label className="flex flex-col gap-1">
                <Text size="sm">{texts.teamPage.teamColorRank}</Text>
                <Input className="h-11" value={createEmblem} type="number" onChange={(e) => setCreateEmblem(e.target.value)} placeholder={texts.teamPage.optionalTeamRank} />
              </label>
            </div>
            <div className="mt-4">
              <Button disabled={busy === 'create'} onClick={() => void createTeam()}>
                {busy === 'create' ? texts.teamPage.creating : texts.teamPage.createTeam}
              </Button>
            </div>
          </LayerCard>

          <LayerCard className="p-4">
            <LayerCard.Secondary>{texts.teamPage.joinTeam}</LayerCard.Secondary>
            <Text DANGEROUS_className="text-kumo-subtle mt-2 block text-sm">
              {texts.teamPage.joinHint}
            </Text>
            <div className="mt-4 flex gap-3">
              <Input value={joinId} type="number" onChange={(e) => setJoinId(e.target.value)} placeholder={texts.teamPage.teamId} />
              <Button
                disabled={busy === 'join' || !previewTeam}
                onClick={() => previewTeam && void joinTeam(previewTeam.teamId)}
              >
                {busy === 'join' ? texts.teamPage.sending : texts.teamPage.sendRequest}
              </Button>
            </div>

            {outgoing ? (
              <div className="border-kumo-line bg-kumo-tint mt-4 rounded-xl border p-3">
                <div className="font-semibold text-kumo-default">
                  {texts.teamPage.pendingRequest}
                </div>
                <div className="text-kumo-subtle mt-2 text-sm">
                  {outgoing.teamName} · {texts.common.id} {outgoing.teamId}
                </div>
                <div className="text-kumo-subtle mt-1 text-sm">
                  {texts.teamPage.leaderValue(outgoing.leaderName || '—')}
                </div>
                <div className="text-kumo-subtle mt-1 text-xs">
                  {texts.teamPage.requestTime(formatDateTimeMaybe(outgoing.createdAt, locale))}
                </div>
                <div className="mt-3">
                  <Button variant="secondary" disabled={busy === 'cancel-request'} onClick={() => void cancelReq()}>
                    {texts.teamPage.cancelRequest}
                  </Button>
                </div>
              </div>
            ) : previewQuery.isPending && joinIdNum ? (
              <div className="mt-4">
                <SkeletonBox className="h-24 w-full rounded-xl" />
              </div>
            ) : previewTeam ? (
              <div className="border-kumo-line bg-kumo-tint mt-4 rounded-xl border p-3">
                <div className="font-semibold text-kumo-default">{previewTeam.teamName || texts.common.teamWithId(previewTeam.teamId)}</div>
                <div className="text-kumo-subtle mt-2 text-sm">
                  {texts.common.id} {previewTeam.teamId} · {texts.teamPage.leaderValue(previewTeam.leaderName || '—')}
                </div>
                <div className="text-kumo-subtle mt-1 text-sm">
                  {texts.teamPage.previewMeta(previewTeam.memberCount ?? 0, previewTeam.teamRank ? `#${previewTeam.teamRank}` : '—')}
                </div>
              </div>
            ) : previewQuery.error ? (
              <Text DANGEROUS_className="text-kumo-danger mt-4 block text-sm">
                {previewQuery.error instanceof Error ? previewQuery.error.message : texts.common.error}
              </Text>
            ) : (
              <Text DANGEROUS_className="text-kumo-subtle mt-4 block text-sm">
                {texts.teamPage.noTeam}
              </Text>
            )}
          </LayerCard>
        </div>
      )}
    </div>
  )
}
