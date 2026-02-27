import type { ModuleBlock } from '@af/shared'
import { useStore } from '../store'

interface PropertiesPanelProps {
  module: ModuleBlock
}

export function PropertiesPanel({ module }: PropertiesPanelProps) {
  const { setSelectedModuleId } = useStore()
  const fqcn = module.collection ? `${module.collection}.${module.name}` : module.name

  return (
    <div className="properties-panel">
      <div className="properties-header">
        <span>Properties</span>
        <button className="close-btn" onClick={() => setSelectedModuleId(null)}>
          &times;
        </button>
      </div>

      <div className="properties-body">
        {/* Task info */}
        <div className="prop-section">
          <div className="prop-section-title">Task</div>
          {module.taskName && (
            <div className="prop-row">
              <span className="prop-label">Name</span>
              <span className="prop-value">{module.taskName}</span>
            </div>
          )}
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
        {(module.when || module.loop || module.register || module.become || module.ignoreErrors || module.delegateTo || (module.tags && module.tags.length > 0)) && (
          <div className="prop-section">
            <div className="prop-section-title">Attributes</div>
            {module.when && (
              <div className="prop-row">
                <span className="prop-label">when</span>
                <span className="prop-value mono">{module.when}</span>
              </div>
            )}
            {module.loop && (
              <div className="prop-row">
                <span className="prop-label">loop</span>
                <span className="prop-value mono">{module.loop}</span>
              </div>
            )}
            {module.register && (
              <div className="prop-row">
                <span className="prop-label">register</span>
                <span className="prop-value mono">{module.register}</span>
              </div>
            )}
            {module.become && (
              <div className="prop-row">
                <span className="prop-label">become</span>
                <span className="prop-value">yes</span>
              </div>
            )}
            {module.ignoreErrors && (
              <div className="prop-row">
                <span className="prop-label">ignore_errors</span>
                <span className="prop-value">yes</span>
              </div>
            )}
            {module.delegateTo && (
              <div className="prop-row">
                <span className="prop-label">delegate_to</span>
                <span className="prop-value mono">{module.delegateTo}</span>
              </div>
            )}
            {module.tags && module.tags.length > 0 && (
              <div className="prop-row">
                <span className="prop-label">tags</span>
                <span className="prop-value">
                  {module.tags.map((tag) => (
                    <span key={tag} className="tag-badge">{tag}</span>
                  ))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Module parameters */}
        {module.moduleParameters && typeof module.moduleParameters === 'object' && (
          <div className="prop-section">
            <div className="prop-section-title">Parameters</div>
            {Object.entries(module.moduleParameters as Record<string, unknown>).map(([key, value]) => (
              <div key={key} className="prop-row">
                <span className="prop-label">{key}</span>
                <span className="prop-value mono">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
