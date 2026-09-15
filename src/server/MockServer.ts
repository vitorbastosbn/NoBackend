import * as http from 'http';
import * as vscode from 'vscode';
import { ServerConfig, RouteConfig, ResponseConfig, ServerStatusInfo } from '../models/types';

interface MatchedRoute {
  route: RouteConfig;
  response: ResponseConfig;
  params: Record<string, string>;
}

interface MatchResult {
  matched: MatchedRoute | null;
  pathMatchedButCriteriaFailed?: boolean;
  failedReason?: string;
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
    const [parsedPath, ...queryParts] = rawUrl.split('?');
    const queryString = queryParts.join('?');
    const searchParams = new URLSearchParams(queryString);

    // Handle CORS preflight
    if (this.config.cors && method === 'OPTIONS') {
      this.sendCorsHeaders(res);
      res.writeHead(204);
      res.end();
      this.logRequest(method, rawUrl, 204, Date.now() - startTime);
      return;
    }

    // Read body if any
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const incomingBody = Buffer.concat(chunks).toString('utf-8');
      const matchResult = this.matchRoute(method, parsedPath, searchParams, incomingBody, req.headers);

      if (!matchResult.matched) {
        if (this.config.cors) {
          this.sendCorsHeaders(res);
        }

        const isCriteriaFailure = matchResult.pathMatchedButCriteriaFailed;
        const notFoundBody = JSON.stringify(
          {
            error: 'Not Found',
            message: isCriteriaFailure
              ? `Nenhuma rota mock para [${method}] ${parsedPath} correspondeu aos query parameters ou payload enviados.`
              : `Nenhuma rota mock configurada para [${method}] ${parsedPath}`,
            details: isCriteriaFailure
              ? {
                  method,
                  url: rawUrl,
                  reason: matchResult.failedReason,
                  receivedQueryParams: Object.fromEntries(searchParams.entries()),
                  receivedBody: incomingBody ? incomingBody : undefined
                }
              : undefined,
            server: this.config.name,
            port: this.config.port,
            timestamp: new Date().toISOString()
          },
          null,
          2
        );

        if (isCriteriaFailure) {
          this.log(`⚠️ [404] [${method}] ${rawUrl} - ${matchResult.failedReason}`);
        }

        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(notFoundBody);
        this.logRequest(method, rawUrl, 404, Date.now() - startTime);
        return;
      }

      const { response, params } = matchResult.matched;
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

        // Query parameter replacement in body ({{query.param}})
        for (const [key, value] of searchParams.entries()) {
          bodyContent = bodyContent.split(`{{query.${key}}}`).join(value);
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
        this.logRequest(method, rawUrl, statusCode, duration);
      }, delayMs);
    });
  }

  private matchRoute(
    reqMethod: string,
    reqPath: string,
    searchParams: URLSearchParams,
    incomingBody: string,
    headers: http.IncomingHttpHeaders
  ): MatchResult {
    const serverPrefix = (this.config.prefix || '').trim().replace(/\/+$/, '');
    let normalizedPath = reqPath;

    if (serverPrefix && normalizedPath.startsWith(serverPrefix)) {
      normalizedPath = normalizedPath.substring(serverPrefix.length);
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath;
      }
    }

    interface CandidateMatch {
      route: RouteConfig;
      params: Record<string, string>;
      specificityScore: number;
    }

    const candidates: CandidateMatch[] = [];
    let pathMatchedCount = 0;
    const failureReasons: string[] = [];

    for (const route of this.config.routes) {
      if (route.method.toUpperCase() !== reqMethod) {
        continue;
      }

      const params = this.matchPattern(route.path, normalizedPath);
      if (params === null) {
        continue;
      }

      pathMatchedCount++;

      // Check Query Params
      const qpResult = this.checkQueryParams(route.request?.queryParams, searchParams);
      if (!qpResult.matches) {
        failureReasons.push(`[${route.method} ${route.path}]: ${qpResult.reason}`);
        continue;
      }

      // Check Body Payload
      const bodyResult = this.checkBody(route.request?.body, incomingBody);
      if (!bodyResult.matches) {
        failureReasons.push(`[${route.method} ${route.path}]: ${bodyResult.reason}`);
        continue;
      }

      // Check Headers
      const headerResult = this.checkHeaders(route.request?.headers, headers);
      if (!headerResult.matches) {
        failureReasons.push(`[${route.method} ${route.path}]: ${headerResult.reason}`);
        continue;
      }

      // Calculate specificity score
      const specificityScore = this.calculateSpecificity(
        route,
        params,
        qpResult.matchedCount,
        bodyResult.matchedCount,
        headerResult.matchedCount
      );

      candidates.push({
        route,
        params,
        specificityScore
      });
    }

    if (candidates.length > 0) {
      // Sort descending by specificity score
      candidates.sort((a, b) => b.specificityScore - a.specificityScore);
      const best = candidates[0];

      let activeResponse = best.route.responses.find((r) => r.id === best.route.activeResponseId);
      if (!activeResponse && best.route.responses.length > 0) {
        activeResponse = best.route.responses[0];
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

      return {
        matched: {
          route: best.route,
          response: activeResponse,
          params: best.params
        }
      };
    }

    return {
      matched: null,
      pathMatchedButCriteriaFailed: pathMatchedCount > 0,
      failedReason: failureReasons.join(' | ')
    };
  }

  private checkQueryParams(
    expectedParams: Record<string, string> | undefined,
    actualParams: URLSearchParams
  ): { matches: boolean; matchedCount: number; reason?: string } {
    if (!expectedParams) {
      return { matches: true, matchedCount: 0 };
    }

    const entries = Object.entries(expectedParams).filter(([k]) => k.trim().length > 0);
    if (entries.length === 0) {
      return { matches: true, matchedCount: 0 };
    }

    let matchedCount = 0;
    for (const [key, expectedVal] of entries) {
      const trimmedKey = key.trim();
      if (!actualParams.has(trimmedKey)) {
        return {
          matches: false,
          matchedCount,
          reason: `Query param obrigatório "${trimmedKey}" não foi enviado na requisição.`
        };
      }

      const trimmedVal = expectedVal.trim();
      if (trimmedVal.length > 0) {
        const actualVal = actualParams.get(trimmedKey) ?? '';
        const isMatch = actualVal === trimmedVal || decodeURIComponent(actualVal) === decodeURIComponent(trimmedVal);
        if (!isMatch) {
          return {
            matches: false,
            matchedCount,
            reason: `Query param "${trimmedKey}" possui valor "${actualVal}", mas era esperado "${trimmedVal}".`
          };
        }
      }

      matchedCount++;
    }

    return { matches: true, matchedCount };
  }

  private checkBody(
    expectedBody: string | undefined,
    actualBody: string
  ): { matches: boolean; matchedCount: number; reason?: string } {
    if (!expectedBody || expectedBody.trim().length === 0) {
      return { matches: true, matchedCount: 0 };
    }

    const trimmedExpected = expectedBody.trim();
    const trimmedActual = actualBody.trim();

    if (trimmedActual.length === 0) {
      return {
        matches: false,
        matchedCount: 0,
        reason: 'Payload esperado não foi enviado no corpo da requisição.'
      };
    }

    // Check JSON matching
    let expectedJson: any;
    let isExpectedJson = false;
    try {
      expectedJson = JSON.parse(trimmedExpected);
      isExpectedJson = true;
    } catch {
      isExpectedJson = false;
    }

    if (isExpectedJson) {
      let actualJson: any;
      let isActualJson = false;
      try {
        actualJson = JSON.parse(trimmedActual);
        isActualJson = true;
      } catch {
        isActualJson = false;
      }

      // Check URL encoded format fallback
      if (!isActualJson) {
        try {
          const params = new URLSearchParams(trimmedActual);
          const obj: Record<string, string> = {};
          let hasKeys = false;
          for (const [k, v] of params.entries()) {
            obj[k] = v;
            hasKeys = true;
          }
          if (hasKeys) {
            actualJson = obj;
            isActualJson = true;
          }
        } catch {}
      }

      if (!isActualJson) {
        return {
          matches: false,
          matchedCount: 0,
          reason: 'O corpo da requisição não é um JSON válido correspondente ao payload esperado.'
        };
      }

      const matchRes = this.deepMatches(expectedJson, actualJson);
      if (!matchRes.matches) {
        return {
          matches: false,
          matchedCount: 0,
          reason: matchRes.reason || 'O JSON enviado não corresponde aos dados esperados.'
        };
      }

      return {
        matches: true,
        matchedCount: matchRes.score
      };
    }

    // Plain text match fallback
    if (trimmedActual === trimmedExpected) {
      return { matches: true, matchedCount: 1 };
    }

    return {
      matches: false,
      matchedCount: 0,
      reason: 'O corpo de texto enviado não coincide exatamente com o payload esperado.'
    };
  }

  private deepMatches(
    expected: any,
    actual: any,
    path = ''
  ): { matches: boolean; score: number; reason?: string } {
    if (expected === null || expected === undefined) {
      const ok = actual === expected;
      return {
        matches: ok,
        score: ok ? 1 : 0,
        reason: ok ? undefined : `Campo "${path || 'raiz'}" esperado ${expected}, mas recebido ${actual}.`
      };
    }

    // Primitives: string, number, boolean
    if (typeof expected !== 'object') {
      const exactMatch = expected === actual;
      const looseMatch =
        typeof actual !== 'object' &&
        actual !== null &&
        actual !== undefined &&
        String(expected).trim() === String(actual).trim();

      const ok = exactMatch || looseMatch;
      return {
        matches: ok,
        score: ok ? 1 : 0,
        reason: ok ? undefined : `Campo "${path || 'raiz'}" esperado "${expected}", mas recebido "${actual}".`
      };
    }

    // Array
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) {
        return {
          matches: false,
          score: 0,
          reason: `Campo "${path || 'raiz'}" deveria ser uma lista (Array).`
        };
      }

      if (expected.length !== actual.length) {
        return {
          matches: false,
          score: 0,
          reason: `Lista "${path || 'raiz'}" esperava ${expected.length} itens, mas recebeu ${actual.length}.`
        };
      }

      let totalScore = 1;
      for (let i = 0; i < expected.length; i++) {
        const itemRes = this.deepMatches(expected[i], actual[i], `${path}[${i}]`);
        if (!itemRes.matches) {
          return itemRes;
        }
        totalScore += itemRes.score;
      }
      return { matches: true, score: totalScore };
    }

    // Object
    if (typeof actual !== 'object' || actual === null || Array.isArray(actual)) {
      return {
        matches: false,
        score: 0,
        reason: `Campo "${path || 'raiz'}" deveria ser um objeto.`
      };
    }

    const expectedKeys = Object.keys(expected);
    let totalScore = 1;

    for (const key of expectedKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      if (!(key in actual)) {
        return {
          matches: false,
          score: 0,
          reason: `Campo "${currentPath}" ausente no payload enviado.`
        };
      }

      const propRes = this.deepMatches(expected[key], actual[key], currentPath);
      if (!propRes.matches) {
        return propRes;
      }
      totalScore += propRes.score;
    }

    return { matches: true, score: totalScore };
  }

  private checkHeaders(
    expectedHeaders: Record<string, string> | undefined,
    actualHeaders: http.IncomingHttpHeaders
  ): { matches: boolean; matchedCount: number; reason?: string } {
    if (!expectedHeaders) {
      return { matches: true, matchedCount: 0 };
    }

    const entries = Object.entries(expectedHeaders).filter(([k]) => k.trim().length > 0);
    if (entries.length === 0) {
      return { matches: true, matchedCount: 0 };
    }

    let matchedCount = 0;
    for (const [key, expectedVal] of entries) {
      const lowerKey = key.trim().toLowerCase();
      const actualVal = actualHeaders[lowerKey];

      if (actualVal === undefined) {
        return {
          matches: false,
          matchedCount,
          reason: `Header obrigatório "${key}" não foi enviado.`
        };
      }

      const trimmedExpected = expectedVal.trim();
      if (trimmedExpected.length > 0) {
        const valStr = Array.isArray(actualVal) ? actualVal.join(', ') : actualVal;
        const isMatch = valStr === trimmedExpected || valStr.toLowerCase() === trimmedExpected.toLowerCase();
        if (!isMatch) {
          return {
            matches: false,
            matchedCount,
            reason: `Header "${key}" possui valor "${valStr}", mas era esperado "${trimmedExpected}".`
          };
        }
      }

      matchedCount++;
    }

    return { matches: true, matchedCount };
  }

  private calculateSpecificity(
    route: RouteConfig,
    params: Record<string, string>,
    qpMatchedCount: number,
    bodyMatchedCount: number,
    headerMatchedCount: number
  ): number {
    let score = 100;

    // Static segments in path get higher score than :param segments
    const segments = route.path.split('/').filter(Boolean);
    for (const seg of segments) {
      if (seg.startsWith(':')) {
        score += 1;
      } else {
        score += 5;
      }
    }

    // Query params weight
    score += qpMatchedCount * 20;

    // Body payload weight
    score += bodyMatchedCount * 25;

    // Headers weight
    score += headerMatchedCount * 10;

    return score;
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
