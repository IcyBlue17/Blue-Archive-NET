import { imgUrl1 } from './imgSign'

/**
 * CHUNITHM 收藏品静态资源：`public/chu3-assets/`（由 tools/chuni_assets 同步）。
 * 大部分图片文件名 id 为 8 位零填充；角色图使用 `prefix_suffix_variant` 规则。
 */

export type Chu3JsonEntry = { id: number; name: string; category?: number }

const resolvedCache = new Map<string, Chu3JsonEntry[]>()
const inflight = new Map<string, Promise<Chu3JsonEntry[]>>()

const BASE = '/chu3-assets'

export function padChu3Id8(id: number): string {
  return String(Math.max(0, Math.floor(id))).padStart(8, '0')
}

export function padChu3CharaImageId(id: number): string {
  return String(Math.max(0, Math.floor(id / 10))).padStart(4, '0')
}

export function padChu3CharaImageSuffix(id: number): string {
  return String(Math.max(0, Math.floor(id % 10))).padStart(2, '0')
}

export function chu3CharacterImageUrl(itemId: number, variant: '00' | '02' = '00'): string | null {
  if (itemId < 0) return null
  const pre = padChu3CharaImageId(itemId)
  const suf = padChu3CharaImageSuffix(itemId)
  return imgUrl1(`${BASE}/chara/CHU_UI_Character_${pre}_${suf}_${variant}.webp`)
}

/** 计划表：分类元数据（field、JSON、本地图目录与前缀） */
export type Chu3CollectibleCategoryMeta = {
  key: string
  field: string
  labelZh: string
  jsonFile: string | null
  hasImage: boolean
  imagePrefix: string | null
  imageDir: string | null
  /** avatar_icon.json 的 category 1–7；其它为 undefined */
  avatarCategory?: number
}

/** 与计划一致的「带本地图」字段映射（用于缩略图 URL） */
const FIELD_IMAGE: Partial<
  Record<
    string,
    {
      dir: string
      prefix: string
      suffix?: string
      formatId?: (id: number) => string
    }
  >
> = {
  nameplateId: { dir: 'namePlate', prefix: 'CHU_UI_NamePlate_' },
  characterId: {
    dir: 'chara',
    prefix: 'CHU_UI_Character_',
    suffix: '_00',
    formatId: (id) => `${padChu3CharaImageId(id)}_${padChu3CharaImageSuffix(id)}`,
  },
  mapIconId: { dir: 'mapIcon', prefix: 'CHU_UI_MapIcon_' },
  voiceId: { dir: 'systemVoice', prefix: 'CHU_UI_SystemVoice_' },
  avatarWear: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
  avatarHead: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
  avatarFace: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
  avatarSkin: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
  avatarItem: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
  avatarFront: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
  avatarBack: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
}

export function chu3CollectibleImageUrl(field: string, itemId: number): string | null {
  if (itemId < 0) return null
  if (itemId === 0 && field !== 'characterId') return null
  if (field === 'characterId') return chu3CharacterImageUrl(itemId, '00')
  const meta = FIELD_IMAGE[field]
  if (!meta) return null
  const fmt = meta.formatId ?? padChu3Id8
  const suffix = meta.suffix ?? ''
  return imgUrl1(`${BASE}/${meta.dir}/${meta.prefix}${fmt(itemId)}${suffix}.webp`)
}

export function chu3CollectibleHasImage(field: string): boolean {
  return FIELD_IMAGE[field] != null
}

export async function fetchChu3AssetJson(jsonFile: string): Promise<Chu3JsonEntry[]> {
  const cached = resolvedCache.get(jsonFile)
  if (cached) return cached
  let p = inflight.get(jsonFile)
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(`${BASE}/${jsonFile}`)
        if (!res.ok) throw new Error(`chu3-assets: failed to load ${jsonFile} (${res.status})`)
        const data = (await res.json()) as Chu3JsonEntry[]
        resolvedCache.set(jsonFile, data)
        return data
      } finally {
        inflight.delete(jsonFile)
      }
    })()
    inflight.set(jsonFile, p)
  }
  return p
}

/** 名称查找：名牌 / 称号 / 地图图标 / 系统语音 / 企鹅部件（avatar 全表按 id） */
export type Chu3NameLookups = {
  namePlate: Map<number, string>
  character: Map<number, string>
  trophy: Map<number, string>
  mapIcon: Map<number, string>
  systemVoice: Map<number, string>
  avatar: Map<number, string>
}

/** 本地 JSON 全量目录（用于「解锁全部」可选列表） */
export type Chu3CatalogBundle = {
  nameplate: Chu3JsonEntry[]
  character: Chu3JsonEntry[]
  trophy: Chu3JsonEntry[]
  mapicon: Chu3JsonEntry[]
  sysvoice: Chu3JsonEntry[]
  avatar_icon: Chu3JsonEntry[]
}

export async function loadChu3CatalogBundle(): Promise<Chu3CatalogBundle> {
  const [nameplate, character, trophy, mapicon, sysvoice, avatar_icon] = await Promise.all([
    fetchChu3AssetJson('nameplate.json'),
    fetchChu3AssetJson('character.json'),
    fetchChu3AssetJson('trophy.json'),
    fetchChu3AssetJson('mapicon.json'),
    fetchChu3AssetJson('sysvoice.json'),
    fetchChu3AssetJson('avatar_icon.json'),
  ])
  return { nameplate, character, trophy, mapicon, sysvoice, avatar_icon }
}

export function bundleToLookups(bundle: Chu3CatalogBundle): Chu3NameLookups {
  const toMap = (rows: Chu3JsonEntry[]) => new Map(rows.map((r) => [r.id, r.name]))
  return {
    namePlate: toMap(bundle.nameplate),
    character: toMap(bundle.character),
    trophy: toMap(bundle.trophy),
    mapIcon: toMap(bundle.mapicon),
    systemVoice: toMap(bundle.sysvoice),
    avatar: toMap(bundle.avatar_icon),
  }
}

export async function loadChu3NameLookups(): Promise<Chu3NameLookups> {
  const b = await loadChu3CatalogBundle()
  return bundleToLookups(b)
}

/** 企鹅部位 field → avatar_icon.json 的 category */
const AVATAR_FIELD_TO_CATEGORY: Record<string, number> = {
  avatarWear: 1,
  avatarHead: 2,
  avatarFace: 3,
  avatarSkin: 4,
  avatarItem: 5,
  avatarFront: 6,
  avatarBack: 7,
}

function allItemsKeysToOptions(
  allItems: Record<string, Record<string, { name?: string }>>,
  key: string,
): { itemId: number; name: string }[] {
  const o = allItems[key]
  if (!o) return []
  return Object.keys(o)
    .map((k) => ({ itemId: parseInt(k, 10), name: o[k]?.name ?? k }))
    .filter((x) => Number.isFinite(x.itemId))
    .sort((a, b) => a.itemId - b.itemId)
}

/** 从静态 JSON + all-items 构建某一字段的**全表**候选项（仅前端展示/选择；机台是否承认另论） */
export function buildChu3CatalogOptions(
  field: string,
  bundle: Chu3CatalogBundle,
  allItems: Record<string, Record<string, { name?: string }>>,
): { itemId: number; name: string }[] {
  switch (field) {
    case 'nameplateId':
      return bundle.nameplate.map((e) => ({ itemId: e.id, name: e.name }))
    case 'trophyId':
    case 'trophyIdSub1':
    case 'trophyIdSub2':
      return bundle.trophy.map((e) => ({ itemId: e.id, name: e.name }))
    case 'mapIconId':
      return bundle.mapicon.map((e) => ({ itemId: e.id, name: e.name }))
    case 'voiceId':
      return bundle.sysvoice.map((e) => ({ itemId: e.id, name: e.name }))
    case 'avatarWear':
    case 'avatarHead':
    case 'avatarFace':
    case 'avatarSkin':
    case 'avatarItem':
    case 'avatarFront':
    case 'avatarBack': {
      const cat = AVATAR_FIELD_TO_CATEGORY[field]
      return bundle.avatar_icon.filter((e) => e.category === cat).map((e) => ({ itemId: e.id, name: e.name }))
    }
    case 'frameId':
      return allItemsKeysToOptions(allItems, 'frame')
    case 'stageId':
      return allItemsKeysToOptions(allItems, 'stage')
    case 'characterId':
      return bundle.character.map((e) => ({ itemId: e.id, name: e.name }))
    default:
      return []
  }
}

/** 计划中的分类常量（文档与扩展用；运行时以 field + FIELD_IMAGE 为准） */
export const CHU3_COLLECTIBLE_CATEGORIES: Chu3CollectibleCategoryMeta[] = [
  {
    key: 'nameplate',
    field: 'nameplateId',
    labelZh: '名牌',
    jsonFile: 'nameplate.json',
    hasImage: true,
    imageDir: 'namePlate',
    imagePrefix: 'CHU_UI_NamePlate_',
  },
  {
    key: 'character',
    field: 'characterId',
    labelZh: '角色',
    jsonFile: 'character.json',
    hasImage: true,
    imageDir: 'chara',
    imagePrefix: 'CHU_UI_Character_',
  },
  {
    key: 'trophy',
    field: 'trophyId',
    labelZh: '称号',
    jsonFile: 'trophy.json',
    hasImage: false,
    imageDir: null,
    imagePrefix: null,
  },
  {
    key: 'trophySub1',
    field: 'trophyIdSub1',
    labelZh: '称号2',
    jsonFile: 'trophy.json',
    hasImage: false,
    imageDir: null,
    imagePrefix: null,
  },
  {
    key: 'trophySub2',
    field: 'trophyIdSub2',
    labelZh: '称号3',
    jsonFile: 'trophy.json',
    hasImage: false,
    imageDir: null,
    imagePrefix: null,
  },
  {
    key: 'mapIcon',
    field: 'mapIconId',
    labelZh: '地图图标',
    jsonFile: 'mapicon.json',
    hasImage: true,
    imageDir: 'mapIcon',
    imagePrefix: 'CHU_UI_MapIcon_',
  },
  {
    key: 'sysvoice',
    field: 'voiceId',
    labelZh: '系统语音',
    jsonFile: 'sysvoice.json',
    hasImage: true,
    imageDir: 'systemVoice',
    imagePrefix: 'CHU_UI_SystemVoice_',
  },
  {
    key: 'avatarWear',
    field: 'avatarWear',
    labelZh: '企鹅服饰',
    jsonFile: 'avatar_icon.json',
    hasImage: true,
    imageDir: 'avatar',
    imagePrefix: 'CHU_UI_Avatar_Icon_',
    avatarCategory: 1,
  },
  {
    key: 'avatarHead',
    field: 'avatarHead',
    labelZh: '企鹅头饰',
    jsonFile: 'avatar_icon.json',
    hasImage: true,
    imageDir: 'avatar',
    imagePrefix: 'CHU_UI_Avatar_Icon_',
    avatarCategory: 2,
  },
  {
    key: 'avatarFace',
    field: 'avatarFace',
    labelZh: '企鹅面部',
    jsonFile: 'avatar_icon.json',
    hasImage: true,
    imageDir: 'avatar',
    imagePrefix: 'CHU_UI_Avatar_Icon_',
    avatarCategory: 3,
  },
  {
    key: 'avatarSkin',
    field: 'avatarSkin',
    labelZh: '企鹅皮肤',
    jsonFile: 'avatar_icon.json',
    hasImage: true,
    imageDir: 'avatar',
    imagePrefix: 'CHU_UI_Avatar_Icon_',
    avatarCategory: 4,
  },
  {
    key: 'avatarItem',
    field: 'avatarItem',
    labelZh: '企鹅物品',
    jsonFile: 'avatar_icon.json',
    hasImage: true,
    imageDir: 'avatar',
    imagePrefix: 'CHU_UI_Avatar_Icon_',
    avatarCategory: 5,
  },
  {
    key: 'avatarFront',
    field: 'avatarFront',
    labelZh: '企鹅前景',
    jsonFile: 'avatar_icon.json',
    hasImage: true,
    imageDir: 'avatar',
    imagePrefix: 'CHU_UI_Avatar_Icon_',
    avatarCategory: 6,
  },
  {
    key: 'avatarBack',
    field: 'avatarBack',
    labelZh: '企鹅背景',
    jsonFile: 'avatar_icon.json',
    hasImage: true,
    imageDir: 'avatar',
    imagePrefix: 'CHU_UI_Avatar_Icon_',
    avatarCategory: 7,
  },
]
