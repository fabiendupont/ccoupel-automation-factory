import type { Play } from '@af/shared'

/**
 * Generate a commit message from the current playbook structure.
 *
 * Examples:
 * - Single play:  "Update deploy.yml: Install nginx (4 tasks)"
 * - Multi play:   "Update deploy.yml: Deploy (5 tasks), Configure (3 tasks)"
 * - No plays:     "Update deploy.yml"
 */
export function buildCommitMessage(plays: Play[], filePath: string): string {
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath
  const prefix = `Update ${fileName}`

  if (plays.length === 0) {
    return prefix
  }

  const summaries = plays.map((play) => {
    const taskCount = play.modules.length
    const name = play.name || 'Unnamed play'
    return `${name} (${taskCount} task${taskCount !== 1 ? 's' : ''})`
  })

  return `${prefix}: ${summaries.join(', ')}`
}
