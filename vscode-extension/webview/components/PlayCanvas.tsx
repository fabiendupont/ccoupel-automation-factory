import { memo, useMemo } from 'react'
import type { Play, ModuleBlock } from '@af/shared'
import { getPlaySectionColor } from '@af/shared'
import { SectionContent } from './SectionContent'
import { SectionLinks } from './SectionLinks'
import { useStore } from '../store'
import { useCanvasDragDrop } from '../hooks/useCanvasDragDrop'

interface PlayCanvasProps {
  play: Play
}

type TaskSectionName = 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
const PLAY_SECTIONS: TaskSectionName[] = ['pre_tasks', 'tasks', 'post_tasks', 'handlers']

function getSectionLabel(section: TaskSectionName): string {
  switch (section) {
    case 'pre_tasks': return 'Pre Tasks'
    case 'tasks': return 'Tasks'
    case 'post_tasks': return 'Post Tasks'
    case 'handlers': return 'Handlers'
    default: return section
  }
}

export const PlayCanvas = memo(function PlayCanvas({ play }: PlayCanvasProps) {
  const { onDragOver, onDrop } = useCanvasDragDrop()
  const setLinkingFrom = useStore((s) => s.setLinkingFrom)

  // Group modules by section — derive during render (rule 5.1)
  const sectionModules = useMemo(() => {
    const grouped: Record<string, ModuleBlock[]> = {}
    for (const section of PLAY_SECTIONS) {
      grouped[section] = play.modules.filter(
        (m) => m.parentSection === section && !m.parentId
      )
    }
    return grouped
  }, [play.modules])

  // Derive attribute summary (rule 5.1)
  const attrs = play.attributes
  const attrItems: string[] = []
  if (attrs?.hosts) attrItems.push(`hosts: ${attrs.hosts}`)
  if (attrs?.become) attrItems.push('become: yes')
  if (attrs?.gatherFacts === false) attrItems.push('gather_facts: false')
  if (attrs?.connection) attrItems.push(`connection: ${attrs.connection}`)

  const varCount = play.variables.length

  return (
    <div
      className="play-canvas"
      onClick={() => setLinkingFrom(null)}
    >
      {/* Play header */}
      <div className="play-header">
        <div className="play-name">{play.name}</div>
        <div className="play-attrs">
          {attrItems.map((item, i) => (
            <span key={i} className="attr-badge">{item}</span>
          ))}
          {varCount > 0 && (
            <span className="attr-badge var-badge">{varCount} variable{varCount > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Sections */}
      {PLAY_SECTIONS.map((section) => {
        const modules = sectionModules[section]
        if (!modules || modules.length === 0) return null

        const color = getPlaySectionColor(section)
        const sectionLinks = play.links.filter((l) => l.type === section)

        return (
          <div key={section} className="play-section" style={{ borderLeftColor: color }}>
            <div className="section-header" style={{ color }}>
              {getSectionLabel(section)}
              <span className="section-count">
                {modules.filter((m) => !m.isPlay).length}
              </span>
            </div>
            <div
              className="section-body drop-zone"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, section)}
            >
              <SectionLinks
                links={sectionLinks}
                modules={play.modules}
              />
              <SectionContent
                modules={modules}
                allModules={play.modules}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
})
