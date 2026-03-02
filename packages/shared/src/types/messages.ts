/**
 * Message protocol between the extension host and webview.
 */

import type { Play } from './playbook'

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

/** Union of all messages the webview can receive. */
export type HostToWebviewMessage = UpdateMessage

/** Union of all messages the host can receive from the webview. */
export type WebviewToHostMessage = EditFullMessage
