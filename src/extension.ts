import * as vscode from 'vscode';
import { ConfigStorage } from './storage/ConfigStorage';
import { ServerManager } from './server/ServerManager';
import { ServersTreeProvider, ServerTreeItem } from './tree/ServersTreeProvider';
import { DashboardPanel } from './webview/DashboardPanel';

let serverManager: ServerManager | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel('NoBackend Server');
  outputChannel.appendLine('⚡ [NoBackend] Inicializado com sucesso. Mocks locais prontos para serem servidos!');
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

  // Status Bar Item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'nobackend.openDashboard';
  statusBarItem.tooltip = 'Clique para abrir o Dashboard do NoBackend';
  context.subscriptions.push(statusBarItem);

  const updateStatusBar = () => {
    if (!serverManager) return;
    const all = serverManager.getAllStatus();
    const runningCount = all.filter((s) => s.running).length;
    if (runningCount > 0) {
      statusBarItem.text = `$(server) NoBackend: ${runningCount} ativo(s)`;
      statusBarItem.backgroundColor = undefined;
      statusBarItem.show();
    } else if (all.length > 0) {
      statusBarItem.text = `$(server) NoBackend: parado`;
      statusBarItem.backgroundColor = undefined;
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  };

  serverManager.onDidChangeStatus(() => updateStatusBar());
  updateStatusBar();

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
          routeId
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
    vscode.commands.registerCommand('nobackend.deleteServer', async (item?: ServerTreeItem | string) => {
      const serverId = typeof item === 'string' ? item : (item instanceof ServerTreeItem ? item.server.id : undefined);
      if (!serverId) return;
      const config = await configStorage.loadConfig();
      const server = config.servers.find((s) => s.id === serverId);
      if (!server) return;
      const confirm = await vscode.window.showWarningMessage(
        `Tem certeza de que deseja excluir o servidor mock "${server.name}"?`,
        { modal: true },
        'Sim, excluir'
      );
      if (confirm === 'Sim, excluir') {
        if (serverManager) {
          await serverManager.stopServer(server.id);
        }
        config.servers = config.servers.filter((s) => s.id !== server.id);
        await configStorage.saveConfig(config);
        vscode.window.showInformationMessage(`Servidor "${server.name}" excluído.`);
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
