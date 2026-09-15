import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { NoBackendConfigFile } from '../models/types';

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
              description: 'List all users',
              activeResponseId: 'resp_users_200',
              responses: [
                {
                  id: 'resp_users_200',
                  name: '200 Success (List)',
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
                  name: '500 Internal Error',
                  statusCode: 500,
                  delay: 200,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    { error: 'InternalServerError', message: 'Failed to fetch users from database' },
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
              description: 'Create new user',
              activeResponseId: 'resp_users_create_201',
              responses: [
                {
                  id: 'resp_users_create_201',
                  name: '201 Successfully Created',
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
                  name: '400 Validation Error',
                  statusCode: 400,
                  delay: 50,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    { error: 'BadRequest', errors: ['Email field is required and must be valid.'] },
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
              description: 'Get user details by ID',
              activeResponseId: 'resp_user_get_200',
              responses: [
                {
                  id: 'resp_user_get_200',
                  name: '200 User Found',
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
                  name: '404 Not Found',
                  statusCode: 404,
                  delay: 40,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    { error: 'NotFound', message: 'User with the specified ID was not found.' },
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
              description: 'Full user update',
              activeResponseId: 'resp_user_put_200',
              responses: [
                {
                  id: 'resp_user_put_200',
                  name: '200 Updated',
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
              description: 'Partial user update',
              activeResponseId: 'resp_user_patch_200',
              responses: [
                {
                  id: 'resp_user_patch_200',
                  name: '200 Partially Updated',
                  statusCode: 200,
                  delay: 70,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    { id: 1, role: 'super-admin', message: 'Permissions updated successfully' },
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
              description: 'Delete user',
              activeResponseId: 'resp_user_delete_204',
              responses: [
                {
                  id: 'resp_user_delete_204',
                  name: '204 No Content (Deleted)',
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
              description: 'User authentication',
              activeResponseId: 'resp_auth_login_200',
              responses: [
                {
                  id: 'resp_auth_login_200',
                  name: '200 Successful Login',
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
                  name: '401 Invalid Credentials',
                  statusCode: 401,
                  delay: 100,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    { error: 'Unauthorized', message: 'Incorrect email or password' },
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
