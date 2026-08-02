import { css, keyframes } from '@emotion/react'

const shimmer = keyframes`
  100% { transform: translateX(100%); }
`

/**
 * 骨架块。antd 的 Skeleton 只给固定的段落/头像形状，页面里大量需要的是
 * 「按具体尺寸占位」，所以这里自己画一个，颜色取自 antd token。
 */
const skeletonStyle = css`
  position: relative;
  overflow: hidden;
  background: var(--app-fill);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, var(--app-base) 55%, transparent) 48%,
      transparent 100%
    );
    animation: ${shimmer} 1.45s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      animation: none;
    }
  }
`

export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div aria-hidden css={skeletonStyle} className={`rounded-xl ${className}`.trim()} />
}
