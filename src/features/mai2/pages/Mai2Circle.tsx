import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { SkeletonBox } from '@/components/ui/Skeleton'
import * as gameApi from '@/api/game'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTimeMaybe } from '@/lib/format'
import { formatDisplayRating } from '@/lib/gameRatingDisplay'
import { useI18n } from '@/lib/i18n'
import { imgCross } from '@/lib/imgSign'
import { mai2CollectibleImageUrl } from '@/lib/mai2Assets'
import { qk } from '@/lib/query'
import type { Mai2CircleClass, Mai2CircleDetail, Mai2CircleJoinIncoming, Mai2CircleMember } from '@/lib/types'
import { useAppTexts } from '@/content/texts'
import { Button, Input } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { useToast } from '@/components/ui/toast'
import { Text } from '@/components/ui/Text'

function int(raw: string) {
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : NaN
}

const CLASS_COLORS: Record<number, string> = {
  0: 'bg-app-recessed text-app-default',
  1: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  3: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  4: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  5: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  6: 'bg-slate-100 text-slate-800 dark:bg-slate-700/60 dark:text-slate-100',
  7: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-500/40 dark:text-yellow-100',
  8: 'bg-gradient-to-r from-pink-200 via-violet-200 to-sky-200 text-violet-900 dark:from-pink-500/40 dark:via-violet-500/40 dark:to-sky-500/40 dark:text-white',
}

function ClassBadge({ circleClass }: { circleClass?: Mai2CircleClass }) {
  const texts = useAppTexts()
  const cls = circleClass ?? 0
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${CLASS_COLORS[cls] ?? CLASS_COLORS[0]}`}>
      {texts.mai2CirclePage.classes[cls] ?? cls}
    </span>
  )
}

function CircleSkeleton() {
  return (
    <SectionCard>
      <SkeletonBox className="h-6 w-40 rounded-md" />
      <SkeletonBox className="mt-3 h-4 w-64 rounded-md" />
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-app-line rounded-xl border p-3">
            <SkeletonBox className="h-4 w-16 rounded-md" />
            <SkeletonBox className="mt-2 h-6 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function StatBox({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="border-app-line rounded-xl border p-3">
      <div className="text-app-subtle text-xs">{label}</div>
      <div className="text-app-default mt-2 text-xl font-semibold">{value}</div>
    </div>
  )
}

function MemberRow({
  row,
  locale,
}: {
  row: Mai2CircleMember
  locale: 'zh' | 'en'
}) {
  const texts = useAppTexts()
  const img = mai2CollectibleImageUrl('iconId', row.iconId)
  return (
    <div className="border-app-line rounded-xl border p-3">
      <div className="flex items-start gap-3">
        <div className="border-app-line bg-app-recessed flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
          {img ? (
            <img
              src={img}
              crossOrigin={imgCross(img)}
              alt={row.userName}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <Text className="text-sm">{row.userName.slice(0, 1) || '?'}</Text>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate font-semibold text-app-default">{row.userName}</div>
            {row.isLeader ? (
              <span className="bg-app-recessed rounded-full px-2 py-0.5 text-xs text-app-default">
                {texts.mai2CirclePage.leader}
              </span>
            ) : null}
          </div>
          <div className="text-app-subtle mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>{texts.common.rating} {formatDisplayRating(row.playerRating, 'mai2')}</div>
            <div>{texts.mai2CirclePage.point(row.circlePoint)}</div>
            <div>{texts.mai2CirclePage.last(formatDateTimeMaybe(row.lastPlayDate, locale))}</div>
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
  row: Mai2CircleJoinIncoming
  locale: 'zh' | 'en'
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const texts = useAppTexts()
  const img = mai2CollectibleImageUrl('iconId', row.applicantIconId)
  return (
    <div className="border-app-line rounded-xl border p-3">
      <div className="flex items-start gap-3">
        <div className="border-app-line bg-app-recessed flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
          {img ? (
            <img
              src={img}
              crossOrigin={imgCross(img)}
              alt={row.applicantName}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <Text className="text-sm">{row.applicantName.slice(0, 1) || '?'}</Text>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-app-default">{row.applicantName}</div>
          <div className="text-app-subtle mt-1 text-sm">
            {texts.common.rating} {formatDisplayRating(row.applicantRating, 'mai2')}
          </div>
          <div className="text-app-subtle mt-1 text-xs">
            {texts.mai2CirclePage.requested(formatDateTimeMaybe(row.createdAt, locale))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="small" disabled={busy} onClick={onApprove}>
              {texts.mai2CirclePage.approve}
            </Button>
            <Button size="small" disabled={busy} onClick={onReject}>
              {texts.mai2CirclePage.reject}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Mai2CirclePage() {
  const { locale } = useI18n()
  const texts = useAppTexts()
  const toast = useToast()
  const qc = useQueryClient()
  const { user } = useAuth()
  const username = user?.username ?? ''
  const [createName, setCreateName] = useState('')
  const [editName, setEditName] = useState('')
  const [joinId, setJoinId] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const circleQuery = useQuery<Mai2CircleDetail>({
    queryKey: qk.mai2CircleDetail(),
    placeholderData: (old) => old,
    queryFn: () => gameApi.mai2CircleDetail(),
  })
  const reqQuery = useQuery({
    queryKey: qk.mai2CircleRequests,
    placeholderData: (old) => old,
    queryFn: () => gameApi.mai2CircleRequests(),
  })

  const myCircle = circleQuery.data && circleQuery.data.circleId > 0 ? circleQuery.data : null
  const incoming = myCircle?.canManage ? reqQuery.data?.incoming ?? [] : []
  const outgoing = !myCircle ? reqQuery.data?.outgoing ?? null : null

  const joinIdNum = useMemo(() => {
    const n = int(joinId)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [joinId])

  const previewQuery = useQuery<Mai2CircleDetail>({
    queryKey: qk.mai2CircleDetail(joinIdNum ?? 0),
    enabled: !myCircle && !!joinIdNum,
    placeholderData: (old) => old,
    queryFn: () => gameApi.mai2CircleDetail(joinIdNum ?? undefined),
  })

  useEffect(() => {
    setEditName(myCircle?.circleName || '')
  }, [myCircle])

  async function refetch() {
    await Promise.all([
      circleQuery.refetch(),
      reqQuery.refetch(),
      qc.invalidateQueries({ queryKey: ['mai2-circle-ranking'] }),
      qc.invalidateQueries({ queryKey: qk.mai2Circle }),
      qc.invalidateQueries({ queryKey: qk.homeSummary(username) }),
      qc.invalidateQueries({ queryKey: qk.gameDash(username, 'mai2') }),
    ])
  }

  function errToast(title: string, err: unknown) {
    toast.add({
      title,
      description: err instanceof Error ? err.message : texts.mai2CirclePage.requestFailed,
      variant: 'error',
    })
  }

  async function createCircle() {
    const name = createName.trim()
    if (!name) {
      errToast(texts.mai2CirclePage.enterNameTitle, new Error(texts.mai2CirclePage.enterNameDesc))
      return
    }

    setBusy('create')
    try {
      const row = await gameApi.mai2CircleCreate(name)
      setCreateName('')
      setJoinId('')
      toast.add({
        title: texts.mai2CirclePage.createdTitle,
        description: texts.mai2CirclePage.createdDesc(row.circleName || name, row.circleId),
      })
      await refetch()
    } catch (err) {
      errToast(texts.mai2CirclePage.createFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function joinCircle(circleId: number) {
    setBusy('join')
    try {
      const row = await gameApi.mai2CircleJoin(circleId)
      toast.add({
        title: texts.mai2CirclePage.joinRequestedTitle,
        description: texts.mai2CirclePage.joinRequestedDesc(row.circleName),
      })
      setJoinId('')
      await refetch()
    } catch (err) {
      errToast(texts.mai2CirclePage.joinFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function cancelReq() {
    setBusy('cancel-request')
    try {
      await gameApi.mai2CircleRequestCancel()
      toast.add({
        title: texts.mai2CirclePage.requestCancelledTitle,
      })
      await refetch()
    } catch (err) {
      errToast(texts.mai2CirclePage.cancelRequestFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function approveReq(id: number) {
    setBusy(`approve-${id}`)
    try {
      await gameApi.mai2CircleRequestApprove(id)
      toast.add({
        title: texts.mai2CirclePage.approvedTitle,
      })
      await refetch()
    } catch (err) {
      errToast(texts.mai2CirclePage.approveFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function rejectReq(id: number) {
    setBusy(`reject-${id}`)
    try {
      await gameApi.mai2CircleRequestReject(id)
      toast.add({
        title: texts.mai2CirclePage.rejectedTitle,
      })
      await refetch()
    } catch (err) {
      errToast(texts.mai2CirclePage.rejectFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function updateCircle() {
    const name = editName.trim()
    if (!name) {
      errToast(texts.mai2CirclePage.enterNameTitle, new Error(texts.mai2CirclePage.enterNameDesc))
      return
    }

    setBusy('update')
    try {
      await gameApi.mai2CircleUpdate(name)
      toast.add({
        title: texts.mai2CirclePage.updatedTitle,
      })
      await refetch()
    } catch (err) {
      errToast(texts.mai2CirclePage.updateFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function leaveCircle() {
    if (!window.confirm(texts.mai2CirclePage.leaveConfirm)) return
    setBusy('leave')
    try {
      await gameApi.mai2CircleLeave()
      toast.add({
        title: texts.mai2CirclePage.leftTitle,
      })
      await refetch()
    } catch (err) {
      errToast(texts.mai2CirclePage.leaveFailed, err)
    } finally {
      setBusy(null)
    }
  }

  async function disbandCircle() {
    if (!window.confirm(texts.mai2CirclePage.disbandConfirm)) return
    setBusy('disband')
    try {
      await gameApi.mai2CircleDisband()
      toast.add({
        title: texts.mai2CirclePage.disbandedTitle,
        description: texts.mai2CirclePage.disbandedDesc,
      })
      await refetch()
    } catch (err) {
      errToast(texts.mai2CirclePage.disbandFailed, err)
    } finally {
      setBusy(null)
    }
  }

  const previewCircle = previewQuery.data && previewQuery.data.circleId > 0 ? previewQuery.data : null
  const members = myCircle?.members ?? []

  return (
    <div>
      <PageHeader title={texts.nav.mai2Circle} crumbs={[{ label: texts.nav.dashboard, href: '/home' }, { label: texts.nav.mai2Circle }]} />

      {circleQuery.isPending && !circleQuery.data ? (
        <CircleSkeleton />
      ) : myCircle ? (
        <>
          <SectionCard title={<>{texts.mai2CirclePage.currentCircle}</>}>
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-app-default text-2xl font-bold">{myCircle.circleName || texts.common.teamWithId(myCircle.circleId)}</div>
                <ClassBadge circleClass={myCircle.circleClass} />
              </div>
              <div className="text-app-subtle mt-1 text-sm">
                {texts.common.id} {myCircle.circleId} · {texts.mai2CirclePage.leaderValue(myCircle.leaderName || '—')}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <StatBox label={texts.mai2CirclePage.totalPoint} value={(myCircle.circlePoint ?? 0).toLocaleString()} />
              <StatBox label={texts.mai2CirclePage.myPoint} value={(myCircle.myPoint ?? 0).toLocaleString()} />
              <StatBox label={texts.mai2CirclePage.memberCount} value={myCircle.memberCount ?? 0} />
              <StatBox label={texts.mai2CirclePage.rank} value={myCircle.circleRank ? `#${myCircle.circleRank}` : '—'} />
            </div>
          </SectionCard>

          <SectionCard title={<>{texts.mai2CirclePage.actions}</>} className="mt-6">
            {myCircle.canManage ? (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)] md:items-end">
                  <label className="flex flex-col gap-1">
                    <Text className="text-sm">{texts.mai2CirclePage.circleName}</Text>
                    <Input className="h-11" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={texts.mai2CirclePage.circleName} />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button disabled={busy === 'update'} onClick={() => void updateCircle()}>
                    {busy === 'update' ? texts.mai2CirclePage.saving : texts.mai2CirclePage.saveCircle}
                  </Button>
                  <Button disabled={busy === 'leave'} onClick={() => void leaveCircle()}>
                    {texts.mai2CirclePage.leaveCircle}
                  </Button>
                  <Button disabled={busy === 'disband'} onClick={() => void disbandCircle()}>
                    {texts.mai2CirclePage.disbandCircle}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Text className="text-app-subtle mt-2 block text-sm">
                  {texts.mai2CirclePage.memberViewHint(myCircle.leaderName || '—')}
                </Text>
                <div className="mt-4">
                  <Button disabled={busy === 'leave'} onClick={() => void leaveCircle()}>
                    {texts.mai2CirclePage.leaveCircle}
                  </Button>
                </div>
              </>
            )}
          </SectionCard>

          {myCircle.canManage ? (
            <SectionCard className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <Text strong>{texts.mai2CirclePage.joinRequests}</Text>
                <Text className="text-app-subtle text-sm">
                  {texts.mai2CirclePage.pendingRequests(incoming.length)}
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
                <Text className="text-app-subtle mt-3 block text-sm">
                  {texts.mai2CirclePage.noRequests}
                </Text>
              )}
            </SectionCard>
          ) : null}

          <SectionCard className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <Text strong>{texts.mai2CirclePage.memberList}</Text>
              <Text className="text-app-subtle text-sm">
                {texts.mai2CirclePage.membersCount(members.length)}
              </Text>
            </div>
            {members.length ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {members.map((row) => (
                  <MemberRow key={row.extId} row={row} locale={locale} />
                ))}
              </div>
            ) : (
              <Text className="text-app-subtle mt-3 block text-sm">
                {texts.mai2CirclePage.noMembers}
              </Text>
            )}
          </SectionCard>
        </>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title={<>{texts.mai2CirclePage.createCircle}</>}>
            <Text className="text-app-subtle mt-2 block text-sm">
              {texts.mai2CirclePage.createHint}
            </Text>
            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)] md:items-end">
              <label className="flex flex-col gap-1">
                <Text className="text-sm">{texts.mai2CirclePage.circleName}</Text>
                <Input className="h-11" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder={texts.mai2CirclePage.circleName} />
              </label>
            </div>
            <div className="mt-4">
              <Button disabled={busy === 'create'} onClick={() => void createCircle()}>
                {busy === 'create' ? texts.mai2CirclePage.creating : texts.mai2CirclePage.createCircle}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={<>{texts.mai2CirclePage.joinCircle}</>}>
            <Text className="text-app-subtle mt-2 block text-sm">
              {texts.mai2CirclePage.joinHint}
            </Text>
            <div className="mt-4 flex gap-3">
              <Input value={joinId} type="number" onChange={(e) => setJoinId(e.target.value)} placeholder={texts.mai2CirclePage.circleId} />
              <Button
                disabled={busy === 'join' || !previewCircle}
                onClick={() => previewCircle && void joinCircle(previewCircle.circleId)}
              >
                {busy === 'join' ? texts.mai2CirclePage.sending : texts.mai2CirclePage.sendRequest}
              </Button>
            </div>

            {outgoing ? (
              <div className="border-app-line bg-app-tint mt-4 rounded-xl border p-3">
                <div className="font-semibold text-app-default">
                  {texts.mai2CirclePage.pendingRequest}
                </div>
                <div className="text-app-subtle mt-2 text-sm">
                  {outgoing.circleName} · {texts.common.id} {outgoing.circleId}
                </div>
                <div className="text-app-subtle mt-1 text-sm">
                  {texts.mai2CirclePage.leaderValue(outgoing.leaderName || '—')}
                </div>
                <div className="text-app-subtle mt-1 text-xs">
                  {texts.mai2CirclePage.requestTime(formatDateTimeMaybe(outgoing.createdAt, locale))}
                </div>
                <div className="mt-3">
                  <Button disabled={busy === 'cancel-request'} onClick={() => void cancelReq()}>
                    {texts.mai2CirclePage.cancelRequest}
                  </Button>
                </div>
              </div>
            ) : previewQuery.isPending && joinIdNum ? (
              <div className="mt-4">
                <SkeletonBox className="h-24 w-full rounded-xl" />
              </div>
            ) : previewCircle ? (
              <div className="border-app-line bg-app-tint mt-4 rounded-xl border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-app-default">{previewCircle.circleName || texts.common.teamWithId(previewCircle.circleId)}</div>
                  <ClassBadge circleClass={previewCircle.circleClass} />
                </div>
                <div className="text-app-subtle mt-2 text-sm">
                  {texts.common.id} {previewCircle.circleId} · {texts.mai2CirclePage.leaderValue(previewCircle.leaderName || '—')}
                </div>
                <div className="text-app-subtle mt-1 text-sm">
                  {texts.mai2CirclePage.previewMeta(previewCircle.memberCount ?? 0, previewCircle.circleRank ? `#${previewCircle.circleRank}` : '—')}
                </div>
              </div>
            ) : previewQuery.error ? (
              <Text className="text-app-danger mt-4 block text-sm">
                {previewQuery.error instanceof Error ? previewQuery.error.message : texts.common.error}
              </Text>
            ) : (
              <Text className="text-app-subtle mt-4 block text-sm">
                {texts.mai2CirclePage.noCircle}
              </Text>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  )
}
