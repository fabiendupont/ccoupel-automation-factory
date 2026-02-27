import type { ModuleBlock } from '@af/shared'
import { useStore } from '../store'

interface TaskNodeProps {
  module: ModuleBlock
}

export function TaskNode({ module }: TaskNodeProps) {
  const { selectedModuleId, setSelectedModuleId } = useStore()
  const isSelected = selectedModuleId === module.id
  const fqcn = module.collection ? `${module.collection}.${module.name}` : module.name

  const badges: string[] = []
  if (module.when) badges.push('when')
  if (module.loop) badges.push('loop')
  if (module.become) badges.push('become')
  if (module.register) badges.push('register')
  if (module.ignoreErrors) badges.push('ignore_errors')
  if (module.delegateTo) badges.push('delegate_to')
  if (module.tags && module.tags.length > 0) badges.push('tags')

  return (
    <div
      className={`task-node ${isSelected ? 'selected' : ''}`}
      style={{
        left: module.x,
        top: module.y,
      }}
      onClick={() => setSelectedModuleId(isSelected ? null : module.id)}
    >
      <div className="task-name">{module.taskName ?? fqcn}</div>
      <div className="task-fqcn">{fqcn}</div>
      {badges.length > 0 && (
        <div className="task-badges">
          {badges.map((badge) => (
            <span key={badge} className="task-badge">{badge}</span>
          ))}
        </div>
      )}
    </div>
  )
}
