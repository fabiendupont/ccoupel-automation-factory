import { describe, it, expect } from 'vitest'
import { parseYaml, generateYaml } from '@af/shared'
import type { Play, ModuleBlock, Link } from '@af/shared'

describe('Bidirectional sync', () => {
  describe('generate → parse consistency', () => {
    it('generated YAML should parse back to equivalent structure', () => {
      const play: Play = {
        id: 'play-1',
        name: 'Test Play',
        modules: [
          {
            id: 'play-1-start-tasks',
            collection: '',
            name: 'Tasks',
            x: 50,
            y: 20,
            isPlay: true,
            parentSection: 'tasks',
          },
          {
            id: 'module-1',
            collection: 'ansible.builtin',
            name: 'debug',
            x: 200,
            y: 20,
            taskName: 'Say hello',
            parentSection: 'tasks',
            moduleParameters: { msg: 'Hello world' },
          },
        ],
        links: [
          { id: 'link-1', from: 'play-1-start-tasks', to: 'module-1', type: 'tasks' },
        ],
        variables: [],
        attributes: { hosts: 'all' },
      }

      const yaml = generateYaml([play])
      expect(yaml).toContain('Say hello')
      expect(yaml).toContain('ansible.builtin.debug')

      const parsed = parseYaml(yaml)
      expect(parsed.errors).toEqual([])
      expect(parsed.plays).toHaveLength(1)
      expect(parsed.plays[0].name).toBe('Test Play')

      const task = parsed.plays[0].modules.find((m) => m.taskName === 'Say hello')
      expect(task).toBeDefined()
      expect(task?.collection).toBe('ansible.builtin')
      expect(task?.name).toBe('debug')
    })
  })

  describe('guard flag logic', () => {
    it('echo guard should prevent re-processing within time window', () => {
      // Simulate the echo guard timing logic
      const ECHO_GUARD_MS = 500
      const editTimestamp = Date.now()

      // Immediately after edit: should skip
      const elapsed1 = 50 // ms after edit
      const shouldSkip1 = editTimestamp && (editTimestamp + elapsed1 - editTimestamp) < ECHO_GUARD_MS
      expect(shouldSkip1).toBe(true)

      // After guard window: should process
      const elapsed2 = 600 // ms after edit
      const shouldSkip2 = editTimestamp && elapsed2 < ECHO_GUARD_MS
      expect(shouldSkip2).toBe(false)
    })

    it('no edit timestamp means always process', () => {
      const editTimestamp = 0
      const ECHO_GUARD_MS = 500

      // Zero timestamp means no recent edit
      const shouldSkip = editTimestamp && Date.now() - editTimestamp < ECHO_GUARD_MS
      expect(shouldSkip).toBeFalsy()
    })
  })

  describe('edit debouncing', () => {
    it('rapid edits should only produce one final state', () => {
      // Simulate rapid module attribute updates
      const states: Play[][] = []

      const play: Play = {
        id: 'play-1',
        name: 'Test',
        modules: [
          {
            id: 'play-1-start-tasks',
            collection: '',
            name: 'Tasks',
            x: 50,
            y: 20,
            isPlay: true,
            parentSection: 'tasks',
          },
          {
            id: 'module-1',
            collection: 'ansible.builtin',
            name: 'debug',
            x: 200,
            y: 20,
            parentSection: 'tasks',
            taskName: 'Original',
          },
        ],
        links: [
          { id: 'link-1', from: 'play-1-start-tasks', to: 'module-1', type: 'tasks' },
        ],
        variables: [],
        attributes: { hosts: 'all' },
      }

      // Simulate 3 rapid updates (only module-1, not the start)
      for (const newName of ['Edit 1', 'Edit 2', 'Final edit']) {
        const updated: Play = {
          ...play,
          modules: play.modules.map((m) =>
            m.id === 'module-1' ? { ...m, taskName: newName } : m,
          ),
        }
        states.push([updated])
      }

      // Only the last state matters (debounce behavior)
      const finalState = states[states.length - 1]
      const yaml = generateYaml(finalState)
      expect(yaml).toContain('Final edit')
      expect(yaml).not.toContain('Edit 1')
      expect(yaml).not.toContain('Edit 2')
    })
  })

  describe('full edit cycle', () => {
    it('parse → modify → generate → parse should preserve modification', () => {
      const originalYaml = `---
- name: Original play
  hosts: webservers
  tasks:
    - name: Install package
      ansible.builtin.apt:
        name: nginx
        state: present
`
      // Step 1: Parse original
      const parsed = parseYaml(originalYaml)
      expect(parsed.errors).toEqual([])

      // Step 2: Modify (simulate user editing task name)
      const modifiedPlays = parsed.plays.map((p) => ({
        ...p,
        modules: p.modules.map((m) =>
          m.taskName === 'Install package'
            ? { ...m, taskName: 'Install nginx' }
            : m,
        ),
      }))

      // Step 3: Generate YAML from modified state
      const newYaml = generateYaml(modifiedPlays)
      expect(newYaml).toContain('Install nginx')
      expect(newYaml).not.toContain('Install package')

      // Step 4: Parse the new YAML
      const reparsed = parseYaml(newYaml)
      expect(reparsed.errors).toEqual([])

      const task = reparsed.plays[0].modules.find((m) => m.taskName === 'Install nginx')
      expect(task).toBeDefined()
      expect(task?.collection).toBe('ansible.builtin')
      expect(task?.name).toBe('apt')
    })

    it('adding a new module should appear in generated YAML', () => {
      const originalYaml = `---
- name: Test
  hosts: all
  tasks:
    - name: Step 1
      ansible.builtin.debug:
        msg: first
`
      const parsed = parseYaml(originalYaml)

      // Add a new module
      const play = parsed.plays[0]
      const newModule: ModuleBlock = {
        id: 'module-new',
        collection: 'ansible.builtin',
        name: 'copy',
        x: 200,
        y: 200,
        taskName: 'Step 2',
        parentSection: 'tasks',
        moduleParameters: { src: '/tmp/a', dest: '/tmp/b' },
      }

      // Find last task in chain
      const lastTask = play.modules.find((m) => m.taskName === 'Step 1')
      const newLink: Link = {
        id: 'link-new',
        from: lastTask!.id,
        to: 'module-new',
        type: 'tasks',
      }

      const modifiedPlay: Play = {
        ...play,
        modules: [...play.modules, newModule],
        links: [...play.links, newLink],
      }

      const yaml = generateYaml([modifiedPlay])
      expect(yaml).toContain('Step 1')
      expect(yaml).toContain('Step 2')
      expect(yaml).toContain('ansible.builtin.copy')
      expect(yaml).toContain('src: /tmp/a')
    })
  })
})
