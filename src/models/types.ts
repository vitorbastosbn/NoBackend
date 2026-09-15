export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export const HTTP_STATUS_DESCRIPTIONS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout'
};

export function getHttpStatusText(code: number): string {
  return HTTP_STATUS_DESCRIPTIONS[code] || 'Custom';
}

export interface ResponseConfig {
  id: string;
  name: string;
  statusCode: number;
  delay: number; // in milliseconds
  headers: Record<string, string>;
  body: string;
}

export interface RouteConfig {
  id: string;
  path: string;
  method: HttpMethod;
  description?: string;
  activeResponseId: string;
  responses: ResponseConfig[];
}

export interface ServerConfig {
  id: string;
  name: string;
  port: number;
  prefix?: string;
  cors: boolean;
  enabled: boolean; // remember running preference
  routes: RouteConfig[];
}

export interface NoBackendConfigFile {
  version: string;
  servers: ServerConfig[];
}

export interface ServerStatusInfo {
  serverId: string;
  running: boolean;
  port: number;
  error?: string;
  requestCount: number;
  lastStarted?: number;
}

export interface RequestLogEntry {
  timestamp: string;
  serverId: string;
  serverName: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  clientIp?: string;
}
