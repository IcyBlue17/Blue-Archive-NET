type BuildInfoFooterProps = {
  className?: string
}

const buildInfo = __BUILD_INFO__

export function BuildInfoFooter({ className = '' }: BuildInfoFooterProps) {
  return (
    <footer
      className={`text-kumo-subtle flex flex-col items-center gap-1 text-center text-xs leading-5 ${className}`}
    >
      <div>
        <span>{buildInfo.commit}</span>
        <span className="mx-1.5">·</span>
        <span>构建于{buildInfo.builtAt}</span>
        <span className="mx-1.5">·</span>
        <span>Bun {buildInfo.bunVersion}</span>
      </div>
      <div>© 2026 Arteric NET 版权所有</div>
    </footer>
  )
}
