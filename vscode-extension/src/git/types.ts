/**
 * Minimal type declarations for the VS Code Git extension API.
 * Only the subset used by GitWorkflowService — not the full API.
 */

import type * as vscode from 'vscode'

export interface GitExtension {
  getAPI(version: 1): GitAPI
}

export interface GitAPI {
  repositories: Repository[]
  getRepository(uri: vscode.Uri): Repository | null
}

export interface Repository {
  rootUri: vscode.Uri
  state: RepositoryState
  add(paths: string[]): Promise<void>
  commit(message: string, opts?: CommitOptions): Promise<void>
  push(remoteName?: string, branchName?: string): Promise<void>
  createBranch(name: string, checkout: boolean): Promise<void>
  checkout(treeish: string): Promise<void>
  getBranches(query?: { remote?: boolean }): Promise<Branch[]>
}

export interface RepositoryState {
  HEAD: Branch | undefined
  remotes: Remote[]
  workingTreeChanges: Change[]
  indexChanges: Change[]
  onDidChange: vscode.Event<void>
}

export interface Branch {
  name?: string
  upstream?: { name: string; remote: string }
  ahead?: number
  behind?: number
}

export interface Remote {
  name: string
}

export interface Change {
  uri: vscode.Uri
}

export interface CommitOptions {
  all?: boolean
}
