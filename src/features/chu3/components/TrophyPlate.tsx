import { chu3TrophyArtUrl, chu3TrophyFrameUrl, type Chu3AllItems } from '@/lib/chu3Assets'
import { imgCross } from '@/lib/imgSign'

/**
 * 称号牌。游戏里的称号绝大多数没有独立贴图，是「按 rareType 取一张底图 + 把称号文字
 * 压在上面」合成出来的，这里照做：
 *
 * - trophy.json 的 imageFile 非空（rareType 18–22，共 75 个）→ 直接用那张整图
 * - 其余 → trophyFrame/{rareType}.png 当底，文字居中叠上去
 *
 * 底图是 592×62 的浅色横幅（灰 / 金 / 奶白 / 粉 / 彩虹），所以文字用深色配白描边；
 * 高稀有度那几张两端有花纹，文字左右各留 14% 避开。
 */
export function TrophyPlate({
  itemId,
  name,
  allItems,
  className = '',
}: {
  itemId: number
  name: string
  allItems: Chu3AllItems
  className?: string
}) {
  const art = chu3TrophyArtUrl(itemId, allItems)
  if (art) {
    return (
      <img
        src={art}
        crossOrigin={imgCross(art)}
        alt={name}
        className={`w-full object-contain ${className}`.trim()}
        loading="lazy"
      />
    )
  }

  const frame = chu3TrophyFrameUrl(allItems.trophy?.[String(itemId)]?.rareType)
  return (
    <div
      className={`relative w-full ${className}`.trim()}
      // containerType 是给下面的 cqw 用的：文字随牌子宽度缩放，窄卡片上也不会溢出
      style={{ aspectRatio: '592 / 62', containerType: 'inline-size' }}
    >
      <img
        src={frame}
        crossOrigin={imgCross(frame)}
        alt=""
        className="absolute inset-0 h-full w-full object-fill"
        loading="lazy"
      />
      <span
        className="absolute inset-y-0 left-[14%] right-[14%] flex items-center justify-center truncate text-center font-semibold text-black"
        style={{
          fontSize: 'clamp(8px, 4.2cqw, 15px)',
          textShadow: '0 1px 2px rgba(255,255,255,0.85), 0 0 3px rgba(255,255,255,0.7)',
        }}
      >
        {name}
      </span>
    </div>
  )
}
