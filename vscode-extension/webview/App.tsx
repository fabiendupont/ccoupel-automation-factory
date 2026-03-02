import { useEffect } from 'react'
import { useStore } from './store'
import { PlaybookGraph } from './components/PlaybookGraph'
import { NotAPlaybook } from './components/NotAPlaybook'
import type { HostToWebviewMessage } from '@af/shared'

/** Skip inbound updates within this window after our own edit. */
const ECHO_GUARD_MS = 500

export function App() {
  const { isPlaybook, plays, setParseResult } = useStore()

  useEffect(() => {
    const handler = (event: MessageEvent<HostToWebviewMessage>) => {
      if (event.data.type === 'update') {
        // Skip echoed updates that arrive shortly after our own edit
        const lastEdit = useStore.getState().lastEditTimestamp
        if (lastEdit && Date.now() - lastEdit < ECHO_GUARD_MS) {
          return
        }
        setParseResult(event.data)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [setParseResult])

  if (!isPlaybook || plays.length === 0) {
    return <NotAPlaybook />
  }

  return <PlaybookGraph />
}
