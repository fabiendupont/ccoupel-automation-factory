import * as vscode from 'vscode'
import { parseYaml } from '@af/shared'
import { PlaybookEditorProvider } from './providers/playbookEditorProvider'
import { GalaxyService } from './services/galaxyService'
import { GitWorkflowService } from './git/gitWorkflowService'
import { buildCommitMessage } from './git/commitMessageBuilder'
import type { GitExtension } from './git/types'

export function activate(context: vscode.ExtensionContext) {
  // Shared services
  const galaxyService = new GalaxyService(context.globalState)
  const gitService = new GitWorkflowService()

  // Bind Git API from the built-in vscode.git extension
  const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')
  if (gitExtension?.isActive) {
    gitService.setAPI(gitExtension.exports.getAPI(1))
  } else {
    gitExtension?.activate().then((ext) => {
      gitService.setAPI(ext.getAPI(1))
    })
  }

  // Register the custom editor provider
  const provider = new PlaybookEditorProvider(context, galaxyService, gitService)
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      PlaybookEditorProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  )

  // Command: open a YAML file as visual graph
  context.subscriptions.push(
    vscode.commands.registerCommand('automationFactory.openVisual', (uri?: vscode.Uri) => {
      const target = uri ?? vscode.window.activeTextEditor?.document.uri
      if (target) {
        vscode.commands.executeCommand(
          'vscode.openWith',
          target,
          PlaybookEditorProvider.viewType
        )
      }
    })
  )

  // Command: switch back to text editor
  context.subscriptions.push(
    vscode.commands.registerCommand('automationFactory.openTextEditor', () => {
      vscode.commands.executeCommand('workbench.action.reopenTextEditor')
    })
  )

  // Command: commit and sync playbook
  context.subscriptions.push(
    vscode.commands.registerCommand('automationFactory.commitAndSync', async () => {
      const uri = getActiveDocumentUri()
      if (!uri) {
        vscode.window.showWarningMessage('No active playbook to commit.')
        return
      }

      // Parse current text for commit message generation
      const doc = await vscode.workspace.openTextDocument(uri)
      const result = parseYaml(doc.getText())
      const suggested = buildCommitMessage(result.plays, uri.fsPath)

      const message = await vscode.window.showInputBox({
        prompt: 'Commit message',
        value: suggested,
      })
      if (!message) return

      const outcome = await gitService.commitAndSync(uri, message)
      if (outcome.error) {
        vscode.window.showErrorMessage(`Commit failed: ${outcome.error}`)
      } else {
        vscode.window.showInformationMessage('Playbook committed and synced.')
      }
    })
  )

  // Command: create branch
  context.subscriptions.push(
    vscode.commands.registerCommand('automationFactory.createBranch', async () => {
      const uri = getActiveDocumentUri()
      if (!uri) return

      const name = await vscode.window.showInputBox({
        prompt: 'New branch name',
      })
      if (!name) return

      try {
        await gitService.createBranch(uri, name, true)
        vscode.window.showInformationMessage(`Switched to new branch: ${name}`)
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to create branch: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    })
  )

  // Command: switch branch
  context.subscriptions.push(
    vscode.commands.registerCommand('automationFactory.switchBranch', async () => {
      const uri = getActiveDocumentUri()
      if (!uri) return

      const branches = await gitService.getBranches(uri)
      if (branches.length === 0) {
        vscode.window.showWarningMessage('No branches found.')
        return
      }

      const selected = await vscode.window.showQuickPick(branches, {
        placeHolder: 'Select a branch to switch to',
      })
      if (!selected) return

      const repo = gitService.getRepository(uri)
      if (!repo) return

      try {
        await repo.checkout(selected)
        vscode.window.showInformationMessage(`Switched to branch: ${selected}`)
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to switch branch: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    })
  )
}

function getActiveDocumentUri(): vscode.Uri | undefined {
  // Try the active custom editor tab first, then fall back to text editor
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab
  if (tab?.input && typeof tab.input === 'object' && 'uri' in tab.input) {
    return (tab.input as { uri: vscode.Uri }).uri
  }
  return vscode.window.activeTextEditor?.document.uri
}

export function deactivate() {
  // Nothing to dispose
}
