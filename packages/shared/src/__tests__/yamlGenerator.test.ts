import { describe, it, expect } from 'vitest'
import { generateYaml } from '../generators/yamlGenerator'
import { parseYaml } from '../parsers/yamlParser'
import type { Play, ModuleBlock, Link, PlayVariable } from '../types/playbook'

// ─── Helpers ──────────────────────────────────────────────────────

function makePlay(overrides: Partial<Play> = {}): Play {
  return {
    id: 'play-1',
    name: 'Test Play',
    modules: [],
    links: [],
    variables: [],
    ...overrides,
  }
}

function makeModule(overrides: Partial<ModuleBlock> & { id: string }): ModuleBlock {
  return {
    collection: 'ansible.builtin',
    name: 'debug',
    x: 0,
    y: 0,
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────

describe('generateYaml', () => {
  describe('basic output', () => {
    it('should produce document start marker', () => {
      const yaml = generateYaml([])
      expect(yaml).toBe('---\n')
    })

    it('should generate a simple play with name and hosts', () => {
      const play = makePlay({
        attributes: { hosts: 'webservers' },
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('name: Test Play')
      expect(yaml).toContain('hosts: webservers')
    })

    it('should default hosts to "all" when not specified', () => {
      const play = makePlay()
      const yaml = generateYaml([play])
      expect(yaml).toContain('hosts: all')
    })
  })

  describe('play attributes', () => {
    it('should include become when true', () => {
      const play = makePlay({
        attributes: { hosts: 'all', become: true },
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('become: true')
    })

    it('should include gather_facts when false', () => {
      const play = makePlay({
        attributes: { hosts: 'all', gatherFacts: false },
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('gather_facts: false')
    })

    it('should include connection', () => {
      const play = makePlay({
        attributes: { hosts: 'all', connection: 'local' },
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('connection: local')
    })

    it('should include remote_user', () => {
      const play = makePlay({
        attributes: { hosts: 'all', remoteUser: 'deploy' },
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('remote_user: deploy')
    })
  })

  describe('variables', () => {
    it('should convert string variables', () => {
      const play = makePlay({
        variables: [{ key: 'app_name', value: 'myapp', type: 'string', required: true }],
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('vars:')
      expect(yaml).toContain('app_name: myapp')
    })

    it('should convert typed variables', () => {
      const variables: PlayVariable[] = [
        { key: 'retries', value: '3', type: 'int', required: true },
        { key: 'debug', value: 'true', type: 'bool', required: true },
      ]
      const play = makePlay({ variables })
      const yaml = generateYaml([play])
      expect(yaml).toContain('retries: 3')
      expect(yaml).toContain('debug: true')
    })

    it('should skip empty variables', () => {
      const play = makePlay({ variables: [] })
      const yaml = generateYaml([play])
      expect(yaml).not.toContain('vars:')
    })
  })

  describe('roles', () => {
    it('should include string roles', () => {
      const play = makePlay({
        attributes: { hosts: 'all', roles: ['geerlingguy.docker'] },
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('geerlingguy.docker')
    })

    it('should include configured roles with vars', () => {
      const play = makePlay({
        attributes: {
          hosts: 'all',
          roles: [{
            role: 'geerlingguy.docker',
            vars: { docker_edition: 'ce' },
          }],
        },
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('role: geerlingguy.docker')
      expect(yaml).toContain('docker_edition: ce')
    })
  })

  describe('tasks', () => {
    it('should generate a simple task with module and params', () => {
      const startModule = makeModule({
        id: 'play-1-start-tasks',
        collection: '',
        name: 'Tasks',
        isPlay: true,
        parentSection: 'tasks',
      })
      const taskModule = makeModule({
        id: 'module-1',
        collection: 'ansible.builtin',
        name: 'debug',
        taskName: 'Show message',
        parentSection: 'tasks',
        moduleParameters: { msg: 'Hello world' },
      })
      const link: Link = {
        id: 'link-1',
        from: 'play-1-start-tasks',
        to: 'module-1',
        type: 'tasks',
      }

      const play = makePlay({
        modules: [startModule, taskModule],
        links: [link],
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('name: Show message')
      expect(yaml).toContain('ansible.builtin.debug:')
      expect(yaml).toContain('msg: Hello world')
    })

    it('should handle task attributes (when, loop, register, etc.)', () => {
      const startModule = makeModule({
        id: 'play-1-start-tasks',
        collection: '',
        name: 'Tasks',
        isPlay: true,
        parentSection: 'tasks',
      })
      const taskModule = makeModule({
        id: 'module-1',
        collection: 'ansible.builtin',
        name: 'apt',
        taskName: 'Install packages',
        parentSection: 'tasks',
        moduleParameters: { name: '{{ item }}', state: 'present' },
        when: 'ansible_os_family == "Debian"',
        loop: '{{ packages }}',
        register: 'install_result',
        become: true,
        ignoreErrors: true,
        tags: ['packages'],
      })
      const link: Link = {
        id: 'link-1',
        from: 'play-1-start-tasks',
        to: 'module-1',
        type: 'tasks',
      }

      const play = makePlay({
        modules: [startModule, taskModule],
        links: [link],
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('when:')
      expect(yaml).toContain('loop:')
      expect(yaml).toContain('register: install_result')
      expect(yaml).toContain('become: true')
      expect(yaml).toContain('ignore_errors: true')
      expect(yaml).toContain('tags:')
      expect(yaml).toContain('packages')
    })

    it('should preserve task order via link chain', () => {
      const start = makeModule({
        id: 'play-1-start-tasks',
        collection: '',
        name: 'Tasks',
        isPlay: true,
        parentSection: 'tasks',
      })
      const task1 = makeModule({
        id: 'module-1',
        collection: 'ansible.builtin',
        name: 'debug',
        taskName: 'First',
        parentSection: 'tasks',
        y: 100,
      })
      const task2 = makeModule({
        id: 'module-2',
        collection: 'ansible.builtin',
        name: 'copy',
        taskName: 'Second',
        parentSection: 'tasks',
        y: 0,
      })
      const links: Link[] = [
        { id: 'link-1', from: 'play-1-start-tasks', to: 'module-1', type: 'tasks' },
        { id: 'link-2', from: 'module-1', to: 'module-2', type: 'tasks' },
      ]

      const play = makePlay({
        modules: [start, task1, task2],
        links,
      })
      const yaml = generateYaml([play])
      const firstIdx = yaml.indexOf('First')
      const secondIdx = yaml.indexOf('Second')
      // Link chain order, not positional order
      expect(firstIdx).toBeLessThan(secondIdx)
    })
  })

  describe('blocks', () => {
    it('should generate block with rescue and always', () => {
      const start = makeModule({
        id: 'play-1-start-tasks',
        collection: '',
        name: 'Tasks',
        isPlay: true,
        parentSection: 'tasks',
      })
      const normalTask = makeModule({
        id: 'module-1',
        collection: 'ansible.builtin',
        name: 'command',
        taskName: 'Run command',
        parentId: 'block-1',
        parentSection: 'normal',
        moduleParameters: { cmd: 'echo hello' },
      })
      const rescueTask = makeModule({
        id: 'module-2',
        collection: 'ansible.builtin',
        name: 'debug',
        taskName: 'Handle error',
        parentId: 'block-1',
        parentSection: 'rescue',
        moduleParameters: { msg: 'Failed!' },
      })
      const alwaysTask = makeModule({
        id: 'module-3',
        collection: 'ansible.builtin',
        name: 'debug',
        taskName: 'Always run',
        parentId: 'block-1',
        parentSection: 'always',
        moduleParameters: { msg: 'Cleanup' },
      })
      const block = makeModule({
        id: 'block-1',
        collection: '',
        name: 'Error handling',
        taskName: 'Error handling',
        isBlock: true,
        parentSection: 'tasks',
        blockSections: {
          normal: ['module-1'],
          rescue: ['module-2'],
          always: ['module-3'],
        },
      })
      const link: Link = {
        id: 'link-1',
        from: 'play-1-start-tasks',
        to: 'block-1',
        type: 'tasks',
      }

      const play = makePlay({
        modules: [start, block, normalTask, rescueTask, alwaysTask],
        links: [link],
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('name: Error handling')
      expect(yaml).toContain('block:')
      expect(yaml).toContain('rescue:')
      expect(yaml).toContain('always:')
      expect(yaml).toContain('Run command')
      expect(yaml).toContain('Handle error')
      expect(yaml).toContain('Always run')
    })
  })

  describe('multiple sections', () => {
    it('should generate pre_tasks, tasks, and handlers', () => {
      const preStart = makeModule({
        id: 'play-1-start-pre-tasks',
        collection: '',
        name: 'Pre Tasks',
        isPlay: true,
        parentSection: 'pre_tasks',
      })
      const preTask = makeModule({
        id: 'module-1',
        collection: 'ansible.builtin',
        name: 'debug',
        taskName: 'Pre step',
        parentSection: 'pre_tasks',
      })
      const taskStart = makeModule({
        id: 'play-1-start-tasks',
        collection: '',
        name: 'Tasks',
        isPlay: true,
        parentSection: 'tasks',
      })
      const mainTask = makeModule({
        id: 'module-2',
        collection: 'ansible.builtin',
        name: 'copy',
        taskName: 'Main step',
        parentSection: 'tasks',
      })
      const handlerStart = makeModule({
        id: 'play-1-start-handlers',
        collection: '',
        name: 'Handlers',
        isPlay: true,
        parentSection: 'handlers',
      })
      const handler = makeModule({
        id: 'module-3',
        collection: 'ansible.builtin',
        name: 'service',
        taskName: 'Restart service',
        parentSection: 'handlers',
      })

      const links: Link[] = [
        { id: 'link-1', from: 'play-1-start-pre-tasks', to: 'module-1', type: 'pre_tasks' },
        { id: 'link-2', from: 'play-1-start-tasks', to: 'module-2', type: 'tasks' },
        { id: 'link-3', from: 'play-1-start-handlers', to: 'module-3', type: 'handlers' },
      ]

      const play = makePlay({
        modules: [preStart, preTask, taskStart, mainTask, handlerStart, handler],
        links,
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('pre_tasks:')
      expect(yaml).toContain('tasks:')
      expect(yaml).toContain('handlers:')
    })
  })

  describe('multiple plays', () => {
    it('should generate multiple plays as YAML list', () => {
      const play1 = makePlay({
        id: 'play-1',
        name: 'First play',
        attributes: { hosts: 'web' },
      })
      const play2 = makePlay({
        id: 'play-2',
        name: 'Second play',
        attributes: { hosts: 'db' },
      })
      const yaml = generateYaml([play1, play2])
      expect(yaml).toContain('name: First play')
      expect(yaml).toContain('hosts: web')
      expect(yaml).toContain('name: Second play')
      expect(yaml).toContain('hosts: db')
    })
  })

  describe('edge cases', () => {
    it('should handle task with no parameters', () => {
      const start = makeModule({
        id: 'play-1-start-tasks',
        collection: '',
        name: 'Tasks',
        isPlay: true,
        parentSection: 'tasks',
      })
      const task = makeModule({
        id: 'module-1',
        collection: 'ansible.builtin',
        name: 'gather_facts',
        parentSection: 'tasks',
      })
      const link: Link = {
        id: 'link-1',
        from: 'play-1-start-tasks',
        to: 'module-1',
        type: 'tasks',
      }
      const play = makePlay({
        modules: [start, task],
        links: [link],
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('ansible.builtin.gather_facts:')
    })

    it('should handle short module names (no collection)', () => {
      const start = makeModule({
        id: 'play-1-start-tasks',
        collection: '',
        name: 'Tasks',
        isPlay: true,
        parentSection: 'tasks',
      })
      const task = makeModule({
        id: 'module-1',
        collection: '',
        name: 'debug',
        parentSection: 'tasks',
        moduleParameters: { msg: 'test' },
      })
      const link: Link = {
        id: 'link-1',
        from: 'play-1-start-tasks',
        to: 'module-1',
        type: 'tasks',
      }
      const play = makePlay({
        modules: [start, task],
        links: [link],
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('debug:')
      // Should NOT have a leading dot
      expect(yaml).not.toContain('.debug:')
    })

    it('should skip system blocks', () => {
      const start = makeModule({
        id: 'play-1-start-tasks',
        collection: '',
        name: 'Tasks',
        isPlay: true,
        parentSection: 'tasks',
      })
      const systemBlock = makeModule({
        id: 'block-sys',
        collection: '',
        name: 'assertions',
        isSystem: true,
        isBlock: true,
        systemType: 'assertions',
        sourceVariable: 'test',
        parentSection: 'pre_tasks',
      })
      const play = makePlay({
        modules: [start, systemBlock],
        links: [],
      })
      const yaml = generateYaml([play])
      expect(yaml).not.toContain('assertions')
    })

    it('should clean empty string parameters', () => {
      const start = makeModule({
        id: 'play-1-start-tasks',
        collection: '',
        name: 'Tasks',
        isPlay: true,
        parentSection: 'tasks',
      })
      const task = makeModule({
        id: 'module-1',
        collection: 'ansible.builtin',
        name: 'copy',
        parentSection: 'tasks',
        moduleParameters: { src: '/tmp/file', dest: '', mode: null },
      })
      const link: Link = {
        id: 'link-1',
        from: 'play-1-start-tasks',
        to: 'module-1',
        type: 'tasks',
      }
      const play = makePlay({
        modules: [start, task],
        links: [link],
      })
      const yaml = generateYaml([play])
      expect(yaml).toContain('src: /tmp/file')
      expect(yaml).not.toContain('dest:')
    })
  })
})
