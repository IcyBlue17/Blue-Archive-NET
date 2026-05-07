interface ImportMetaEnv {
  readonly VITE_OAUTH_HOST?: string
}

declare const __BUILD_INFO__: {
  readonly commit: string
  readonly builtAt: string
  readonly bunVersion: string
}

declare module '~icons/*' {
  import type { ComponentType, SVGProps } from 'react'
  const Icon: ComponentType<SVGProps<SVGSVGElement>>
  export default Icon
}
