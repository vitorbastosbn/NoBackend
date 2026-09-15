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
        this.log(`[START] Server running at http://localhost:${this.config.port}${this.config.prefix || ""}`);
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
        this.log(`[STOP] Server stopped (Port ${this.config.port})`);
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
    const [parsedPath, ...queryParts] = rawUrl.split("?");
    const queryString = queryParts.join("?");
    const searchParams = new URLSearchParams(queryString);
    if (this.config.cors && method === "OPTIONS") {
      this.sendCorsHeaders(res);
      res.writeHead(204);
      res.end();
      this.logRequest(method, rawUrl, 204, Date.now() - startTime);
      return;
    }
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const incomingBody = Buffer.concat(chunks).toString("utf-8");
      const matchResult = this.matchRoute(method, parsedPath, searchParams, incomingBody, req.headers);
      if (!matchResult.matched) {
        if (this.config.cors) {
          this.sendCorsHeaders(res);
        }
        const isCriteriaFailure = matchResult.pathMatchedButCriteriaFailed;
        const notFoundBody = JSON.stringify(
          {
            error: "Not Found",
            message: isCriteriaFailure ? `Nenhuma rota mock para [${method}] ${parsedPath} correspondeu aos query parameters ou payload enviados.` : `Nenhuma rota mock configurada para [${method}] ${parsedPath}`,
            details: isCriteriaFailure ? {
              method,
              url: rawUrl,
              reason: matchResult.failedReason,
              receivedQueryParams: Object.fromEntries(searchParams.entries()),
              receivedBody: incomingBody ? incomingBody : void 0
            } : void 0,
            server: this.config.name,
            port: this.config.port,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          },
          null,
          2
        );
        if (isCriteriaFailure) {
          this.log(`[WARN] [404] [${method}] ${rawUrl} - ${matchResult.failedReason}`);
        }
        res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
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
        const headers = { ...response.headers };
        let bodyContent = response.body || "";
        for (const [key, value] of Object.entries(params)) {
          bodyContent = bodyContent.split(`:${key}`).join(value);
          bodyContent = bodyContent.split(`{{${key}}}`).join(value);
        }
        for (const [key, value] of searchParams.entries()) {
          bodyContent = bodyContent.split(`{{query.${key}}}`).join(value);
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
        this.logRequest(method, rawUrl, statusCode, duration);
      }, delayMs);
    });
  }
  matchRoute(reqMethod, reqPath, searchParams, incomingBody, headers) {
    const serverPrefix = (this.config.prefix || "").trim().replace(/\/+$/, "");
    let normalizedPath = reqPath;
    if (serverPrefix && normalizedPath.startsWith(serverPrefix)) {
      normalizedPath = normalizedPath.substring(serverPrefix.length);
      if (!normalizedPath.startsWith("/")) {
        normalizedPath = "/" + normalizedPath;
      }
    }
    const candidates = [];
    let pathMatchedCount = 0;
    const failureReasons = [];
    for (const route of this.config.routes) {
      if (route.method.toUpperCase() !== reqMethod) {
        continue;
      }
      const params = this.matchPattern(route.path, normalizedPath);
      if (params === null) {
        continue;
      }
      pathMatchedCount++;
      const qpResult = this.checkQueryParams(route.request?.queryParams, searchParams);
      if (!qpResult.matches) {
        failureReasons.push(`[${route.method} ${route.path}]: ${qpResult.reason}`);
        continue;
      }
      const bodyResult = this.checkBody(route.request?.body, incomingBody);
      if (!bodyResult.matches) {
        failureReasons.push(`[${route.method} ${route.path}]: ${bodyResult.reason}`);
        continue;
      }
      const headerResult = this.checkHeaders(route.request?.headers, headers);
      if (!headerResult.matches) {
        failureReasons.push(`[${route.method} ${route.path}]: ${headerResult.reason}`);
        continue;
      }
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
      candidates.sort((a, b) => b.specificityScore - a.specificityScore);
      const best = candidates[0];
      let activeResponse = best.route.responses.find((r) => r.id === best.route.activeResponseId);
      if (!activeResponse && best.route.responses.length > 0) {
        activeResponse = best.route.responses[0];
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
      failedReason: failureReasons.join(" | ")
    };
  }
  checkQueryParams(expectedParams, actualParams) {
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
          reason: `Query param obrigat\xF3rio "${trimmedKey}" n\xE3o foi enviado na requisi\xE7\xE3o.`
        };
      }
      const trimmedVal = expectedVal.trim();
      if (trimmedVal.length > 0) {
        const actualVal = actualParams.get(trimmedKey) ?? "";
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
  checkBody(expectedBody, actualBody) {
    if (!expectedBody || expectedBody.trim().length === 0) {
      return { matches: true, matchedCount: 0 };
    }
    const trimmedExpected = expectedBody.trim();
    const trimmedActual = actualBody.trim();
    if (trimmedActual.length === 0) {
      return {
        matches: false,
        matchedCount: 0,
        reason: "Payload esperado n\xE3o foi enviado no corpo da requisi\xE7\xE3o."
      };
    }
    let expectedJson;
    let isExpectedJson = false;
    try {
      expectedJson = JSON.parse(trimmedExpected);
      isExpectedJson = true;
    } catch {
      isExpectedJson = false;
    }
    if (isExpectedJson) {
      let actualJson;
      let isActualJson = false;
      try {
        actualJson = JSON.parse(trimmedActual);
        isActualJson = true;
      } catch {
        isActualJson = false;
      }
      if (!isActualJson) {
        try {
          const params = new URLSearchParams(trimmedActual);
          const obj = {};
          let hasKeys = false;
          for (const [k, v] of params.entries()) {
            obj[k] = v;
            hasKeys = true;
          }
          if (hasKeys) {
            actualJson = obj;
            isActualJson = true;
          }
        } catch {
        }
      }
      if (!isActualJson) {
        return {
          matches: false,
          matchedCount: 0,
          reason: "O corpo da requisi\xE7\xE3o n\xE3o \xE9 um JSON v\xE1lido correspondente ao payload esperado."
        };
      }
      const matchRes = this.deepMatches(expectedJson, actualJson);
      if (!matchRes.matches) {
        return {
          matches: false,
          matchedCount: 0,
          reason: matchRes.reason || "O JSON enviado n\xE3o corresponde aos dados esperados."
        };
      }
      return {
        matches: true,
        matchedCount: matchRes.score
      };
    }
    if (trimmedActual === trimmedExpected) {
      return { matches: true, matchedCount: 1 };
    }
    return {
      matches: false,
      matchedCount: 0,
      reason: "O corpo de texto enviado n\xE3o coincide exatamente com o payload esperado."
    };
  }
  deepMatches(expected, actual, path = "") {
    if (expected === null || expected === void 0) {
      const ok = actual === expected;
      return {
        matches: ok,
        score: ok ? 1 : 0,
        reason: ok ? void 0 : `Campo "${path || "raiz"}" esperado ${expected}, mas recebido ${actual}.`
      };
    }
    if (typeof expected !== "object") {
      const exactMatch = expected === actual;
      const looseMatch = typeof actual !== "object" && actual !== null && actual !== void 0 && String(expected).trim() === String(actual).trim();
      const ok = exactMatch || looseMatch;
      return {
        matches: ok,
        score: ok ? 1 : 0,
        reason: ok ? void 0 : `Campo "${path || "raiz"}" esperado "${expected}", mas recebido "${actual}".`
      };
    }
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) {
        return {
          matches: false,
          score: 0,
          reason: `Campo "${path || "raiz"}" deveria ser uma lista (Array).`
        };
      }
      if (expected.length !== actual.length) {
        return {
          matches: false,
          score: 0,
          reason: `Lista "${path || "raiz"}" esperava ${expected.length} itens, mas recebeu ${actual.length}.`
        };
      }
      let totalScore2 = 1;
      for (let i = 0; i < expected.length; i++) {
        const itemRes = this.deepMatches(expected[i], actual[i], `${path}[${i}]`);
        if (!itemRes.matches) {
          return itemRes;
        }
        totalScore2 += itemRes.score;
      }
      return { matches: true, score: totalScore2 };
    }
    if (typeof actual !== "object" || actual === null || Array.isArray(actual)) {
      return {
        matches: false,
        score: 0,
        reason: `Campo "${path || "raiz"}" deveria ser um objeto.`
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
  checkHeaders(expectedHeaders, actualHeaders) {
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
      if (actualVal === void 0) {
        return {
          matches: false,
          matchedCount,
          reason: `Header obrigat\xF3rio "${key}" n\xE3o foi enviado.`
        };
      }
      const trimmedExpected = expectedVal.trim();
      if (trimmedExpected.length > 0) {
        const valStr = Array.isArray(actualVal) ? actualVal.join(", ") : actualVal;
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
  calculateSpecificity(route, params, qpMatchedCount, bodyMatchedCount, headerMatchedCount) {
    let score = 100;
    const segments = route.path.split("/").filter(Boolean);
    for (const seg of segments) {
      if (seg.startsWith(":")) {
        score += 1;
      } else {
        score += 5;
      }
    }
    score += qpMatchedCount * 20;
    score += bodyMatchedCount * 25;
    score += headerMatchedCount * 10;
    return score;
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
    const statusTag = statusCode >= 200 && statusCode < 300 ? "[OK]" : statusCode >= 400 && statusCode < 500 ? "[WARN]" : "[ERROR]";
    this.outputChannel.appendLine(
      `[${time}] [:${this.config.port}] ${method.padEnd(6)} ${path} -> ${statusTag} ${statusCode} (${durationMs}ms)`
    );
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MockServer
});
