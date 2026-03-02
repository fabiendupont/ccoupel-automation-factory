import * as vscode from 'vscode'
import { parseYaml, isAnsiblePlaybook, generateYaml } from '@af/shared'
import type { WebviewToHostMessage } from '@af/shared'

const DEBOUNCE_MS = 300

export class PlaybookEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'automationFactory.playbookViewer'

  private debounceTimer: ReturnType<typeof setTimeout> | undefined

  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = { enableScripts: true }
    webviewPanel.webview.html = this.getHtml(webviewPanel.webview)

    // Guard flag: prevent echo loops when the webview edit triggers
    // onDidChangeTextDocument, which would re-send to the webview.
    let isUpdatingFromWebview = false

    const sendUpdate = () => {
      const text = document.getText()

      if (!isAnsiblePlaybook(text)) {
        webviewPanel.webview.postMessage({
          type: 'update',
          isPlaybook: false,
          plays: [],
          warnings: [],
          errors: [],
        })
        return
      }

      const result = parseYaml(text)
      webviewPanel.webview.postMessage({
        type: 'update',
        isPlaybook: true,
        plays: result.plays,
        warnings: result.warnings,
        errors: result.errors,
      })
    }

    // Initial parse
    sendUpdate()

    // Webview → YAML: receive edits from visual editor
    const messageSubscription = webviewPanel.webview.onDidReceiveMessage(
      async (msg: WebviewToHostMessage) => {
        if (msg.type === 'edit:full') {
          const yaml = generateYaml(msg.plays)
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length),
          )
          const edit = new vscode.WorkspaceEdit()
          edit.replace(document.uri, fullRange, yaml)
          isUpdatingFromWebview = true
          await vscode.workspace.applyEdit(edit)
          isUpdatingFromWebview = false
        }
      },
    )

    // YAML → Webview: re-parse on text changes (skip echoes)
    const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (
        e.document.uri.toString() === document.uri.toString() &&
        !isUpdatingFromWebview
      ) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer)
        this.debounceTimer = setTimeout(sendUpdate, DEBOUNCE_MS)
      }
    })

    webviewPanel.onDidDispose(() => {
      messageSubscription.dispose()
      changeSubscription.dispose()
      if (this.debounceTimer) clearTimeout(this.debounceTimer)
    })
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js')
    )
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.css')
    )
    const nonce = getNonce()

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${styleUri}">
  <title>Automation Factory</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
  }
}

function getNonce(): string {
  let text = ''
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return text
}
