import * as vscode from 'vscode';
import { ConfigStorage } from './storage/ConfigStorage';
import { ServerManager } from './server/ServerManager';
import { ServersTreeProvider, ServerTreeItem, RouteTreeItem } from './tree/ServersTreeProvider';
import { RouteConfig } from './models/types';
import { DashboardPanel } from './webview/DashboardPanel';

let serverManager: ServerManager | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel('NoBackend Server');
  outputChannel.appendLine('[NoBackend] ' + vscode.l10n.t('Initialized successfully. Local mock server ready.'));
  context.subscriptions.push(outputChannel);

  const configStorage = ConfigStorage.getInstance(context);
  context.subscriptions.push(configStorage);

  serverManager = new ServerManager(configStorage, outputChannel);
  context.subscriptions.push(serverManager);

  // Initialize and auto-start enabled servers
  await serverManager.initialize();

  // Register Tree View
  const treeProvider = new ServersTreeProvider(configStorage, serverManager);
  const treeView = vscode.window.createTreeView('nobackend-servers', {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  });
  context.subscriptions.push(treeView);

  treeView.onDidExpandElement((e) => {
    if (e.element instanceof ServerTreeItem) {
      treeProvider.setServerExpanded(e.element.server.id, true);
    }
  });

  treeView.onDidCollapseElement((e) => {
    if (e.element instanceof ServerTreeItem) {
      treeProvider.setServerExpanded(e.element.server.id, false);
    }
  });

  treeView.onDidChangeSelection((e) => {
    if (e.selection.length > 0) {
      setTimeout(() => {
        treeProvider.clearSelection();
      }, 50);
    }
  });

  // Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'nobackend.openDashboard',
      (serverId?: string | ServerTreeItem, routeId?: string) => {
        const targetServerId = serverId instanceof ServerTreeItem ? serverId.server.id : serverId;
        DashboardPanel.createOrShow(
          context.extensionUri,
          configStorage,
          serverManager!,
          targetServerId,
          routeId,
          routeId ? 'route' : 'server'
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'nobackend.openRoute',
      (serverId: string, routeId: string) => {
        DashboardPanel.createOrShow(
          context.extensionUri,
          configStorage,
          serverManager!,
          serverId,
          routeId,
          'route'
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nobackend.startServer', async (item?: ServerTreeItem | string) => {
      const serverId = item instanceof ServerTreeItem ? item.server.id : item;
      if (serverId && serverManager) {
        await serverManager.startServer(serverId);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nobackend.stopServer', async (item?: ServerTreeItem | string) => {
      const serverId = item instanceof ServerTreeItem ? item.server.id : item;
      if (serverId && serverManager) {
        await serverManager.stopServer(serverId);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nobackend.startAll', async () => {
      if (serverManager) {
        await serverManager.startAll();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nobackend.stopAll', async () => {
      if (serverManager) {
        await serverManager.stopAll();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nobackend.addServer', async () => {
      DashboardPanel.createOrShow(
        context.extensionUri,
        configStorage,
        serverManager!,
        undefined,
        undefined,
        'server',
        true
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nobackend.addRoute', async (item?: ServerTreeItem | string) => {
      let serverId = item instanceof ServerTreeItem ? item.server.id : item;
      const config = await configStorage.loadConfig();

      if (!serverId) {
        if (config.servers.length === 0) {
          vscode.window.showWarningMessage(vscode.l10n.t('No mock servers found. Create a server first.'));
          return;
        }
        if (config.servers.length === 1) {
          serverId = config.servers[0].id;
        } else {
          const pick = await vscode.window.showQuickPick(
            config.servers.map((s) => ({
              label: s.name,
              description: `:${s.port}`,
              detail: `${s.routes.length} rota(s)`,
              serverId: s.id
            })),
            { placeHolder: vscode.l10n.t('Select the server to add the route') }
          );
          if (!pick) return;
          serverId = pick.serverId;
        }
      }

      const server = config.servers.find((s) => s.id === serverId);
      if (!server) {
        vscode.window.showErrorMessage(vscode.l10n.t('Mock server not found.'));
        return;
      }

      const routeId = 'route_' + Date.now();
      const respId = 'resp_' + Date.now();

      let defaultPath = '/new-route';
      const existingPaths = new Set(server.routes.map((r) => r.path));
      if (existingPaths.has(defaultPath)) {
        let counter = 1;
        while (existingPaths.has(`/new-route-${counter}`)) {
          counter++;
        }
        defaultPath = `/new-route-${counter}`;
      }

      const newRoute: RouteConfig = {
        id: routeId,
        path: defaultPath,
        method: 'GET',
        description: '',
        request: {
          headers: {},
          queryParams: {},
          body: ''
        },
        activeResponseId: respId,
        responses: [
          {
            id: respId,
            name: 'Success',
            statusCode: 200,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Mock response' }, null, 2)
          }
        ]
      };

      server.routes.push(newRoute);
      await configStorage.saveConfig(config);

      // Expand server in sidebar tree so the user immediately sees the new route
      treeProvider.setServerExpanded(server.id, true);
      treeProvider.refresh();

      // Open route management screen directly for this new route
      DashboardPanel.createOrShow(
        context.extensionUri,
        configStorage,
        serverManager!,
        server.id,
        newRoute.id,
        'route',
        false,
        true
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nobackend.deleteServer', async (item?: ServerTreeItem | string) => {
      const serverId = typeof item === 'string' ? item : (item instanceof ServerTreeItem ? item.server.id : undefined);
      if (!serverId) return;
      const config = await configStorage.loadConfig();
      const server = config.servers.find((s) => s.id === serverId);
      if (!server) return;
      const confirm = await vscode.window.showWarningMessage(
        vscode.l10n.t('Are you sure you want to delete mock server "{0}"?', server.name),
        { modal: true },
        vscode.l10n.t('Yes, delete')
      );
      if (confirm === vscode.l10n.t('Yes, delete')) {
        if (serverManager) {
          await serverManager.stopServer(server.id);
        }
        config.servers = config.servers.filter((s) => s.id !== server.id);
        DashboardPanel.closeIfServerOpen(server.id);
        await configStorage.saveConfig(config);
        vscode.window.showInformationMessage(vscode.l10n.t('Server "{0}" deleted.', server.name));
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nobackend.deleteRoute', async (item?: RouteTreeItem) => {
      if (!item || !(item instanceof RouteTreeItem)) return;
      const routeLabel = `${item.route.method} ${item.route.path}`;
      const confirm = await vscode.window.showWarningMessage(
        vscode.l10n.t('Are you sure you want to delete route "{0}"?', routeLabel),
        { modal: true },
        vscode.l10n.t('Yes, delete')
      );
      if (confirm === vscode.l10n.t('Yes, delete')) {
        const config = await configStorage.loadConfig();
        const server = config.servers.find((s) => s.id === item.server.id);
        if (server) {
          server.routes = server.routes.filter((r) => r.id !== item.route.id);
          // If the route screen is currently open, close it together
          DashboardPanel.closeIfRouteOpen(item.route.id);
          await configStorage.saveConfig(config);
          vscode.window.showInformationMessage(vscode.l10n.t('Route "{0}" deleted.', routeLabel));
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nobackend.openConfigFile', async () => {
      const filePath = configStorage.getConfigFilePath();
      const doc = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(doc);
    })
  );
}

export async function deactivate(): Promise<void> {
  if (serverManager) {
    await serverManager.dispose();
  }
}
