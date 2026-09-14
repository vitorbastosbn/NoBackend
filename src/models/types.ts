export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

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
