import * as vscode from 'vscode';
import { ConfigStorage } from '../storage/ConfigStorage';
import { ServerManager } from '../server/ServerManager';
import { ServerConfig, RouteConfig } from '../models/types';

export class ServerTreeItem extends vscode.TreeItem {
  constructor(
    public readonly server: ServerConfig,
    public readonly isRunning: boolean,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed,
    epoch: number = 0
  ) {
    super(server.name, collapsibleState);

    this.id = `server_${server.id}_${epoch}`;
    this.description = `:${server.port}`;
    this.contextValue = isRunning ? 'server-running' : 'server-stopped';

    if (isRunning) {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('testing.iconPassed'));
    } else {
      this.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('disabledForeground'));
    }

    const statusLabel = isRunning ? vscode.l10n.t('Running') : vscode.l10n.t('Stopped');
    const corsLabel = server.cors ? vscode.l10n.t('Enabled') : vscode.l10n.t('Disabled');

    this.tooltip = new vscode.MarkdownString(
      `### ${server.name}\n` +
      `- **${vscode.l10n.t('Port')}:** \`${server.port}\`\n` +
      `- **${vscode.l10n.t('Status')}:** ${statusLabel}\n` +
      `- **CORS:** ${corsLabel}\n` +
      `- **${vscode.l10n.t('Prefix')}:** \`${server.prefix || '/'}\`\n` +
      `- **${vscode.l10n.t('Total Routes')}:** ${server.routes.length}`
    );
  }
}

export class RouteTreeItem extends vscode.TreeItem {
  constructor(
    public readonly server: ServerConfig,
    public readonly route: RouteConfig,
    epoch: number = 0
  ) {
    const activeResponse = route.responses.find((r) => r.id === route.activeResponseId) || route.responses[0];
    const statusText = activeResponse ? `${activeResponse.statusCode}` : '200';

    super(`${route.method} ${route.path}`, vscode.TreeItemCollapsibleState.None);

    this.id = `route_${server.id}_${route.id}_${epoch}`;
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
      `- **${vscode.l10n.t('Returned status')}:** \`${activeResponse?.statusCode || 200}\`\n` +
      `- **${vscode.l10n.t('Latency')}:** ${activeResponse?.delay || 0}ms\n` +
      `- **${vscode.l10n.t('Configured variants')}:** ${route.responses.length}`
    );

    // Clicking a route opens the screen with information of only that route
    this.command = {
      command: 'nobackend.openRoute',
      title: vscode.l10n.t('Open Route Configuration'),
      arguments: [server.id, route.id]
    };
  }
}

export class ServersTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private expandedServerIds = new Set<string>();
  private selectionEpoch = 0;

  constructor(
    private readonly configStorage: ConfigStorage,
    private readonly serverManager: ServerManager
  ) {
    this.configStorage.onDidChangeConfig(() => this.refresh());
    this.serverManager.onDidChangeStatus(() => this.refresh());
  }

  public setServerExpanded(serverId: string, expanded: boolean): void {
    if (expanded) {
      this.expandedServerIds.add(serverId);
    } else {
      this.expandedServerIds.delete(serverId);
    }
  }

  public clearSelection(): void {
    this.selectionEpoch++;
    this._onDidChangeTreeData.fire();
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
        const isExpanded = this.expandedServerIds.has(srv.id);
        const collapsibleState = isExpanded
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed;
        return new ServerTreeItem(srv, isRunning, collapsibleState, this.selectionEpoch);
      });
    }

    if (element instanceof ServerTreeItem) {
      // Return routes of this server
      return element.server.routes.map((route) => new RouteTreeItem(element.server, route, this.selectionEpoch));
    }

    return [];
  }
}
