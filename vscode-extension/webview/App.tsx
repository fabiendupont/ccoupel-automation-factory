import { useEffect } from 'react'
import { useStore } from './store'
import { PlaybookGraph } from './components/PlaybookGraph'
import { NotAPlaybook } from './components/NotAPlaybook'
import type { Play } from '@af/shared'

interface UpdateMessage {
  type: 'update'
  isPlaybook: boolean
  plays: Play[]
  warnings: string[]
  errors: string[]
}

export function App() {
  const { isPlaybook, plays, setParseResult } = useStore()

  useEffect(() => {
    const handler = (event: MessageEvent<UpdateMessage>) => {
      if (event.data.type === 'update') {
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
