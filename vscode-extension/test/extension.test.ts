import { describe, it, expect } from 'vitest'
import { parseYaml, isAnsiblePlaybook } from '@af/shared'

describe('Extension integration', () => {
  describe('YAML parsing via @af/shared', () => {
    it('parses a playbook and produces plays', () => {
      const yaml = `
- name: Deploy
  hosts: webservers
  become: true
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
    - name: Start nginx
      ansible.builtin.service:
        name: nginx
        state: started
`
      const result = parseYaml(yaml)
      expect(result.errors).toEqual([])
      expect(result.plays).toHaveLength(1)

      const play = result.plays[0]
      expect(play.name).toBe('Deploy')
      expect(play.attributes?.hosts).toBe('webservers')
      expect(play.attributes?.become).toBe(true)

      // START + 2 tasks
      expect(play.modules).toHaveLength(3)
      expect(play.links).toHaveLength(2)

      const tasks = play.modules.filter(m => !m.isPlay)
      expect(tasks[0].collection).toBe('ansible.builtin')
      expect(tasks[0].name).toBe('apt')
      expect(tasks[1].name).toBe('service')
    })
  })

  describe('Playbook detection via @af/shared', () => {
    it('detects ansible playbooks', () => {
      expect(isAnsiblePlaybook('- hosts: all\n  tasks: []')).toBe(true)
    })

    it('rejects non-playbook YAML', () => {
      expect(isAnsiblePlaybook('version: "3"\nservices:\n  web:\n    image: nginx')).toBe(false)
    })
  })
})
