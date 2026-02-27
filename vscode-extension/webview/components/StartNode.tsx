import type { ModuleBlock } from '@af/shared'

interface StartNodeProps {
  module: ModuleBlock
}

export function StartNode({ module }: StartNodeProps) {
  return (
    <div
      className="start-node"
      style={{
        left: module.x,
        top: module.y,
      }}
    >
      START
    </div>
  )
}
