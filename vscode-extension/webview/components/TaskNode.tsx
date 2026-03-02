import { memo, useCallback } from 'react'
import type { ModuleBlock, Link } from '@af/shared'
import { useStore } from '../store'

interface TaskNodeProps {
  module: ModuleBlock
}

export const TaskNode = memo(function TaskNode({ module }: TaskNodeProps) {
  // Subscribe to derived boolean, not the full selectedModuleId (rule 5.8)
  const isSelected = useStore((s) => s.selectedModuleId === module.id)
  const setSelectedModuleId = useStore((s) => s.setSelectedModuleId)
  const linkingFrom = useStore((s) => s.linkingFrom)
  const setLinkingFrom = useStore((s) => s.setLinkingFrom)
  const addLink = useStore((s) => s.addLink)

  const handleClick = useCallback(() => {
    setSelectedModuleId(isSelected ? null : module.id)
  }, [isSelected, module.id, setSelectedModuleId])

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      const rect = e.currentTarget.getBoundingClientRect()
      e.dataTransfer.setData(
        'application/x-af-move',
        JSON.stringify({
          moduleId: module.id,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
        }),
      )
      e.dataTransfer.effectAllowed = 'move'
    },
    [module.id],
  )

  const handleOutputClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setLinkingFrom(module.id)
    },
    [module.id, setLinkingFrom],
  )

  const handleInputClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (linkingFrom && linkingFrom !== module.id) {
        const link: Link = {
          id: `link-${Date.now()}`,
          from: linkingFrom,
          to: module.id,
          type: (module.parentSection as Link['type']) ?? 'tasks',
        }
        addLink(link)
        setLinkingFrom(null)
      }
    },
    [linkingFrom, module.id, module.parentSection, addLink, setLinkingFrom],
  )

  const fqcn = module.collection ? `${module.collection}.${module.name}` : module.name

  const badges: string[] = []
  if (module.when) badges.push('when')
  if (module.loop) badges.push('loop')
  if (module.become) badges.push('become')
  if (module.register) badges.push('register')
  if (module.ignoreErrors) badges.push('ignore_errors')
  if (module.delegateTo) badges.push('delegate_to')
  if (module.tags && module.tags.length > 0) badges.push('tags')

  const isLinking = linkingFrom !== null

  return (
    <div
      className={`task-node ${isSelected ? 'selected' : ''} ${isLinking ? 'linking-mode' : ''}`}
      style={{
        left: module.x,
        top: module.y,
      }}
      onClick={handleClick}
      draggable={!isLinking}
      onDragStart={handleDragStart}
    >
      {/* Input connector (left) */}
      <div
        className={`connector connector-input ${isLinking ? 'active' : ''}`}
        onClick={handleInputClick}
      />

      <div className="task-name">{module.taskName ?? fqcn}</div>
      <div className="task-fqcn">{fqcn}</div>
      {badges.length > 0 && (
        <div className="task-badges">
          {badges.map((badge) => (
            <span key={badge} className="task-badge">{badge}</span>
          ))}
        </div>
      )}

      {/* Output connector (right) */}
      <div
        className="connector connector-output"
        onClick={handleOutputClick}
      />
    </div>
  )
})
