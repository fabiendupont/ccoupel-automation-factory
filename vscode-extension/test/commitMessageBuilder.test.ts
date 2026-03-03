import { describe, it, expect } from 'vitest'
import { buildCommitMessage } from '../src/git/commitMessageBuilder'
import type { Play } from '@af/shared'

function makePlay(name: string, taskCount: number): Play {
  return {
    id: `play-${name}`,
    name,
    modules: Array.from({ length: taskCount }, (_, i) => ({
      id: `mod-${i}`,
      name: `task-${i}`,
      fqcn: 'ansible.builtin.debug',
      x: 0,
      y: 0,
      section: 'tasks' as const,
      parentSection: 'tasks' as const,
      params: {},
    })),
    links: [],
    variables: [],
    attributes: { hosts: 'all' },
  }
}

describe('buildCommitMessage', () => {
  it('generates message for a single play', () => {
    const plays = [makePlay('Install nginx', 4)]
    const msg = buildCommitMessage(plays, '/home/user/deploy.yml')
    expect(msg).toBe('Update deploy.yml: Install nginx (4 tasks)')
  })

  it('generates message for multiple plays', () => {
    const plays = [
      makePlay('Deploy', 5),
      makePlay('Configure', 3),
    ]
    const msg = buildCommitMessage(plays, '/home/user/site.yml')
    expect(msg).toBe('Update site.yml: Deploy (5 tasks), Configure (3 tasks)')
  })

  it('falls back when no plays', () => {
    const msg = buildCommitMessage([], '/home/user/playbook.yml')
    expect(msg).toBe('Update playbook.yml')
  })

  it('handles a play with one task (singular)', () => {
    const plays = [makePlay('Setup', 1)]
    const msg = buildCommitMessage(plays, '/path/to/main.yml')
    expect(msg).toBe('Update main.yml: Setup (1 task)')
  })

  it('handles a play with zero tasks', () => {
    const plays = [makePlay('Empty', 0)]
    const msg = buildCommitMessage(plays, '/path/to/empty.yml')
    expect(msg).toBe('Update empty.yml: Empty (0 tasks)')
  })

  it('uses basename only from full path', () => {
    const plays = [makePlay('Test', 2)]
    const msg = buildCommitMessage(plays, '/very/deep/nested/path/roles.yml')
    expect(msg).toBe('Update roles.yml: Test (2 tasks)')
  })
})
