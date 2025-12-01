/// <reference types="vite/client" />

interface BuildInfo {
  commitHash: string
  buildDate: string
}

declare const __BUILD_INFO__: BuildInfo
