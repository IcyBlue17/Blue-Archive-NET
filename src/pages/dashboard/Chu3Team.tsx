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
import type { Chu3TeamDetail, Chu3TeamMember, Chu3TeamRankEntry } from '../../lib/types'

const RANK_LIMIT = 10

function parseInt1(raw: string) {
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : NaN
}

function formatTime2(iso: string, locale: 'zh' | 'en') {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')
}

function TeamHeroSkeleton() {
  return (
    <LayerCard className="overflow-hidden p-0">
      <div className="border-kumo-border border-b px-5 py-5">
        <SkeletonBox className="h-4 w-24 rounded-md" />
        <SkeletonBox className="mt-3 h-10 w-56 rounded-xl" />
        <SkeletonBox className="mt-3 h-4 w-44 rounded-md" />
      </div>
      <div className="grid gap-4 px-4 py-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBox className="h-4 w-20 rounded-md" />
            <SkeletonBox className="h-6 w-28 rounded-md" />
          </div>
        ))}
      </div>
    </LayerCard>
  )
}

function MemberCard({ row, locale }: { row: Chu3TeamMember; locale: 'zh' | 'en' }) {
  const avatar = chu3CharacterImageUrl(row.characterId, '02')
  return (
    <div className="border-kumo-border bg-kumo-background-alt rounded-2xl border p-4">
      <div className="flex items-start gap-4">
        <div className="border-kumo-border bg-kumo-recessed flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border">
          {avatar ? (
            <img
              src={avatar}
              crossOrigin={imgCross1(avatar)}
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
            <div className="truncate text-base font-semibold text-kumo-text">{row.userName}</div>
            {row.isLeader ? (
              <span className="bg-kumo-recessed text-kumo-text rounded-full px-2 py-0.5 text-xs">
                {locale === 'zh' ? '队长' : 'Leader'}
              </span>
            ) : null}
          </div>
          <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-kumo-subtle">{locale === 'zh' ? '等级' : 'Level'}</dt>
            <dd className="text-kumo-text">{row.level}</dd>
            <dt className="text-kumo-subtle">Rating</dt>
            <dd className="text-kumo-text">{formatDisplayRating(row.playerRating, 'chu3')}</dd>
            <dt className="text-kumo-subtle">{locale === 'zh' ? '贡献 EXP' : 'Team EXP'}</dt>
            <dd className="text-kumo-text">{row.teamPoint.toLocaleString()}</dd>
            <dt className="text-kumo-subtle">{locale === 'zh' ? '最近游玩' : 'Last play'}</dt>
            <dd className="text-kumo-text">{formatTime2(row.lastPlayDate, locale)}</dd>
          </dl>
        </div>
      </div>
    </div>
  )
}

export function Chu3TeamPage() {
  const { locale, t } = useI18n()
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useKumoToastManager()
  const username = user?.username ?? ''
  const [newName, setNewName] = useState('')
  const [newEmblem, setNewEmblem] = useState('0')
  const [joinId, setJoinId] = useState('')
  const [editName, setEditName] = useState('')
  const [editEmblem, setEditEmblem] = useState('0')
  const [busy, setBusy] = useState<string | null>(null)

  const teamQuery = useQuery<Chu3TeamDetail>({
    queryKey: qk.chu3TeamDetail(),
    placeholderData: (old) => old,
    queryFn: () => gameApi.chu3TeamDetail(),
  })
  const rankQuery = useQuery<Chu3TeamRankEntry[]>({
    queryKey: qk.chu3TeamRanking(RANK_LIMIT),
    placeholderData: (old) => old,
    queryFn: () => gameApi.chu3TeamRanking(RANK_LIMIT),
  })

  const myTeam = teamQuery.data && teamQuery.data.teamId > 0 ? teamQuery.data : null
  const joinIdNum = useMemo(() => {
    const n = parseInt1(joinId)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [joinId])
  const previewQuery = useQuery<Chu3TeamDetail>({
    queryKey: ['chu3-team-preview', joinIdNum ?? 0],
    enabled: !myTeam && !!joinIdNum,
    placeholderData: (old) => old,
    queryFn: () => gameApi.chu3TeamDetail(joinIdNum ?? undefined),
  })

  useEffect(() => {
    if (!myTeam) return
    setEditName(myTeam.teamName)
    setEditEmblem(String(myTeam.emblemId ?? 0))
  }, [myTeam?.teamId, myTeam?.teamName, myTeam?.emblemId])

  async function refetch1() {
    await Promise.all([
      teamQuery.refetch(),
      rankQuery.refetch(),
      qc.invalidateQueries({ queryKey: qk.chu3Team }),
      qc.invalidateQueries({ queryKey: qk.chu3TeamDetailBase }),
      qc.invalidateQueries({ queryKey: qk.homeSummary(username) }),
      qc.invalidateQueries({ queryKey: qk.gameDash(username, 'chu3') }),
    ])
  }

  function toastErr1(titleZh: string, titleEn: string, err: unknown) {
    toast.add({
      title: locale === 'zh' ? titleZh : titleEn,
      description: err instanceof Error ? err.message : locale === 'zh' ? '请求失败' : 'Request failed',
      variant: 'error',
    })
  }

  async function createTeam1() {
    const name1 = newName.trim()
    const emblemNum = parseInt1(newEmblem || '0')
    if (!name1) {
      toast.add({
        title: locale === 'zh' ? '请输入战队名' : 'Enter a team name',
        description: locale === 'zh' ? '建队前需要先填名字。' : 'Team creation requires a name.',
        variant: 'error',
      })
      return
    }
    if (!Number.isFinite(emblemNum) || emblemNum < 0) {
      toast.add({
        title: locale === 'zh' ? '徽章 ID 无效' : 'Invalid emblem id',
        description: locale === 'zh' ? '徽章 ID 需要是大于等于 0 的整数。' : 'Emblem id must be an integer >= 0.',
        variant: 'error',
      })
      return
    }

    setBusy('create')
    try {
      const next = await gameApi.chu3TeamCreate(name1, emblemNum)
      setNewName('')
      setJoinId('')
      toast.add({
        title: locale === 'zh' ? '战队已创建' : 'Team created',
        description:
          locale === 'zh'
            ? `${next.teamName} 已创建，编号 ${next.teamId}`
            : `${next.teamName} was created with id ${next.teamId}`,
      })
      await refetch1()
    } catch (err) {
      toastErr1('创建战队失败', 'Create team failed', err)
    } finally {
      setBusy(null)
    }
  }

  async function joinTeam1(teamId: number) {
    setBusy('join')
    try {
      const next = await gameApi.chu3TeamJoin(teamId)
      setJoinId('')
      toast.add({
        title: locale === 'zh' ? '已加入战队' : 'Joined team',
        description:
          locale === 'zh'
            ? `你现在属于 ${next.teamName}（${next.teamId}）`
            : `You joined ${next.teamName} (${next.teamId})`,
      })
      await refetch1()
    } catch (err) {
      toastErr1('加入战队失败', 'Join team failed', err)
    } finally {
      setBusy(null)
    }
  }

  async function updateTeam1() {
    const name1 = editName.trim()
    const emblemNum = parseInt1(editEmblem || '0')
    if (!name1) {
      toast.add({
        title: locale === 'zh' ? '请输入战队名' : 'Enter a team name',
        description: locale === 'zh' ? '改名前需要先填名字。' : 'Team rename requires a name.',
        variant: 'error',
      })
      return
    }
    if (!Number.isFinite(emblemNum) || emblemNum < 0) {
      toast.add({
        title: locale === 'zh' ? '徽章 ID 无效' : 'Invalid emblem id',
        description: locale === 'zh' ? '徽章 ID 需要是大于等于 0 的整数。' : 'Emblem id must be an integer >= 0.',
        variant: 'error',
      })
      return
    }

    setBusy('update')
    try {
      await gameApi.chu3TeamUpdate(name1, emblemNum)
      toast.add({
        title: locale === 'zh' ? '战队资料已更新' : 'Team updated',
        description: locale === 'zh' ? '队名和徽章已保存。' : 'Team name and emblem were updated.',
      })
      await refetch1()
    } catch (err) {
      toastErr1('更新战队失败', 'Update team failed', err)
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
        description: locale === 'zh' ? '你已经不在任何战队中。' : 'You are no longer in a team.',
      })
      await refetch1()
    } catch (err) {
      toastErr1('退出战队失败', 'Leave team failed', err)
    } finally {
      setBusy(null)
    }
  }

  async function disbandTeam1() {
    if (!window.confirm(locale === 'zh' ? '确定解散战队？这会移除所有成员。' : 'Disband this team? This removes every member.')) {
      return
    }
    setBusy('disband')
    try {
      await gameApi.chu3TeamDisband()
      toast.add({
        title: locale === 'zh' ? '战队已解散' : 'Team disbanded',
        description: locale === 'zh' ? '成员关系和战队积分已清空。' : 'Team membership and points were cleared.',
      })
      await refetch1()
    } catch (err) {
      toastErr1('解散战队失败', 'Disband team failed', err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader title={t('team')} crumbs={[{ label: t('dashboard'), href: '/home' }, { label: t('team') }]} />

      {teamQuery.isPending && !teamQuery.data ? (
        <TeamHeroSkeleton />
      ) : myTeam ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
          <div className="space-y-6">
            <LayerCard className="overflow-hidden p-0">
              <div className="border-kumo-border bg-[linear-gradient(135deg,rgba(232,81,67,0.08),rgba(212,175,55,0.18))] border-b px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-kumo-subtle text-xs font-medium tracking-[0.28em] uppercase">
                      {locale === 'zh' ? 'Team Network' : 'Team Network'}
                    </div>
                    <div className="text-kumo-text mt-3 truncate text-[clamp(1.8rem,4vw,2.6rem)] font-black tracking-[0.14em]">
                      {myTeam.teamName}
                    </div>
                    <div className="text-kumo-subtle mt-3 text-sm">
                      ID {myTeam.teamId} · {locale === 'zh' ? `队长 ${myTeam.leaderName || '—'}` : `Leader ${myTeam.leaderName || '—'}`}
                    </div>
                  </div>
                  <div className="border-kumo-border bg-kumo-background/70 min-w-[8.5rem] rounded-2xl border px-4 py-3 text-right backdrop-blur">
                    <div className="text-kumo-subtle text-xs">{locale === 'zh' ? '战队排名' : 'Rank'}</div>
                    <div className="text-kumo-text mt-1 text-2xl font-black">#{myTeam.teamRank || 0}</div>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 px-4 py-4 md:grid-cols-4">
                <div>
                  <div className="text-kumo-subtle text-xs">{locale === 'zh' ? '总 EXP' : 'Total EXP'}</div>
                  <div className="text-kumo-text mt-1 text-xl font-semibold">{myTeam.teamPoint.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-kumo-subtle text-xs">{locale === 'zh' ? '我的贡献' : 'My EXP'}</div>
                  <div className="text-kumo-text mt-1 text-xl font-semibold">{myTeam.myPoint.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-kumo-subtle text-xs">{locale === 'zh' ? '成员人数' : 'Members'}</div>
                  <div className="text-kumo-text mt-1 text-xl font-semibold">{myTeam.memberCount}</div>
                </div>
                <div>
                  <div className="text-kumo-subtle text-xs">{locale === 'zh' ? '徽章 ID' : 'Emblem ID'}</div>
                  <div className="text-kumo-text mt-1 text-xl font-semibold">{myTeam.emblemId}</div>
                </div>
              </div>
            </LayerCard>

            <LayerCard className="p-4">
              <LayerCard.Secondary>{locale === 'zh' ? '战队操作' : 'Team actions'}</LayerCard.Secondary>
              {myTeam.canManage ? (
                <>
                  <Text DANGEROUS_className="text-kumo-subtle mt-2 block text-sm">
                    {locale === 'zh'
                      ? '你是当前队长，可以改名、调整徽章或直接解散战队。'
                      : 'You are the leader. You can rename the team, change its emblem or disband it.'}
                  </Text>
                  <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{locale === 'zh' ? '战队名称' : 'Team name'}</span>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{locale === 'zh' ? '徽章 ID' : 'Emblem ID'}</span>
                      <Input type="number" value={editEmblem} onChange={(e) => setEditEmblem(e.target.value)} />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="primary" disabled={busy === 'update'} onClick={() => void updateTeam1()}>
                      {busy === 'update'
                        ? (locale === 'zh' ? '保存中…' : 'Saving…')
                        : (locale === 'zh' ? '保存战队资料' : 'Save team')}
                    </Button>
                    <Button variant="destructive" disabled={busy === 'disband'} onClick={() => void disbandTeam1()}>
                      {busy === 'disband'
                        ? (locale === 'zh' ? '解散中…' : 'Disbanding…')
                        : (locale === 'zh' ? '解散战队' : 'Disband team')}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Text DANGEROUS_className="text-kumo-subtle mt-2 block text-sm">
                    {locale === 'zh'
                      ? `当前队长是 ${myTeam.leaderName || '—'}。你可以退出战队，但不能改名或解散。`
                      : `Current leader: ${myTeam.leaderName || '—'}. You can leave the team but cannot manage it.`}
                  </Text>
                  <div className="mt-4">
                    <Button variant="secondary" disabled={busy === 'leave'} onClick={() => void leaveTeam1()}>
                      {busy === 'leave'
                        ? (locale === 'zh' ? '退出中…' : 'Leaving…')
                        : (locale === 'zh' ? '退出战队' : 'Leave team')}
                    </Button>
                  </div>
                </>
              )}
            </LayerCard>

            <LayerCard className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <LayerCard.Secondary>{locale === 'zh' ? '成员列表' : 'Members'}</LayerCard.Secondary>
                <Text DANGEROUS_className="text-kumo-subtle text-sm">
                  {locale === 'zh' ? `${myTeam.memberCount} 人` : `${myTeam.memberCount} members`}
                </Text>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {myTeam.members.map((row) => (
                  <MemberCard key={row.extId} row={row} locale={locale} />
                ))}
              </div>
            </LayerCard>
          </div>

          <LayerCard className="h-fit p-4">
            <LayerCard.Secondary>{locale === 'zh' ? '战队排行' : 'Team ranking'}</LayerCard.Secondary>
            <div className="mt-4 space-y-3">
              {(rankQuery.data ?? []).length ? (
                (rankQuery.data ?? []).map((row) => (
                  <div key={row.teamId} className="border-kumo-border bg-kumo-background-alt rounded-2xl border px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-kumo-text truncate font-semibold">#{row.rank} {row.teamName || `Team ${row.teamId}`}</div>
                        <div className="text-kumo-subtle mt-1 text-xs">
                          ID {row.teamId} · {locale === 'zh' ? `队长 ${row.leaderName || '—'}` : `Leader ${row.leaderName || '—'}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-kumo-text font-semibold">{row.teamPoint.toLocaleString()}</div>
                        <div className="text-kumo-subtle text-xs">{locale === 'zh' ? `${row.memberCount} 人` : `${row.memberCount} members`}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <Text DANGEROUS_className="text-kumo-subtle text-sm">
                  {locale === 'zh' ? '暂无排行数据' : 'No ranking data yet'}
                </Text>
              )}
            </div>
          </LayerCard>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
          <div className="space-y-6">
            <LayerCard className="overflow-hidden p-0">
              <div className="border-kumo-border bg-[linear-gradient(135deg,rgba(46,111,191,0.08),rgba(212,175,55,0.12))] border-b px-5 py-5">
                <div className="text-kumo-subtle text-xs font-medium tracking-[0.28em] uppercase">
                  {locale === 'zh' ? 'Team Operation' : 'Team Operation'}
                </div>
                <div className="text-kumo-text mt-3 text-[clamp(1.8rem,4vw,2.6rem)] font-black tracking-[0.12em]">
                  {locale === 'zh' ? '加入或创建一支战队' : 'Create or Join a Team'}
                </div>
                <Text DANGEROUS_className="text-kumo-subtle mt-3 block max-w-2xl text-sm">
                  {locale === 'zh'
                    ? '创建战队会自动分配 100xxxx 形式的随机编号。加入战队只需要输入战队 ID，进入游戏后机台就会沿用这支战队。'
                    : 'Creating a team gives you a random 100xxxx id. Joining only needs the team id and the cab will use it on next sync.'}
                </Text>
              </div>
              <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                <div className="border-kumo-border bg-kumo-background-alt rounded-2xl border p-4">
                  <div className="text-kumo-text text-base font-semibold">{locale === 'zh' ? '创建战队' : 'Create team'}</div>
                  <div className="mt-3 space-y-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{locale === 'zh' ? '战队名称' : 'Team name'}</span>
                      <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={locale === 'zh' ? '例如：Aqua Blue' : 'Example: Aqua Blue'} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{locale === 'zh' ? '徽章 ID' : 'Emblem ID'}</span>
                      <Input type="number" value={newEmblem} onChange={(e) => setNewEmblem(e.target.value)} />
                    </label>
                    <Button variant="primary" disabled={busy === 'create'} onClick={() => void createTeam1()}>
                      {busy === 'create'
                        ? (locale === 'zh' ? '创建中…' : 'Creating…')
                        : (locale === 'zh' ? '创建并自动加入' : 'Create and join')}
                    </Button>
                  </div>
                </div>

                <div className="border-kumo-border bg-kumo-background-alt rounded-2xl border p-4">
                  <div className="text-kumo-text text-base font-semibold">{locale === 'zh' ? '加入战队' : 'Join team'}</div>
                  <div className="mt-3 space-y-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{locale === 'zh' ? '战队 ID' : 'Team ID'}</span>
                      <Input
                        inputMode="numeric"
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value)}
                        placeholder="1000000"
                      />
                    </label>
                    <Button
                      variant="secondary"
                      disabled={busy === 'join' || !joinIdNum}
                      onClick={() => joinIdNum != null && void joinTeam1(joinIdNum)}
                    >
                      {busy === 'join'
                        ? (locale === 'zh' ? '加入中…' : 'Joining…')
                        : (locale === 'zh' ? '直接加入' : 'Join now')}
                    </Button>
                  </div>

                  {joinIdNum && previewQuery.isFetching && !previewQuery.data ? (
                    <div className="mt-4 space-y-2">
                      <SkeletonBox className="h-5 w-32 rounded-md" />
                      <SkeletonBox className="h-4 w-44 rounded-md" />
                      <SkeletonBox className="h-4 w-36 rounded-md" />
                    </div>
                  ) : joinIdNum && previewQuery.data?.teamId ? (
                    <div className="border-kumo-border mt-4 rounded-2xl border p-4">
                      <div className="text-kumo-text font-semibold">{previewQuery.data.teamName}</div>
                      <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                        <dt className="text-kumo-subtle">ID</dt>
                        <dd className="text-kumo-text">{previewQuery.data.teamId}</dd>
                        <dt className="text-kumo-subtle">{locale === 'zh' ? '队长' : 'Leader'}</dt>
                        <dd className="text-kumo-text">{previewQuery.data.leaderName || '—'}</dd>
                        <dt className="text-kumo-subtle">{locale === 'zh' ? '成员' : 'Members'}</dt>
                        <dd className="text-kumo-text">{previewQuery.data.memberCount}</dd>
                        <dt className="text-kumo-subtle">{locale === 'zh' ? '总 EXP' : 'Total EXP'}</dt>
                        <dd className="text-kumo-text">{previewQuery.data.teamPoint.toLocaleString()}</dd>
                      </dl>
                    </div>
                  ) : joinIdNum && previewQuery.error ? (
                    <Text DANGEROUS_className="text-kumo-danger mt-4 block text-sm">
                      {previewQuery.error instanceof Error ? previewQuery.error.message : 'Error'}
                    </Text>
                  ) : null}
                </div>
              </div>
            </LayerCard>
          </div>

          <LayerCard className="h-fit p-4">
            <LayerCard.Secondary>{locale === 'zh' ? '战队排行' : 'Team ranking'}</LayerCard.Secondary>
            <div className="mt-4 space-y-3">
              {(rankQuery.data ?? []).length ? (
                (rankQuery.data ?? []).map((row) => (
                  <div key={row.teamId} className="border-kumo-border bg-kumo-background-alt rounded-2xl border px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-kumo-text truncate font-semibold">#{row.rank} {row.teamName || `Team ${row.teamId}`}</div>
                        <div className="text-kumo-subtle mt-1 text-xs">
                          ID {row.teamId} · {locale === 'zh' ? `队长 ${row.leaderName || '—'}` : `Leader ${row.leaderName || '—'}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-kumo-text font-semibold">{row.teamPoint.toLocaleString()}</div>
                        <div className="text-kumo-subtle text-xs">{locale === 'zh' ? `${row.memberCount} 人` : `${row.memberCount} members`}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <Text DANGEROUS_className="text-kumo-subtle text-sm">
                  {locale === 'zh' ? '暂无排行数据' : 'No ranking data yet'}
                </Text>
              )}
            </div>
          </LayerCard>
        </div>
      )}

      {teamQuery.error ? (
        <Text DANGEROUS_className="text-kumo-danger mt-6">
          {teamQuery.error instanceof Error ? teamQuery.error.message : 'Error'}
        </Text>
      ) : null}
    </div>
  )
}
