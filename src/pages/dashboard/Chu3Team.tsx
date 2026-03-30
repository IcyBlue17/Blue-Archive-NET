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
import { formatDisplayRating } from '../../lib/gameRatingDisplay'
import { useI18n } from '../../lib/i18n'
import { imgCross1 } from '../../lib/imgSign'
import { qk } from '../../lib/query'
import type { Chu3TeamDetail, Chu3TeamJoinIncoming, Chu3TeamMember } from '../../lib/types'

function int1(raw: string) {
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : NaN
}

function time1(raw: string | undefined, locale: 'zh' | 'en') {
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')
}

function TeamSkeleton() {
  return (
    <LayerCard className="p-4">
      <SkeletonBox className="h-6 w-40 rounded-md" />
      <SkeletonBox className="mt-3 h-4 w-64 rounded-md" />
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-kumo-border rounded-xl border p-3">
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
    <div className="border-kumo-border rounded-xl border p-3">
      <div className="text-kumo-subtle text-xs">{label}</div>
      <div className="text-kumo-text mt-2 text-xl font-semibold">{value}</div>
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
  const img = chu3CharacterImageUrl(row.characterId, '02')
  return (
    <div className="border-kumo-border rounded-xl border p-3">
      <div className="flex items-start gap-3">
        <div className="border-kumo-border bg-kumo-recessed flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
          {img ? (
            <img
              src={img}
              crossOrigin={imgCross1(img)}
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
            <div className="truncate font-semibold text-kumo-text">{row.userName}</div>
            {row.isLeader ? (
              <span className="bg-kumo-recessed rounded-full px-2 py-0.5 text-xs text-kumo-text">
                {locale === 'zh' ? '队长' : 'Leader'}
              </span>
            ) : null}
          </div>
          <div className="text-kumo-subtle mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>{locale === 'zh' ? `等级 ${row.level}` : `Level ${row.level}`}</div>
            <div>Rating {formatDisplayRating(row.playerRating, 'chu3')}</div>
            <div>{locale === 'zh' ? `贡献 ${row.teamPoint}` : `EXP ${row.teamPoint}`}</div>
            <div>{locale === 'zh' ? `最近 ${time1(row.lastPlayDate, locale)}` : `Last ${time1(row.lastPlayDate, locale)}`}</div>
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
  const img = chu3CharacterImageUrl(row.applicantCharacterId, '02')
  return (
    <div className="border-kumo-border rounded-xl border p-3">
      <div className="flex items-start gap-3">
        <div className="border-kumo-border bg-kumo-recessed flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
          {img ? (
            <img
              src={img}
              crossOrigin={imgCross1(img)}
              alt={row.applicantName}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <Text size="sm">{row.applicantName.slice(0, 1) || '?'}</Text>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-kumo-text">{row.applicantName}</div>
          <div className="text-kumo-subtle mt-1 text-sm">
            {locale === 'zh'
              ? `等级 ${row.applicantLevel} · Rating ${formatDisplayRating(row.applicantRating, 'chu3')}`
              : `Level ${row.applicantLevel} · Rating ${formatDisplayRating(row.applicantRating, 'chu3')}`}
          </div>
          <div className="text-kumo-subtle mt-1 text-xs">
            {locale === 'zh' ? `申请时间 ${time1(row.createdAt, locale)}` : `Requested ${time1(row.createdAt, locale)}`}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={onApprove}>
              {locale === 'zh' ? '通过' : 'Approve'}
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={onReject}>
              {locale === 'zh' ? '拒绝' : 'Reject'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Chu3TeamPage() {
  const { locale, t } = useI18n()
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
    const n = int1(joinId)
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
  }, [myTeam?.teamId, myTeam?.teamName, myTeam?.emblemId])

  async function refetch1() {
    await Promise.all([
      teamQuery.refetch(),
      reqQuery.refetch(),
      qc.invalidateQueries({ queryKey: ['chu3-team-ranking'] }),
      qc.invalidateQueries({ queryKey: qk.chu3Team }),
      qc.invalidateQueries({ queryKey: qk.homeSummary(username) }),
      qc.invalidateQueries({ queryKey: qk.gameDash(username, 'chu3') }),
    ])
  }

  function errToast1(titleZh: string, titleEn: string, err: unknown) {
    toast.add({
      title: locale === 'zh' ? titleZh : titleEn,
      description: err instanceof Error ? err.message : locale === 'zh' ? '请求失败' : 'Request failed',
      variant: 'error',
    })
  }

  async function createTeam1() {
    const name1 = createName.trim()
    const emblem1 = int1(createEmblem || '0')
    if (!name1) {
      errToast1('请输入战队名称', 'Enter a team name', new Error(locale === 'zh' ? '战队名不能为空。' : 'Team name is required.'))
      return
    }
    if (!Number.isFinite(emblem1) || emblem1 < 0) {
      errToast1('徽章 ID 无效', 'Invalid emblem id', new Error(locale === 'zh' ? '徽章 ID 需要是大于等于 0 的整数。' : 'Emblem id must be an integer >= 0.'))
      return
    }

    setBusy('create')
    try {
      const row = await gameApi.chu3TeamCreate(name1, emblem1)
      setCreateName('')
      setJoinId('')
      toast.add({
        title: locale === 'zh' ? '战队已创建' : 'Team created',
        description:
          locale === 'zh'
            ? `${row.teamName || name1} 已创建，ID ${row.teamId}`
            : `${row.teamName || name1} was created, id ${row.teamId}`,
      })
      await refetch1()
    } catch (err) {
      errToast1('创建战队失败', 'Create team failed', err)
    } finally {
      setBusy(null)
    }
  }

  async function joinTeam1(teamId: number) {
    setBusy('join')
    try {
      const row = await gameApi.chu3TeamJoin(teamId)
      toast.add({
        title: locale === 'zh' ? '申请已提交' : 'Request sent',
        description:
          locale === 'zh'
            ? `已向 ${row.teamName} 提交入队申请，等待队长审核。`
            : `Join request for ${row.teamName} was sent.`,
      })
      setJoinId('')
      await refetch1()
    } catch (err) {
      errToast1('提交申请失败', 'Join request failed', err)
    } finally {
      setBusy(null)
    }
  }

  async function cancelReq1() {
    setBusy('cancel-request')
    try {
      await gameApi.chu3TeamRequestCancel()
      toast.add({
        title: locale === 'zh' ? '申请已取消' : 'Request canceled',
        description: locale === 'zh' ? '你可以重新申请其他战队。' : 'You can request another team now.',
      })
      await refetch1()
    } catch (err) {
      errToast1('取消申请失败', 'Cancel request failed', err)
    } finally {
      setBusy(null)
    }
  }

  async function approveReq1(id: number) {
    setBusy(`approve-${id}`)
    try {
      await gameApi.chu3TeamRequestApprove(id)
      toast.add({
        title: locale === 'zh' ? '已通过申请' : 'Request approved',
        description: locale === 'zh' ? '新成员已经加入战队。' : 'The new member joined the team.',
      })
      await refetch1()
    } catch (err) {
      errToast1('审核失败', 'Approve failed', err)
    } finally {
      setBusy(null)
    }
  }

  async function rejectReq1(id: number) {
    setBusy(`reject-${id}`)
    try {
      await gameApi.chu3TeamRequestReject(id)
      toast.add({
        title: locale === 'zh' ? '已拒绝申请' : 'Request rejected',
        description: locale === 'zh' ? '该申请已经从队列移除。' : 'The request was removed.',
      })
      await refetch1()
    } catch (err) {
      errToast1('拒绝申请失败', 'Reject failed', err)
    } finally {
      setBusy(null)
    }
  }

  async function updateTeam1() {
    const name1 = editName.trim()
    const emblem1 = int1(editEmblem || '0')
    if (!name1) {
      errToast1('请输入战队名称', 'Enter a team name', new Error(locale === 'zh' ? '战队名不能为空。' : 'Team name is required.'))
      return
    }
    if (!Number.isFinite(emblem1) || emblem1 < 0) {
      errToast1('徽章 ID 无效', 'Invalid emblem id', new Error(locale === 'zh' ? '徽章 ID 需要是大于等于 0 的整数。' : 'Emblem id must be an integer >= 0.'))
      return
    }

    setBusy('update')
    try {
      await gameApi.chu3TeamUpdate(name1, emblem1)
      toast.add({
        title: locale === 'zh' ? '战队资料已保存' : 'Team updated',
        description: locale === 'zh' ? '队名和徽章已经更新。' : 'Name and emblem were updated.',
      })
      await refetch1()
    } catch (err) {
      errToast1('保存战队失败', 'Save team failed', err)
    } finally {
      setBusy(null)
    }
  }

  async function leaveTeam1() {
    if (!window.confirm(locale === 'zh' ? '确定退出当前战队？' : 'Leave current team?')) return
    setBusy('leave')
    try {
      await gameApi.chu3TeamLeave()
      toast.add({
        title: locale === 'zh' ? '已退出战队' : 'Left team',
        description: locale === 'zh' ? '你当前不属于任何战队。' : 'You are no longer in a team.',
      })
      await refetch1()
    } catch (err) {
      errToast1('退出战队失败', 'Leave team failed', err)
    } finally {
      setBusy(null)
    }
  }

  async function disbandTeam1() {
    if (!window.confirm(locale === 'zh' ? '确定解散当前战队？' : 'Disband this team?')) return
    setBusy('disband')
    try {
      await gameApi.chu3TeamDisband()
      toast.add({
        title: locale === 'zh' ? '战队已解散' : 'Team disbanded',
        description: locale === 'zh' ? '所有成员都已被移出战队。' : 'All members were removed from the team.',
      })
      await refetch1()
    } catch (err) {
      errToast1('解散战队失败', 'Disband team failed', err)
    } finally {
      setBusy(null)
    }
  }

  const previewTeam = previewQuery.data && previewQuery.data.teamId > 0 ? previewQuery.data : null
  const members = myTeam?.members ?? []

  return (
    <div>
      <PageHeader title={t('team')} crumbs={[{ label: t('dashboard'), href: '/home' }, { label: t('team') }]} />

      {teamQuery.isPending && !teamQuery.data ? (
        <TeamSkeleton />
      ) : myTeam ? (
        <>
          <LayerCard className="p-4">
            <LayerCard.Secondary>{locale === 'zh' ? '当前战队' : 'Current team'}</LayerCard.Secondary>
            <div className="mt-3">
              <div className="text-kumo-text text-2xl font-bold">{myTeam.teamName || `Team ${myTeam.teamId}`}</div>
              <div className="text-kumo-subtle mt-1 text-sm">
                ID {myTeam.teamId} · {locale === 'zh' ? `队长 ${myTeam.leaderName || '—'}` : `Leader ${myTeam.leaderName || '—'}`}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <StatBox label={locale === 'zh' ? '总 EXP' : 'Team EXP'} value={(myTeam.teamPoint ?? 0).toLocaleString()} />
              <StatBox label={locale === 'zh' ? '我的贡献' : 'My EXP'} value={(myTeam.myPoint ?? 0).toLocaleString()} />
              <StatBox label={locale === 'zh' ? '成员人数' : 'Members'} value={myTeam.memberCount ?? 0} />
              <StatBox label={locale === 'zh' ? '战队排名' : 'Rank'} value={myTeam.teamRank ? `#${myTeam.teamRank}` : '—'} />
            </div>
          </LayerCard>

          <LayerCard className="mt-6 p-4">
            <LayerCard.Secondary>{locale === 'zh' ? '战队操作' : 'Team actions'}</LayerCard.Secondary>
            {myTeam.canManage ? (
              <>
                <Text DANGEROUS_className="text-kumo-subtle mt-2 block text-sm">
                  {locale === 'zh' ? '只有队长可以改名、改徽章和审核入队申请。' : 'Only the leader can rename the team, change emblem and review join requests.'}
                </Text>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={locale === 'zh' ? '战队名称' : 'Team name'} />
                  <Input value={editEmblem} type="number" onChange={(e) => setEditEmblem(e.target.value)} placeholder={locale === 'zh' ? '徽章 ID' : 'Emblem ID'} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button disabled={busy === 'update'} onClick={() => void updateTeam1()}>
                    {busy === 'update' ? (locale === 'zh' ? '保存中…' : 'Saving…') : (locale === 'zh' ? '保存战队资料' : 'Save team')}
                  </Button>
                  <Button variant="secondary" disabled={busy === 'leave'} onClick={() => void leaveTeam1()}>
                    {locale === 'zh' ? '退出战队' : 'Leave team'}
                  </Button>
                  <Button variant="secondary" disabled={busy === 'disband'} onClick={() => void disbandTeam1()}>
                    {locale === 'zh' ? '解散战队' : 'Disband team'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Text DANGEROUS_className="text-kumo-subtle mt-2 block text-sm">
                  {locale === 'zh'
                    ? `当前队长是 ${myTeam.leaderName || '—'}。普通成员只能查看资料和退出战队。`
                    : `Current leader: ${myTeam.leaderName || '—'}. Members can only view the team and leave it.`}
                </Text>
                <div className="mt-4">
                  <Button variant="secondary" disabled={busy === 'leave'} onClick={() => void leaveTeam1()}>
                    {locale === 'zh' ? '退出战队' : 'Leave team'}
                  </Button>
                </div>
              </>
            )}
          </LayerCard>

          {myTeam.canManage ? (
            <LayerCard className="mt-6 p-4">
              <div className="flex items-center justify-between gap-3">
                <LayerCard.Secondary>{locale === 'zh' ? '入队申请' : 'Join requests'}</LayerCard.Secondary>
                <Text DANGEROUS_className="text-kumo-subtle text-sm">
                  {locale === 'zh' ? `${incoming.length} 条待审核` : `${incoming.length} pending`}
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
                      onApprove={() => void approveReq1(row.id)}
                      onReject={() => void rejectReq1(row.id)}
                    />
                  ))}
                </div>
              ) : (
                <Text DANGEROUS_className="text-kumo-subtle mt-3 block text-sm">
                  {locale === 'zh' ? '目前没有新的入队申请。' : 'No join requests right now.'}
                </Text>
              )}
            </LayerCard>
          ) : null}

          <LayerCard className="mt-6 p-4">
            <div className="flex items-center justify-between gap-3">
              <LayerCard.Secondary>{locale === 'zh' ? '成员列表' : 'Members'}</LayerCard.Secondary>
              <Text DANGEROUS_className="text-kumo-subtle text-sm">
                {locale === 'zh' ? `${members.length} 人` : `${members.length} members`}
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
                {locale === 'zh' ? '当前战队还没有成员数据。' : 'No team members yet.'}
              </Text>
            )}
          </LayerCard>
        </>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <LayerCard className="p-4">
            <LayerCard.Secondary>{locale === 'zh' ? '创建战队' : 'Create team'}</LayerCard.Secondary>
            <Text DANGEROUS_className="text-kumo-subtle mt-2 block text-sm">
              {locale === 'zh'
                ? '输入战队名称后直接创建。系统会自动生成 100xxxx 的战队 ID，并让你成为队长。'
                : 'Create a new team with a name. The server will generate a 100xxxx id and make you the leader.'}
            </Text>
            <div className="mt-4 grid gap-3">
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder={locale === 'zh' ? '战队名称' : 'Team name'} />
              <Input value={createEmblem} type="number" onChange={(e) => setCreateEmblem(e.target.value)} placeholder={locale === 'zh' ? '徽章 ID（可选）' : 'Emblem ID'} />
            </div>
            <div className="mt-4">
              <Button disabled={busy === 'create'} onClick={() => void createTeam1()}>
                {busy === 'create' ? (locale === 'zh' ? '创建中…' : 'Creating…') : (locale === 'zh' ? '创建战队' : 'Create team')}
              </Button>
            </div>
          </LayerCard>

          <LayerCard className="p-4">
            <LayerCard.Secondary>{locale === 'zh' ? '加入战队' : 'Join team'}</LayerCard.Secondary>
            <Text DANGEROUS_className="text-kumo-subtle mt-2 block text-sm">
              {locale === 'zh'
                ? '输入战队 ID 提交申请。队长通过后，你才会真正加入战队。'
                : 'Enter a team id to send a request. You only join after the leader approves it.'}
            </Text>
            <div className="mt-4 flex gap-3">
              <Input value={joinId} type="number" onChange={(e) => setJoinId(e.target.value)} placeholder={locale === 'zh' ? '战队 ID' : 'Team ID'} />
              <Button
                disabled={busy === 'join' || !previewTeam}
                onClick={() => previewTeam && void joinTeam1(previewTeam.teamId)}
              >
                {busy === 'join' ? (locale === 'zh' ? '提交中…' : 'Sending…') : (locale === 'zh' ? '提交申请' : 'Send request')}
              </Button>
            </div>

            {outgoing ? (
              <div className="border-kumo-border bg-kumo-background-alt mt-4 rounded-xl border p-3">
                <div className="font-semibold text-kumo-text">
                  {locale === 'zh' ? '当前有一条待审核申请' : 'Current pending request'}
                </div>
                <div className="text-kumo-subtle mt-2 text-sm">
                  {outgoing.teamName} · ID {outgoing.teamId}
                </div>
                <div className="text-kumo-subtle mt-1 text-sm">
                  {locale === 'zh' ? `队长 ${outgoing.leaderName || '—'}` : `Leader ${outgoing.leaderName || '—'}`}
                </div>
                <div className="text-kumo-subtle mt-1 text-xs">
                  {locale === 'zh' ? `申请时间 ${time1(outgoing.createdAt, locale)}` : `Requested ${time1(outgoing.createdAt, locale)}`}
                </div>
                <div className="mt-3">
                  <Button variant="secondary" disabled={busy === 'cancel-request'} onClick={() => void cancelReq1()}>
                    {locale === 'zh' ? '取消申请' : 'Cancel request'}
                  </Button>
                </div>
              </div>
            ) : previewQuery.isPending && joinIdNum ? (
              <div className="mt-4">
                <SkeletonBox className="h-24 w-full rounded-xl" />
              </div>
            ) : previewTeam ? (
              <div className="border-kumo-border bg-kumo-background-alt mt-4 rounded-xl border p-3">
                <div className="font-semibold text-kumo-text">{previewTeam.teamName || `Team ${previewTeam.teamId}`}</div>
                <div className="text-kumo-subtle mt-2 text-sm">
                  ID {previewTeam.teamId} · {locale === 'zh' ? `队长 ${previewTeam.leaderName || '—'}` : `Leader ${previewTeam.leaderName || '—'}`}
                </div>
                <div className="text-kumo-subtle mt-1 text-sm">
                  {locale === 'zh'
                    ? `成员 ${previewTeam.memberCount ?? 0} 人 · 排名 ${previewTeam.teamRank ? `#${previewTeam.teamRank}` : '—'}`
                    : `${previewTeam.memberCount ?? 0} members · Rank ${previewTeam.teamRank ? `#${previewTeam.teamRank}` : '—'}`}
                </div>
              </div>
            ) : previewQuery.error ? (
              <Text DANGEROUS_className="text-kumo-danger mt-4 block text-sm">
                {previewQuery.error instanceof Error ? previewQuery.error.message : 'Error'}
              </Text>
            ) : (
              <Text DANGEROUS_className="text-kumo-subtle mt-4 block text-sm">
                {locale === 'zh' ? '当前还没有加入任何战队。' : 'You are not in any team right now.'}
              </Text>
            )}
          </LayerCard>
        </div>
      )}
    </div>
  )
}
