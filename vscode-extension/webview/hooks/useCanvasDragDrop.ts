import { useCallback } from 'react'
import type { ModuleBlock } from '@af/shared'
import { snapToGrid } from '@af/shared'
import { useStore } from '../store'

/** Task-bearing sections where modules can be dropped. */
type TaskSectionName = 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'

interface DropResult {
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, section: TaskSectionName) => void
}

/**
 * Hook for handling drag-drop on the play canvas.
 *
 * Two modes:
 * 1. Palette → canvas: creates a new ModuleBlock and auto-links to last module in section
 * 2. Canvas reposition: updates x/y with grid snapping
 */
export function useCanvasDragDrop(): DropResult {
  const { addModule, moveModule } = useStore()

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes('application/x-af-module') ||
      e.dataTransfer.types.includes('application/x-af-move')
    ) {
      e.preventDefault()
      e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/x-af-move')
        ? 'move'
        : 'copy'
    }
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent, section: TaskSectionName) => {
      e.preventDefault()

      // Mode 1: Palette drop — create new module
      const moduleData = e.dataTransfer.getData('application/x-af-module')
      if (moduleData) {
        try {
          const parsed = JSON.parse(moduleData) as {
            name: string
            collection: string
            description: string
          }

          const rect = e.currentTarget.getBoundingClientRect()
          const x = snapToGrid(e.clientX - rect.left)
          const y = snapToGrid(e.clientY - rect.top)

          if (parsed.name === 'block') {
            const newBlock: ModuleBlock = {
              id: `block-${Date.now()}`,
              collection: '',
              name: 'Block',
              x,
              y,
              isBlock: true,
              parentSection: section,
              blockSections: { normal: [], rescue: [], always: [] },
            }
            // Find last module in section to auto-link
            const lastModuleId = findLastInSection(section)
            addModule(newBlock, lastModuleId)
          } else {
            const newModule: ModuleBlock = {
              id: `module-${Date.now()}`,
              collection: parsed.collection,
              name: parsed.name,
              description: parsed.description,
              x,
              y,
              parentSection: section,
            }
            const lastModuleId = findLastInSection(section)
            addModule(newModule, lastModuleId)
          }
        } catch {
          // Invalid drag data
        }
        return
      }

      // Mode 2: Canvas reposition
      const moveData = e.dataTransfer.getData('application/x-af-move')
      if (moveData) {
        try {
          const { moduleId, offsetX, offsetY } = JSON.parse(moveData) as {
            moduleId: string
            offsetX: number
            offsetY: number
          }
          const rect = e.currentTarget.getBoundingClientRect()
          const x = snapToGrid(e.clientX - rect.left - offsetX)
          const y = snapToGrid(e.clientY - rect.top - offsetY)
          moveModule(moduleId, Math.max(0, x), Math.max(0, y))
        } catch {
          // Invalid drag data
        }
      }
    },
    [addModule, moveModule],
  )

  return { onDragOver, onDrop }
}

/** Find the last module in a section to auto-link from. */
function findLastInSection(section: TaskSectionName): string | undefined {
  const state = useStore.getState()
  const play = state.plays[state.activePlayIndex]
  if (!play) return undefined

  // Find modules in this section at the top level (not block children)
  const sectionModules = play.modules.filter(
    (m) => m.parentSection === section && !m.parentId,
  )

  if (sectionModules.length === 0) return undefined

  // Find the last in the link chain, or fall back to the last by position
  const outgoing = new Set(play.links.filter((l) => l.type === section).map((l) => l.from))
  const incoming = new Set(play.links.filter((l) => l.type === section).map((l) => l.to))

  // A "tail" module is one that has an incoming link but no outgoing link
  const tails = sectionModules.filter((m) => incoming.has(m.id) && !outgoing.has(m.id))
  if (tails.length > 0) return tails[0].id

  // Fallback: last by y-position
  const sorted = [...sectionModules].sort((a, b) => b.y - a.y)
  return sorted[0]?.id
}
