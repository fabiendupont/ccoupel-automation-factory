import { memo, useState, useCallback } from 'react'
import type { PlayVariable, VariableType } from '@af/shared'
import { useStore } from '../store'

const TYPES: VariableType[] = ['string', 'int', 'bool', 'list', 'dict']

interface VariablesPanelProps {
  variables: PlayVariable[]
}

export const VariablesPanel = memo(function VariablesPanel({
  variables,
}: VariablesPanelProps) {
  const updatePlayVariables = useStore((s) => s.updatePlayVariables)
  const [editing, setEditing] = useState<{ index: number; field: string } | null>(null)

  const updateVariable = useCallback(
    (index: number, updates: Partial<PlayVariable>) => {
      const next = variables.map((v, i) =>
        i === index ? { ...v, ...updates } : v,
      )
      updatePlayVariables(next)
    },
    [variables, updatePlayVariables],
  )

  const addVariable = useCallback(() => {
    const next: PlayVariable[] = [
      ...variables,
      { key: `var_${variables.length + 1}`, value: '', type: 'string', required: true },
    ]
    updatePlayVariables(next)
  }, [variables, updatePlayVariables])

  const removeVariable = useCallback(
    (index: number) => {
      updatePlayVariables(variables.filter((_, i) => i !== index))
    },
    [variables, updatePlayVariables],
  )

  return (
    <div className="prop-section">
      <div className="prop-section-title">
        Variables
        <button className="var-add-btn" onClick={addVariable} title="Add variable">
          +
        </button>
      </div>

      {variables.length === 0 && (
        <div className="prop-empty">No variables defined</div>
      )}

      {variables.map((v, i) => (
        <div key={i} className="var-row">
          <input
            className="var-input var-key"
            value={v.key}
            placeholder="key"
            onChange={(e) => updateVariable(i, { key: e.target.value })}
            onFocus={() => setEditing({ index: i, field: 'key' })}
            onBlur={() => setEditing(null)}
          />
          <input
            className="var-input var-value"
            value={v.value}
            placeholder="value"
            onChange={(e) => updateVariable(i, { value: e.target.value })}
            onFocus={() => setEditing({ index: i, field: 'value' })}
            onBlur={() => setEditing(null)}
          />
          <select
            className="var-select"
            value={v.type}
            onChange={(e) => updateVariable(i, { type: e.target.value as VariableType })}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            className="var-remove-btn"
            onClick={() => removeVariable(i)}
            title="Remove variable"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  )
})
