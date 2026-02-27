import { describe, it, expect } from 'vitest'
import { parseYaml, isAnsiblePlaybook, TASK_LEVEL_KEYS } from '../parsers/yamlParser'

describe('yamlParser', () => {
  describe('TASK_LEVEL_KEYS', () => {
    it('contains essential Ansible task keys', () => {
      expect(TASK_LEVEL_KEYS.has('name')).toBe(true)
      expect(TASK_LEVEL_KEYS.has('when')).toBe(true)
      expect(TASK_LEVEL_KEYS.has('register')).toBe(true)
      expect(TASK_LEVEL_KEYS.has('block')).toBe(true)
      expect(TASK_LEVEL_KEYS.has('rescue')).toBe(true)
      expect(TASK_LEVEL_KEYS.has('always')).toBe(true)
    })

    it('does not contain module names', () => {
      expect(TASK_LEVEL_KEYS.has('ansible.builtin.debug')).toBe(false)
      expect(TASK_LEVEL_KEYS.has('debug')).toBe(false)
    })
  })

  describe('parseYaml', () => {
    it('returns empty plays for empty content', () => {
      const result = parseYaml('')
      expect(result.plays).toEqual([])
      expect(result.errors).toEqual([])
    })

    it('returns errors for invalid YAML', () => {
      const result = parseYaml('{{invalid yaml')
      expect(result.plays).toEqual([])
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('parses a simple playbook with one task', () => {
      const yaml = `
- name: Test Play
  hosts: all
  tasks:
    - name: Say hello
      ansible.builtin.debug:
        msg: "Hello"
`
      const result = parseYaml(yaml)
      expect(result.errors).toEqual([])
      expect(result.plays).toHaveLength(1)

      const play = result.plays[0]
      expect(play.name).toBe('Test Play')
      expect(play.attributes?.hosts).toBe('all')

      // Should have START + 1 task module
      expect(play.modules).toHaveLength(2)
      expect(play.links).toHaveLength(1)

      const startModule = play.modules[0]
      expect(startModule.isPlay).toBe(true)

      const taskModule = play.modules[1]
      expect(taskModule.collection).toBe('ansible.builtin')
      expect(taskModule.name).toBe('debug')
      expect(taskModule.taskName).toBe('Say hello')
    })

    it('parses multiple tasks in a chain', () => {
      const yaml = `
- name: Multi-task
  hosts: webservers
  tasks:
    - name: Task 1
      ansible.builtin.debug:
        msg: "1"
    - name: Task 2
      ansible.builtin.command:
        cmd: echo hello
    - name: Task 3
      ansible.builtin.file:
        path: /tmp/test
        state: directory
`
      const result = parseYaml(yaml)
      expect(result.plays).toHaveLength(1)

      const play = result.plays[0]
      // START + 3 tasks
      expect(play.modules).toHaveLength(4)
      // 3 links: START→T1, T1→T2, T2→T3
      expect(play.links).toHaveLength(3)

      // Verify chain
      expect(play.links[0].from).toBe(play.modules[0].id)
      expect(play.links[0].to).toBe(play.modules[1].id)
      expect(play.links[1].from).toBe(play.modules[1].id)
      expect(play.links[1].to).toBe(play.modules[2].id)
    })

    it('parses blocks with rescue and always', () => {
      const yaml = `
- name: Block play
  hosts: all
  tasks:
    - name: My block
      block:
        - name: Normal task
          ansible.builtin.debug:
            msg: "normal"
      rescue:
        - name: Rescue task
          ansible.builtin.debug:
            msg: "rescue"
      always:
        - name: Always task
          ansible.builtin.debug:
            msg: "always"
`
      const result = parseYaml(yaml)
      expect(result.errors).toEqual([])

      const play = result.plays[0]
      const blockModule = play.modules.find(m => m.isBlock)
      expect(blockModule).toBeDefined()
      expect(blockModule!.blockSections).toBeDefined()
      expect(blockModule!.blockSections!.normal).toHaveLength(1)
      expect(blockModule!.blockSections!.rescue).toHaveLength(1)
      expect(blockModule!.blockSections!.always).toHaveLength(1)

      // Child tasks should have parentId
      const childTasks = play.modules.filter(m => m.parentId === blockModule!.id)
      expect(childTasks).toHaveLength(3)
    })

    it('parses multiple sections', () => {
      const yaml = `
- name: Multi-section
  hosts: all
  pre_tasks:
    - name: Pre task
      ansible.builtin.debug:
        msg: "pre"
  tasks:
    - name: Main task
      ansible.builtin.debug:
        msg: "main"
  post_tasks:
    - name: Post task
      ansible.builtin.debug:
        msg: "post"
  handlers:
    - name: Handler
      ansible.builtin.service:
        name: nginx
        state: restarted
`
      const result = parseYaml(yaml)
      const play = result.plays[0]

      // 4 sections × (1 START + 1 task) = 8 modules
      expect(play.modules).toHaveLength(8)
      // 4 links (one per section)
      expect(play.links).toHaveLength(4)

      // Verify section types on links
      const linkTypes = play.links.map(l => l.type)
      expect(linkTypes).toContain('pre_tasks')
      expect(linkTypes).toContain('tasks')
      expect(linkTypes).toContain('post_tasks')
      expect(linkTypes).toContain('handlers')
    })

    it('extracts play attributes', () => {
      const yaml = `
- name: Attributed play
  hosts: webservers
  remote_user: admin
  gather_facts: false
  become: true
  connection: ssh
  tasks: []
`
      const result = parseYaml(yaml)
      const attrs = result.plays[0].attributes!
      expect(attrs.hosts).toBe('webservers')
      expect(attrs.remoteUser).toBe('admin')
      expect(attrs.gatherFacts).toBe(false)
      expect(attrs.become).toBe(true)
      expect(attrs.connection).toBe('ssh')
    })

    it('extracts play variables', () => {
      const yaml = `
- name: Vars play
  hosts: all
  vars:
    my_string: hello
    my_int: 42
    my_bool: true
    my_list:
      - a
      - b
    my_dict:
      key: value
  tasks: []
`
      const result = parseYaml(yaml)
      const vars = result.plays[0].variables
      expect(vars).toHaveLength(5)

      const types = Object.fromEntries(vars.map(v => [v.key, v.type]))
      expect(types.my_string).toBe('string')
      expect(types.my_int).toBe('int')
      expect(types.my_bool).toBe('bool')
      expect(types.my_list).toBe('list')
      expect(types.my_dict).toBe('dict')
    })

    it('extracts task attributes', () => {
      const yaml = `
- name: Attrs play
  hosts: all
  tasks:
    - name: Attributed task
      ansible.builtin.debug:
        msg: "test"
      when: ansible_os_family == "Debian"
      register: result
      loop: "{{ items }}"
      tags:
        - deploy
        - config
      ignore_errors: true
      become: true
      delegate_to: localhost
`
      const result = parseYaml(yaml)
      const task = result.plays[0].modules[1] // [0] is START
      expect(task.when).toBe('ansible_os_family == "Debian"')
      expect(task.register).toBe('result')
      expect(task.loop).toBe('{{ items }}')
      expect(task.tags).toEqual(['deploy', 'config'])
      expect(task.ignoreErrors).toBe(true)
      expect(task.become).toBe(true)
      expect(task.delegateTo).toBe('localhost')
    })

    it('splits FQCN correctly', () => {
      const yaml = `
- hosts: all
  tasks:
    - ansible.builtin.debug:
        msg: "fqcn"
    - community.general.ufw:
        rule: allow
    - debug:
        msg: "short"
`
      const result = parseYaml(yaml)
      const modules = result.plays[0].modules.filter(m => !m.isPlay)

      expect(modules[0].collection).toBe('ansible.builtin')
      expect(modules[0].name).toBe('debug')
      expect(modules[1].collection).toBe('community.general')
      expect(modules[1].name).toBe('ufw')
      expect(modules[2].collection).toBe('')
      expect(modules[2].name).toBe('debug')
    })

    it('parses multiple plays', () => {
      const yaml = `
- name: Play 1
  hosts: web
  tasks:
    - ansible.builtin.debug:
        msg: "play 1"
- name: Play 2
  hosts: db
  tasks:
    - ansible.builtin.debug:
        msg: "play 2"
`
      const result = parseYaml(yaml)
      expect(result.plays).toHaveLength(2)
      expect(result.plays[0].name).toBe('Play 1')
      expect(result.plays[1].name).toBe('Play 2')
      expect(result.plays[0].id).toBe('play-1')
      expect(result.plays[1].id).toBe('play-2')
    })

    it('stores module parameters', () => {
      const yaml = `
- hosts: all
  tasks:
    - name: Copy file
      ansible.builtin.copy:
        src: /tmp/foo
        dest: /tmp/bar
        mode: "0644"
`
      const result = parseYaml(yaml)
      const task = result.plays[0].modules[1]
      expect(task.moduleParameters).toEqual({
        src: '/tmp/foo',
        dest: '/tmp/bar',
        mode: '0644',
      })
    })
  })

  describe('isAnsiblePlaybook', () => {
    it('returns true for valid playbooks', () => {
      expect(isAnsiblePlaybook('- hosts: all\n  tasks: []')).toBe(true)
      expect(isAnsiblePlaybook('- name: Test\n  hosts: web\n  gather_facts: false')).toBe(true)
    })

    it('returns false for non-playbook YAML', () => {
      expect(isAnsiblePlaybook('version: "3"\nservices:\n  web:\n    image: nginx')).toBe(false)
      expect(isAnsiblePlaybook('key: value')).toBe(false)
    })

    it('returns false for invalid YAML', () => {
      expect(isAnsiblePlaybook('{{not yaml')).toBe(false)
    })

    it('returns false for empty content', () => {
      expect(isAnsiblePlaybook('')).toBe(false)
    })
  })
})
