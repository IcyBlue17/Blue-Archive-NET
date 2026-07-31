import { useLayoutEffect, useRef, useState } from 'react'
import { chu3AssetUrl } from '../../lib/chu3Assets'
import { imgCross } from '../../lib/imgSign'

/** 底框贴图的原始尺寸，用来锁定容器宽高比。 */
const FRAME_W = 592
const FRAME_H = 62

/** 仓库里带了 0..14；2.50 数据里还有 15~22，其中 18~22 都是自带整图的称号，
 *  真正会落空的只有 15/16/17 共 42 条，按游戏的做法回退到 0（素白）。 */
const MAX_FRAME_RARE = 14

/** 文字块高度上限占底框的比例，跟 Chuni-Eventer 的 render_trophy_text_preview 一致。 */
const TEXT_HEIGHT_RATIO = 0.92
/** 左右留白占宽度的比例，同上。 */
const TEXT_MARGIN_RATIO = 0.04

function frameUrl(rareType: number | null | undefined): string {
  const r = Number.isFinite(rareType) ? Math.max(0, Math.floor(rareType as number)) : 0
  return chu3AssetUrl(`trophyFrame/${r <= MAX_FRAME_RARE ? r : 0}.png`)
}

/**
 * 在固定宽度换行的前提下，二分出让文字块高度不超过 maxHeight 的最大字号。
 *
 * 这是 Chuni-Eventer 那个 QTextDocument 二分法的 DOM 版：称号名长短差得很远
 * （从「(^ω^)」到一整句日文），固定字号要么撑破底框要么小得看不清。
 */
function fitFontSize(el: HTMLElement, text: string, width: number, maxHeight: number): number {
  if (width < 4 || maxHeight < 4) return 8
  let lo = 6
  let hi = Math.min(64, Math.max(10, Math.round(maxHeight)))
  let best = 6
  const probe = el
  probe.style.width = `${width}px`
  probe.textContent = text
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    probe.style.fontSize = `${mid}px`
    const h = probe.scrollHeight
    if (h > 0 && h <= maxHeight) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return best
}

export type Chu3TrophyBadgeProps = {
  name: string
  rareType?: number | null
  /** 自带整图的称号（KING of Performai 这类）直接铺图，不画文字。 */
  imageFile?: string | null
  className?: string
}

export function Chu3TrophyBadge({ name, rareType, imageFile, className }: Chu3TrophyBadgeProps) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const probeRef = useRef<HTMLDivElement | null>(null)
  const [fontSize, setFontSize] = useState(12)

  const label = (name || '').trim() || '—'
  const ownImage = (imageFile || '').trim()

  useLayoutEffect(() => {
    if (ownImage) return
    const box = boxRef.current
    const probe = probeRef.current
    if (!box || !probe) return

    const measure = () => {
      const w = box.clientWidth
      const h = box.clientHeight
      if (w < 4 || h < 4) return
      const inner = Math.max(1, w - 2 * Math.round(w * TEXT_MARGIN_RATIO))
      setFontSize(fitFontSize(probe, label, inner, h * TEXT_HEIGHT_RATIO))
    }
    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(box)
    return () => ro.disconnect()
  }, [label, ownImage])

  if (ownImage) {
    const src = chu3AssetUrl(`trophy/${ownImage}`)
    return (
      <div
        className={`relative w-full overflow-hidden ${className ?? ''}`}
        style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}
      >
        <img
          src={src}
          crossOrigin={imgCross(src)}
          alt={label}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div
      ref={boxRef}
      className={`relative w-full overflow-hidden ${className ?? ''}`}
      style={{
        aspectRatio: `${FRAME_W} / ${FRAME_H}`,
        backgroundImage: `url("${frameUrl(rareType)}")`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
      }}
      title={label}
    >
      {/* 离屏量高用的探针，样式必须和真正的文字层完全一致，否则二分出来的字号不准 */}
      <div
        ref={probeRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-normal break-words text-center leading-tight"
        style={{ position: 'absolute', visibility: 'hidden', zIndex: -1 }}
      />
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingLeft: `${TEXT_MARGIN_RATIO * 100}%`, paddingRight: `${TEXT_MARGIN_RATIO * 100}%` }}
      >
        <span
          className="w-full whitespace-normal break-words text-center leading-tight text-black"
          style={{ fontSize: `${fontSize}px` }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
