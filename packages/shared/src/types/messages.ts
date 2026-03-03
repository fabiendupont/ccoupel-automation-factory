/**
 * Message protocol between the extension host and webview.
 */

import type { Play } from './playbook'
import type { CollectionInfo, GalaxyModuleInfo } from './galaxy'

/** Host → Webview: send parsed playbook state. */
export interface UpdateMessage {
  type: 'update'
  isPlaybook: boolean
  plays: Play[]
  warnings: string[]
  errors: string[]
}

/** Webview → Host: send full edited state for YAML generation. */
export interface EditFullMessage {
  type: 'edit:full'
  plays: Play[]
}

/** Webview → Host: search Galaxy collections. */
export interface GalaxySearchMessage {
  type: 'galaxy:search'
  query: string
}

/** Host → Webview: search results. */
export interface GalaxySearchResultMessage {
  type: 'galaxy:search-result'
  collections: CollectionInfo[]
  error?: string
}

/** Webview → Host: request modules for a collection. */
export interface GalaxyModulesMessage {
  type: 'galaxy:modules'
  namespace: string
  collection: string
}

/** Host → Webview: modules list for a collection. */
export interface GalaxyModulesResultMessage {
  type: 'galaxy:modules-result'
  namespace: string
  collection: string
  modules: GalaxyModuleInfo[]
  error?: string
}

/** Host → Webview: git status snapshot. */
export interface GitStatusResultMessage {
  type: 'git:status-result'
  branch: string | undefined
  dirty: boolean
  ahead: number
  behind: number
}

/** Union of all messages the webview can receive. */
export type HostToWebviewMessage =
  | UpdateMessage
  | GalaxySearchResultMessage
  | GalaxyModulesResultMessage
  | GitStatusResultMessage

/** Union of all messages the host can receive from the webview. */
export type WebviewToHostMessage =
  | EditFullMessage
  | GalaxySearchMessage
  | GalaxyModulesMessage
