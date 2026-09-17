/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COINGECKO_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
