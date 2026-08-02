import { imgUrl } from '@/lib/imgSign'

export type Chu3JsonEntry = { id: number; name: string; category?: number }
export type Chu3MateReward = {
  rewardId?: number
  level?: number
  itemId?: number
  itemName?: string
}
/**
 * mate.json rows. Detail comes from here rather than all-items.json: that file is ~14 MB and
 * gets overwritten in place, so an edge cache can serve a stale copy long after a rebuild —
 * mate.json is 2 KB and already loaded for the name lookups.
 */
export type Chu3MateJsonEntry = Chu3JsonEntry & {
  imageFile?: string
  charaId?: number
  charaName?: string
  ddsIllustId?: number
  ddsIllustName?: string
  systemVoiceId?: number
  netOpenName?: string
  version?: string
  rewards?: Chu3MateReward[]
}
export type Chu3StageJsonEntry = {
  stageId?: number
  id?: number
  name?: string | null
  imagePath?: string | null
  imageFile?: string | null
  isEnabled?: boolean
  defaultHave?: boolean
}
export type Chu3AllItemMeta = {
  name?: string
  imagePath?: string | null
  imageFile?: string | null
  /** 称号专有：稀有度，决定文字牌的配色（trophy.json 里没有图，只有这个）。 */
  rareType?: number
}
export type Chu3AllItems = Record<string, Record<string, Chu3AllItemMeta>>

const resolvedCache = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()

function fixBase(raw: unknown): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  return `/${s.replace(/^\/+|\/+$/g, '')}`
}

const BASE = fixBase(import.meta.env.VITE_CHU3_ASSET_BASE ?? '')

function assetPath(one: string): string {
  return BASE ? `${BASE}/${one}` : `/${one}`
}

export function chu3AssetUrl(one: string): string {
  return imgUrl(assetPath(one))
}

function assetImageUrl(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  return chu3AssetUrl(s.replace(/^\/+/, ''))
}

function stageImagePath(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  const path = s.replace(/^\/+/, '')
  if (!path) return null
  return path.includes('/') ? path : `stage/${path}`
}

function categoryImagePath(raw: unknown, dir: string): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  const path = s.replace(/^\/+/, '')
  if (!path) return null
  return path.includes('/') ? path : `${dir}/${path}`
}

export function padChu3Id8(id: number): string {
  return String(Math.max(0, Math.floor(id))).padStart(8, '0')
}

// Mate art is 6-digit: mate 101 -> CHU_UI_Mate_000101.webp
export function padChu3Id6(id: number): string {
  return String(Math.max(0, Math.floor(id))).padStart(6, '0')
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
  return chu3AssetUrl(`chara/CHU_UI_Character_${pre}_${suf}_${variant}.webp`)
}

export type Chu3CollectibleCategoryMeta = {
  key: string
  field: string
  jsonFile: string | null
  hasImage: boolean
  imagePrefix: string | null
  imageDir: string | null
  
  avatarCategory?: number
}

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
  frameId: { dir: 'frame', prefix: 'CHU_UI_Frame_' },
  characterId: {
    dir: 'chara',
    prefix: 'CHU_UI_Character_',
    suffix: '_00',
    formatId: (id) => `${padChu3CharaImageId(id)}_${padChu3CharaImageSuffix(id)}`,
  },
  mapIconId: { dir: 'mapIcon', prefix: 'CHU_UI_MapIcon_' },
  voiceId: { dir: 'systemVoice', prefix: 'CHU_UI_SystemVoice_' },
  stageId: { dir: 'stage', prefix: 'CHU_UI_Stage_' },
  mateId: { dir: 'mate', prefix: 'CHU_UI_Mate_', formatId: padChu3Id6 },
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
    const row = allItems?.stage?.[String(itemId)]
    return assetImageUrl(stageImagePath(row?.imagePath ?? row?.imageFile))
  }
  if (field === 'characterId') return chu3CharacterImageUrl(itemId, '00')
  const meta = FIELD_IMAGE[field]
  if (!meta) return null
  if (field === 'frameId' || field === 'mateId') {
    const key = field === 'frameId' ? 'frame' : 'mate'
    const row = allItems?.[key]?.[String(itemId)]
    const fromMeta = assetImageUrl(categoryImagePath(row?.imagePath ?? row?.imageFile, meta.dir))
    if (fromMeta) return fromMeta
  }
  const fmt = meta.formatId ?? padChu3Id8
  const suffix = meta.suffix ?? ''
  return chu3AssetUrl(`${meta.dir}/${meta.prefix}${fmt(itemId)}${suffix}.webp`)
}

export function chu3CollectibleHasImage(field: string): boolean {
  return FIELD_IMAGE[field] != null
}

export const CHU3_TROPHY_FIELDS = ['trophyId', 'trophyIdSub1', 'trophyIdSub2'] as const

/**
 * 称号底图。trophyFrame/ 下按 rareType 命名（0–14，592×62 的横幅）。
 * rareType 最高到 17 但只出到 14，超出的夹到 14。
 */
export function chu3TrophyFrameUrl(rareType: number | undefined): string {
  const n = Math.min(Math.max(Math.floor(rareType ?? 0), 0), 14)
  return chu3AssetUrl(`trophyFrame/${n}.png`)
}

/**
 * 少数称号（KING of Performai 之类，rareType 18–22，共 75 个）自带整张立绘，
 * trophy.json 里的 imageFile 就是文件名；其余 8000 多个只有文字，靠底图 + 文本合成。
 */
export function chu3TrophyArtUrl(itemId: number, allItems?: Chu3AllItems): string | null {
  const file = String(allItems?.trophy?.[String(itemId)]?.imageFile ?? '').trim()
  return file ? chu3AssetUrl(`trophy/${file}`) : null
}

export async function fetchChu3AssetJson<T = Chu3JsonEntry[]>(jsonFile: string): Promise<T> {
  if (resolvedCache.has(jsonFile)) return resolvedCache.get(jsonFile) as T
  let p = inflight.get(jsonFile) as Promise<T> | undefined
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(chu3AssetUrl(jsonFile))
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

async function fetchChu3AssetJsonOr<T>(jsonFile: string, fallback: T): Promise<T> {
  try {
    return await fetchChu3AssetJson<T>(jsonFile)
  } catch {
    return fallback
  }
}

export async function loadChu3StageCatalog(): Promise<Chu3StageJsonEntry[]> {
  return fetchChu3AssetJson<Chu3StageJsonEntry[]>('stage.json')
}

/**
 * 称号 rareType 的稀有度名，取自游戏内标准稀有度。
 *
 * 没列出的（4/6/8 等）在数据里是实际存在且常见的档位——4 是 EXPERT ALL JUSTICE、
 * 6 是 MASTER、8 是 ULTIMA，各有自己的底框，只是没有官方短名，界面直接显示编号。
 */
export const TROPHY_RARE_LABEL: Record<number, string> = {
  0: 'normal',
  1: 'bronze',
  2: 'silver',
  3: 'gold',
  5: 'platinum',
  7: 'rainbow',
  9: 'staff',
  10: 'ongeki',
  11: 'maimai',
  12: 'irodori silver',
  13: 'irodori gold',
  14: 'irodori rainbow',
}

export function trophyRareLabel(rareType: number | null | undefined): string {
  if (!Number.isFinite(rareType)) return '—'
  const r = Math.floor(rareType as number)
  return TROPHY_RARE_LABEL[r] ? `${TROPHY_RARE_LABEL[r]} (${r})` : String(r)
}

/** 详情分片的 id 跨度，必须和产物侧的 DETAIL_SHARD_SPAN1 一致。 */
const DETAIL_SHARD_SPAN = 1000

export type Chu3DetailRow = Record<string, unknown>

/**
 * 按需取一条详情。列表文件只留渲染列表要的字段，等级奖励、达成条件这些重字段
 * 按 id 分片放在 detail/ 下，点开才拉——整套 8093 条称号的条件有 4.5 MB，
 * 首屏不该为它买单。fetchChu3AssetJson 自带按文件名缓存，同片只会拉一次。
 *
 * 取不到就返回 null（老版本资源包没有 detail/ 目录），调用方自己回退。
 */
export async function fetchChu3DetailRow(
  kind: 'chara' | 'trophy',
  itemId: number,
): Promise<Chu3DetailRow | null> {
  if (!Number.isFinite(itemId) || itemId < 0) return null
  const bucket = Math.floor(Math.floor(itemId) / DETAIL_SHARD_SPAN)
  const rows = await fetchChu3AssetJsonOr<Record<string, Chu3DetailRow>>(
    `detail/${kind}-${bucket}.json`,
    {},
  )
  return rows[String(Math.floor(itemId))] ?? null
}

/**
 * 用已经加载的分类目录拼出 all-items 结构。
 *
 * 以前这份数据是单独下 all-items.json 拿的，14 MB，而里面每一类都和分类文件重复——
 * 收藏品页等于把同一批数据下了两遍。分类文件本来就要加载，就地拼出来即可。
 */
export function bundleToAllItems(
  bundle: Chu3CatalogBundle,
  stageRows: Chu3StageJsonEntry[] = [],
): Chu3AllItems {
  const toObj = (rows: Array<Record<string, unknown>>): Record<string, Chu3AllItemMeta> => {
    const out: Record<string, Chu3AllItemMeta> = {}
    for (const row of rows) {
      const rawId = row.id ?? row.stageId
      const id = typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10)
      if (!Number.isFinite(id)) continue
      const rest: Record<string, unknown> = { ...row }
      delete rest.id
      out[String(id)] = rest as Chu3AllItemMeta
    }
    return out
  }
  return {
    namePlate: toObj(bundle.nameplate),
    frame: toObj(bundle.frame),
    trophy: toObj(bundle.trophy),
    mapIcon: toObj(bundle.mapicon),
    systemVoice: toObj(bundle.sysvoice),
    avatarAccessory: toObj(bundle.avatar_icon),
    chara: toObj(bundle.character),
    mate: toObj(bundle.mate),
    stage: toObj(stageRows as unknown as Array<Record<string, unknown>>),
  }
}

export type Chu3NameLookups = {
  namePlate: Map<number, string>
  frame: Map<number, string>
  character: Map<number, string>
  trophy: Map<number, string>
  mapIcon: Map<number, string>
  systemVoice: Map<number, string>
  avatar: Map<number, string>
  mate: Map<number, string>
}

export type Chu3CatalogBundle = {
  nameplate: Chu3JsonEntry[]
  frame: Chu3JsonEntry[]
  character: Chu3JsonEntry[]
  trophy: Chu3JsonEntry[]
  mapicon: Chu3JsonEntry[]
  sysvoice: Chu3JsonEntry[]
  avatar_icon: Chu3JsonEntry[]
  mate: Chu3MateJsonEntry[]
}

export async function loadChu3CatalogBundle(): Promise<Chu3CatalogBundle> {
  const [nameplate, frame, character, trophy, mapicon, sysvoice, avatar_icon, mate] = await Promise.all([
    fetchChu3AssetJson('nameplate.json'),
    fetchChu3AssetJsonOr<Chu3JsonEntry[]>('frame.json', []),
    fetchChu3AssetJson('character.json'),
    fetchChu3AssetJson('trophy.json'),
    fetchChu3AssetJson('mapicon.json'),
    fetchChu3AssetJson('sysvoice.json'),
    fetchChu3AssetJson('avatar_icon.json'),
    // 2.50 only — asset bundles built before mate support simply don't ship this file.
    fetchChu3AssetJsonOr<Chu3MateJsonEntry[]>('mate.json', []),
  ])
  return { nameplate, frame, character, trophy, mapicon, sysvoice, avatar_icon, mate }
}

export function bundleToLookups(bundle: Chu3CatalogBundle): Chu3NameLookups {
  const toMap = (rows: Chu3JsonEntry[]) => new Map(rows.map((r) => [r.id, r.name]))
  return {
    namePlate: toMap(bundle.nameplate),
    frame: toMap(bundle.frame),
    character: toMap(bundle.character),
    trophy: toMap(bundle.trophy),
    mapIcon: toMap(bundle.mapicon),
    systemVoice: toMap(bundle.sysvoice),
    avatar: toMap(bundle.avatar_icon),
    mate: toMap(bundle.mate),
  }
}

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
      return bundle.frame.length
        ? bundle.frame.map((e) => ({ itemId: e.id, name: e.name }))
        : allItemsKeysToOptions(allItems, 'frame')
    case 'stageId':
      return allItemsKeysToOptions(allItems, 'stage')
    case 'mateId':
      return bundle.mate.length
        ? bundle.mate.map((e) => ({ itemId: e.id, name: e.name }))
        : allItemsKeysToOptions(allItems, 'mate')
    case 'characterId':
      return bundle.character.map((e) => ({ itemId: e.id, name: e.name }))
    default:
      return []
  }
}
