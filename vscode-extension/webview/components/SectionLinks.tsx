import { memo, useMemo, useCallback } from 'react'
import type { ModuleBlock, Link } from '@af/shared'
import { getLinkStyle, getModuleOrVirtual, getModuleDimensions } from '@af/shared'
import { useStore } from '../store'

const EMPTY_SET = new Set<string>()

interface SectionLinksProps {
  links: Link[]
  modules: ModuleBlock[]
}

export const SectionLinks = memo(function SectionLinks({ links, modules }: SectionLinksProps) {
  const deleteLink = useStore((s) => s.deleteLink)
  const linkingFrom = useStore((s) => s.linkingFrom)
  const setLinkingFrom = useStore((s) => s.setLinkingFrom)
  const addLink = useStore((s) => s.addLink)

  // Build index map for O(1) module lookups (rule 7.2, 7.11)
  const moduleIndex = useMemo(() => {
    const map = new Map<string, ModuleBlock>()
    for (const m of modules) {
      map.set(m.id, m)
    }
    return map
  }, [modules])

  const handleLinkClick = useCallback(
    (e: React.MouseEvent, linkId: string) => {
      e.stopPropagation()
      deleteLink(linkId)
    },
    [deleteLink],
  )

  if (links.length === 0 && !linkingFrom) return null

  // Temp line from linking source to mouse (rendered via CSS pointer-events)
  const linkingModule = linkingFrom ? getModuleOrVirtual(linkingFrom, modules) : null

  return (
    <svg className="section-links-svg">
      {links.map((link) => {
        const fromModule = getModuleOrVirtual(link.from, modules)
        const toModule = getModuleOrVirtual(link.to, modules)
        if (!fromModule || !toModule) return null

        const fromDims = getModuleDimensions(fromModule, modules, EMPTY_SET, EMPTY_SET)
        const toDims = getModuleDimensions(toModule, modules, EMPTY_SET, EMPTY_SET)

        // Connection points: right side of source → left side of target
        const x1 = fromModule.x + fromDims.width
        const y1 = fromModule.y + fromDims.height / 2
        const x2 = toModule.x
        const y2 = toModule.y + toDims.height / 2

        const style = getLinkStyle(link.type)
        const midX = (x1 + x2) / 2

        return (
          <g key={link.id} className="link-group" onClick={(e) => handleLinkClick(e, link.id)}>
            {/* Invisible wide hit area */}
            <path
              d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="transparent"
              strokeWidth="12"
              style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
            />
            {/* Visible line */}
            <path
              d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={style.stroke}
              strokeWidth={style.strokeWidth ?? '2'}
              strokeDasharray={style.strokeDasharray}
              opacity={0.7}
              className="link-path"
            />
            {/* Arrow head */}
            <polygon
              points={`${x2},${y2} ${x2 - 8},${y2 - 4} ${x2 - 8},${y2 + 4}`}
              fill={style.stroke}
              opacity={0.7}
            />
          </g>
        )
      })}
    </svg>
  )
})
