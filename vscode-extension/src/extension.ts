import * as vscode from 'vscode'
import { PlaybookEditorProvider } from './providers/playbookEditorProvider'
import { GalaxyService } from './services/galaxyService'

export function activate(context: vscode.ExtensionContext) {
  // Shared Galaxy service (cache persists across editor instances)
  const galaxyService = new GalaxyService(context.globalState)

  // Register the custom editor provider
  const provider = new PlaybookEditorProvider(context, galaxyService)
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
}

export function deactivate() {
  // Nothing to dispose
}
