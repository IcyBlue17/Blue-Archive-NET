import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { cn } from '@cloudflare/kumo'
import { Button, buttonVariants } from '@cloudflare/kumo/components/button'
import { Link } from '@cloudflare/kumo/components/link'
import { Select } from '@cloudflare/kumo/components/select'
import { Text } from '@cloudflare/kumo/components/text'
import * as dataApi from '../../api/data'
import * as gameApi from '../../api/game'
import { CHU3_MATCHINGS } from '../../lib/config'
import type { SettingFieldLocale } from '../../lib/settingsFieldLabels'
import type { ChusanMatchingOption, GameOption } from '../../lib/types'
import { Chu3AppearanceSettings } from './Chu3AppearanceSettings'
import { GameOptionFields } from './GameOptionFields'

export function ChusanExtraSettings({
  username,
  options,
  locale,
  onSet,
  onReload,
  err,
}: {
  username: string
  options: GameOption[]
  locale: SettingFieldLocale
  onSet: (key: string, value: string) => Promise<void>
  onReload: () => Promise<void>
  err: string | null
}) {
  const [linkedVerse, setLinkedVerse] = useState(false)
  const [overlay, setOverlay] = useState(false)
  const [custom, setCustom] = useState(false)
  const [symbolChat, setSymbolChat] = useState<Record<string, { name: string }>>({})
  const [symbols, setSymbols] = useState<Record<number, string>>({ 1: '', 2: '', 3: '', 4: '' })
  const [symbolDirty, setSymbolDirty] = useState<Record<number, boolean>>({})
  const [symSaving, setSymSaving] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const basicOptions = useMemo(() => options.filter((o) => o.key !== 'chusanTeamName'), [options])

  const matchingUrl = String(options.find((o) => o.key === 'chusanMatchingServer')?.value ?? '')

  useEffect(() => {
    if (!username) return
    void gameApi
      .userSummary(username, 'chu3')
      .then((s) => {
        const parts = (s.lastVersion || '0.0.0').split('.')
        setLinkedVerse(parts[0] === '2' && parseInt(parts[1] || '0', 10) >= 40)
      })
      .catch(() => setLinkedVerse(false))
  }, [username])

  useEffect(() => {
    if (matchingUrl && !CHU3_MATCHINGS.some((m) => m.matching === matchingUrl)) setCustom(true)
    else if (CHU3_MATCHINGS.some((m) => m.matching === matchingUrl)) setCustom(false)
  }, [matchingUrl])

  useEffect(() => {
    void dataApi.allItems('chu3').then((raw: unknown) => {
      const o = raw as { symbolChat?: Record<string, { name: string }> }
      setSymbolChat(o?.symbolChat ?? {})
    })
  }, [])

  useEffect(() => {
    const next: Record<number, string> = { 1: '', 2: '', 3: '', 4: '' }
    for (const o of options) {
      const m = /^chusanSymbolChat(\d+)$/.exec(o.key)
      if (m && o.value != null && o.value !== '') next[parseInt(m[1], 10)] = String(o.value)
    }
    setSymbols(next)
    setSymbolDirty({})
  }, [options])

  async function pickMatching(opt: ChusanMatchingOption) {
    await onSet('chusanMatchingReflector', opt.reflector)
    await onSet('chusanMatchingServer', opt.matching)
    setCustom(false)
    setOverlay(false)
    await onReload()
  }

  function clickCustom() {
    setCustom(true)
    setOverlay(false)
  }

  async function doExport() {
    setExporting(true)
    try {
      const data = await gameApi.exportGame('chu3')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `export-chu3-${username}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setExporting(false)
    }
  }

  const symbolSelectOptions = useMemo(
    () =>
      Object.entries(symbolChat)
        .filter(([id]) => parseInt(id, 10) !== 0)
        .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10)),
    [symbolChat],
  )

  async function saveSymbol(slot: number) {
    const key = `chusanSymbolChat${slot}`
    const raw = symbols[slot]
    setSymSaving(slot)
    try {
      await onSet(key, raw === '' ? '0' : raw)
      setSymbolDirty((d) => ({ ...d, [slot]: false }))
      await onReload()
    } finally {
      setSymSaving(null)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {err ? <Text DANGEROUS_className="text-kumo-danger text-sm">{err}</Text> : null}

      <section>
        <h3 className="text-kumo-text mb-2 text-base font-semibold">
          {locale === 'zh' ? 'CHUNITHM 基础' : 'CHUNITHM basics'}
        </h3>
        <GameOptionFields
          options={basicOptions}
          gameFilter={(g) => g === 'chu3'}
          locale={locale}
          onSet={onSet}
        />
      </section>

      <section>
        <h3 className="text-kumo-text mb-2 text-base font-semibold">
          {locale === 'zh' ? '战队' : 'Team'}
        </h3>
        <blockquote className="border-kumo-border text-kumo-subtle mb-3 border-l-2 pl-3 text-sm">
          {locale === 'zh'
            ? '战队现在有独立页面，支持创建、申请加入、审核成员和管理资料。'
            : 'Teams now have a dedicated page for create, join requests, member review and management.'}
        </blockquote>
        <RouterLink
          to="/team"
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
        >
          {locale === 'zh' ? '前往战队页' : 'Open team page'}
        </RouterLink>
      </section>

      <section>
        <h3 className="text-kumo-text mb-2 text-base font-semibold">
          {locale === 'zh' ? '全国对战 & Linked Verse' : 'National matching & Linked Verse'}
        </h3>
        <blockquote className="border-kumo-border text-kumo-subtle mb-3 border-l-2 pl-3 text-sm">
          {locale === 'zh'
            ? '对战服相关设置可能影响机台连线，请与服主说明后修改。'
            : 'Matching settings affect cab connectivity; coordinate with your server operator.'}
        </blockquote>

        {linkedVerse ? (
          <>
            <GameOptionFields
              options={options}
              gameFilter={(g) => g === 'chu3-linked-verse'}
              locale={locale}
              onSet={onSet}
            />
          </>
        ) : null}

        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => setOverlay(true)}>
            {locale === 'zh' ? '选择对战服预设…' : 'Choose matching preset…'}
          </Button>
        </div>

        {custom ? (
          <div className="mt-4">
            <Text DANGEROUS_className="mb-2" size="sm">
              {locale === 'zh' ? '自定义对战服务器' : 'Custom matching server'}
            </Text>
            <GameOptionFields
              options={options}
              gameFilter={(g) => g === 'chu3-matching'}
              locale={locale}
              onSet={onSet}
            />
          </div>
        ) : null}
      </section>

      <section>
        <h3 className="text-kumo-text mb-2 text-base font-semibold">
          {locale === 'zh' ? '对战快捷表情' : 'Symbol chat'}
        </h3>
        {[1, 2, 3, 4].map((slot) => (
          <div key={slot} className="mb-4 flex max-w-xl flex-col gap-2">
            <span className="text-sm font-medium">
              {locale === 'zh' ? `快捷表情 #${slot}` : `Symbol chat #${slot}`}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                className="min-w-[12rem]"
                aria-label={
                  locale === 'zh' ? `快捷表情 #${slot}` : `Symbol chat #${slot}`
                }
                value={symbols[slot] ?? ''}
                onValueChange={(v) => {
                  setSymbols((s) => ({ ...s, [slot]: String(v ?? '') }))
                  setSymbolDirty((d) => ({ ...d, [slot]: true }))
                }}
              >
                <Select.Option value="">
                  {locale === 'zh' ? '（默认）' : '(default)'}
                </Select.Option>
                {symbolSelectOptions.map(([id, meta]) => (
                  <Select.Option key={id} value={id}>
                    {meta?.name ?? id}
                  </Select.Option>
                ))}
              </Select>
              {symbolDirty[slot] ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={symSaving === slot}
                  onClick={() => void saveSymbol(slot)}
                >
                  {locale === 'zh' ? '保存' : 'Save'}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      <Chu3AppearanceSettings />

      <div className="mt-2">
        <Link
          render={<RouterLink to="/collectibles" />}
          variant="inline"
          className="text-kumo-accent text-sm font-medium"
        >
          {locale === 'zh' ? '前往收藏品页面设置 →' : 'Open Collectibles page →'}
        </Link>
      </div>

      <Button variant="secondary" disabled={exporting} onClick={() => void doExport()}>
        {locale === 'zh' ? '导出 CHUNITHM 存档 (JSON)' : 'Export CHUNITHM save (JSON)'}
      </Button>

      {overlay ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={() => setOverlay(false)}
        >
          <div
            className="bg-kumo-background border-kumo-border max-h-[90vh] max-w-3xl overflow-auto rounded-lg border p-6 shadow-xl"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-kumo-text mb-2 text-lg font-semibold">
              {locale === 'zh' ? '选择对战服' : 'Matching server'}
            </h4>
            <p className="text-kumo-subtle mb-4 text-sm">
              {locale === 'zh' ? '点选后自动写入 Matching / Reflector URL。' : 'Applies matching & reflector URLs.'}
            </p>
            <div className="flex flex-wrap gap-3">
              {CHU3_MATCHINGS.map((opt) => (
                <div
                  key={opt.matching}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    buttonVariants({ variant: 'secondary' }),
                    'h-auto cursor-pointer flex-col items-stretch rounded-lg p-4 text-left',
                    !custom && matchingUrl === opt.matching && 'ring-kumo-accent ring-2',
                  )}
                  onClick={() => void pickMatching(opt)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      void pickMatching(opt)
                    }
                  }}
                >
                  <div className="font-semibold">{opt.name}</div>
                  <div className="text-kumo-accent mt-2 text-xs">
                    <Link href={opt.ui} target="_blank" rel="noreferrer" variant="inline">
                      UI
                    </Link>
                    {' · '}
                    <Link href={opt.guide} target="_blank" rel="noreferrer" variant="inline">
                      {locale === 'zh' ? '教程' : 'Guide'}
                    </Link>
                  </div>
                  <div className="text-kumo-subtle mt-2 text-xs">{opt.coop.join(' / ')}</div>
                </div>
              ))}
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  buttonVariants({ variant: 'secondary' }),
                  'h-auto cursor-pointer flex-col items-stretch rounded-lg p-4 text-left',
                  custom && 'ring-kumo-accent ring-2',
                )}
                onClick={clickCustom}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    clickCustom()
                  }
                }}
              >
                <div className="font-semibold">{locale === 'zh' ? '自定义' : 'Custom'}</div>
                <p className="text-kumo-subtle mt-1 text-xs">
                  {locale === 'zh' ? '手动填写 URL（见下方字段）。' : 'Enter URLs manually below.'}
                </p>
              </div>
            </div>
            <Button className="mt-6" variant="secondary" onClick={() => setOverlay(false)}>
              {locale === 'zh' ? '关闭' : 'Close'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
