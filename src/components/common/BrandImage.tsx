import { APP_NAME } from '../../lib/config'
import { imgCross, imgUrl } from '../../lib/imgSign'

type BrandImageKind = 'logo' | 'mark'

const BRAND_IMAGES: Record<
  BrandImageKind,
  { path: string; alt: string; width: number; height: number; className: string }
> = {
  logo: {
    path: '/blue-archive-logo.png',
    alt: APP_NAME,
    width: 1804,
    height: 500,
    className: 'h-16 w-auto',
  },
  mark: {
    path: '/favicon.png',
    alt: '',
    width: 32,
    height: 32,
    className: 'h-8 w-8 shrink-0 object-contain',
  },
}

export function BrandImage({
  kind,
  className,
}: {
  kind: BrandImageKind
  className?: string
}) {
  const image = BRAND_IMAGES[kind]
  const src = imgUrl(image.path)

  return (
    <img
      src={src}
      crossOrigin={imgCross(src)}
      alt={image.alt}
      width={image.width}
      height={image.height}
      decoding="async"
      className={className ?? image.className}
    />
  )
}
