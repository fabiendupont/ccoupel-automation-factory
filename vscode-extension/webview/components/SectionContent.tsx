import { memo } from 'react'
import type { ModuleBlock } from '@af/shared'
import { TaskNode } from './TaskNode'
import { BlockNode } from './BlockNode'
import { StartNode } from './StartNode'

interface SectionContentProps {
  modules: ModuleBlock[]
  allModules: ModuleBlock[]
}

export const SectionContent = memo(function SectionContent({ modules, allModules }: SectionContentProps) {
  return (
    <div className="section-content">
      {modules.map((mod) => {
        if (mod.isPlay) {
          return <StartNode key={mod.id} module={mod} />
        }
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
  )
})
