/** 与 `public/favicon.png` 同源，用于侧栏、登录头等左上角品牌图 */
import { imgUrl1 } from '../../lib/imgSign'

export function AppMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <img
      src={imgUrl1('/favicon.png')}
      alt=""
      width={32}
      height={32}
      decoding="async"
      className={`shrink-0 object-contain ${className}`}
    />
  )
}
