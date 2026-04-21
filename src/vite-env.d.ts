interface ImportMetaEnv {
  readonly VITE_OAUTH_HOST?: string
}

declare module '~icons/*' {
  import type { ComponentType, SVGProps } from 'react'
  const Icon: ComponentType<SVGProps<SVGSVGElement>>
  export default Icon
}
