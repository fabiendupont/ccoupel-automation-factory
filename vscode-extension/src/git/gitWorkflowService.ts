import type { GitAPI, Repository } from './types'

export interface GitStatus {
  branch: string | undefined
  ahead: number
  behind: number
  dirty: boolean
  staged: number
  unstaged: number
}

export class GitWorkflowService {
  private api: GitAPI | undefined

  /**
   * @param api Git API instance. At runtime, pass the result of
   *            `vscode.extensions.getExtension('vscode.git').exports.getAPI(1)`.
   *            In tests, pass a mock.
   */
  constructor(api?: GitAPI) {
    this.api = api
  }

  /** Late-bind the API after the git extension activates. */
  setAPI(api: GitAPI) {
    this.api = api
  }

  getRepository(uri: { fsPath: string }): Repository | undefined {
    return this.api?.getRepository(uri as any) ?? undefined
  }

  getStatus(uri: { fsPath: string }): GitStatus | undefined {
    const repo = this.getRepository(uri)
    if (!repo) return undefined

    const head = repo.state.HEAD
    return {
      branch: head?.name,
      ahead: head?.ahead ?? 0,
      behind: head?.behind ?? 0,
      dirty:
        repo.state.workingTreeChanges.length > 0 ||
        repo.state.indexChanges.length > 0,
      staged: repo.state.indexChanges.length,
      unstaged: repo.state.workingTreeChanges.length,
    }
  }

  async commitAndSync(
    uri: { fsPath: string },
    message: string,
  ): Promise<{ sha?: string; error?: string }> {
    const repo = this.getRepository(uri)
    if (!repo) {
      return { error: 'No Git repository found for this file' }
    }

    try {
      // Stage the file
      await repo.add([uri.fsPath])

      // Commit
      await repo.commit(message)

      // Push only if upstream exists
      const head = repo.state.HEAD
      if (head?.upstream) {
        await repo.push()
      }

      return {}
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  }

  async createBranch(
    uri: { fsPath: string },
    name: string,
    checkout = false,
  ): Promise<void> {
    const repo = this.getRepository(uri)
    if (!repo) {
      throw new Error('No Git repository found for this file')
    }
    await repo.createBranch(name, checkout)
  }

  async getBranches(uri: { fsPath: string }): Promise<string[]> {
    const repo = this.getRepository(uri)
    if (!repo) return []

    const branches = await repo.getBranches({})
    return branches
      .map((b) => b.name)
      .filter((name): name is string => !!name)
  }
}
