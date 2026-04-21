export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`aq-skeleton rounded-xl ${className}`.trim()} />
}
