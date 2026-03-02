import { memo, useState, useCallback } from 'react'
import type { ModuleBlock } from '@af/shared'
import { useStore } from '../store'

interface PropertiesPanelProps {
  module: ModuleBlock
}

export const PropertiesPanel = memo(function PropertiesPanel({ module }: PropertiesPanelProps) {
  const { setSelectedModuleId, updateModuleAttributes, deleteModule } = useStore()
  const fqcn = module.collection ? `${module.collection}.${module.name}` : module.name

  // Local state for text inputs — committed on blur/Enter
  const [taskName, setTaskName] = useState(module.taskName ?? '')
  const [when, setWhen] = useState(module.when ?? '')
  const [loop, setLoop] = useState(module.loop ?? '')
  const [register, setRegister] = useState(module.register ?? '')
  const [delegateTo, setDelegateTo] = useState(module.delegateTo ?? '')
  const [tagsStr, setTagsStr] = useState((module.tags ?? []).join(', '))

  const commit = useCallback(
    (field: string, value: string) => {
      const updates: Partial<ModuleBlock> = {}
      switch (field) {
        case 'taskName': updates.taskName = value || undefined; break
        case 'when': updates.when = value || undefined; break
        case 'loop': updates.loop = value || undefined; break
        case 'register': updates.register = value || undefined; break
        case 'delegateTo': updates.delegateTo = value || undefined; break
        case 'tags':
          updates.tags = value
            ? value.split(',').map((t) => t.trim()).filter(Boolean)
            : undefined
          break
      }
      updateModuleAttributes(module.id, updates)
    },
    [module.id, updateModuleAttributes],
  )

  const handleKeyDown = useCallback(
    (field: string, value: string) => (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commit(field, value)
    },
    [commit],
  )

  const handleDelete = useCallback(() => {
    deleteModule(module.id)
    setSelectedModuleId(null)
  }, [module.id, deleteModule, setSelectedModuleId])

  // Module parameter editing
  const [paramEdits, setParamEdits] = useState<Record<string, string>>(() => {
    const params = module.moduleParameters as Record<string, unknown> | undefined
    if (!params) return {}
    const result: Record<string, string> = {}
    for (const [k, v] of Object.entries(params)) {
      result[k] = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '')
    }
    return result
  })

  const commitParam = useCallback(
    (key: string, value: string) => {
      const params = { ...(module.moduleParameters as Record<string, unknown> ?? {}) }
      if (value === '') {
        delete params[key]
      } else {
        // Try parse as JSON for complex types
        try {
          params[key] = JSON.parse(value)
        } catch {
          params[key] = value
        }
      }
      updateModuleAttributes(module.id, { moduleParameters: params })
    },
    [module.id, module.moduleParameters, updateModuleAttributes],
  )

  const addParam = useCallback(() => {
    const key = `param_${Object.keys(paramEdits).length + 1}`
    setParamEdits((prev) => ({ ...prev, [key]: '' }))
  }, [paramEdits])

  const removeParam = useCallback(
    (key: string) => {
      const next = { ...paramEdits }
      delete next[key]
      setParamEdits(next)
      commitParam(key, '')
    },
    [paramEdits, commitParam],
  )

  return (
    <div className="properties-panel">
      <div className="properties-header">
        <span>Properties</span>
        <div className="properties-header-actions">
          <button className="delete-btn" onClick={handleDelete} title="Delete module">
            Delete
          </button>
          <button className="close-btn" onClick={() => setSelectedModuleId(null)}>
            &times;
          </button>
        </div>
      </div>

      <div className="properties-body">
        {/* Task info */}
        <div className="prop-section">
          <div className="prop-section-title">Task</div>
          <div className="prop-row">
            <label className="prop-label" htmlFor="task-name">Name</label>
            <input
              id="task-name"
              className="prop-input"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              onBlur={() => commit('taskName', taskName)}
              onKeyDown={handleKeyDown('taskName', taskName)}
              placeholder="Task name"
            />
          </div>
          <div className="prop-row">
            <span className="prop-label">Module</span>
            <span className="prop-value mono">{fqcn}</span>
          </div>
          {module.parentSection && (
            <div className="prop-row">
              <span className="prop-label">Section</span>
              <span className="prop-value">{module.parentSection}</span>
            </div>
          )}
        </div>

        {/* Attributes */}
        <div className="prop-section">
          <div className="prop-section-title">Attributes</div>
          <div className="prop-row">
            <label className="prop-label" htmlFor="task-when">when</label>
            <input
              id="task-when"
              className="prop-input mono"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              onBlur={() => commit('when', when)}
              onKeyDown={handleKeyDown('when', when)}
              placeholder="condition"
            />
          </div>
          <div className="prop-row">
            <label className="prop-label" htmlFor="task-loop">loop</label>
            <input
              id="task-loop"
              className="prop-input mono"
              value={loop}
              onChange={(e) => setLoop(e.target.value)}
              onBlur={() => commit('loop', loop)}
              onKeyDown={handleKeyDown('loop', loop)}
              placeholder="loop expression"
            />
          </div>
          <div className="prop-row">
            <label className="prop-label" htmlFor="task-register">register</label>
            <input
              id="task-register"
              className="prop-input mono"
              value={register}
              onChange={(e) => setRegister(e.target.value)}
              onBlur={() => commit('register', register)}
              onKeyDown={handleKeyDown('register', register)}
              placeholder="variable name"
            />
          </div>
          <div className="prop-row">
            <label className="prop-label" htmlFor="task-delegate">delegate_to</label>
            <input
              id="task-delegate"
              className="prop-input mono"
              value={delegateTo}
              onChange={(e) => setDelegateTo(e.target.value)}
              onBlur={() => commit('delegateTo', delegateTo)}
              onKeyDown={handleKeyDown('delegateTo', delegateTo)}
              placeholder="hostname"
            />
          </div>
          <div className="prop-row">
            <label className="prop-label" htmlFor="task-tags">tags</label>
            <input
              id="task-tags"
              className="prop-input mono"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              onBlur={() => commit('tags', tagsStr)}
              onKeyDown={handleKeyDown('tags', tagsStr)}
              placeholder="tag1, tag2"
            />
          </div>
          <div className="prop-row">
            <span className="prop-label">become</span>
            <input
              type="checkbox"
              className="prop-checkbox"
              checked={module.become ?? false}
              onChange={(e) =>
                updateModuleAttributes(module.id, { become: e.target.checked })
              }
            />
          </div>
          <div className="prop-row">
            <span className="prop-label">ignore_errors</span>
            <input
              type="checkbox"
              className="prop-checkbox"
              checked={module.ignoreErrors ?? false}
              onChange={(e) =>
                updateModuleAttributes(module.id, { ignoreErrors: e.target.checked })
              }
            />
          </div>
        </div>

        {/* Module parameters */}
        <div className="prop-section">
          <div className="prop-section-title">
            Parameters
            <button className="var-add-btn" onClick={addParam} title="Add parameter">
              +
            </button>
          </div>
          {Object.keys(paramEdits).length === 0 && (
            <div className="prop-empty">No parameters</div>
          )}
          {Object.entries(paramEdits).map(([key, value]) => (
            <div key={key} className="var-row">
              <span className="var-key-label">{key}</span>
              <input
                className="var-input var-value"
                value={value}
                onChange={(e) =>
                  setParamEdits((prev) => ({ ...prev, [key]: e.target.value }))
                }
                onBlur={() => commitParam(key, value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitParam(key, value)
                }}
              />
              <button
                className="var-remove-btn"
                onClick={() => removeParam(key)}
                title="Remove parameter"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})
