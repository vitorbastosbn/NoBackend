import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigStorage } from '../storage/ConfigStorage';
import { ServerManager } from '../server/ServerManager';
import { NoBackendConfigFile } from '../models/types';

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly configStorage: ConfigStorage,
    private readonly serverManager: ServerManager,
    initialServerId?: string,
    initialRouteId?: string
  ) {
    this._panel = panel;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.html = this.getHtmlForWebview(this._panel.webview);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleWebviewMessage(message, initialServerId, initialRouteId);
      },
      null,
      this._disposables
    );

    // Sync configuration updates to webview
    this.configStorage.onDidChangeConfig((config) => {
      this._panel.webview.postMessage({
        type: 'configUpdated',
        config,
        statusList: this.serverManager.getAllStatus()
      });
    }, null, this._disposables);

    // Sync server status updates to webview
    this.serverManager.onDidChangeStatus((statusList) => {
      this._panel.webview.postMessage({
        type: 'statusUpdated',
        statusList
      });
    }, null, this._disposables);
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    configStorage: ConfigStorage,
    serverManager: ServerManager,
    initialServerId?: string,
    initialRouteId?: string
  ): DashboardPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel._panel.reveal(column);
      if (initialServerId) {
        DashboardPanel.currentPanel._panel.webview.postMessage({
          type: 'selectTarget',
          serverId: initialServerId,
          routeId: initialRouteId
        });
      }
      return DashboardPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'nobackendDashboard',
      'NoBackend - Mock Dashboard',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist', 'media'),
          vscode.Uri.joinPath(extensionUri, 'media')
        ]
      }
    );

    DashboardPanel.currentPanel = new DashboardPanel(
      panel,
      extensionUri,
      configStorage,
      serverManager,
      initialServerId,
      initialRouteId
    );
    return DashboardPanel.currentPanel;
  }

  private async handleWebviewMessage(
    message: any,
    initialServerId?: string,
    initialRouteId?: string
  ): Promise<void> {
    switch (message.type) {
      case 'ready': {
        const config = await this.configStorage.loadConfig();
        const statusList = this.serverManager.getAllStatus();
        this._panel.webview.postMessage({
          type: 'initData',
          config,
          statusList,
          initialServerId,
          initialRouteId
        });
        break;
      }
      case 'saveConfig': {
        try {
          await this.configStorage.saveConfig(message.config as NoBackendConfigFile);
          this._panel.webview.postMessage({
            type: 'saveSuccess',
            message: 'Configurações salvas com sucesso!'
          });
        } catch (err: any) {
          vscode.window.showErrorMessage(`Falha ao salvar configuração: ${err.message || err}`);
        }
        break;
      }
      case 'startServer': {
        try {
          await this.serverManager.startServer(message.serverId);
        } catch (err: any) {
          // Handled in serverManager
        }
        break;
      }
      case 'stopServer': {
        await this.serverManager.stopServer(message.serverId);
        break;
      }
      case 'toggleServer': {
        await this.serverManager.toggleServer(message.serverId);
        break;
      }
      case 'startAll': {
        await this.serverManager.startAll();
        break;
      }
      case 'stopAll': {
        await this.serverManager.stopAll();
        break;
      }
      case 'openConfigFile': {
        const filePath = this.configStorage.getConfigFilePath();
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
        break;
      }
      case 'copyToClipboard': {
        await vscode.env.clipboard.writeText(message.text);
        vscode.window.showInformationMessage(`Copiado para a área de transferência: ${message.text}`);
        break;
      }
      case 'notify': {
        if (message.level === 'error') {
          vscode.window.showErrorMessage(message.text);
        } else if (message.level === 'warning') {
          vscode.window.showWarningMessage(message.text);
        } else {
          vscode.window.showInformationMessage(message.text);
        }
        break;
      }
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'media', 'dashboard.css')
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'media', 'dashboard.js')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NoBackend Dashboard</title>
  <link rel="stylesheet" href="${cssUri}">
</head>
<body>
  <div class="app-container">
    <!-- Header bar -->
    <header class="top-bar">
      <div class="brand">
        <div class="brand-icon">⚡</div>
        <div class="brand-title">NoBackend</div>
        <span class="brand-badge">Mock Server</span>
      </div>
      <div class="top-actions">
        <button id="btn-start-all" class="btn btn-success" title="Iniciar todos os servidores">
          <span class="icon">▶</span> Iniciar Todos
        </button>
        <button id="btn-stop-all" class="btn btn-secondary" title="Parar todos os servidores">
          <span class="icon">⏹</span> Parar Todos
        </button>
        <button id="btn-open-json" class="btn btn-outline" title="Abrir .nobackend/servers.json no editor">
          <span class="icon">📄</span> Abrir JSON
        </button>
        <button id="btn-save-all" class="btn btn-primary" title="Salvar todas as alterações (Ctrl+S)">
          <span class="icon">💾</span> Salvar
        </button>
      </div>
    </header>

    <!-- Main 3-column workspace -->
    <main class="main-layout">
      <!-- Column 1: Servers List -->
      <aside class="col-servers">
        <div class="col-header">
          <h3>Servidores</h3>
          <button id="btn-add-server" class="btn-icon" title="Adicionar Servidor">➕</button>
        </div>
        <div id="servers-list" class="servers-list">
          <!-- Populated by JS -->
        </div>
      </aside>

      <!-- Column 2: Routes List -->
      <aside class="col-routes">
        <div class="col-header">
          <div class="routes-header-title">
            <h3>Rotas</h3>
            <span id="routes-count-badge" class="badge">0</span>
          </div>
          <button id="btn-add-route" class="btn-icon" title="Adicionar Rota">➕</button>
        </div>
        <div class="routes-filter-box">
          <input type="text" id="input-route-filter" placeholder="🔍 Filtrar rotas..." />
        </div>
        <div id="routes-list" class="routes-list">
          <!-- Populated by JS -->
        </div>
      </aside>

      <!-- Column 3: Route & Response Editor -->
      <section class="col-editor" id="col-editor">
        <div id="editor-empty" class="editor-empty-state">
          <div class="empty-icon">📭</div>
          <h3>Nenhuma rota selecionada</h3>
          <p>Selecione uma rota na coluna ao lado ou crie uma nova para configurar os mocks.</p>
        </div>

        <div id="editor-content" class="editor-content hidden">
          <!-- Server & Route Meta Header -->
          <div class="route-meta-panel">
            <div class="field-row">
              <div class="field-group method-group">
                <label>Verbo HTTP</label>
                <select id="route-method-select">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div class="field-group path-group">
                <label>Caminho da Rota (ex: /users/:id)</label>
                <div class="path-input-wrapper">
                  <span id="route-prefix-display" class="path-prefix">/api</span>
                  <input type="text" id="route-path-input" placeholder="/exemplo/:id" />
                </div>
              </div>
              <div class="field-group actions-group">
                <label>&nbsp;</label>
                <div class="meta-action-buttons">
                  <button id="btn-copy-url" class="btn btn-outline" title="Copiar URL Completa para usar no Insomnia">
                    📋 Copiar URL
                  </button>
                  <button id="btn-delete-route" class="btn btn-danger-outline" title="Excluir Rota">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Responses Variants Tabs -->
          <div class="responses-section">
            <div class="section-subhead">
              <h4>Respostas da Rota</h4>
              <button id="btn-add-response" class="btn btn-xs btn-outline">➕ Nova Resposta</button>
            </div>
            <div id="responses-tabs" class="tabs-container">
              <!-- Rendered by JS -->
            </div>

            <!-- Active response editor form -->
            <div class="response-editor-card">
              <div class="card-header-row">
                <div class="response-title-edit">
                  <label>Identificação:</label>
                  <input type="text" id="resp-name-input" placeholder="ex: 200 Sucesso" />
                </div>
                <div class="response-active-toggle">
                  <button id="btn-set-active-resp" class="btn btn-sm btn-primary">
                    ★ Resposta Ativa
                  </button>
                </div>
                <div class="response-delete">
                  <button id="btn-delete-response" class="btn-icon" title="Excluir esta resposta">🗑️</button>
                </div>
              </div>

              <div class="response-status-row">
                <div class="status-field">
                  <label>Status Code:</label>
                  <div class="status-inputs">
                    <select id="resp-status-quick">
                      <option value="200">200 OK</option>
                      <option value="201">201 Created</option>
                      <option value="204">204 No Content</option>
                      <option value="400">400 Bad Request</option>
                      <option value="401">401 Unauthorized</option>
                      <option value="403">403 Forbidden</option>
                      <option value="404">404 Not Found</option>
                      <option value="422">422 Unprocessable Entity</option>
                      <option value="500">500 Internal Server Error</option>
                      <option value="custom">Outro...</option>
                    </select>
                    <input type="number" id="resp-status-code" min="100" max="599" value="200" />
                  </div>
                </div>

                <div class="delay-field">
                  <label>Latência Simulada (Delay):</label>
                  <div class="delay-input-group">
                    <input type="number" id="resp-delay-input" min="0" step="50" value="0" />
                    <span class="unit">ms</span>
                  </div>
                  <div class="quick-delays">
                    <button type="button" class="btn-pill" data-delay="0">0ms</button>
                    <button type="button" class="btn-pill" data-delay="150">150ms</button>
                    <button type="button" class="btn-pill" data-delay="500">500ms</button>
                    <button type="button" class="btn-pill" data-delay="1000">1s</button>
                  </div>
                </div>
              </div>

              <!-- Headers Section -->
              <div class="headers-accordion">
                <div class="accordion-head" id="headers-head">
                  <span>Headers de Resposta (<span id="headers-count">1</span>)</span>
                  <span class="chevron">▼</span>
                </div>
                <div class="accordion-body" id="headers-body">
                  <div id="headers-list-container" class="headers-table"></div>
                  <button id="btn-add-header" class="btn btn-xs btn-outline">➕ Adicionar Header</button>
                </div>
              </div>

              <!-- Response Body Editor -->
              <div class="body-editor-section">
                <div class="body-header">
                  <label>Corpo da Resposta (Payload)</label>
                  <div class="body-tools">
                    <span id="json-valid-indicator" class="valid-tag valid">JSON Válido</span>
                    <button id="btn-format-json" class="btn btn-xs btn-outline" title="Formatar e identar JSON">
                      🪄 Formatar JSON
                    </button>
                    <button id="btn-template-array" class="btn btn-xs btn-ghost">Exemplo Lista</button>
                    <button id="btn-template-object" class="btn btn-xs btn-ghost">Exemplo Objeto</button>
                  </div>
                </div>
                <textarea id="resp-body-textarea" spellcheck="false" placeholder="Digite o JSON ou texto retornado..."></textarea>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Modal for New/Edit Server -->
    <div id="server-modal" class="modal-overlay hidden">
      <div class="modal-card">
        <h3 id="server-modal-title">Novo Servidor Mock</h3>
        <div class="modal-form">
          <div class="form-group">
            <label>Nome do Servidor</label>
            <input type="text" id="modal-server-name" placeholder="ex: API de Pagamentos" />
          </div>
          <div class="form-group">
            <label>Porta HTTP</label>
            <input type="number" id="modal-server-port" min="1024" max="65535" value="3002" />
          </div>
          <div class="form-group">
            <label>Prefixo Global (opcional)</label>
            <input type="text" id="modal-server-prefix" placeholder="ex: /api ou /v1" />
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" id="modal-server-cors" checked /> Habilitar CORS automaticamente
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button id="btn-modal-cancel" class="btn btn-secondary">Cancelar</button>
          <button id="btn-modal-save" class="btn btn-primary">Salvar Servidor</button>
        </div>
      </div>
    </div>
  </div>

  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
  }

  public dispose(): void {
    DashboardPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
