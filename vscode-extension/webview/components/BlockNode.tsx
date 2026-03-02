import { memo } from 'react'
import type { ModuleBlock } from '@af/shared'
import { getSectionColor } from '@af/shared'
import { useStore } from '../store'
import { TaskNode } from './TaskNode'
import { StartNode } from './StartNode'

interface BlockNodeProps {
  block: ModuleBlock
  allModules: ModuleBlock[]
}

const BLOCK_SECTIONS: Array<'normal' | 'rescue' | 'always'> = ['normal', 'rescue', 'always']

export const BlockNode = memo(function BlockNode({ block, allModules }: BlockNodeProps) {
  const { collapsedBlocks, collapsedBlockSections, toggleBlockCollapse, toggleBlockSection } =
    useStore()

  const isCollapsed = collapsedBlocks.has(block.id)

  return (
    <div
      className="block-node"
      style={{
        left: block.x,
        top: block.y,
      }}
    >
      <div className="block-header" onClick={() => toggleBlockCollapse(block.id)}>
        <span className="collapse-icon">{isCollapsed ? '\u25B6' : '\u25BC'}</span>
        <span className="block-name">{block.taskName ?? block.name ?? 'Block'}</span>
      </div>

      {!isCollapsed && (
        <div className="block-body">
          {BLOCK_SECTIONS.map((section) => {
            const taskIds = block.blockSections?.[section] ?? []
            const sectionKey = `${block.id}:${section}`
            const wildcardKey = `*:${section}`
            const isSectionCollapsed =
              collapsedBlockSections.has(sectionKey) ||
              collapsedBlockSections.has(wildcardKey)

            return (
              <div key={section} className="block-section">
                <div
                  className="block-section-header"
                  style={{ borderLeftColor: getSectionColor(section) }}
                  onClick={() => toggleBlockSection(sectionKey)}
                >
                  <span className="collapse-icon">
                    {isSectionCollapsed ? '\u25B6' : '\u25BC'}
                  </span>
                  <span style={{ color: getSectionColor(section) }}>{section}</span>
                  <span className="section-count">{taskIds.length}</span>
                </div>

                {!isSectionCollapsed && taskIds.length > 0 && (
                  <div className="block-section-content">
                    {taskIds.map((taskId) => {
                      const mod = allModules.find((m) => m.id === taskId)
                      if (!mod) return null
                      if (mod.isPlay) return <StartNode key={mod.id} module={mod} />
                      if (mod.isBlock) {
                        return (
                          <BlockNode
                            key={mod.id}
                            block={mod}
                            allModules={allModules}
                          />
                        )
                      }
                      return <TaskNode key={mod.id} module={mod} />
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
