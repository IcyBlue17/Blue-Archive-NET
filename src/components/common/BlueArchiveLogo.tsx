import { imgCross1, imgUrl1 } from '../../lib/imgSign'

export function BlueArchiveLogo({ className = 'h-16 w-auto' }: { className?: string }) {
  const src1 = imgUrl1('/blue-archive-logo.png')
  return (
    <img
      src={src1}
      crossOrigin={imgCross1(src1)}
      alt="Blue Archive"
      width={1804}
      height={500}
      decoding="async"
      className={className}
    />
  )
}
