import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { SkeletonBox } from '@/components/ui/Skeleton'
import * as dataApi from '@/api/data'
import * as gameApi from '@/api/game'
import { detailSet } from '@/api/settings'
import { qk } from '@/lib/query'
import {
  buildMai2CatalogOptions,
  bundleToMai2Lookups,
  loadMai2CatalogBundle,
  mai2CollectibleHasImage,
  mai2CollectibleImageUrl,
  type Mai2AllItems,
  type Mai2CatalogBundle,
  type Mai2NameLookups,
} from '@/lib/mai2Assets'
import { imgCross } from '@/lib/imgSign'
import {
  buildMai2AppearanceSelectRows,
  MAI2_APPEARANCE_FIELD_ORDER,
  MAI2_FIELD_ALL_ITEMS_KEY,
  parseMai2CharaSlots,
  withMai2EquippedIfMissing,
  type Mai2AppearanceField,
  type Mai2UserItem,
  type Mai2UserboxSelectRow,
} from '@/lib/mai2Userbox'
import { useAppTexts } from '@/content/texts'
import { Button, Input, Modal } from 'antd'
import { useToast } from '@/components/ui/toast'
import { LabeledSwitch } from '@/components/ui/LabeledSwitch'
import { Text } from '@/components/ui/Text'

const UNLOCK_ALL_STORAGE_KEY = 'mai2-collectibles-unlock-all'

// charaSlot is the 5-chara team on the user detail — rendered as five pickers
// instead of a modal, so it is excluded from the grid and handled separately.
const MODAL_FIELDS = MAI2_APPEARANCE_FIELD_ORDER.filter((f) => f !== 'charaSlot')
const WIDE_PREVIEW_FIELDS = new Set(['plateId', 'frameId'])

function numFromUser(u: Record<string, unknown>, field: string): number {
  const v = u[field]
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v !== '') return parseInt(v, 10) || 0
  return 0
}

function draftFromUser(u: Record<string, unknown>): Record<string, number> {
  const d: Record<string, number> = {}
  for (const f of MAI2_APPEARANCE_FIELD_ORDER) {
    d[f] = numFromUser(u, f)
  }
  return d
}

function resolveName(
  field: string,
  itemId: number,
  allItems: Mai2AllItems,
  lookups: Mai2NameLookups | null,
): string {
  if (itemId <= 0) return '—'
  const key = MAI2_FIELD_ALL_ITEMS_KEY[field as Mai2AppearanceField]
  const fromAll = key ? allItems[key]?.[String(itemId)]?.name : undefined
  let fromJson: string | undefined
  if (lookups) {
    switch (field) {
      case 'iconId':
        fromJson = lookups.icon.get(itemId)
        break
      case 'plateId':
        fromJson = lookups.plate.get(itemId)
        break
      case 'titleId':
        fromJson = lookups.title.get(itemId)
        break
      case 'frameId':
        fromJson = lookups.frame.get(itemId)
        break
      case 'partnerId':
        fromJson = lookups.partner.get(itemId)
        break
      case 'charaSlot':
        fromJson = lookups.chara.get(itemId)
        break
      default:
        break
    }
  }
  return fromJson ?? fromAll ?? `(unknown ${itemId})`
}

function buildPaginationItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 1) return []
  if (total <= 9) return Array.from({ length: total }, (_, i) => i)
  const want = new Set<number>()
  want.add(0)
  want.add(total - 1)
  for (let d = -2; d <= 2; d++) {
    const p = current + d
    if (p >= 0 && p < total) want.add(p)
  }
  const sorted = [...want].sort((a, b) => a - b)
  const out: (number | 'ellipsis')[] = []
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!
    if (i > 0 && cur > sorted[i - 1]! + 1) out.push('ellipsis')
    out.push(cur)
  }
  return out
}

type Mai2CollectibleLoad = {
  lockedRows: Mai2UserboxSelectRow[]
  catalogBundle: Mai2CatalogBundle
  user: Record<string, unknown>
  draft: Record<string, number>
  allItems: Mai2AllItems
  lookups: Mai2NameLookups
  ownedCharacters: number[]
  ownedPartners: number[]
  ownedItemIds: Record<string, Set<number>>
}

export function Mai2CollectiblesPage() {
  const texts = useAppTexts()
  const toast = useToast()
  const [unlockAll, setUnlockAll] = useState(() => localStorage.getItem(UNLOCK_ALL_STORAGE_KEY) === '1')
  const [lockedRows, setLockedRows] = useState<Mai2UserboxSelectRow[]>([])
  const [catalogBundle, setCatalogBundle] = useState<Mai2CatalogBundle | null>(null)
  const [user, setUser] = useState<Record<string, unknown>>({})
  const [draft, setDraft] = useState<Record<string, number>>(() => draftFromUser({}))
  const [allItems, setAllItems] = useState<Mai2AllItems>({})
  const [lookups, setLookups] = useState<Mai2NameLookups | null>(null)
  const [ownedItemIds, setOwnedItemIds] = useState<Record<string, Set<number>>>({})
  const [err, setErr] = useState<string | null>(null)
  const [modalField, setModalField] = useState<string | null>(null)
  const [modalPage, setModalPage] = useState(0)
  const [modalSearch, setModalSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const deferredSearch = useDeferredValue(modalSearch.trim().toLowerCase())

  const label = useCallback(
    (field: string) => texts.collectibles.fieldLabels[field as keyof typeof texts.collectibles.fieldLabels] ?? field,
    [texts],
  )

  const effectiveUser = useMemo(() => {
    const o: Record<string, unknown> = { ...user }
    for (const f of MAI2_APPEARANCE_FIELD_ORDER) {
      o[f] = draft[f]
    }
    return o
  }, [user, draft])

  const hasDirty = useMemo(
    () => MAI2_APPEARANCE_FIELD_ORDER.some((f) => numFromUser(user, f) !== draft[f]),
    [user, draft],
  )

  const displayRows = useMemo((): Mai2UserboxSelectRow[] => {
    const base: Mai2UserboxSelectRow[] =
      unlockAll && catalogBundle
        ? MAI2_APPEARANCE_FIELD_ORDER.map((f) => ({
            field: f,
            allItemsKey: MAI2_FIELD_ALL_ITEMS_KEY[f],
            options: buildMai2CatalogOptions(f, catalogBundle),
          }))
        : lockedRows
    return base.map((row) =>
      withMai2EquippedIfMissing(row, numFromUser(effectiveUser, row.field), allItems),
    )
  }, [unlockAll, catalogBundle, lockedRows, allItems, effectiveUser])

  const loadQuery = useQuery<Mai2CollectibleLoad>({
    queryKey: qk.collectiblesMai2,
    placeholderData: (old) => old,
    queryFn: async () => {
      const [box, allRaw, bundle] = await Promise.all([
        gameApi.mai2UserBox(),
        dataApi.allItems('mai2'),
        loadMai2CatalogBundle(),
      ])
      const items = (box.items ?? []) as Mai2UserItem[]
      const u = (box.user ?? {}) as Record<string, unknown>
      const charIds = (box.characters ?? [])
        .map((x) => (typeof x === 'number' ? x : parseInt(String(x), 10)))
        .filter((n) => Number.isFinite(n) && n > 0)
      const partnerIds = (box.intimateRows ?? [])
        .map((r) => (typeof r.partnerId === 'number' ? r.partnerId : parseInt(String(r.partnerId), 10)))
        .filter((n) => Number.isFinite(n) && n > 0)
      const ai = allRaw as Mai2AllItems
      const byField: Record<string, Set<number>> = {
        iconId: new Set(items.filter((x) => x.itemKind === 3).map((x) => x.itemId)),
        plateId: new Set(items.filter((x) => x.itemKind === 1).map((x) => x.itemId)),
        titleId: new Set(items.filter((x) => x.itemKind === 2).map((x) => x.itemId)),
        frameId: new Set(items.filter((x) => x.itemKind === 11).map((x) => x.itemId)),
        partnerId: new Set(partnerIds),
        charaSlot: new Set(charIds),
      }
      return {
        allItems: ai,
        user: u,
        catalogBundle: bundle,
        lookups: bundleToMai2Lookups(bundle),
        lockedRows: buildMai2AppearanceSelectRows(items, charIds, partnerIds, u, ai),
        draft: draftFromUser(u),
        ownedCharacters: charIds,
        ownedPartners: partnerIds,
        ownedItemIds: byField,
      }
    },
  })

  useEffect(() => {
    if (!loadQuery.data) return
    setAllItems(loadQuery.data.allItems)
    setUser(loadQuery.data.user)
    setCatalogBundle(loadQuery.data.catalogBundle)
    setLookups(loadQuery.data.lookups)
    setOwnedItemIds(loadQuery.data.ownedItemIds)
    setLockedRows(loadQuery.data.lockedRows)
    setDraft(loadQuery.data.draft)
  }, [loadQuery.data])

  const isOwned = useCallback(
    (field: string, itemId: number) => ownedItemIds[field]?.has(itemId) ?? true,
    [ownedItemIds],
  )

  const activeRow = useMemo(
    () => (modalField ? displayRows.find((r) => r.field === modalField) ?? null : null),
    [displayRows, modalField],
  )

  const pickerOptionsFull = useMemo(() => activeRow?.options ?? [], [activeRow])

  const filteredOptions = useMemo(() => {
    return pickerOptionsFull.filter((o) => {
      if (!deferredSearch) return true
      return o.name.toLowerCase().includes(deferredSearch) || String(o.itemId).includes(deferredSearch)
    })
  }, [pickerOptionsFull, deferredSearch])

  const pageSize = activeRow && mai2CollectibleHasImage(activeRow.field) ? 12 : 24
  const totalPages = Math.max(1, Math.ceil(filteredOptions.length / pageSize))
  const safePage = Math.min(modalPage, totalPages - 1)
  const pageSlice = filteredOptions.slice(safePage * pageSize, safePage * pageSize + pageSize)
  const equippedId = modalField ? numFromUser(effectiveUser, modalField) : 0

  useEffect(() => {
    setModalPage(0)
  }, [modalField, deferredSearch, pageSize])

  useEffect(() => {
    if (!modalField) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setModalField(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalField])

  function openModal(field: string) {
    setModalSearch('')
    setModalPage(0)
    setModalField(field)
  }

  const closeModal = useCallback(() => {
    setModalField(null)
    setModalSearch('')
  }, [])

  const onUnlockAllChange = (on: boolean) => {
    setUnlockAll(on)
    localStorage.setItem(UNLOCK_ALL_STORAGE_KEY, on ? '1' : '0')
  }

  const selectDraftItem = useCallback(
    (field: string, itemId: number) => {
      setDraft((d) => ({ ...d, [field]: itemId }))
      closeModal()
    },
    [closeModal],
  )

  const saveCollectibles = useCallback(async () => {
    if (!hasDirty) return
    setSaving(true)
    setErr(null)
    try {
      for (const f of MAI2_APPEARANCE_FIELD_ORDER) {
        const next = draft[f]
        const prev = numFromUser(user, f)
        if (next !== prev) {
          await detailSet('mai2', f, String(next))
        }
      }
      await loadQuery.refetch()
      toast.add({ title: texts.common.saved, variant: 'success' })
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.collectibles.saveFailed)
    } finally {
      setSaving(false)
    }
  }, [hasDirty, draft, user, texts.collectibles, texts.common.saved, toast, loadQuery])

  const charaSlotRow = useMemo(
    () => displayRows.find((r) => r.field === 'charaSlot') ?? null,
    [displayRows],
  )
  const modalRows = useMemo(
    () => displayRows.filter((r) => (MODAL_FIELDS as readonly string[]).includes(r.field)),
    [displayRows],
  )

  // charaSlot is the 5-chara team on user detail; slots sent as csv
  const charaSlots = useMemo(() => parseMai2CharaSlots(user.charaSlot), [user])
  const charaDraft = useMemo(() => {
    const base = charaSlots.length ? charaSlots : [0, 0, 0, 0, 0]
    return [0, 1, 2, 3, 4].map((i) => base[i] ?? 0)
  }, [charaSlots])
  const [charaSlotDraft, setCharaSlotDraft] = useState<number[]>([0, 0, 0, 0, 0])
  const charaSlotDirty = useMemo(
    () => charaSlotDraft.some((v, i) => v !== (charaSlots[i] ?? 0)),
    [charaSlotDraft, charaSlots],
  )

  useEffect(() => {
    setCharaSlotDraft(charaDraft)
  }, [charaDraft])

  const saveCharaSlots = useCallback(async () => {
    setSaving(true)
    setErr(null)
    try {
      await detailSet('mai2', 'charaSlot', charaSlotDraft.join(','))
      await loadQuery.refetch()
      toast.add({ title: texts.common.saved, variant: 'success' })
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.collectibles.saveFailed)
    } finally {
      setSaving(false)
    }
  }, [charaSlotDraft, texts.collectibles, texts.common.saved, toast, loadQuery])

  const pageItems = useMemo(() => buildPaginationItems(safePage, totalPages), [safePage, totalPages])
  const loadErr = loadQuery.error instanceof Error ? loadQuery.error.message : loadQuery.error ? texts.collectibles.loadFailed : null

  if (loadQuery.isPending && !loadQuery.data) {
    return (
      <div className="pb-10">
        <PageHeader title={texts.nav.mai2Collectibles} crumbs={[{ label: texts.nav.home, href: '/home' }]} />
        <div className="mb-6 flex max-w-md flex-col gap-3">
          <SkeletonBox className="h-11 w-56 rounded-lg" />
          <SkeletonBox className="h-10 w-24 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="border-app-line bg-app-base flex flex-col overflow-hidden rounded-lg border shadow-sm"
            >
              <div className="border-app-line bg-app-tint border-b px-3 py-2.5 text-center">
                <SkeletonBox className="mx-auto h-4 w-24 rounded-md" />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-3">
                <SkeletonBox className="h-10 w-full rounded-lg" />
                <SkeletonBox className="aspect-square w-full rounded-xl" />
                <SkeletonBox className="h-9 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10">
      <PageHeader title={texts.nav.mai2Collectibles} crumbs={[{ label: texts.nav.home, href: '/home' }]} />

      <div className="mb-6 flex max-w-md flex-col gap-3">
        <LabeledSwitch label={texts.collectibles.unlockAll} checked={unlockAll} onChange={onUnlockAllChange} />
        <Button disabled={!hasDirty || saving} onClick={() => void saveCollectibles()}>
          {texts.collectibles.save}
        </Button>
      </div>

      {err || loadErr ? (
        <Text className="text-app-danger mb-4 text-sm">{err ?? loadErr}</Text>
      ) : null}

      <section>
        <h2 className="text-app-default mb-3 text-lg font-semibold">{texts.collectibles.equipped}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {modalRows.map((row) => {
            const cur = numFromUser(effectiveUser, row.field)
            const name = resolveName(row.field, cur, allItems, lookups)
            const img = mai2CollectibleImageUrl(row.field, cur, allItems)
            const hasImg = mai2CollectibleHasImage(row.field)
            const textOnly = row.field === 'titleId'
            const emptyUnlocks = row.options.length === 0
            const isWidePreview = WIDE_PREVIEW_FIELDS.has(row.field)
            return (
              <div
                key={row.field}
                className="border-app-line bg-app-base flex flex-col overflow-hidden rounded-lg border shadow-sm"
              >
                <div className="border-app-line bg-app-tint border-b px-3 py-2.5 text-center text-sm font-semibold text-app-default">
                  {label(row.field)}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-3">
                  <div>
                    <div className="text-app-default line-clamp-3 min-h-[2.75rem] text-sm font-medium">{name}</div>
                    {!unlockAll && emptyUnlocks && cur === 0 ? (
                      <div className="text-app-subtle mt-1 text-xs">{texts.collectibles.nothingUnlocked}</div>
                    ) : null}
                  </div>
                  <div
                    className={`flex flex-1 items-center justify-center overflow-hidden ${
                      isWidePreview ? 'min-h-[88px]' : hasImg ? 'min-h-[160px]' : 'min-h-[48px]'
                    }`}
                  >
                    {textOnly ? (
                      <div className="border-app-line bg-app-fill text-app-subtle flex w-full items-center justify-center rounded-md border px-2 py-2 text-center text-xs font-semibold leading-snug">
                        {name}
                      </div>
                    ) : img ? (
                      <img
                        src={img}
                        crossOrigin={imgCross(img)}
                        alt=""
                        className={
                          isWidePreview
                            ? 'max-h-20 w-full object-contain object-center'
                            : 'max-h-full max-w-full object-contain'
                        }
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <Button className="mt-auto" size="small" type="primary" onClick={() => openModal(row.field)}>
                    {texts.collectibles.change}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {charaSlotRow ? (
        <section className="mt-8">
          <h2 className="text-app-default mb-1 text-lg font-semibold">{texts.collectibles.charaSlotTitle}</h2>
          <Text className="text-app-subtle mb-3 block text-sm">{texts.collectibles.charaSlotHint}</Text>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {charaSlotDraft.map((slotId, idx) => {
              const img = mai2CollectibleImageUrl('characterId', slotId, allItems)
              return (
                <div
                  key={idx}
                  className="border-app-line bg-app-base flex flex-col overflow-hidden rounded-lg border shadow-sm"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="border-app-line bg-app-recessed h-14 w-14 shrink-0 overflow-hidden rounded-md border">
                      {img ? (
                        <img
                          src={img}
                          crossOrigin={imgCross(img)}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-app-subtle text-xs">
                        {texts.collectibles.charaSlotIndex(idx + 1)}
                      </div>
                      <div className="text-app-default truncate text-sm font-medium">
                        {resolveName('charaSlot', slotId, allItems, lookups)}
                      </div>
                    </div>
                  </div>
                  <div className="border-app-line border-t px-3 py-2.5">
                    <select
                      value={slotId}
                      onChange={(e) =>
                        setCharaSlotDraft((d) => {
                          const next = [...d]
                          next[idx] = parseInt(e.target.value, 10) || 0
                          return next
                        })
                      }
                      className="border-app-line bg-app-base h-9 w-full rounded-lg border px-2 text-sm text-app-default"
                    >
                      <option value={0}>{texts.common.empty}</option>
                      {charaSlotRow.options.map((o) => (
                        <option key={o.itemId} value={o.itemId}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
          <Button
            className="mt-4"
            size="small"
            type="primary"
            disabled={!charaSlotDirty || saving}
            onClick={() => void saveCharaSlots()}
          >
            {texts.collectibles.save}
          </Button>
        </section>
      ) : null}

      <Modal
        open={!!(modalField && activeRow)}
        onCancel={closeModal}
        title={activeRow ? label(activeRow.field) : ''}
        footer={null}
        centered
        destroyOnHidden
        width={{ xs: '100%', sm: '92%', lg: 960 }}
        styles={{
          body: {
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(78vh, 760px)',
          },
        }}
      >
        {activeRow ? (
          <>
            <div className="border-app-line bg-app-base shrink-0 border-b px-4 py-3">
              <label className="flex flex-col gap-1">
                <span className="text-app-subtle text-xs">{texts.collectibles.searchLabel}</span>
                <Input
                  className="h-11"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder={texts.collectibles.searchPlaceholder}
                  autoFocus
                />
              </label>
            </div>

            <div className="bg-app-recessed min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {filteredOptions.length === 0 ? (
                <Text className="text-app-subtle text-sm">{texts.collectibles.noMatches}</Text>
              ) : (
                <div
                  className={
                    mai2CollectibleHasImage(activeRow.field)
                      ? WIDE_PREVIEW_FIELDS.has(activeRow.field)
                        ? 'grid grid-cols-1 gap-4 sm:grid-cols-2'
                        : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'
                      : 'grid grid-cols-1 gap-2 sm:grid-cols-2'
                  }
                >
                  {pageSlice.map((o) => {
                    const isEquipped = equippedId === o.itemId
                    const owned = isOwned(activeRow.field, o.itemId)
                    const img = mai2CollectibleImageUrl(activeRow.field, o.itemId, allItems)
                    const displayName = resolveName(activeRow.field, o.itemId, allItems, lookups)
                    const hasImg = mai2CollectibleHasImage(activeRow.field)
                    const textOnly = activeRow.field === 'titleId'
                    const isWidePreview = WIDE_PREVIEW_FIELDS.has(activeRow.field)
                    return (
                      <Button
                        key={o.itemId}
                        htmlType="button"
                        disabled={saving}
                        onClick={() => selectDraftItem(activeRow.field, o.itemId)}
                        className={`border-app-line !bg-app-base !text-app-default h-auto min-h-0 w-full flex-col items-stretch gap-0 overflow-hidden rounded-xl border p-0 text-left shadow-sm transition-colors hover:border-app-brand ${
                          isEquipped ? 'ring-app-brand ring-2 ring-offset-2 ring-offset-app-base' : ''
                        }`}
                      >
                        <div className="text-app-default border-app-line line-clamp-2 border-b px-3 py-2.5 text-sm font-medium">
                          {displayName}
                        </div>
                        {!owned ? (
                          <div className="border-app-line border-b px-3 py-2">
                            <span className="bg-app-warning-tint text-app-warning rounded-md px-2 py-1 text-xs">
                              {texts.collectibles.locked}
                            </span>
                          </div>
                        ) : null}
                        {textOnly || !hasImg ? null : (
                          <div
                            className={`flex items-center justify-center p-2 ${
                              isWidePreview ? 'min-h-[100px]' : 'min-h-[160px]'
                            }`}
                          >
                            {img ? (
                              <img
                                src={img}
                                crossOrigin={imgCross(img)}
                                alt=""
                                className={
                                  isWidePreview
                                    ? 'max-h-24 w-full object-contain object-center'
                                    : 'max-h-[min(240px,100%)] max-w-full object-contain'
                                }
                                loading="lazy"
                              />
                            ) : null}
                          </div>
                        )}
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>

            {totalPages > 1 && filteredOptions.length > 0 ? (
              <div className="border-app-line bg-app-base flex shrink-0 flex-wrap items-center justify-center gap-1 border-t px-4 py-3">
                <Button size="small" disabled={safePage <= 0 || saving} onClick={() => setModalPage(0)}>
                  «
                </Button>
                <Button
                  size="small"
                  disabled={safePage <= 0 || saving}
                  onClick={() => setModalPage((p) => Math.max(0, p - 1))}
                >
                  {texts.common.previousPage}
                </Button>
                {pageItems.map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="text-app-subtle px-2 text-sm">
                      …
                    </span>
                  ) : (
                    <Button
                      key={item}
                      size="small"
                      type={item === safePage ? 'primary' : 'default'}
                      disabled={saving}
                      onClick={() => setModalPage(item)}
                    >
                      {item + 1}
                    </Button>
                  ),
                )}
                <Button
                  size="small"
                  disabled={safePage >= totalPages - 1 || saving}
                  onClick={() => setModalPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  {texts.common.nextPage}
                </Button>
                <Button
                  size="small"
                  disabled={safePage >= totalPages - 1 || saving}
                  onClick={() => setModalPage(totalPages - 1)}
                >
                  »
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </Modal>
    </div>
  )
}
