import type { ModuleBlock, Link } from '@af/shared'
import { getLinkStyle, getModuleOrVirtual, getModuleDimensions } from '@af/shared'

interface SectionLinksProps {
  links: Link[]
  modules: ModuleBlock[]
}

export function SectionLinks({ links, modules }: SectionLinksProps) {
  if (links.length === 0) return null

  return (
    <svg className="section-links-svg">
      {links.map((link) => {
        const fromModule = getModuleOrVirtual(link.from, modules)
        const toModule = getModuleOrVirtual(link.to, modules)
        if (!fromModule || !toModule) return null

        const emptySet = new Set<string>()
        const fromDims = getModuleDimensions(fromModule, modules, emptySet, emptySet)
        const toDims = getModuleDimensions(toModule, modules, emptySet, emptySet)

        // Connection points: right side of source → left side of target
        const x1 = fromModule.x + fromDims.width
        const y1 = fromModule.y + fromDims.height / 2
        const x2 = toModule.x
        const y2 = toModule.y + toDims.height / 2

        const style = getLinkStyle(link.type)
        const midX = (x1 + x2) / 2

        return (
          <g key={link.id}>
            <path
              d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={style.stroke}
              strokeWidth={style.strokeWidth ?? '2'}
              strokeDasharray={style.strokeDasharray}
              opacity={0.7}
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
}
