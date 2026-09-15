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
  private currentServerId?: string;
  private currentRouteId?: string;
  private currentViewMode: 'server' | 'route' = 'server';
  private shouldOpenNewServerModal: boolean = false;
  private isNewRoute: boolean = false;

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly configStorage: ConfigStorage,
    private readonly serverManager: ServerManager,
    initialServerId?: string,
    initialRouteId?: string,
    viewMode: 'server' | 'route' = 'server',
    openNewServerModal: boolean = false,
    isNewRoute: boolean = false
  ) {
    this._panel = panel;
    this.currentServerId = initialServerId;
    this.currentRouteId = initialRouteId;
    this.currentViewMode = viewMode;
    this.shouldOpenNewServerModal = openNewServerModal;
    this.isNewRoute = isNewRoute;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.html = this.getHtmlForWebview(this._panel.webview);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleWebviewMessage(message);
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
    initialRouteId?: string,
    viewMode: 'server' | 'route' = 'server',
    openNewServerModal: boolean = false,
    isNewRoute: boolean = false
  ): DashboardPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel._panel.reveal(column);
      if (initialServerId) {
        DashboardPanel.currentPanel.currentServerId = initialServerId;
      }
      if (initialRouteId) {
        DashboardPanel.currentPanel.currentRouteId = initialRouteId;
      }
      DashboardPanel.currentPanel.currentViewMode = viewMode;
      DashboardPanel.currentPanel.isNewRoute = isNewRoute;

      if (initialServerId && initialRouteId) {
        configStorage.loadConfig().then((cfg) => {
          const srv = cfg.servers.find((s) => s.id === initialServerId);
          const r = srv?.routes.find((rt) => rt.id === initialRouteId);
          if (r && DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel._panel.title = `${r.method} ${r.path}`;
          }
        });
      }

      DashboardPanel.currentPanel._panel.webview.postMessage({
        type: 'selectTarget',
        serverId: initialServerId,
        routeId: initialRouteId,
        viewMode
      });

      if (openNewServerModal) {
        DashboardPanel.currentPanel._panel.webview.postMessage({
          type: 'openNewServerModal'
        });
      }

      if (isNewRoute) {
        DashboardPanel.currentPanel._panel.webview.postMessage({
          type: 'newRouteCreated'
        });
      }

      return DashboardPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'nobackendDashboard',
      'NoBackend - Mock Server',
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

    if (initialServerId && initialRouteId) {
      configStorage.loadConfig().then((cfg) => {
        const srv = cfg.servers.find((s) => s.id === initialServerId);
        const r = srv?.routes.find((rt) => rt.id === initialRouteId);
        if (r && panel) {
          panel.title = `${r.method} ${r.path}`;
        }
      });
    }

    DashboardPanel.currentPanel = new DashboardPanel(
      panel,
      extensionUri,
      configStorage,
      serverManager,
      initialServerId,
      initialRouteId,
      viewMode,
      openNewServerModal,
      isNewRoute
    );
    return DashboardPanel.currentPanel;
  }

  private async handleWebviewMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'ready': {
        const config = await this.configStorage.loadConfig();
        const statusList = this.serverManager.getAllStatus();

        // Default to first server if not specified
        const serverId = this.currentServerId || (config.servers.length > 0 ? config.servers[0].id : undefined);

        this._panel.webview.postMessage({
          type: 'initData',
          config,
          statusList,
          initialServerId: serverId,
          initialRouteId: this.currentRouteId,
          viewMode: this.currentViewMode,
          openNewServerModal: this.shouldOpenNewServerModal,
          isNewRoute: this.isNewRoute
        });
        this.shouldOpenNewServerModal = false;
        this.isNewRoute = false;
        break;
      }
      case 'saveNewServer': {
        try {
          await this.configStorage.saveConfig(message.config as NoBackendConfigFile);
          const srvName = message.name || 'Servidor';
          const srvPort = message.port ? ` na porta ${message.port}` : '';
          vscode.window.showInformationMessage(`Servidor "${srvName}" criado com sucesso${srvPort}!`);
          this.dispose();
        } catch (err: any) {
          vscode.window.showErrorMessage(`Falha ao salvar servidor: ${err.message || err}`);
        }
        break;
      }
      case 'updateTitle': {
        if (message.title && this._panel) {
          this._panel.title = message.title;
        }
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
      case 'closeScreen':
      case 'close': {
        this.dispose();
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

    const isNewServerInitial = this.shouldOpenNewServerModal;

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
    <header class="top-bar ${isNewServerInitial ? 'hidden' : ''}">
      <div class="brand">
        <div class="brand-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </div>
        <div class="brand-title">NoBackend</div>
        <span id="top-server-badge" class="server-badge">Servidor</span>
      </div>
      <div class="top-actions">
        <div id="save-status-indicator" class="save-status saved" title="Status de persistência">
          <span class="status-dot"></span>
          <span id="save-status-text">Salvo</span>
        </div>
        <button id="btn-save-all" class="btn btn-save" title="Salvar alterações no disco (Ctrl+S)">
          <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          <span>Salvar</span>
        </button>
      </div>
    </header>

    <!-- Main workspace -->
    <main class="main-layout ${isNewServerInitial ? 'hidden' : ''}" id="main-layout">
      <!-- Column 1: Routes List of current server (hidden in route-only mode) -->
      <aside class="col-routes hidden" id="col-routes">
        <div class="col-header">
          <div class="routes-header-title">
            <h3 id="routes-col-title">Rotas</h3>
            <span id="routes-count-badge" class="badge">0</span>
          </div>
          <button id="btn-add-route" class="btn-icon" title="Adicionar Rota">
            <svg class="icon-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <div class="routes-filter-box">
          <input type="text" id="input-route-filter" placeholder="Filtrar rotas..." />
        </div>
        <div id="routes-list" class="routes-list">
          <!-- Populated by JS -->
        </div>
      </aside>

      <!-- Column 3: Route & Response Editor -->
      <section class="col-editor" id="col-editor">
        <div id="editor-empty" class="editor-empty-state">
          <div class="empty-icon">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>
          <h3>Nenhuma rota selecionada</h3>
          <p>Crie ou selecione uma rota na barra lateral para começar a configurar os mocks.</p>
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
                  <option value="OPTIONS">OPTIONS</option>
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
                  <button id="btn-copy-url" class="btn btn-outline" title="Copiar URL completa para usar no Insomnia/Postman">
                    <svg class="icon-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copiar URL</span>
                  </button>
                  <button id="btn-copy-curl" class="btn btn-outline" title="Copiar comando cURL completo">
                    <svg class="icon-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="4 17 10 11 4 5"></polyline>
                      <line x1="12" y1="19" x2="20" y2="19"></line>
                    </svg>
                    <span>cURL</span>
                  </button>
                  <button id="btn-delete-route" class="btn btn-danger-outline btn-icon-only" title="Excluir Rota">
                    <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Segmented Navigation: Request vs Responses -->
          <div class="editor-nav-bar">
            <div class="nav-segment-control">
              <button type="button" id="tab-nav-request" class="nav-tab-btn" data-target="section-request">
                <svg class="icon-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="7" y1="17" x2="17" y2="7"></line>
                  <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
                <span>Requisição (Request)</span>
              </button>
              <button type="button" id="tab-nav-responses" class="nav-tab-btn active" data-target="section-responses">
                <svg class="icon-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="17" y1="7" x2="7" y2="17"></line>
                  <polyline points="17 17 7 17 7 7"></polyline>
                </svg>
                <span>Respostas (Responses)</span>
                <span id="nav-responses-badge" class="nav-pill-count">1</span>
              </button>
            </div>
            <div class="url-preview-inline" title="URL completa deste endpoint">
              <span class="url-preview-label">Endpoint:</span>
              <span id="url-preview-text" class="url-preview-text">http://localhost:3000/api/exemplo</span>
            </div>
          </div>

          <!-- Section 1: REQUEST SPECIFICATION -->
          <div id="section-request" class="route-tab-section hidden">
            <div class="card-section request-card">
              <!-- Path Parameters detected -->
              <div id="path-params-container" class="params-box hidden">
                <label>Parâmetros de Rota (Path Parameters):</label>
                <div id="path-params-list" class="param-badges-list"></div>
              </div>

              <!-- Query Parameters -->
              <div class="headers-accordion" id="req-query-accordion">
                <div class="accordion-head" id="req-query-head">
                  <div class="accordion-title-group">
                    <span class="accordion-title">Query Parameters esperados</span>
                    <span id="req-query-count" class="badge">0</span>
                  </div>
                  <span class="chevron">▼</span>
                </div>
                <div class="accordion-body" id="req-query-body">
                  <div id="req-query-container" class="headers-table"></div>
                  <button id="btn-add-query-param" class="btn btn-xs btn-outline">
                    <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>Adicionar Parâmetro</span>
                  </button>
                </div>
              </div>

              <!-- Request Headers -->
              <div class="headers-accordion" id="req-headers-accordion">
                <div class="accordion-head" id="req-headers-head">
                  <div class="accordion-title-group">
                    <span class="accordion-title">Headers da Requisição</span>
                    <span id="req-headers-count" class="badge">0</span>
                  </div>
                  <span class="chevron">▼</span>
                </div>
                <div class="accordion-body" id="req-headers-body">
                  <div id="req-headers-container" class="headers-table"></div>
                  <button id="btn-add-req-header" class="btn btn-xs btn-outline">
                    <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>Adicionar Header</span>
                  </button>
                </div>
              </div>

              <!-- Request Body Payload (ex: for POST, PUT, PATCH) -->
              <div class="body-editor-section">
                <div class="body-header">
                  <label>Corpo Esperado da Requisição (Payload / Exemplo de Envio)</label>
                  <div class="body-tools">
                    <span id="req-json-valid-indicator" class="valid-tag">Vazio</span>
                    <button id="btn-format-req-json" class="btn btn-xs btn-outline" title="Formatar e identar JSON da requisição">
                      <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                      <span>Formatar JSON</span>
                    </button>
                    <button id="btn-template-req-object" class="btn btn-xs btn-ghost">Exemplo Objeto</button>
                    <button id="btn-clear-req-body" class="btn btn-xs btn-ghost" title="Limpar payload da requisição">Limpar</button>
                  </div>
                </div>
                <textarea id="req-body-textarea" spellcheck="false" placeholder="Exemplo do JSON esperado na requisição enviada pelo cliente..."></textarea>
              </div>
            </div>
          </div>

          <!-- Section 2: RESPONSES SPECIFICATION -->
          <div id="section-responses" class="route-tab-section">
            <div class="responses-section">
              <div class="section-subhead">
                <h4>Respostas da Rota</h4>
                <button id="btn-add-response" class="btn btn-xs btn-outline" title="Adicionar nova variante de resposta">
                  <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  <span>Nova Resposta</span>
                </button>
              </div>
              <div id="responses-tabs" class="tabs-container">
                <!-- Rendered by JS -->
              </div>

              <!-- Active response editor form -->
              <div class="response-editor-card">
                <div class="card-header-row">
                  <div class="response-title-edit">
                    <label>Identificação:</label>
                    <input type="text" id="resp-name-input" placeholder="ex: Sucesso" />
                  </div>
                  <div class="response-header-actions">
                    <button id="btn-set-active-resp" class="btn-icon btn-star-favorite" title="Favoritar como resposta ativa">
                      <svg class="icon-svg star-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </button>
                    <button id="btn-duplicate-response" class="btn-icon" title="Duplicar esta resposta">
                      <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="8" y="8" width="14" height="14" rx="2" ry="2"></rect>
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                      </svg>
                    </button>
                    <button id="btn-delete-response" class="btn-icon btn-danger-icon" title="Excluir esta resposta">
                      <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
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
                    <!-- Quick status pills -->
                    <div class="quick-status-pills">
                      <button type="button" class="btn-pill-status s2xx" data-code="200">200</button>
                      <button type="button" class="btn-pill-status s2xx" data-code="201">201</button>
                      <button type="button" class="btn-pill-status s2xx" data-code="204">204</button>
                      <button type="button" class="btn-pill-status s4xx" data-code="400">400</button>
                      <button type="button" class="btn-pill-status s4xx" data-code="401">401</button>
                      <button type="button" class="btn-pill-status s4xx" data-code="404">404</button>
                      <button type="button" class="btn-pill-status s5xx" data-code="500">500</button>
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
                <div class="headers-accordion" id="resp-headers-accordion">
                  <div class="accordion-head" id="headers-head">
                    <div class="accordion-title-group">
                      <span class="accordion-title">Headers de Resposta</span>
                      <span id="headers-count" class="badge">1</span>
                    </div>
                    <span class="chevron">▼</span>
                  </div>
                  <div class="accordion-body" id="headers-body">
                    <div id="headers-list-container" class="headers-table"></div>
                    <button id="btn-add-header" class="btn btn-xs btn-outline">
                      <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      <span>Adicionar Header</span>
                    </button>
                  </div>
                </div>

                <!-- Response Body Editor -->
                <div class="body-editor-section">
                  <div class="body-header">
                    <label>Corpo da Resposta (Payload)</label>
                    <div class="body-tools">
                      <span id="json-valid-indicator" class="valid-tag valid">JSON Válido</span>
                      <button id="btn-format-json" class="btn btn-xs btn-outline" title="Formatar e identar JSON">
                        <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                        <span>Formatar JSON</span>
                      </button>
                      <button id="btn-template-array" class="btn btn-xs btn-ghost">Exemplo Lista</button>
                      <button id="btn-template-object" class="btn btn-xs btn-ghost">Exemplo Objeto</button>
                      <button id="btn-clear-resp-body" class="btn btn-xs btn-ghost" title="Limpar corpo da resposta">Limpar</button>
                    </div>
                  </div>
                  <textarea id="resp-body-textarea" spellcheck="false" placeholder="Digite o JSON ou texto retornado..."></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Screen for New Server Registration (Full screen view, not a floating modal) -->
    <section id="new-server-screen" class="new-server-screen ${isNewServerInitial ? '' : 'hidden'}">
      <div class="screen-container">
        <div class="screen-card">
          <div class="form-title-group">
            <h2>Cadastrar Novo Servidor Mock</h2>
            <p class="form-subtitle">Defina as configurações de porta, prefixo e CORS para criar um novo servidor.</p>
          </div>
          <div class="form-section">
            <div class="form-group">
              <label for="modal-server-name">Nome do Servidor <span class="required">*</span></label>
              <input type="text" id="modal-server-name" placeholder="ex: API de Pagamentos, Auth Service..." />
              <span class="form-help">Um nome descritivo para identificar este servidor no painel.</span>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label for="modal-server-port">Porta HTTP <span class="required">*</span></label>
                <input type="number" id="modal-server-port" min="1024" max="65535" value="3000" />
                <span class="form-help">Porta local (entre 1024 e 65535). Ex: 3000, 8080.</span>
              </div>

              <div class="form-group">
                <label for="modal-server-prefix">Prefixo Global (opcional)</label>
                <input type="text" id="modal-server-prefix" placeholder="ex: /api ou /v1" />
                <span class="form-help">Prefixo adicionado antes de todas as rotas deste servidor.</span>
              </div>
            </div>

            <div class="form-group checkbox-card">
              <label class="checkbox-label">
                <input type="checkbox" id="modal-server-cors" checked />
                <div class="checkbox-text">
                  <span class="checkbox-title">Habilitar CORS automaticamente</span>
                  <span class="checkbox-desc">Adiciona cabeçalhos Access-Control-Allow-Origin e responde automaticamente a requisições OPTIONS pré-voo (pre-flight).</span>
                </div>
              </label>
            </div>
          </div>

          <div class="screen-actions">
            <button id="btn-modal-cancel" class="btn btn-outline">Cancelar</button>
            <button id="btn-modal-save" class="btn btn-primary btn-lg">
              Salvar
            </button>
          </div>
        </div>
      </div>
    </section>
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
