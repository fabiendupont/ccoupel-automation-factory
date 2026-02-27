import { useStore } from '../store'
import { PlayCanvas } from './PlayCanvas'
import { PropertiesPanel } from './PropertiesPanel'

export function PlaybookGraph() {
  const { plays, activePlayIndex, setActivePlayIndex, warnings, errors, selectedModuleId } = useStore()

  const activePlay = plays[activePlayIndex]
  if (!activePlay) return null

  const selectedModule = selectedModuleId
    ? activePlay.modules.find((m) => m.id === selectedModuleId)
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
