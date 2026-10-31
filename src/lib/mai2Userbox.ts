import type { Mai2AllItems } from '@/lib/mai2Assets'

export interface Mai2UserItem {
  itemKind: number
  itemId: number
  stock?: number
}

export interface Mai2UserboxSelectRow {
  allItemsKey: string
  field: string
  options: { itemId: number; name: string }[]
}

// maimai2_user_item.itemKind ordinals (Mai2ItemKind)
export const MAI2_IKINDS = {
  plate: 1,
  title: 2,
  icon: 3,
  musicUnlock: 5,
  musicMasterUnlock: 6,
  musicRemasterUnlock: 7,
  musicStrongUnlock: 8,
  chara: 9,
  partner: 10,
  frame: 11,
  ticket: 12,
} as const

export const MAI2_APPEARANCE_FIELD_ORDER = [
  'iconId',
  'plateId',
  'titleId',
  'frameId',
  'partnerId',
  'charaSlot',
] as const

export type Mai2AppearanceField = (typeof MAI2_APPEARANCE_FIELD_ORDER)[number]

export const MAI2_FIELD_ALL_ITEMS_KEY: Record<Mai2AppearanceField, string> = {
  iconId: 'icon',
  plateId: 'plate',
  titleId: 'title',
  frameId: 'frame',
  partnerId: 'partner',
  charaSlot: 'chara',
}

function itemName(allItems: Mai2AllItems, key: string, itemId: number): string {
  if (itemId === 0) return '—'
  if (!key) return String(itemId)
  const n = allItems[key]?.[String(itemId)]?.name
  return n ?? `(unknown ${itemId})`
}

export function withMai2EquippedIfMissing(
  row: Mai2UserboxSelectRow,
  currentId: number,
  allItems: Mai2AllItems,
): Mai2UserboxSelectRow {
  if (currentId <= 0 || row.options.some((o) => o.itemId === currentId)) return row
  return {
    ...row,
    options: [
      { itemId: currentId, name: itemName(allItems, row.allItemsKey, currentId) },
      ...row.options,
    ],
  }
}

function idListRow(
  field: Mai2AppearanceField,
  ids: number[],
  equippedId: number,
  allItems: Mai2AllItems,
): Mai2UserboxSelectRow {
  const key = MAI2_FIELD_ALL_ITEMS_KEY[field]
  const set = new Set(ids.filter((n) => Number.isFinite(n) && n > 0))
  if (equippedId > 0) set.add(equippedId)
  const sorted = [...set].sort((a, b) => a - b)
  return {
    allItemsKey: key,
    field,
    options: sorted.map((itemId) => ({ itemId, name: itemName(allItems, key, itemId) })),
  }
}

// partners live in maimai2_user_intimate (like ongeki decks), not userItem
function partnerRow(
  ownedPartnerIds: number[],
  equippedId: number,
  allItems: Mai2AllItems,
): Mai2UserboxSelectRow {
  return idListRow('partnerId', ownedPartnerIds, equippedId, allItems)
}

// charaSlot is the 5-chara team list on user detail; owned charas come from
// maimai2_user_character rows (chara itemKind=9 rows in userItem may also exist).
function charaSlotRow(
  ownedCharaIds: number[],
  currentSlots: number[],
  allItems: Mai2AllItems,
): Mai2UserboxSelectRow {
  const set = new Set(ownedCharaIds.filter((n) => Number.isFinite(n) && n > 0))
  const sorted = [...set].sort((a, b) => a - b)
  const options = [{ itemId: 0, name: '—' }]
    .concat(sorted.map((itemId) => ({ itemId, name: itemName(allItems, 'chara', itemId) })))
  for (const slotId of currentSlots) {
    if (slotId > 0 && !options.some((o) => o.itemId === slotId)) {
      options.push({ itemId: slotId, name: itemName(allItems, 'chara', slotId) })
    }
  }
  return { allItemsKey: 'chara', field: 'charaSlot', options }
}

export function parseMai2CharaSlots(v: unknown): number[] {
  if (Array.isArray(v)) return v.map((x) => Number(x) || 0).slice(0, 5)
  if (typeof v === 'string' && v) return v.split(',').map((x) => parseInt(x, 10) || 0).slice(0, 5)
  return []
}

export function buildMai2AppearanceSelectRows(
  userItems: Mai2UserItem[],
  ownedCharaIds: number[],
  ownedPartnerIds: number[],
  user: Record<string, unknown>,
  allItems: Mai2AllItems,
): Mai2UserboxSelectRow[] {
  const num = (f: string) => {
    const v = user[f]
    if (typeof v === 'number') return v
    if (typeof v === 'string' && v !== '') return parseInt(v, 10) || 0
    return 0
  }

  const itemIdsOfKind = (kind: number) =>
    userItems.filter((x) => x.itemKind === kind).map((x) => x.itemId)

  // union chara sources: maimai2_user_character rows + itemKind=9 rows
  const charaIds = [...ownedCharaIds, ...itemIdsOfKind(MAI2_IKINDS.chara)]

  return [
    idListRow('iconId', itemIdsOfKind(MAI2_IKINDS.icon), num('iconId'), allItems),
    idListRow('plateId', itemIdsOfKind(MAI2_IKINDS.plate), num('plateId'), allItems),
    idListRow('titleId', itemIdsOfKind(MAI2_IKINDS.title), num('titleId'), allItems),
    idListRow('frameId', itemIdsOfKind(MAI2_IKINDS.frame), num('frameId'), allItems),
    partnerRow(ownedPartnerIds, num('partnerId'), allItems),
    charaSlotRow(charaIds, parseMai2CharaSlots(user.charaSlot), allItems),
  ]
}
