/** 与 `public/favicon.png` 同源，用于侧栏、登录头等左上角品牌图 */
import { imgCross1, imgUrl1 } from '../../lib/imgSign'

export function AppMark({ className = 'h-8 w-8' }: { className?: string }) {
  const src1 = imgUrl1('/favicon.png')
  return (
    <img
      src={src1}
      crossOrigin={imgCross1(src1)}
      alt=""
      width={32}
      height={32}
      decoding="async"
      className={`shrink-0 object-contain ${className}`}
    />
  )
}
