import { describe, it, expect } from 'vitest'
import { parseYaml } from '../parsers/yamlParser'
import { generateYaml } from '../generators/yamlGenerator'

/**
 * Roundtrip tests: parse YAML → generate YAML → parse again → compare.
 * We compare the parsed structures rather than YAML strings, since
 * formatting and key ordering may differ.
 */
describe('roundtrip: parse → generate → parse', () => {
  function roundtrip(yaml: string) {
    const first = parseYaml(yaml)
    expect(first.errors).toEqual([])

    const generated = generateYaml(first.plays)
    const second = parseYaml(generated)
    expect(second.errors).toEqual([])

    return { first, second, generated }
  }

  /** Compare play structures, ignoring IDs and positions. */
  function comparePlays(
    original: ReturnType<typeof parseYaml>,
    roundtripped: ReturnType<typeof parseYaml>,
  ) {
    expect(roundtripped.plays.length).toBe(original.plays.length)

    for (let i = 0; i < original.plays.length; i++) {
      const orig = original.plays[i]
      const rt = roundtripped.plays[i]

      // Name
      expect(rt.name).toBe(orig.name)

      // Attributes
      expect(rt.attributes?.hosts).toBe(orig.attributes?.hosts)
      expect(rt.attributes?.become).toBe(orig.attributes?.become)
      expect(rt.attributes?.gatherFacts).toBe(orig.attributes?.gatherFacts)

      // Variables
      expect(rt.variables.length).toBe(orig.variables.length)
      for (let j = 0; j < orig.variables.length; j++) {
        expect(rt.variables[j].key).toBe(orig.variables[j].key)
        expect(rt.variables[j].type).toBe(orig.variables[j].type)
      }

      // Count non-start, non-system modules
      const origTasks = orig.modules.filter((m) => !m.isPlay && !m.isSystem)
      const rtTasks = rt.modules.filter((m) => !m.isPlay && !m.isSystem)
      expect(rtTasks.length).toBe(origTasks.length)

      // Verify task names match in order
      const origNames = origTasks.map((m) => m.taskName).filter(Boolean)
      const rtNames = rtTasks.map((m) => m.taskName).filter(Boolean)
      expect(rtNames).toEqual(origNames)

      // Verify module FQCNs match
      const origFqcns = origTasks.map((m) =>
        m.collection ? `${m.collection}.${m.name}` : m.name,
      )
      const rtFqcns = rtTasks.map((m) =>
        m.collection ? `${m.collection}.${m.name}` : m.name,
      )
      expect(rtFqcns).toEqual(origFqcns)
    }
  }

  it('should roundtrip a simple playbook', () => {
    const yaml = `---
- name: Simple play
  hosts: all
  tasks:
    - name: Say hello
      ansible.builtin.debug:
        msg: Hello
`
    const { first, second } = roundtrip(yaml)
    comparePlays(first, second)
  })

  it('should roundtrip play attributes', () => {
    const yaml = `---
- name: Full attributes
  hosts: webservers
  become: true
  gather_facts: false
  connection: local
  tasks:
    - name: Test
      ansible.builtin.debug:
        msg: test
`
    const { first, second } = roundtrip(yaml)
    comparePlays(first, second)
    expect(second.plays[0].attributes?.become).toBe(true)
    expect(second.plays[0].attributes?.gatherFacts).toBe(false)
    expect(second.plays[0].attributes?.connection).toBe('local')
  })

  it('should roundtrip variables', () => {
    const yaml = `---
- name: With vars
  hosts: all
  vars:
    app_name: myapp
    retries: 3
    debug_mode: true
  tasks:
    - name: Use var
      ansible.builtin.debug:
        msg: "{{ app_name }}"
`
    const { first, second } = roundtrip(yaml)
    comparePlays(first, second)
    expect(second.plays[0].variables.length).toBe(3)
  })

  it('should roundtrip task attributes', () => {
    const yaml = `---
- name: Task attrs
  hosts: all
  tasks:
    - name: Conditional task
      ansible.builtin.apt:
        name: nginx
        state: present
      when: ansible_os_family == "Debian"
      become: true
      register: result
      tags:
        - packages
`
    const { first, second } = roundtrip(yaml)
    comparePlays(first, second)

    const origTask = first.plays[0].modules.find((m) => m.taskName === 'Conditional task')
    const rtTask = second.plays[0].modules.find((m) => m.taskName === 'Conditional task')
    expect(rtTask?.when).toBe(origTask?.when)
    expect(rtTask?.become).toBe(origTask?.become)
    expect(rtTask?.register).toBe(origTask?.register)
  })

  it('should roundtrip blocks', () => {
    const yaml = `---
- name: Block play
  hosts: all
  tasks:
    - name: Error handling block
      block:
        - name: Try this
          ansible.builtin.command:
            cmd: echo hello
      rescue:
        - name: Handle error
          ansible.builtin.debug:
            msg: Failed
      always:
        - name: Always cleanup
          ansible.builtin.debug:
            msg: Cleanup
`
    const { first, second } = roundtrip(yaml)
    comparePlays(first, second)
  })

  it('should roundtrip multiple sections', () => {
    const yaml = `---
- name: Multi section
  hosts: all
  pre_tasks:
    - name: Pre step
      ansible.builtin.debug:
        msg: pre
  tasks:
    - name: Main step
      ansible.builtin.debug:
        msg: main
  post_tasks:
    - name: Post step
      ansible.builtin.debug:
        msg: post
  handlers:
    - name: Restart handler
      ansible.builtin.service:
        name: nginx
        state: restarted
`
    const { first, second } = roundtrip(yaml)
    comparePlays(first, second)
  })

  it('should roundtrip multiple plays', () => {
    const yaml = `---
- name: First play
  hosts: web
  tasks:
    - name: Web task
      ansible.builtin.debug:
        msg: web

- name: Second play
  hosts: db
  tasks:
    - name: DB task
      ansible.builtin.debug:
        msg: db
`
    const { first, second } = roundtrip(yaml)
    comparePlays(first, second)
  })

  it('should roundtrip multiple tasks preserving order', () => {
    const yaml = `---
- name: Ordered play
  hosts: all
  tasks:
    - name: Step 1
      ansible.builtin.debug:
        msg: first
    - name: Step 2
      ansible.builtin.copy:
        src: /tmp/a
        dest: /tmp/b
    - name: Step 3
      ansible.builtin.command:
        cmd: echo done
`
    const { first, second } = roundtrip(yaml)
    comparePlays(first, second)

    const rtNames = second.plays[0].modules
      .filter((m) => m.taskName)
      .map((m) => m.taskName)
    expect(rtNames).toEqual(['Step 1', 'Step 2', 'Step 3'])
  })
})
