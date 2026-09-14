import * as http from 'http';
import * as vscode from 'vscode';
import { ServerConfig, RouteConfig, ResponseConfig, ServerStatusInfo } from '../models/types';

interface MatchedRoute {
  route: RouteConfig;
  response: ResponseConfig;
  params: Record<string, string>;
}

export class MockServer {
  private server?: http.Server;
  private isRunning = false;
  private requestCount = 0;
  private lastStarted?: number;
  private lastError?: string;

  constructor(
    private config: ServerConfig,
    private readonly outputChannel: vscode.OutputChannel,
    private readonly onStatusChangeCallback: () => void
  ) {}

  public getId(): string {
    return this.config.id;
  }

  public getPort(): number {
    return this.config.port;
  }

  public getName(): string {
    return this.config.name;
  }

  public getStatus(): ServerStatusInfo {
    return {
      serverId: this.config.id,
      running: this.isRunning,
      port: this.config.port,
      error: this.lastError,
      requestCount: this.requestCount,
      lastStarted: this.lastStarted
    };
  }

  public updateConfig(newConfig: ServerConfig): boolean {
    const portChanged = this.config.port !== newConfig.port;
    this.config = newConfig;
    return portChanged;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.lastError = undefined;

    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        this.isRunning = false;
        if (err.code === 'EADDRINUSE') {
          this.lastError = `Porta ${this.config.port} já está em uso por outro aplicativo.`;
          this.log(`[ERRO] Porta ${this.config.port} em uso!`);
        } else {
          this.lastError = err.message;
          this.log(`[ERRO] ${err.message}`);
        }
        this.onStatusChangeCallback();
        reject(err);
      });

      server.listen(this.config.port, () => {
        this.server = server;
        this.isRunning = true;
        this.lastStarted = Date.now();
        this.lastError = undefined;
        this.log(`🟢 Servidor iniciado em http://localhost:${this.config.port}${this.config.prefix || ''}`);
        this.onStatusChangeCallback();
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    if (!this.server || !this.isRunning) {
      this.isRunning = false;
      this.onStatusChangeCallback();
      return;
    }

    return new Promise((resolve) => {
      this.server?.close(() => {
        this.server = undefined;
        this.isRunning = false;
        this.log(`⚪ Servidor parado (Porta ${this.config.port})`);
        this.onStatusChangeCallback();
        resolve();
      });
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const startTime = Date.now();
    this.requestCount++;

    const method = (req.method || 'GET').toUpperCase();
    const rawUrl = req.url || '/';
    const parsedPath = rawUrl.split('?')[0];

    // Handle CORS preflight
    if (this.config.cors && method === 'OPTIONS') {
      this.sendCorsHeaders(res);
      res.writeHead(204);
      res.end();
      this.logRequest(method, parsedPath, 204, Date.now() - startTime);
      return;
    }

    // Read body if any
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const matched = this.matchRoute(method, parsedPath);

      if (!matched) {
        if (this.config.cors) {
          this.sendCorsHeaders(res);
        }
        const notFoundBody = JSON.stringify(
          {
            error: 'Not Found',
            message: `Nenhuma rota mock configurada para [${method}] ${parsedPath}`,
            server: this.config.name,
            port: this.config.port,
            timestamp: new Date().toISOString()
          },
          null,
          2
        );
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(notFoundBody);
        this.logRequest(method, parsedPath, 404, Date.now() - startTime);
        return;
      }

      const { response, params } = matched;
      const delayMs = response.delay || 0;

      setTimeout(() => {
        if (this.config.cors) {
          this.sendCorsHeaders(res);
        }

        // Apply headers
        const headers: Record<string, string> = { ...response.headers };

        let bodyContent = response.body || '';

        // Route parameter replacement in body (:id or {{id}})
        for (const [key, value] of Object.entries(params)) {
          bodyContent = bodyContent.split(`:${key}`).join(value);
          bodyContent = bodyContent.split(`{{${key}}}`).join(value);
        }

        // Ensure Content-Type if missing and looks like JSON
        const hasContentType = Object.keys(headers).some(
          (h) => h.toLowerCase() === 'content-type'
        );
        if (!hasContentType) {
          const trimmed = bodyContent.trim();
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            headers['Content-Type'] = 'application/json; charset=utf-8';
          } else if (trimmed.length > 0) {
            headers['Content-Type'] = 'text/plain; charset=utf-8';
          }
        }

        const statusCode = response.statusCode || 200;
        res.writeHead(statusCode, headers);
        res.end(bodyContent);

        const duration = Date.now() - startTime;
        this.logRequest(method, parsedPath, statusCode, duration);
      }, delayMs);
    });
  }

  private matchRoute(reqMethod: string, reqPath: string): MatchedRoute | null {
    const serverPrefix = (this.config.prefix || '').trim().replace(/\/+$/, '');
    let normalizedPath = reqPath;

    if (serverPrefix && normalizedPath.startsWith(serverPrefix)) {
      normalizedPath = normalizedPath.substring(serverPrefix.length);
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath;
      }
    }

    for (const route of this.config.routes) {
      if (route.method.toUpperCase() !== reqMethod) {
        continue;
      }

      const params = this.matchPattern(route.path, normalizedPath);
      if (params !== null) {
        // Find active response
        let activeResponse = route.responses.find((r) => r.id === route.activeResponseId);
        if (!activeResponse && route.responses.length > 0) {
          activeResponse = route.responses[0];
        }

        if (!activeResponse) {
          activeResponse = {
            id: 'default',
            name: '200 OK',
            statusCode: 200,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
          };
        }

        return { route, response: activeResponse, params };
      }
    }

    return null;
  }

  private matchPattern(routePattern: string, requestPath: string): Record<string, string> | null {
    // Normalize slashes
    const patternSegments = routePattern.split('/').filter(Boolean);
    const requestSegments = requestPath.split('/').filter(Boolean);

    if (patternSegments.length !== requestSegments.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternSegments.length; i++) {
      const pSeg = patternSegments[i];
      const rSeg = requestSegments[i];

      if (pSeg.startsWith(':')) {
        const paramName = pSeg.slice(1);
        params[paramName] = decodeURIComponent(rSeg);
      } else if (pSeg !== rSeg) {
        return null;
      }
    }

    return params;
  }

  private sendCorsHeaders(res: http.ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  private log(message: string): void {
    const time = new Date().toLocaleTimeString();
    this.outputChannel.appendLine(`[${time}] [${this.config.name}:${this.config.port}] ${message}`);
  }

  private logRequest(method: string, path: string, statusCode: number, durationMs: number): void {
    const time = new Date().toLocaleTimeString();
    const statusEmoji = statusCode >= 200 && statusCode < 300 ? '✅' : statusCode >= 400 && statusCode < 500 ? '⚠️' : '❌';
    this.outputChannel.appendLine(
      `[${time}] [:${this.config.port}] ${method.padEnd(6)} ${path} -> ${statusEmoji} ${statusCode} (${durationMs}ms)`
    );
  }
}
