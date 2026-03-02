import { memo, useState, useCallback } from 'react'

interface ModuleEntry {
  name: string
  collection: string
  description: string
}

interface Category {
  label: string
  modules: ModuleEntry[]
}

const CATEGORIES: Category[] = [
  {
    label: 'Files',
    modules: [
      { name: 'copy', collection: 'ansible.builtin', description: 'Copy files to remote' },
      { name: 'template', collection: 'ansible.builtin', description: 'Jinja2 templating' },
      { name: 'file', collection: 'ansible.builtin', description: 'Manage file properties' },
      { name: 'lineinfile', collection: 'ansible.builtin', description: 'Manage lines in files' },
      { name: 'fetch', collection: 'ansible.builtin', description: 'Fetch files from remote' },
    ],
  },
  {
    label: 'System',
    modules: [
      { name: 'command', collection: 'ansible.builtin', description: 'Run commands' },
      { name: 'shell', collection: 'ansible.builtin', description: 'Run shell commands' },
      { name: 'service', collection: 'ansible.builtin', description: 'Manage services' },
      { name: 'systemd', collection: 'ansible.builtin', description: 'Manage systemd units' },
      { name: 'user', collection: 'ansible.builtin', description: 'Manage user accounts' },
      { name: 'group', collection: 'ansible.builtin', description: 'Manage groups' },
      { name: 'cron', collection: 'ansible.builtin', description: 'Manage cron jobs' },
    ],
  },
  {
    label: 'Packages',
    modules: [
      { name: 'apt', collection: 'ansible.builtin', description: 'Apt package manager' },
      { name: 'yum', collection: 'ansible.builtin', description: 'Yum package manager' },
      { name: 'dnf', collection: 'ansible.builtin', description: 'DNF package manager' },
      { name: 'pip', collection: 'ansible.builtin', description: 'Python pip packages' },
      { name: 'package', collection: 'ansible.builtin', description: 'Generic packages' },
    ],
  },
  {
    label: 'Control',
    modules: [
      { name: 'debug', collection: 'ansible.builtin', description: 'Print debug messages' },
      { name: 'fail', collection: 'ansible.builtin', description: 'Fail with message' },
      { name: 'assert', collection: 'ansible.builtin', description: 'Assert conditions' },
      { name: 'pause', collection: 'ansible.builtin', description: 'Pause execution' },
      { name: 'wait_for', collection: 'ansible.builtin', description: 'Wait for condition' },
      { name: 'set_fact', collection: 'ansible.builtin', description: 'Set host facts' },
      { name: 'include_tasks', collection: 'ansible.builtin', description: 'Include tasks file' },
    ],
  },
  {
    label: 'Structure',
    modules: [
      { name: 'block', collection: '', description: 'Group tasks with error handling' },
    ],
  },
]

export const ModulePalette = memo(function ModulePalette() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = useCallback((label: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }, [])

  const handleDragStart = useCallback(
    (e: React.DragEvent, mod: ModuleEntry) => {
      e.dataTransfer.setData(
        'application/x-af-module',
        JSON.stringify(mod),
      )
      e.dataTransfer.effectAllowed = 'copy'
    },
    [],
  )

  return (
    <div className="module-palette">
      <div className="palette-header">Modules</div>
      {CATEGORIES.map((cat) => (
        <div key={cat.label} className="palette-category">
          <div
            className="palette-category-header"
            onClick={() => toggle(cat.label)}
          >
            <span className="collapse-icon">
              {collapsed.has(cat.label) ? '\u25B6' : '\u25BC'}
            </span>
            {cat.label}
          </div>
          {!collapsed.has(cat.label) && (
            <div className="palette-category-body">
              {cat.modules.map((mod) => (
                <div
                  key={mod.name}
                  className="palette-module"
                  draggable
                  onDragStart={(e) => handleDragStart(e, mod)}
                  title={mod.description}
                >
                  {mod.name}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
})
