import { memo, useState, useCallback } from 'react'
import type { PlayAttributes } from '@af/shared'
import { useStore } from '../store'

interface PlayAttributesPanelProps {
  attributes: PlayAttributes
  playName: string
  playIndex: number
}

export const PlayAttributesPanel = memo(function PlayAttributesPanel({
  attributes,
  playName,
  playIndex,
}: PlayAttributesPanelProps) {
  const { updatePlayAttributes, renamePlay, setSelectedModuleId } = useStore()

  const [name, setName] = useState(playName)
  const [hosts, setHosts] = useState(attributes.hosts ?? 'all')
  const [connection, setConnection] = useState(attributes.connection ?? '')
  const [remoteUser, setRemoteUser] = useState(attributes.remoteUser ?? '')

  const commitName = useCallback(() => {
    if (name !== playName) renamePlay(playIndex, name)
  }, [name, playName, playIndex, renamePlay])

  const commitHosts = useCallback(() => {
    if (hosts !== (attributes.hosts ?? 'all')) {
      updatePlayAttributes({ hosts })
    }
  }, [hosts, attributes.hosts, updatePlayAttributes])

  const commitConnection = useCallback(() => {
    updatePlayAttributes({ connection: connection || undefined })
  }, [connection, updatePlayAttributes])

  const commitRemoteUser = useCallback(() => {
    updatePlayAttributes({ remoteUser: remoteUser || undefined })
  }, [remoteUser, updatePlayAttributes])

  const handleKeyDown = useCallback(
    (commit: () => void) => (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commit()
    },
    [],
  )

  return (
    <div className="properties-panel">
      <div className="properties-header">
        <span>Play Attributes</span>
        <button className="close-btn" onClick={() => setSelectedModuleId(null)}>
          &times;
        </button>
      </div>

      <div className="properties-body">
        <div className="prop-section">
          <div className="prop-section-title">Play</div>

          <div className="prop-row">
            <label className="prop-label" htmlFor="play-name">Name</label>
            <input
              id="play-name"
              className="prop-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={handleKeyDown(commitName)}
            />
          </div>

          <div className="prop-row">
            <label className="prop-label" htmlFor="play-hosts">Hosts</label>
            <input
              id="play-hosts"
              className="prop-input mono"
              value={hosts}
              onChange={(e) => setHosts(e.target.value)}
              onBlur={commitHosts}
              onKeyDown={handleKeyDown(commitHosts)}
            />
          </div>

          <div className="prop-row">
            <label className="prop-label" htmlFor="play-conn">Connection</label>
            <input
              id="play-conn"
              className="prop-input mono"
              value={connection}
              placeholder="ssh"
              onChange={(e) => setConnection(e.target.value)}
              onBlur={commitConnection}
              onKeyDown={handleKeyDown(commitConnection)}
            />
          </div>

          <div className="prop-row">
            <label className="prop-label" htmlFor="play-user">Remote user</label>
            <input
              id="play-user"
              className="prop-input mono"
              value={remoteUser}
              onChange={(e) => setRemoteUser(e.target.value)}
              onBlur={commitRemoteUser}
              onKeyDown={handleKeyDown(commitRemoteUser)}
            />
          </div>

          <div className="prop-row">
            <span className="prop-label">Become</span>
            <input
              type="checkbox"
              className="prop-checkbox"
              checked={attributes.become ?? false}
              onChange={(e) => updatePlayAttributes({ become: e.target.checked })}
            />
          </div>

          <div className="prop-row">
            <span className="prop-label">Gather facts</span>
            <input
              type="checkbox"
              className="prop-checkbox"
              checked={attributes.gatherFacts ?? true}
              onChange={(e) => updatePlayAttributes({ gatherFacts: e.target.checked })}
            />
          </div>
        </div>

        {/* Roles summary */}
        {attributes.roles && attributes.roles.length > 0 && (
          <div className="prop-section">
            <div className="prop-section-title">Roles</div>
            {attributes.roles.map((role, i) => (
              <div key={i} className="prop-row">
                <span className="prop-label">Role {i + 1}</span>
                <span className="prop-value mono">
                  {typeof role === 'string' ? role : role.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
