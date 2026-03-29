/**
 * 与 aquaNet `ChuniSettings.svelte` 一致：收藏品下拉只含 **已解锁** `items`，名称来自官方静态
 * `GET https://aquadx.net/d/chu3/00/all-items.json`（或 `VITE_DATA_HOST`）顶层键：
 * `namePlate`、`frame`、`trophy`、`mapIcon`、`systemVoice`、`avatarAccessory`、`stage`、`chara` 等。
 */
export interface Chu3UserItem {
  itemKind: number
  itemId: number
  stock?: number
}

export interface Chu3UserboxSelectRow {
  /** `allItems` 顶层键，如 namePlate / trophy / avatarAccessory */
  allItemsKey: string
  /** `user-detail-set` 字段名 */
  field: string
  options: { itemId: number; name: string }[]
}

const IKINDS: Record<string, number> = {
  namePlate: 1,
  frame: 2,
  trophy: 3,
  trophySub1: 4,
  trophySub2: 5,
  mapIcon: 8,
  systemVoice: 9,
  avatarAccessory: 11,
  stage: 13,
}

const AVATAR_KINDS = ['Wear', 'Head', 'Face', 'Skin', 'Item', 'Front', 'Back'] as const

/** 与 `aquaNet` zh / en_ref `userbox.${field}` 对齐 */
export const CHU3_USERBOX_LABELS: Record<string, string> = {
  nameplateId: '名牌',
  frameId: '边框',
  trophyId: '称号',
  trophyIdSub1: '称号2',
  trophyIdSub2: '称号3',
  mapIconId: '地图图标',
  voiceId: '系统语音',
  avatarWear: '企鹅服饰',
  avatarHead: '企鹅头饰',
  avatarFace: '企鹅面部',
  avatarSkin: '企鹅皮肤',
  avatarItem: '企鹅物品',
  avatarFront: '企鹅前景',
  avatarBack: '企鹅背景',
  stageId: '舞台',
  characterId: '角色',
  userName: '游戏内名称',
}

/** 与 `Chu3UserData` / 名牌预览字段顺序一致（角色紧挨边框）。 */
export const CHU3_APPEARANCE_FIELD_ORDER = [
  'nameplateId',
  'frameId',
  'characterId',
  'trophyId',
  'trophyIdSub1',
  'trophyIdSub2',
  'mapIconId',
  'voiceId',
  'avatarWear',
  'avatarHead',
  'avatarFace',
  'avatarSkin',
  'avatarItem',
  'avatarFront',
  'avatarBack',
  'stageId',
] as const

/** `user-detail-set` 字段 → `all-items.json` 顶层键 */
export const CHU3_FIELD_ALL_ITEMS_KEY: Record<(typeof CHU3_APPEARANCE_FIELD_ORDER)[number], string> = {
  nameplateId: 'namePlate',
  frameId: 'frame',
  characterId: 'chara',
  trophyId: 'trophy',
  trophyIdSub1: 'trophy',
  trophyIdSub2: 'trophy',
  mapIconId: 'mapIcon',
  voiceId: 'systemVoice',
  avatarWear: 'avatarAccessory',
  avatarHead: 'avatarAccessory',
  avatarFace: 'avatarAccessory',
  avatarSkin: 'avatarAccessory',
  avatarItem: 'avatarAccessory',
  avatarFront: 'avatarAccessory',
  avatarBack: 'avatarAccessory',
  stageId: 'stage',
}

function itemName(
  allItems: Record<string, Record<string, { name?: string }>>,
  key: string,
  itemId: number,
): string {
  const n = allItems[key]?.[String(itemId)]?.name
  return n ?? `(unknown ${itemId})`
}

/** 当前装备不在已解锁列表时仍显示一项（与机台数据一致，避免 `<select>` 无匹配 value） */
export function withEquippedIfMissing(
  row: Chu3UserboxSelectRow,
  currentId: number,
  allItems: Record<string, Record<string, { name?: string }>>,
): Chu3UserboxSelectRow {
  if (currentId === 0 || row.options.some((o) => o.itemId === currentId)) return row
  return {
    ...row,
    options: [
      { itemId: currentId, name: itemName(allItems, row.allItemsKey, currentId) },
      ...row.options,
    ],
  }
}

export function buildChu3UserboxSelectRows(
  userItems: Chu3UserItem[],
  allItems: Record<string, Record<string, { name?: string }>>,
): Chu3UserboxSelectRow[] {
  const rows: Chu3UserboxSelectRow[] = []

  for (const [entryKey, iKind] of Object.entries(IKINDS)) {
    if (entryKey === 'avatarAccessory') {
      for (let i = 0; i < AVATAR_KINDS.length; i++) {
        const aKind = AVATAR_KINDS[i]
        const field = `avatar${aKind}`
        const filtered = userItems.filter(
          (x) => x.itemKind === iKind && Math.floor(x.itemId / 100000) % 10 === i + 1,
        )
        if (!filtered.length) continue
        rows.push({
          allItemsKey: 'avatarAccessory',
          field,
          options: filtered.map((x) => ({
            itemId: x.itemId,
            name: itemName(allItems, 'avatarAccessory', x.itemId),
          })),
        })
      }
      continue
    }

    let iKey = entryKey
    let ubKey = `${iKey}Id`
    if (iKey.slice(6, 9) === 'Sub') {
      ubKey = `trophyIdSub${iKey.slice(9, 10)}`
      iKey = 'trophy'
    }
    if (ubKey === 'namePlateId') ubKey = 'nameplateId'
    if (ubKey === 'systemVoiceId') ubKey = 'voiceId'

    const filtered = userItems.filter(
      (x) => x.itemKind === iKind || (iKey === 'trophy' && x.itemKind === 3),
    )
    if (!filtered.length) continue

    const allItemsKey =
      entryKey.startsWith('trophySub') || entryKey === 'trophy'
        ? 'trophy'
        : entryKey === 'namePlate'
          ? 'namePlate'
          : iKey

    rows.push({
      allItemsKey,
      field: ubKey,
      options: filtered.map((x) => ({
        itemId: x.itemId,
        name: itemName(allItems, allItemsKey, x.itemId),
      })),
    })
  }

  return rows
}

function buildCharacterSelectRow(
  unlockedCharacterIds: number[],
  equippedCharacterId: number,
  allItems: Record<string, Record<string, { name?: string }>>,
): Chu3UserboxSelectRow | null {
  const allItemsKey = 'chara'
  const ids = [...new Set(unlockedCharacterIds.filter((n) => Number.isFinite(n)))]
  if (equippedCharacterId > 0 && !ids.includes(equippedCharacterId)) ids.push(equippedCharacterId)
  if (!ids.length) return null
  ids.sort((a, b) => a - b)
  return {
    allItemsKey,
    field: 'characterId',
    options: ids.map((itemId) => ({
      itemId,
      name: itemName(allItems, allItemsKey, itemId),
    })),
  }
}

export function buildChu3AppearanceSelectRows(
  userItems: Chu3UserItem[],
  unlockedCharacterIds: number[],
  equippedCharacterId: number,
  allItems: Record<string, Record<string, { name?: string }>>,
): Chu3UserboxSelectRow[] {
  const fromItems = buildChu3UserboxSelectRows(userItems, allItems)
  const byField = new Map(fromItems.map((r) => [r.field, r]))
  const charRow = buildCharacterSelectRow(unlockedCharacterIds, equippedCharacterId, allItems)
  if (charRow) byField.set('characterId', charRow)

  const out: Chu3UserboxSelectRow[] = []
  for (const f of CHU3_APPEARANCE_FIELD_ORDER) {
    const r = byField.get(f)
    if (r) out.push(r)
  }
  return out
}
