import * as vscode from 'vscode';
import { ConfigStorage } from '../storage/ConfigStorage';
import { NoBackendConfigFile, ServerConfig, ServerStatusInfo } from '../models/types';
import { MockServer } from './MockServer';

export class ServerManager {
  private servers: Map<string, MockServer> = new Map();
  private readonly _onDidChangeStatus = new vscode.EventEmitter<ServerStatusInfo[]>();
  public readonly onDidChangeStatus = this._onDidChangeStatus.event;

  constructor(
    private readonly configStorage: ConfigStorage,
    private readonly outputChannel: vscode.OutputChannel
  ) {
    this.configStorage.onDidChangeConfig((config) => this.syncWithConfig(config));
  }

  public async initialize(): Promise<void> {
    const config = await this.configStorage.loadConfig();
    this.syncWithConfig(config);

    // Auto-start servers configured with enabled: true
    for (const srv of config.servers) {
      if (srv.enabled) {
        try {
          await this.startServer(srv.id);
        } catch (error) {
          // Handled inside MockServer
        }
      }
    }
  }

  private syncWithConfig(config: NoBackendConfigFile): void {
    const currentIds = new Set(config.servers.map((s) => s.id));

    // Remove deleted servers
    for (const [id, server] of this.servers.entries()) {
      if (!currentIds.has(id)) {
        server.stop().catch(() => {});
        this.servers.delete(id);
      }
    }

    // Add or update servers
    for (const srvConfig of config.servers) {
      const existing = this.servers.get(srvConfig.id);
      if (existing) {
        const portChanged = existing.updateConfig(srvConfig);
        if (portChanged && existing.getStatus().running) {
          existing.stop().then(() => existing.start()).catch((err) => {
            vscode.window.showErrorMessage(`Falha ao reiniciar servidor ${srvConfig.name} na nova porta: ${err}`);
          });
        }
      } else {
        const newServer = new MockServer(srvConfig, this.outputChannel, () => {
          this.emitStatusChange();
        });
        this.servers.set(srvConfig.id, newServer);
      }
    }

    this.emitStatusChange();
  }

  public async startServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Servidor com ID ${serverId} não encontrado.`);
    }

    try {
      await server.start();
      vscode.window.showInformationMessage(`Servidor "${server.getName()}" rodando na porta ${server.getPort()}!`);
      this.updateServerEnabledState(serverId, true);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Não foi possível iniciar "${server.getName()}" na porta ${server.getPort()}: ${err.message || err}`);
      throw err;
    }
  }

  public async stopServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      return;
    }

    await server.stop();
    vscode.window.showInformationMessage(`Servidor "${server.getName()}" foi parado.`);
    this.updateServerEnabledState(serverId, false);
  }

  public async toggleServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      return;
    }

    if (server.getStatus().running) {
      await this.stopServer(serverId);
    } else {
      await this.startServer(serverId);
    }
  }

  public async startAll(): Promise<void> {
    let startedCount = 0;
    for (const server of this.servers.values()) {
      if (!server.getStatus().running) {
        try {
          await server.start();
          startedCount++;
          this.updateServerEnabledState(server.getId(), true);
        } catch {
          // Server logged error
        }
      }
    }
    if (startedCount > 0) {
      vscode.window.showInformationMessage(`${startedCount} servidor(es) NoBackend iniciado(s).`);
    }
  }

  public async stopAll(): Promise<void> {
    for (const server of this.servers.values()) {
      if (server.getStatus().running) {
        await server.stop();
        this.updateServerEnabledState(server.getId(), false);
      }
    }
    vscode.window.showInformationMessage('Todos os servidores NoBackend foram parados.');
  }

  public getStatus(serverId: string): ServerStatusInfo | undefined {
    return this.servers.get(serverId)?.getStatus();
  }

  public getAllStatus(): ServerStatusInfo[] {
    return Array.from(this.servers.values()).map((s) => s.getStatus());
  }

  private emitStatusChange(): void {
    this._onDidChangeStatus.fire(this.getAllStatus());
  }

  private async updateServerEnabledState(serverId: string, enabled: boolean): Promise<void> {
    const config = await this.configStorage.loadConfig();
    const target = config.servers.find((s) => s.id === serverId);
    if (target && target.enabled !== enabled) {
      target.enabled = enabled;
      await this.configStorage.saveConfig(config);
    }
  }

  public async dispose(): Promise<void> {
    this._onDidChangeStatus.dispose();
    for (const server of this.servers.values()) {
      await server.stop();
    }
    this.servers.clear();
  }
}
