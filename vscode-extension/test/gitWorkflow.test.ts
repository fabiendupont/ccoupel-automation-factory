import { describe, it, expect, vi } from 'vitest'
import { GitWorkflowService } from '../src/git/gitWorkflowService'
import type { GitAPI, Repository, RepositoryState, Branch } from '../src/git/types'

function createMockRepo(overrides: Partial<{
  branch: string
  ahead: number
  behind: number
  workingTreeChanges: { uri: { fsPath: string } }[]
  indexChanges: { uri: { fsPath: string } }[]
  upstream: { name: string; remote: string } | undefined
}> = {}): Repository {
  const head: Branch = {
    name: overrides.branch ?? 'main',
    upstream: 'upstream' in overrides
      ? overrides.upstream
      : { name: 'origin/main', remote: 'origin' },
    ahead: overrides.ahead ?? 0,
    behind: overrides.behind ?? 0,
  }

  const state: RepositoryState = {
    HEAD: head,
    remotes: [{ name: 'origin' }],
    workingTreeChanges: (overrides.workingTreeChanges ?? []) as any,
    indexChanges: (overrides.indexChanges ?? []) as any,
    onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
  }

  return {
    rootUri: { fsPath: '/repo' } as any,
    state,
    add: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    push: vi.fn().mockResolvedValue(undefined),
    createBranch: vi.fn().mockResolvedValue(undefined),
    checkout: vi.fn().mockResolvedValue(undefined),
    getBranches: vi.fn().mockResolvedValue([
      { name: 'main' },
      { name: 'develop' },
      { name: 'feature/test' },
    ]),
  }
}

function createMockAPI(repo: Repository | null): GitAPI {
  return {
    repositories: repo ? [repo] : [],
    getRepository: vi.fn(() => repo),
  }
}

describe('GitWorkflowService', () => {
  describe('getStatus', () => {
    it('returns status for a clean repo', () => {
      const repo = createMockRepo()
      const service = new GitWorkflowService(createMockAPI(repo))

      const status = service.getStatus({ fsPath: '/repo/playbook.yml' })

      expect(status).toEqual({
        branch: 'main',
        ahead: 0,
        behind: 0,
        dirty: false,
        staged: 0,
        unstaged: 0,
      })
    })

    it('reports dirty state with working tree changes', () => {
      const repo = createMockRepo({
        workingTreeChanges: [{ uri: { fsPath: '/repo/file.yml' } }],
      })
      const service = new GitWorkflowService(createMockAPI(repo))

      const status = service.getStatus({ fsPath: '/repo/playbook.yml' })

      expect(status?.dirty).toBe(true)
      expect(status?.unstaged).toBe(1)
    })

    it('reports ahead/behind counts', () => {
      const repo = createMockRepo({ ahead: 2, behind: 1 })
      const service = new GitWorkflowService(createMockAPI(repo))

      const status = service.getStatus({ fsPath: '/repo/playbook.yml' })

      expect(status?.ahead).toBe(2)
      expect(status?.behind).toBe(1)
    })

    it('returns undefined when no repo found', () => {
      const service = new GitWorkflowService(createMockAPI(null))

      const status = service.getStatus({ fsPath: '/no-repo/file.yml' })

      expect(status).toBeUndefined()
    })
  })

  describe('commitAndSync', () => {
    it('stages, commits, and pushes when upstream exists', async () => {
      const repo = createMockRepo()
      const service = new GitWorkflowService(createMockAPI(repo))

      const result = await service.commitAndSync(
        { fsPath: '/repo/deploy.yml' },
        'Update deploy.yml',
      )

      expect(result).toEqual({})
      expect(repo.add).toHaveBeenCalledWith(['/repo/deploy.yml'])
      expect(repo.commit).toHaveBeenCalledWith('Update deploy.yml')
      expect(repo.push).toHaveBeenCalled()
    })

    it('skips push when no upstream', async () => {
      const repo = createMockRepo({ upstream: undefined })
      const service = new GitWorkflowService(createMockAPI(repo))

      const result = await service.commitAndSync(
        { fsPath: '/repo/deploy.yml' },
        'Update deploy.yml',
      )

      expect(result).toEqual({})
      expect(repo.commit).toHaveBeenCalled()
      expect(repo.push).not.toHaveBeenCalled()
    })

    it('returns error when no repo', async () => {
      const service = new GitWorkflowService(createMockAPI(null))

      const result = await service.commitAndSync({ fsPath: '/no-repo/file.yml' }, 'msg')

      expect(result.error).toBe('No Git repository found for this file')
    })

    it('returns error on commit failure', async () => {
      const repo = createMockRepo()
      ;(repo.commit as any).mockRejectedValue(new Error('Nothing to commit'))
      const service = new GitWorkflowService(createMockAPI(repo))

      const result = await service.commitAndSync({ fsPath: '/repo/deploy.yml' }, 'msg')

      expect(result.error).toBe('Nothing to commit')
    })
  })

  describe('createBranch', () => {
    it('creates and checks out branch', async () => {
      const repo = createMockRepo()
      const service = new GitWorkflowService(createMockAPI(repo))

      await service.createBranch({ fsPath: '/repo/file.yml' }, 'feature/new', true)

      expect(repo.createBranch).toHaveBeenCalledWith('feature/new', true)
    })

    it('throws when no repo', async () => {
      const service = new GitWorkflowService(createMockAPI(null))

      await expect(
        service.createBranch({ fsPath: '/no-repo/file.yml' }, 'x'),
      ).rejects.toThrow('No Git repository found for this file')
    })
  })

  describe('getBranches', () => {
    it('returns local branch names', async () => {
      const repo = createMockRepo()
      const service = new GitWorkflowService(createMockAPI(repo))

      const branches = await service.getBranches({ fsPath: '/repo/file.yml' })

      expect(branches).toEqual(['main', 'develop', 'feature/test'])
    })

    it('filters out branches without names', async () => {
      const repo = createMockRepo()
      ;(repo.getBranches as any).mockResolvedValue([
        { name: 'main' },
        { name: undefined },
        { name: 'develop' },
      ])
      const service = new GitWorkflowService(createMockAPI(repo))

      const branches = await service.getBranches({ fsPath: '/repo/file.yml' })

      expect(branches).toEqual(['main', 'develop'])
    })

    it('returns empty array when no repo', async () => {
      const service = new GitWorkflowService(createMockAPI(null))

      const branches = await service.getBranches({ fsPath: '/no-repo/file.yml' })

      expect(branches).toEqual([])
    })
  })
})
