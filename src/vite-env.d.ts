/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When set, OAuth authorize URLs use this origin instead of API base. */
  readonly VITE_OAUTH_HOST?: string
}
