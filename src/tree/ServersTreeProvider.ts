import * as vscode from 'vscode';
import { ConfigStorage } from '../storage/ConfigStorage';
import { ServerManager } from '../server/ServerManager';
import { ServerConfig, RouteConfig } from '../models/types';

export class ServerTreeItem extends vscode.TreeItem {
  constructor(
    public readonly server: ServerConfig,
    public readonly isRunning: boolean
  ) {
    super(server.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.id = `server_${server.id}`;
    this.description = `:${server.port}`;
    this.contextValue = isRunning ? 'server-running' : 'server-stopped';

    if (isRunning) {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('testing.iconPassed'));
    } else {
      this.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('disabledForeground'));
    }

    this.tooltip = new vscode.MarkdownString(
      `### ${server.name}\n` +
      `- **Porta:** \`${server.port}\`\n` +
      `- **Status:** ${isRunning ? '🟢 Rodando' : '⚪ Parado'}\n` +
      `- **CORS:** ${server.cors ? 'Habilitado' : 'Desabilitado'}\n` +
      `- **Prefixo:** \`${server.prefix || '/'}\`\n` +
      `- **Total de Rotas:** ${server.routes.length}`
    );
  }
}

export class RouteTreeItem extends vscode.TreeItem {
  constructor(
    public readonly server: ServerConfig,
    public readonly route: RouteConfig
  ) {
    const activeResponse = route.responses.find((r) => r.id === route.activeResponseId) || route.responses[0];
    const statusText = activeResponse ? `${activeResponse.statusCode}` : '200';

    super(`${route.method} ${route.path}`, vscode.TreeItemCollapsibleState.None);

    this.id = `route_${server.id}_${route.id}`;
    this.description = `[${statusText}] ${activeResponse?.name || ''}`;
    this.contextValue = 'route-item';

    // Set method icon with colored dots
    switch (route.method) {
      case 'GET':
        this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
        break;
      case 'POST':
        this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.blue'));
        break;
      case 'PUT':
        this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.yellow'));
        break;
      case 'PATCH':
        this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.purple'));
        break;
      case 'DELETE':
        this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
        break;
      default:
        this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.orange'));
    }

    this.tooltip = new vscode.MarkdownString(
      `**${route.method}** \`${route.path}\`\n\n` +
      `- **Status retornado:** \`${activeResponse?.statusCode || 200}\`\n` +
      `- **Delay:** ${activeResponse?.delay || 0}ms\n` +
      `- **Variantes configuradas:** ${route.responses.length}`
    );

    // Clicking a route opens the screen with information of only that route
    this.command = {
      command: 'nobackend.openRoute',
      title: 'Abrir Configuração da Rota',
      arguments: [server.id, route.id]
    };
  }
}

export class ServersTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private readonly configStorage: ConfigStorage,
    private readonly serverManager: ServerManager
  ) {
    this.configStorage.onDidChangeConfig(() => this.refresh());
    this.serverManager.onDidChangeStatus(() => this.refresh());
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  public async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    const config = await this.configStorage.loadConfig();

    if (!element) {
      // Return servers list
      return config.servers.map((srv) => {
        const isRunning = this.serverManager.getStatus(srv.id)?.running ?? false;
        return new ServerTreeItem(srv, isRunning);
      });
    }

    if (element instanceof ServerTreeItem) {
      // Return routes of this server
      return element.server.routes.map((route) => new RouteTreeItem(element.server, route));
    }

    return [];
  }
}
