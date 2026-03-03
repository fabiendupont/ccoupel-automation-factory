import { useState, useEffect } from 'react'
import type { GitStatusResultMessage } from '@af/shared'

interface GitStatus {
  branch: string | undefined
  dirty: boolean
  ahead: number
  behind: number
}

export function GitStatusBar() {
  const [status, setStatus] = useState<GitStatus | null>(null)

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data as GitStatusResultMessage
      if (msg.type === 'git:status-result') {
        setStatus({
          branch: msg.branch,
          dirty: msg.dirty,
          ahead: msg.ahead,
          behind: msg.behind,
        })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  if (!status || !status.branch) return null

  return (
    <div className="git-status-bar">
      <span className="git-branch-name">{status.branch}</span>
      {status.dirty && <span className="git-dirty-dot" title="Uncommitted changes" />}
      {status.ahead > 0 && (
        <span className="git-sync-count" title={`${status.ahead} ahead`}>
          {status.ahead}&uarr;
        </span>
      )}
      {status.behind > 0 && (
        <span className="git-sync-count" title={`${status.behind} behind`}>
          {status.behind}&darr;
        </span>
      )}
    </div>
  )
}
