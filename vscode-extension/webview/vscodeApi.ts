import type { WebviewToHostMessage } from '@af/shared'

interface VsCodeApi {
  postMessage(message: WebviewToHostMessage): void
  getState(): unknown
  setState(state: unknown): void
}

// acquireVsCodeApi can only be called once
let api: VsCodeApi | undefined

export function getVsCodeApi(): VsCodeApi {
  if (!api) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api = (window as any).acquireVsCodeApi()
  }
  return api!
}
