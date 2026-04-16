import { imgUrl1 } from './imgSign'

/**
 * CHUNITHM 收藏品静态资源。
 * 默认不再强制加 `/chu3-assets` 前缀；需要子目录时请用 `VITE_CHU3_ASSET_BASE` 或直接写进 `VITE_IMAGE_HOST`。
 * 大部分图片文件名 id 为 8 位零填充；角色图使用 `prefix_suffix_variant` 规则。
 */

export type Chu3JsonEntry = { id: number; name: string; category?: number }
export type Chu3StageJsonEntry = {
  stageId?: number
  id?: number
  name?: string | null
  imagePath?: string | null
  imageFile?: string | null
  isEnabled?: boolean
  defaultHave?: boolean
}
export type Chu3AllItemMeta = { name?: string; imagePath?: string | null; imageFile?: string | null }
export type Chu3AllItems = Record<string, Record<string, Chu3AllItemMeta>>

const resolvedCache = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()

function fixBase1(raw: unknown): string {
  const s1 = String(raw ?? '').trim()
  if (!s1) return ''
  return `/${s1.replace(/^\/+|\/+$/g, '')}`
}

const BASE = fixBase1(import.meta.env.VITE_CHU3_ASSET_BASE ?? '')

function assetPath1(one: string): string {
  return BASE ? `${BASE}/${one}` : `/${one}`
}

export function chu3AssetUrl1(one: string): string {
  return imgUrl1(assetPath1(one))
}

function assetImageUrl1(raw: unknown): string | null {
  const s1 = String(raw ?? '').trim()
  if (!s1) return null
  if (/^https?:\/\//i.test(s1)) return s1
  return chu3AssetUrl1(s1.replace(/^\/+/, ''))
}

function stageImagePath1(raw: unknown): string | null {
  const s1 = String(raw ?? '').trim()
  if (!s1) return null
  if (/^https?:\/\//i.test(s1)) return s1
  const path1 = s1.replace(/^\/+/, '')
  if (!path1) return null
  return path1.includes('/') ? path1 : `stage/${path1}`
}

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
  return chu3AssetUrl1(`chara/CHU_UI_Character_${pre}_${suf}_${variant}.webp`)
}

/** 计划表：分类元数据（field、JSON、本地图目录与前缀） */
export type Chu3CollectibleCategoryMeta = {
  key: string
  field: string
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
  stageId: { dir: 'stage', prefix: 'CHU_UI_Stage_' },
  avatarWear: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
  avatarHead: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
  avatarFace: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
  avatarSkin: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
  avatarItem: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
  avatarFront: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
  avatarBack: { dir: 'avatar', prefix: 'CHU_UI_Avatar_Icon_' },
}

export function chu3CollectibleImageUrl(field: string, itemId: number, allItems?: Chu3AllItems): string | null {
  if (itemId < 0) return null
  if (itemId === 0 && field !== 'characterId') return null
  if (field === 'stageId') {
    const row1 = allItems?.stage?.[String(itemId)]
    return assetImageUrl1(stageImagePath1(row1?.imagePath ?? row1?.imageFile))
  }
  if (field === 'characterId') return chu3CharacterImageUrl(itemId, '00')
  const meta = FIELD_IMAGE[field]
  if (!meta) return null
  const fmt = meta.formatId ?? padChu3Id8
  const suffix = meta.suffix ?? ''
  return chu3AssetUrl1(`${meta.dir}/${meta.prefix}${fmt(itemId)}${suffix}.webp`)
}

export function chu3CollectibleHasImage(field: string): boolean {
  return FIELD_IMAGE[field] != null
}

export async function fetchChu3AssetJson<T = Chu3JsonEntry[]>(jsonFile: string): Promise<T> {
  if (resolvedCache.has(jsonFile)) return resolvedCache.get(jsonFile) as T
  let p = inflight.get(jsonFile) as Promise<T> | undefined
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(chu3AssetUrl1(jsonFile))
        if (!res.ok) throw new Error(`chu3-assets: failed to load ${jsonFile} (${res.status})`)
        const data = (await res.json()) as T
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

export async function loadChu3StageCatalog(): Promise<Chu3StageJsonEntry[]> {
  return fetchChu3AssetJson<Chu3StageJsonEntry[]>('stage.json')
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
  allItems: Chu3AllItems,
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
  allItems: Chu3AllItems,
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
