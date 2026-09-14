import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { NoBackendConfigFile, ServerConfig, RouteConfig, ResponseConfig } from '../models/types';

export class ConfigStorage {
  private static instance: ConfigStorage;
  private readonly _onDidChangeConfig = new vscode.EventEmitter<NoBackendConfigFile>();
  public readonly onDidChangeConfig = this._onDidChangeConfig.event;

  private fileWatcher?: vscode.FileSystemWatcher;
  private configCache?: NoBackendConfigFile;
  private isSaving = false;

  private constructor(private readonly context: vscode.ExtensionContext) {
    this.setupFileWatcher();
  }

  public static getInstance(context: vscode.ExtensionContext): ConfigStorage {
    if (!ConfigStorage.instance) {
      ConfigStorage.instance = new ConfigStorage(context);
    }
    return ConfigStorage.instance;
  }

  public getConfigFilePath(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      return path.join(workspaceFolders[0].uri.fsPath, '.nobackend', 'servers.json');
    }
    // Fallback if no workspace is opened
    return path.join(this.context.globalStorageUri.fsPath, 'servers.json');
  }

  private setupFileWatcher(): void {
    const filePath = this.getConfigFilePath();
    const pattern = new vscode.RelativePattern(path.dirname(filePath), path.basename(filePath));
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    const reload = async () => {
      if (this.isSaving) {
        return;
      }
      this.configCache = undefined;
      const config = await this.loadConfig();
      this._onDidChangeConfig.fire(config);
    };

    this.fileWatcher.onDidChange(reload);
    this.fileWatcher.onDidCreate(reload);
    this.fileWatcher.onDidDelete(reload);
  }

  public async loadConfig(): Promise<NoBackendConfigFile> {
    if (this.configCache) {
      return this.configCache;
    }

    const filePath = this.getConfigFilePath();
    if (!fs.existsSync(filePath)) {
      const initialConfig = this.createDefaultConfig();
      await this.saveConfig(initialConfig);
      this.configCache = initialConfig;
      return initialConfig;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content) as NoBackendConfigFile;
      if (!parsed.servers || !Array.isArray(parsed.servers)) {
        parsed.servers = [];
      }
      this.configCache = parsed;
      return parsed;
    } catch (error) {
      vscode.window.showErrorMessage(`Erro ao ler .nobackend/servers.json: ${error}`);
      const fallback = this.createDefaultConfig();
      this.configCache = fallback;
      return fallback;
    }
  }

  public async saveConfig(config: NoBackendConfigFile): Promise<void> {
    const filePath = this.getConfigFilePath();
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.isSaving = true;
    try {
      this.configCache = config;
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
      this._onDidChangeConfig.fire(config);
    } finally {
      setTimeout(() => {
        this.isSaving = false;
      }, 300);
    }
  }

  public createDefaultConfig(): NoBackendConfigFile {
    return {
      version: '1.0.0',
      servers: [
        {
          id: 'srv_users_3000',
          name: 'API Principal (Usuários)',
          port: 3000,
          prefix: '/api',
          cors: true,
          enabled: true,
          routes: [
            {
              id: 'route_get_users',
              path: '/users',
              method: 'GET',
              description: 'Listar todos os usuários',
              activeResponseId: 'resp_users_200',
              responses: [
                {
                  id: 'resp_users_200',
                  name: '200 Sucesso (Lista)',
                  statusCode: 200,
                  delay: 80,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    [
                      { id: 1, name: 'Maria Silva', email: 'maria@example.com', role: 'admin' },
                      { id: 2, name: 'João Santos', email: 'joao@example.com', role: 'developer' },
                      { id: 3, name: 'Ana Oliveira', email: 'ana@example.com', role: 'designer' }
                    ],
                    null,
                    2
                  )
                },
                {
                  id: 'resp_users_500',
                  name: '500 Erro Interno',
                  statusCode: 500,
                  delay: 200,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    { error: 'InternalServerError', message: 'Falha ao buscar usuários no banco de dados' },
                    null,
                    2
                  )
                }
              ]
            },
            {
              id: 'route_post_users',
              path: '/users',
              method: 'POST',
              description: 'Criar novo usuário',
              activeResponseId: 'resp_users_create_201',
              responses: [
                {
                  id: 'resp_users_create_201',
                  name: '201 Criado com Sucesso',
                  statusCode: 201,
                  delay: 150,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    { id: 4, name: 'Carlos Lima', email: 'carlos@example.com', role: 'developer', createdAt: '2026-09-14T20:00:00Z' },
                    null,
                    2
                  )
                },
                {
                  id: 'resp_users_create_400',
                  name: '400 Validação Incorreta',
                  statusCode: 400,
                  delay: 50,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    { error: 'BadRequest', errors: ['O campo email é obrigatório e deve ser válido.'] },
                    null,
                    2
                  )
                }
              ]
            },
            {
              id: 'route_get_user_id',
              path: '/users/:id',
              method: 'GET',
              description: 'Obter detalhes do usuário por ID',
              activeResponseId: 'resp_user_get_200',
              responses: [
                {
                  id: 'resp_user_get_200',
                  name: '200 Usuário Encontrado',
                  statusCode: 200,
                  delay: 50,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    { id: 1, name: 'Maria Silva', email: 'maria@example.com', role: 'admin', active: true },
                    null,
                    2
                  )
                },
                {
                  id: 'resp_user_get_404',
                  name: '404 Não Encontrado',
                  statusCode: 404,
                  delay: 40,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    { error: 'NotFound', message: 'Usuário com o ID especificado não foi encontrado.' },
                    null,
                    2
                  )
                }
              ]
            },
            {
              id: 'route_put_user_id',
              path: '/users/:id',
              method: 'PUT',
              description: 'Atualização completa do usuário',
              activeResponseId: 'resp_user_put_200',
              responses: [
                {
                  id: 'resp_user_put_200',
                  name: '200 Atualizado',
                  statusCode: 200,
                  delay: 100,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    { id: 1, name: 'Maria Silva Atualizada', email: 'maria.silva@example.com', updatedAt: '2026-09-14T20:05:00Z' },
                    null,
                    2
                  )
                }
              ]
            },
            {
              id: 'route_patch_user_id',
              path: '/users/:id',
              method: 'PATCH',
              description: 'Atualização parcial do usuário',
              activeResponseId: 'resp_user_patch_200',
              responses: [
                {
                  id: 'resp_user_patch_200',
                  name: '200 Parcialmente Atualizado',
                  statusCode: 200,
                  delay: 70,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    { id: 1, role: 'super-admin', message: 'Permissões atualizadas com sucesso' },
                    null,
                    2
                  )
                }
              ]
            },
            {
              id: 'route_delete_user_id',
              path: '/users/:id',
              method: 'DELETE',
              description: 'Excluir usuário',
              activeResponseId: 'resp_user_delete_204',
              responses: [
                {
                  id: 'resp_user_delete_204',
                  name: '204 Sem Conteúdo (Excluído)',
                  statusCode: 204,
                  delay: 120,
                  headers: {},
                  body: ''
                }
              ]
            }
          ]
        },
        {
          id: 'srv_auth_3001',
          name: 'Auth Service',
          port: 3001,
          prefix: '',
          cors: true,
          enabled: false,
          routes: [
            {
              id: 'route_auth_login',
              path: '/auth/login',
              method: 'POST',
              description: 'Autenticação de usuário',
              activeResponseId: 'resp_auth_login_200',
              responses: [
                {
                  id: 'resp_auth_login_200',
                  name: '200 Login Bem Sucedido',
                  statusCode: 200,
                  delay: 180,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    {
                      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6Ik1hcmlhIFNpbHZhIiwiaWF0IjoxNTE2MjM5MDIyfQ.mock-signature',
                      tokenType: 'Bearer',
                      expiresIn: 3600
                    },
                    null,
                    2
                  )
                },
                {
                  id: 'resp_auth_login_401',
                  name: '401 Credenciais Inválidas',
                  statusCode: 401,
                  delay: 100,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    { error: 'Unauthorized', message: 'Email ou senha incorretos' },
                    null,
                    2
                  )
                }
              ]
            }
          ]
        }
      ]
    };
  }

  public dispose(): void {
    this.fileWatcher?.dispose();
    this._onDidChangeConfig.dispose();
  }
}
