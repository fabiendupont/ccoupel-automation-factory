import { useMemo } from 'react'
import { useStore } from '../store'
import { PlayCanvas } from './PlayCanvas'
import { PropertiesPanel } from './PropertiesPanel'

export function PlaybookGraph() {
  // Narrow subscriptions: each selector returns a stable value (rule 5.8)
  const plays = useStore((s) => s.plays)
  const activePlayIndex = useStore((s) => s.activePlayIndex)
  const setActivePlayIndex = useStore((s) => s.setActivePlayIndex)
  const warnings = useStore((s) => s.warnings)
  const errors = useStore((s) => s.errors)
  const selectedModuleId = useStore((s) => s.selectedModuleId)

  const activePlay = plays[activePlayIndex]
  if (!activePlay) return null

  // Build index map for O(1) module lookups (rule 7.2, 7.11)
  const moduleIndex = useMemo(() => {
    const map = new Map<string, (typeof activePlay.modules)[number]>()
    for (const m of activePlay.modules) {
      map.set(m.id, m)
    }
    return map
  }, [activePlay.modules])

  const selectedModule = selectedModuleId
    ? moduleIndex.get(selectedModuleId) ?? null
    : null

  return (
    <div className="playbook-graph">
      {/* Play tabs */}
      {plays.length > 1 && (
        <div className="play-tabs">
          {plays.map((play, i) => (
            <button
              key={play.id}
              className={`play-tab ${i === activePlayIndex ? 'active' : ''}`}
              onClick={() => setActivePlayIndex(i)}
            >
              {play.name}
            </button>
          ))}
        </div>
      )}

      {/* Warnings & errors */}
      {(warnings.length > 0 || errors.length > 0) && (
        <div className="messages">
          {errors.map((err, i) => (
            <div key={`e-${i}`} className="message error">{err}</div>
          ))}
          {warnings.map((w, i) => (
            <div key={`w-${i}`} className="message warning">{w}</div>
          ))}
        </div>
      )}

      {/* Main layout */}
      <div className="graph-layout">
        <div className="canvas-container">
          <PlayCanvas play={activePlay} />
        </div>
        {selectedModule && (
          <div className="properties-container">
            <PropertiesPanel module={selectedModule} />
          </div>
        )}
      </div>
    </div>
  )
}
