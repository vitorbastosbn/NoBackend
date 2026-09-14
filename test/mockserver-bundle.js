"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server/MockServer.ts
var MockServer_exports = {};
__export(MockServer_exports, {
  MockServer: () => MockServer
});
module.exports = __toCommonJS(MockServer_exports);
var http = __toESM(require("http"));
var MockServer = class {
  constructor(config, outputChannel, onStatusChangeCallback) {
    this.config = config;
    this.outputChannel = outputChannel;
    this.onStatusChangeCallback = onStatusChangeCallback;
  }
  server;
  isRunning = false;
  requestCount = 0;
  lastStarted;
  lastError;
  getId() {
    return this.config.id;
  }
  getPort() {
    return this.config.port;
  }
  getName() {
    return this.config.name;
  }
  getStatus() {
    return {
      serverId: this.config.id,
      running: this.isRunning,
      port: this.config.port,
      error: this.lastError,
      requestCount: this.requestCount,
      lastStarted: this.lastStarted
    };
  }
  updateConfig(newConfig) {
    const portChanged = this.config.port !== newConfig.port;
    this.config = newConfig;
    return portChanged;
  }
  async start() {
    if (this.isRunning) {
      return;
    }
    this.lastError = void 0;
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });
      server.on("error", (err) => {
        this.isRunning = false;
        if (err.code === "EADDRINUSE") {
          this.lastError = `Porta ${this.config.port} j\xE1 est\xE1 em uso por outro aplicativo.`;
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
        this.lastError = void 0;
        this.log(`\u{1F7E2} Servidor iniciado em http://localhost:${this.config.port}${this.config.prefix || ""}`);
        this.onStatusChangeCallback();
        resolve();
      });
    });
  }
  async stop() {
    if (!this.server || !this.isRunning) {
      this.isRunning = false;
      this.onStatusChangeCallback();
      return;
    }
    return new Promise((resolve) => {
      this.server?.close(() => {
        this.server = void 0;
        this.isRunning = false;
        this.log(`\u26AA Servidor parado (Porta ${this.config.port})`);
        this.onStatusChangeCallback();
        resolve();
      });
    });
  }
  handleRequest(req, res) {
    const startTime = Date.now();
    this.requestCount++;
    const method = (req.method || "GET").toUpperCase();
    const rawUrl = req.url || "/";
    const parsedPath = rawUrl.split("?")[0];
    if (this.config.cors && method === "OPTIONS") {
      this.sendCorsHeaders(res);
      res.writeHead(204);
      res.end();
      this.logRequest(method, parsedPath, 204, Date.now() - startTime);
      return;
    }
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const matched = this.matchRoute(method, parsedPath);
      if (!matched) {
        if (this.config.cors) {
          this.sendCorsHeaders(res);
        }
        const notFoundBody = JSON.stringify(
          {
            error: "Not Found",
            message: `Nenhuma rota mock configurada para [${method}] ${parsedPath}`,
            server: this.config.name,
            port: this.config.port,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          },
          null,
          2
        );
        res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
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
        const headers = { ...response.headers };
        let bodyContent = response.body || "";
        for (const [key, value] of Object.entries(params)) {
          bodyContent = bodyContent.split(`:${key}`).join(value);
          bodyContent = bodyContent.split(`{{${key}}}`).join(value);
        }
        const hasContentType = Object.keys(headers).some(
          (h) => h.toLowerCase() === "content-type"
        );
        if (!hasContentType) {
          const trimmed = bodyContent.trim();
          if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
            headers["Content-Type"] = "application/json; charset=utf-8";
          } else if (trimmed.length > 0) {
            headers["Content-Type"] = "text/plain; charset=utf-8";
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
  matchRoute(reqMethod, reqPath) {
    const serverPrefix = (this.config.prefix || "").trim().replace(/\/+$/, "");
    let normalizedPath = reqPath;
    if (serverPrefix && normalizedPath.startsWith(serverPrefix)) {
      normalizedPath = normalizedPath.substring(serverPrefix.length);
      if (!normalizedPath.startsWith("/")) {
        normalizedPath = "/" + normalizedPath;
      }
    }
    for (const route of this.config.routes) {
      if (route.method.toUpperCase() !== reqMethod) {
        continue;
      }
      const params = this.matchPattern(route.path, normalizedPath);
      if (params !== null) {
        let activeResponse = route.responses.find((r) => r.id === route.activeResponseId);
        if (!activeResponse && route.responses.length > 0) {
          activeResponse = route.responses[0];
        }
        if (!activeResponse) {
          activeResponse = {
            id: "default",
            name: "200 OK",
            statusCode: 200,
            delay: 0,
            headers: { "Content-Type": "application/json" },
            body: "{}"
          };
        }
        return { route, response: activeResponse, params };
      }
    }
    return null;
  }
  matchPattern(routePattern, requestPath) {
    const patternSegments = routePattern.split("/").filter(Boolean);
    const requestSegments = requestPath.split("/").filter(Boolean);
    if (patternSegments.length !== requestSegments.length) {
      return null;
    }
    const params = {};
    for (let i = 0; i < patternSegments.length; i++) {
      const pSeg = patternSegments[i];
      const rSeg = requestSegments[i];
      if (pSeg.startsWith(":")) {
        const paramName = pSeg.slice(1);
        params[paramName] = decodeURIComponent(rSeg);
      } else if (pSeg !== rSeg) {
        return null;
      }
    }
    return params;
  }
  sendCorsHeaders(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  log(message) {
    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    this.outputChannel.appendLine(`[${time}] [${this.config.name}:${this.config.port}] ${message}`);
  }
  logRequest(method, path, statusCode, durationMs) {
    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    const statusEmoji = statusCode >= 200 && statusCode < 300 ? "\u2705" : statusCode >= 400 && statusCode < 500 ? "\u26A0\uFE0F" : "\u274C";
    this.outputChannel.appendLine(
      `[${time}] [:${this.config.port}] ${method.padEnd(6)} ${path} -> ${statusEmoji} ${statusCode} (${durationMs}ms)`
    );
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MockServer
});
