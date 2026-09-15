// Acquire VS Code API
const vscode = acquireVsCodeApi();

// Localization helper
const i18n = (typeof window !== 'undefined' && window.NOBACKEND_I18N) ? window.NOBACKEND_I18N : {};
function t(key, fallback) {
  return (i18n && i18n[key]) ? i18n[key] : (fallback || '');
}

const HTTP_STATUS_DESCRIPTIONS = {
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

function getStatusDescription(code) {
  return HTTP_STATUS_DESCRIPTIONS[code] || '';
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Application State
let state = {
  config: { version: '1.0.0', servers: [] },
  statusList: [],
  selectedServerId: null,
  selectedRouteId: null,
  selectedResponseId: null,
  activeEditorTab: 'responses', // 'request' | 'responses'
  viewMode: 'server', // 'server' (routes + editor) or 'route' (editor only)
  isDirty: false,
  // Component internal row models allowing multiple empty entries
  responseHeadersList: [],
  requestHeadersList: [],
  queryParamsList: []
};

// DOM Elements cache
const el = {
  // Top bar
  topBar: document.querySelector('.top-bar'),
  topServerBadge: document.getElementById('top-server-badge'),
  saveStatusIndicator: document.getElementById('save-status-indicator'),
  saveStatusText: document.getElementById('save-status-text'),
  btnSaveAll: document.getElementById('btn-save-all'),

  // Layout & Columns
  mainLayout: document.getElementById('main-layout'),

  // New Server Screen
  newServerScreen: document.getElementById('new-server-screen'),
  modalServerName: document.getElementById('modal-server-name'),
  modalServerPort: document.getElementById('modal-server-port'),
  modalServerPrefix: document.getElementById('modal-server-prefix'),
  modalServerCors: document.getElementById('modal-server-cors'),
  btnModalCancel: document.getElementById('btn-modal-cancel'),
  btnModalSave: document.getElementById('btn-modal-save'),

  // Editor Column
  editorEmpty: document.getElementById('editor-empty'),
  editorContent: document.getElementById('editor-content'),
  routeMethodSelect: document.getElementById('route-method-select'),
  routePathInput: document.getElementById('route-path-input'),
  routePrefixDisplay: document.getElementById('route-prefix-display'),
  btnCopyUrl: document.getElementById('btn-copy-url'),
  btnCopyCurl: document.getElementById('btn-copy-curl'),

  // Navigation: Request vs Responses
  tabNavRequest: document.getElementById('tab-nav-request'),
  tabNavResponses: document.getElementById('tab-nav-responses'),
  navResponsesBadge: document.getElementById('nav-responses-badge'),
  urlPreviewText: document.getElementById('url-preview-text'),

  // Section: Request
  sectionRequest: document.getElementById('section-request'),
  pathParamsContainer: document.getElementById('path-params-container'),
  pathParamsList: document.getElementById('path-params-list'),
  reqQueryHead: document.getElementById('req-query-head'),
  reqQueryBody: document.getElementById('req-query-body'),
  reqQueryCount: document.getElementById('req-query-count'),
  reqQueryContainer: document.getElementById('req-query-container'),
  btnAddQueryParam: document.getElementById('btn-add-query-param'),
  reqHeadersHead: document.getElementById('req-headers-head'),
  reqHeadersBody: document.getElementById('req-headers-body'),
  reqHeadersCount: document.getElementById('req-headers-count'),
  reqHeadersContainer: document.getElementById('req-headers-container'),
  btnAddReqHeader: document.getElementById('btn-add-req-header'),
  reqBodyTextarea: document.getElementById('req-body-textarea'),
  reqJsonValidIndicator: document.getElementById('req-json-valid-indicator'),
  btnFormatReqJson: document.getElementById('btn-format-req-json'),
  btnTemplateReqObject: document.getElementById('btn-template-req-object'),
  btnClearReqBody: document.getElementById('btn-clear-req-body'),

  // Section: Responses
  sectionResponses: document.getElementById('section-responses'),
  btnAddResponse: document.getElementById('btn-add-response'),
  responsesTabs: document.getElementById('responses-tabs'),
  respNameInput: document.getElementById('resp-name-input'),
  btnSetActiveResp: document.getElementById('btn-set-active-resp'),
  btnDuplicateResponse: document.getElementById('btn-duplicate-response'),
  btnDeleteResponse: document.getElementById('btn-delete-response'),
  respStatusQuick: document.getElementById('resp-status-quick'),
  respStatusCode: document.getElementById('resp-status-code'),
  respDelayInput: document.getElementById('resp-delay-input'),
  quickDelayBtns: document.querySelectorAll('.btn-pill[data-delay]'),

  // Headers (Response)
  headersHead: document.getElementById('headers-head'),
  headersBody: document.getElementById('headers-body'),
  headersCount: document.getElementById('headers-count'),
  headersListContainer: document.getElementById('headers-list-container'),
  btnAddHeader: document.getElementById('btn-add-header'),

  // Body (Response)
  jsonValidIndicator: document.getElementById('json-valid-indicator'),
  btnFormatJson: document.getElementById('btn-format-json'),
  btnTemplateArray: document.getElementById('btn-template-array'),
  btnTemplateObject: document.getElementById('btn-template-object'),
  btnClearRespBody: document.getElementById('btn-clear-resp-body'),
  respBodyTextarea: document.getElementById('resp-body-textarea')
};

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  applyTranslations();
  vscode.postMessage({ type: 'ready' });
});

// Handle incoming messages from Extension Host
window.addEventListener('message', (event) => {
  const msg = event.data;
  switch (msg.type) {
    case 'initData':
      state.config = msg.config;
      state.statusList = msg.statusList || [];
      state.viewMode = msg.viewMode || 'server';

      if (state.config.servers.length > 0) {
        state.selectedServerId = msg.initialServerId || state.config.servers[0].id;
        const currentServer = state.config.servers.find((s) => s.id === state.selectedServerId);
        if (currentServer && currentServer.routes.length > 0) {
          state.selectedRouteId = msg.initialRouteId || currentServer.routes[0].id;
          const currentRoute = currentServer.routes.find((r) => r.id === state.selectedRouteId);
          state.selectedResponseId = currentRoute ? currentRoute.activeResponseId : currentServer.routes[0].activeResponseId;
        }
      }
      applyViewMode();
      applyTranslations();
      renderAll();

      if (msg.openNewServerModal || msg.openNewServerScreen) {
        openNewServerScreen();
      }
      if (msg.isNewRoute) {
        focusRoutePathInput();
      }
      break;

    case 'newRouteCreated':
      focusRoutePathInput();
      break;

    case 'openNewServerModal':
    case 'openNewServerScreen':
      openNewServerScreen();
      break;

    case 'configUpdated':
      state.config = msg.config;
      if (msg.statusList) {
        state.statusList = msg.statusList;
      }
      const activeSrv = getSelectedServer();
      if (activeSrv && activeSrv.routes && !activeSrv.routes.some((r) => r.id === state.selectedRouteId)) {
        state.selectedRouteId = activeSrv.routes.length > 0 ? activeSrv.routes[0].id : null;
        state.selectedResponseId = activeSrv.routes[0] ? (activeSrv.routes[0].activeResponseId || (activeSrv.routes[0].responses[0] ? activeSrv.routes[0].responses[0].id : null)) : null;
      }
      renderAll();
      break;

    case 'statusUpdated':
      state.statusList = msg.statusList || [];
      renderHeader();
      break;

    case 'selectTarget':
      if (msg.serverId) {
        state.selectedServerId = msg.serverId;
      }
      if (msg.routeId) {
        state.selectedRouteId = msg.routeId;
        const currentServer = state.config.servers.find((s) => s.id === state.selectedServerId);
        if (currentServer) {
          const currentRoute = currentServer.routes.find((r) => r.id === msg.routeId);
          if (currentRoute) {
            state.selectedResponseId = currentRoute.activeResponseId || (currentRoute.responses[0] ? currentRoute.responses[0].id : null);
          }
        }
      }
      if (msg.viewMode) {
        state.viewMode = msg.viewMode;
      }
      applyViewMode();
      renderAll();
      break;

    case 'saveSuccess':
      state.isDirty = false;
      updateSaveIndicator();
      showTransientToast(t('configSaved', 'Configurações salvas com sucesso!'));
      break;
  }
});

function applyViewMode() {
  if (state.viewMode === 'route') {
    el.mainLayout.classList.add('route-only');
  } else {
    el.mainLayout.classList.remove('route-only');
  }
}

function focusRoutePathInput() {
  setTimeout(() => {
    if (el.routePathInput) {
      el.routePathInput.focus();
      el.routePathInput.select();
    }
  }, 100);
}

function updatePanelTitle(route) {
  if (!route) return;
  vscode.postMessage({
    type: 'updateTitle',
    title: `${route.method} ${route.path}`
  });
}

// Setup Events
function setupEventListeners() {
  // New Server Screen events
  if (el.btnModalCancel) {
    el.btnModalCancel.addEventListener('click', () => {
      vscode.postMessage({ type: 'closeScreen' });
    });
  }
  if (el.btnModalSave) {
    el.btnModalSave.addEventListener('click', () => handleSaveServerScreen());
  }

  const modalInputs = [el.modalServerName, el.modalServerPort, el.modalServerPrefix];
  modalInputs.forEach((inp) => {
    if (inp) {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSaveServerScreen();
        }
      });
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.newServerScreen && !el.newServerScreen.classList.contains('hidden')) {
      vscode.postMessage({ type: 'closeScreen' });
    }
  });

  if (el.btnAddRoute) {
    el.btnAddRoute.addEventListener('click', () => handleAddRoute());
  }

  // Save manual button (NO auto-save!)
  if (el.btnSaveAll) {
    el.btnSaveAll.addEventListener('click', () => saveConfig());
  }

  // Keyboard shortcut Ctrl+S / Cmd+S
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveConfig();
    }
  });

  // Filter
  if (el.inputRouteFilter) {
    el.inputRouteFilter.addEventListener('input', (e) => {
      state.filterQuery = e.target.value.toLowerCase();
      renderRoutesList();
    });
  }

  // Editor route fields
  el.routeMethodSelect.addEventListener('change', (e) => {
    const route = getSelectedRoute();
    if (route) {
      route.method = e.target.value;
      updatePanelTitle(route);
      renderRoutesList();
      updateUrlPreview();
      markDirty();
    }
  });

  el.routePathInput.addEventListener('input', (e) => {
    const route = getSelectedRoute();
    if (route) {
      let pathVal = e.target.value.trim();
      if (pathVal && !pathVal.startsWith('/')) {
        pathVal = '/' + pathVal;
      }
      route.path = pathVal;
      updatePanelTitle(route);
      renderRoutesList();
      updatePathParameters(pathVal);
      updateUrlPreview();
      markDirty();
    }
  });

  // Copy Full URL
  el.btnCopyUrl.addEventListener('click', () => {
    const fullUrl = getFullUrl();
    if (fullUrl) {
      vscode.postMessage({ type: 'copyToClipboard', text: fullUrl });
    }
  });

  // Copy cURL
  if (el.btnCopyCurl) {
    el.btnCopyCurl.addEventListener('click', () => {
      const route = getSelectedRoute();
      const url = getFullUrl();
      if (!route || !url) return;

      let curl = `curl -X ${route.method} "${url}"`;

      // Include headers from Request spec if any
      const reqHeaders = (route.request && route.request.headers) ? route.request.headers : {};
      Object.entries(reqHeaders).forEach(([k, v]) => {
        if (k.trim()) {
          curl += ` \\\n  -H "${k}: ${v}"`;
        }
      });

      // Include body from Request spec if method sends payload
      if (['POST', 'PUT', 'PATCH'].includes(route.method) && route.request && route.request.body && route.request.body.trim()) {
        const bodyEscaped = route.request.body.replace(/"/g, '\\"');
        curl += ` \\\n  -d "${bodyEscaped}"`;
      }

      vscode.postMessage({ type: 'copyToClipboard', text: curl });
    });
  }



  // Mode Switcher: Request vs Responses
  if (el.tabNavRequest) {
    el.tabNavRequest.addEventListener('click', () => {
      switchEditorTab('request');
    });
  }
  if (el.tabNavResponses) {
    el.tabNavResponses.addEventListener('click', () => {
      switchEditorTab('responses');
    });
  }

  // ===================== SECTION: REQUEST EVENTS =====================
  if (el.reqQueryHead) {
    el.reqQueryHead.addEventListener('click', () => {
      el.reqQueryHead.classList.toggle('collapsed');
      el.reqQueryBody.classList.toggle('collapsed');
    });
  }
  if (el.btnAddQueryParam) {
    el.btnAddQueryParam.addEventListener('click', () => {
      state.queryParamsList.push({ id: 'qp_' + Date.now() + Math.random(), key: '', value: '' });
      renderQueryParams();
      markDirty();
      focusLastRowInput(el.reqQueryContainer);
    });
  }

  if (el.reqHeadersHead) {
    el.reqHeadersHead.addEventListener('click', () => {
      el.reqHeadersHead.classList.toggle('collapsed');
      el.reqHeadersBody.classList.toggle('collapsed');
    });
  }
  if (el.btnAddReqHeader) {
    el.btnAddReqHeader.addEventListener('click', () => {
      state.requestHeadersList.push({ id: 'rh_' + Date.now() + Math.random(), key: '', value: '' });
      renderRequestHeaders();
      markDirty();
      focusLastRowInput(el.reqHeadersContainer);
    });
  }

  if (el.reqBodyTextarea) {
    el.reqBodyTextarea.addEventListener('input', (e) => {
      const route = getSelectedRoute();
      if (route) {
        route.request = route.request || {};
        route.request.body = e.target.value;
        validateJson(e.target.value, el.reqJsonValidIndicator);
        markDirty();
      }
    });
  }

  if (el.btnFormatReqJson) {
    el.btnFormatReqJson.addEventListener('click', () => {
      const val = el.reqBodyTextarea.value.trim();
      if (!val) return;
      try {
        const parsed = JSON.parse(val);
        const formatted = JSON.stringify(parsed, null, 2);
        el.reqBodyTextarea.value = formatted;
        const route = getSelectedRoute();
        if (route) {
          route.request = route.request || {};
          route.request.body = formatted;
          validateJson(formatted, el.reqJsonValidIndicator);
          markDirty();
        }
      } catch {
        vscode.postMessage({ type: 'notify', level: 'warning', text: t('formatError', 'Não foi possível formatar: JSON contém erros de sintaxe.') });
      }
    });
  }

  if (el.btnTemplateReqObject) {
    el.btnTemplateReqObject.addEventListener('click', () => {
      const sample = JSON.stringify({
        name: "John Doe",
        email: "john.doe@example.com",
        role: "developer"
      }, null, 2);
      el.reqBodyTextarea.value = sample;
      const route = getSelectedRoute();
      if (route) {
        route.request = route.request || {};
        route.request.body = sample;
        validateJson(sample, el.reqJsonValidIndicator);
        markDirty();
      }
    });
  }

  if (el.btnClearReqBody) {
    el.btnClearReqBody.addEventListener('click', () => {
      el.reqBodyTextarea.value = '';
      const route = getSelectedRoute();
      if (route) {
        route.request = route.request || {};
        route.request.body = '';
        validateJson('', el.reqJsonValidIndicator);
        markDirty();
      }
    });
  }

  // ===================== SECTION: RESPONSES EVENTS =====================
  el.btnAddResponse.addEventListener('click', () => handleAddResponse());

  if (el.btnDuplicateResponse) {
    el.btnDuplicateResponse.addEventListener('click', () => handleDuplicateResponse());
  }

  el.respNameInput.addEventListener('input', (e) => {
    const resp = getSelectedResponse();
    if (resp) {
      resp.name = e.target.value;
      renderResponsesTabs();
      markDirty();
    }
  });

  // Star favorite toggle
  el.btnSetActiveResp.addEventListener('click', () => {
    const route = getSelectedRoute();
    if (route && state.selectedResponseId) {
      route.activeResponseId = state.selectedResponseId;
      renderStarButton();
      renderResponsesTabs();
      renderRoutesList();
      markDirty();
    }
  });

  el.btnDeleteResponse.addEventListener('click', () => {
    const route = getSelectedRoute();
    if (route && route.responses.length > 1) {
      route.responses = route.responses.filter((r) => r.id !== state.selectedResponseId);
      state.selectedResponseId = route.responses[0].id;
      if (route.activeResponseId === state.selectedResponseId) {
        route.activeResponseId = route.responses[0].id;
      }
      renderResponsesTabs();
      renderResponseDetails();
      renderRoutesList();
      markDirty();
    } else {
      vscode.postMessage({ type: 'notify', level: 'warning', text: 'A rota precisa de pelo menos uma resposta configurada.' });
    }
  });

  // Status code dropdown + input
  if (el.respStatusQuick) {
    el.respStatusQuick.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        el.respStatusCode.classList.remove('hidden');
        el.respStatusCode.focus();
        el.respStatusCode.select();
        const code = parseInt(el.respStatusCode.value, 10);
        if (code && !isNaN(code)) {
          updateStatusCode(code, false);
        }
      } else {
        el.respStatusCode.classList.add('hidden');
        const code = parseInt(e.target.value, 10);
        el.respStatusCode.value = code;
        updateStatusCode(code, true);
      }
    });
  }

  if (el.respStatusCode) {
    el.respStatusCode.addEventListener('input', (e) => {
      const code = parseInt(e.target.value, 10);
      if (!isNaN(code) && code >= 100 && code <= 599) {
        updateStatusCode(code, false);
      }
    });
  }

  // Latency / Delay
  el.respDelayInput.addEventListener('input', (e) => {
    const resp = getSelectedResponse();
    if (resp) {
      resp.delay = Math.max(0, parseInt(e.target.value, 10) || 0);
      highlightActiveDelay(resp.delay);
      markDirty();
    }
  });

  el.quickDelayBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const delay = parseInt(btn.getAttribute('data-delay'), 10) || 0;
      el.respDelayInput.value = delay;
      const resp = getSelectedResponse();
      if (resp) {
        resp.delay = delay;
        highlightActiveDelay(delay);
        markDirty();
      }
    });
  });

  // Response Headers
  el.headersHead.addEventListener('click', () => {
    el.headersHead.classList.toggle('collapsed');
    el.headersBody.classList.toggle('collapsed');
  });

  el.btnAddHeader.addEventListener('click', () => {
    state.responseHeadersList.push({ id: 'rh_' + Date.now() + Math.random(), key: '', value: '' });
    renderHeaders();
    markDirty();
    focusLastRowInput(el.headersListContainer);
  });

  // Response Body editor
  el.respBodyTextarea.addEventListener('input', (e) => {
    const resp = getSelectedResponse();
    if (resp) {
      resp.body = e.target.value;
      validateJson(e.target.value, el.jsonValidIndicator);
      markDirty();
    }
  });

  el.btnFormatJson.addEventListener('click', () => {
    const val = el.respBodyTextarea.value.trim();
    if (!val) return;
    try {
      const parsed = JSON.parse(val);
      const formatted = JSON.stringify(parsed, null, 2);
      el.respBodyTextarea.value = formatted;
      const resp = getSelectedResponse();
      if (resp) {
        resp.body = formatted;
        validateJson(formatted, el.jsonValidIndicator);
        markDirty();
      }
    } catch {
      vscode.postMessage({ type: 'notify', level: 'warning', text: t('formatError', 'Não foi possível formatar: JSON contém erros de sintaxe.') });
    }
  });

  el.btnTemplateArray.addEventListener('click', () => {
    const sample = JSON.stringify([
      { id: 1, name: "Example Item A", active: true },
      { id: 2, name: "Example Item B", active: false }
    ], null, 2);
    setBodyTemplate(sample);
  });

  el.btnTemplateObject.addEventListener('click', () => {
    const sample = JSON.stringify({
      id: 1,
      message: "Operation executed successfully",
      timestamp: new Date().toISOString()
    }, null, 2);
    setBodyTemplate(sample);
  });

  if (el.btnClearRespBody) {
    el.btnClearRespBody.addEventListener('click', () => {
      setBodyTemplate('');
    });
  }
}

function switchEditorTab(tabName) {
  state.activeEditorTab = tabName;
  if (tabName === 'request') {
    el.tabNavRequest.classList.add('active');
    el.tabNavResponses.classList.remove('active');
    el.sectionRequest.classList.remove('hidden');
    el.sectionResponses.classList.add('hidden');
    renderRequestSection();
  } else {
    el.tabNavResponses.classList.add('active');
    el.tabNavRequest.classList.remove('active');
    el.sectionResponses.classList.remove('hidden');
    el.sectionRequest.classList.add('hidden');
    renderResponsesTabs();
    renderResponseDetails();
  }
}

function updateStatusCode(code, syncSelect = true) {
  const resp = getSelectedResponse();
  if (resp) {
    resp.statusCode = code;
    if (syncSelect) {
      const opt = el.respStatusQuick.querySelector(`option[value="${code}"]`);
      if (opt) {
        el.respStatusQuick.value = String(code);
        el.respStatusCode.classList.add('hidden');
      } else {
        el.respStatusQuick.value = 'custom';
        el.respStatusCode.classList.remove('hidden');
      }
    }
    renderResponsesTabs();
    renderRoutesList();
    markDirty();
  }
}

function highlightActiveDelay(delay) {
  if (!el.quickDelayBtns) return;
  el.quickDelayBtns.forEach((btn) => {
    const d = parseInt(btn.getAttribute('data-delay'), 10);
    if (d === delay) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function setBodyTemplate(sample) {
  el.respBodyTextarea.value = sample;
  const resp = getSelectedResponse();
  if (resp) {
    resp.body = sample;
    validateJson(sample, el.jsonValidIndicator);
    markDirty();
  }
}

function validateJson(text, indicatorEl) {
  if (!indicatorEl) return;
  const trimmed = (text || '').trim();
  if (!trimmed) {
    indicatorEl.textContent = t('empty', 'Vazio');
    indicatorEl.className = 'valid-tag';
    return;
  }
  try {
    JSON.parse(trimmed);
    indicatorEl.textContent = t('validJson', 'JSON Válido');
    indicatorEl.className = 'valid-tag valid';
  } catch (err) {
    indicatorEl.textContent = t('invalidJson', 'JSON Inválido');
    indicatorEl.className = 'valid-tag invalid';
  }
}

// Rendering
function renderAll() {
  renderHeader();
  renderRoutesList();
  renderEditor();
  updateSaveIndicator();
}

function renderHeader() {
  const server = getSelectedServer();
  if (!server) {
    if (el.topServerBadge) el.topServerBadge.textContent = t('noServer', 'Nenhum servidor');
    return;
  }

  if (el.topServerBadge) {
    el.topServerBadge.innerHTML = `${escapeHtml(server.name)} <span class="badge-port">:${server.port}</span>`;
  }

  if (el.routesColTitle) {
    el.routesColTitle.textContent = server.name;
  }
}

function renderRoutesList() {
  if (!el.routesList) return;
  const server = getSelectedServer();
  el.routesList.innerHTML = '';

  if (!server) {
    el.routesCountBadge.textContent = '0';
    return;
  }

  const routes = server.routes || [];
  el.routesCountBadge.textContent = routes.length.toString();

  const filteredRoutes = routes.filter((r) => {
    if (!state.filterQuery) return true;
    return r.path.toLowerCase().includes(state.filterQuery) || r.method.toLowerCase().includes(state.filterQuery);
  });

  filteredRoutes.forEach((route) => {
    const isSelected = route.id === state.selectedRouteId;
    const activeResp = route.responses.find((r) => r.id === route.activeResponseId) || route.responses[0];
    const statusCode = activeResp ? activeResp.statusCode : 200;
    const statusText = getStatusDescription(statusCode);

    let statusClass = 's2xx';
    if (statusCode >= 300 && statusCode < 400) statusClass = 's3xx';
    else if (statusCode >= 400 && statusCode < 500) statusClass = 's4xx';
    else if (statusCode >= 500) statusClass = 's5xx';

    const card = document.createElement('div');
    card.className = `route-card ${isSelected ? 'active' : ''}`;
    card.innerHTML = `
      <div class="route-card-left">
        <span class="route-method-name ${route.method}">${route.method}</span>
        <span class="route-path-text" title="${escapeHtml(route.path)}">${escapeHtml(route.path)}</span>
      </div>
      <span class="status-pill ${statusClass}">${statusCode} ${statusText}</span>
    `;

    card.addEventListener('click', () => {
      syncCurrentListsToModel();
      state.selectedRouteId = route.id;
      state.selectedResponseId = route.activeResponseId || (route.responses[0] && route.responses[0].id);
      renderRoutesList();
      renderEditor();
    });

    el.routesList.appendChild(card);
  });
}

function renderEditor() {
  const server = getSelectedServer();
  const route = getSelectedRoute();

  if (!server || !route) {
    el.editorEmpty.classList.remove('hidden');
    el.editorContent.classList.add('hidden');
    return;
  }

  el.editorEmpty.classList.add('hidden');
  el.editorContent.classList.remove('hidden');

  vscode.postMessage({
    type: 'routeSelected',
    routeId: route.id,
    serverId: server.id
  });

  // Set route metadata
  el.routeMethodSelect.value = route.method;
  el.routePathInput.value = route.path;
  el.routePrefixDisplay.textContent = server.prefix ? server.prefix : ': ' + server.port;

  updateUrlPreview();
  updatePathParameters(route.path);

  // Initialize request & response models
  route.request = route.request || { headers: {}, queryParams: {}, body: '' };

  state.requestHeadersList = Object.entries(route.request.headers || {}).map(([k, v], i) => ({
    id: 'req_h_' + i + '_' + Date.now(),
    key: k,
    value: v
  }));

  state.queryParamsList = Object.entries(route.request.queryParams || {}).map(([k, v], i) => ({
    id: 'qp_' + i + '_' + Date.now(),
    key: k,
    value: v
  }));

  const resp = getSelectedResponse();
  if (resp) {
    state.responseHeadersList = Object.entries(resp.headers || {}).map(([k, v], i) => ({
      id: 'rh_' + i + '_' + Date.now(),
      key: k,
      value: v
    }));
  } else {
    state.responseHeadersList = [];
  }

  // Render current tab
  if (state.activeEditorTab === 'request') {
    switchEditorTab('request');
  } else {
    switchEditorTab('responses');
  }
}

// Render Section: REQUEST
function renderRequestSection() {
  const route = getSelectedRoute();
  if (!route) return;

  route.request = route.request || { headers: {}, queryParams: {}, body: '' };

  renderQueryParams();
  renderRequestHeaders();

  if (el.reqBodyTextarea) {
    el.reqBodyTextarea.value = route.request.body || '';
    validateJson(route.request.body || '', el.reqJsonValidIndicator);
  }
}

function renderQueryParams() {
  if (!el.reqQueryContainer || !el.reqQueryCount) return;

  el.reqQueryCount.textContent = state.queryParamsList.length.toString();
  el.reqQueryContainer.innerHTML = '';

  state.queryParamsList.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'header-row';
    row.innerHTML = `
      <input type="text" class="hdr-key" value="${escapeHtml(item.key)}" placeholder="Parâmetro (ex: limit, page, filter)" />
      <input type="text" class="hdr-val" value="${escapeHtml(item.value)}" placeholder="Valor ou exemplo (ex: 10)" />
      <button class="btn-icon btn-del-hdr" title="Remover parâmetro">
        <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    const keyInput = row.querySelector('.hdr-key');
    const valInput = row.querySelector('.hdr-val');
    const delBtn = row.querySelector('.btn-del-hdr');

    keyInput.addEventListener('input', (e) => {
      item.key = e.target.value;
      syncQueryParamsToModel();
      markDirty();
    });

    valInput.addEventListener('input', (e) => {
      item.value = e.target.value;
      syncQueryParamsToModel();
      markDirty();
    });

    delBtn.addEventListener('click', () => {
      state.queryParamsList = state.queryParamsList.filter((x) => x.id !== item.id);
      syncQueryParamsToModel();
      renderQueryParams();
      markDirty();
    });

    el.reqQueryContainer.appendChild(row);
  });
}

function renderRequestHeaders() {
  if (!el.reqHeadersContainer || !el.reqHeadersCount) return;

  el.reqHeadersCount.textContent = state.requestHeadersList.length.toString();
  el.reqHeadersContainer.innerHTML = '';

  state.requestHeadersList.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'header-row';
    row.innerHTML = `
      <input type="text" class="hdr-key" value="${escapeHtml(item.key)}" placeholder="Header (ex: Authorization, Content-Type)" />
      <input type="text" class="hdr-val" value="${escapeHtml(item.value)}" placeholder="Valor (ex: Bearer token123)" />
      <button class="btn-icon btn-del-hdr" title="Remover header">
        <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    const keyInput = row.querySelector('.hdr-key');
    const valInput = row.querySelector('.hdr-val');
    const delBtn = row.querySelector('.btn-del-hdr');

    keyInput.addEventListener('input', (e) => {
      item.key = e.target.value;
      syncRequestHeadersToModel();
      markDirty();
    });

    valInput.addEventListener('input', (e) => {
      item.value = e.target.value;
      syncRequestHeadersToModel();
      markDirty();
    });

    delBtn.addEventListener('click', () => {
      state.requestHeadersList = state.requestHeadersList.filter((x) => x.id !== item.id);
      syncRequestHeadersToModel();
      renderRequestHeaders();
      markDirty();
    });

    el.reqHeadersContainer.appendChild(row);
  });
}

// Render Section: RESPONSES
function renderResponsesTabs() {
  const route = getSelectedRoute();
  if (!route) return;

  el.responsesTabs.innerHTML = '';

  if (!state.selectedResponseId && route.responses.length > 0) {
    state.selectedResponseId = route.activeResponseId || route.responses[0].id;
  }

  if (el.navResponsesBadge) {
    el.navResponsesBadge.textContent = route.responses.length.toString();
  }

  route.responses.forEach((resp) => {
    const isActive = resp.id === route.activeResponseId;
    const isSelected = resp.id === state.selectedResponseId;
    const statusDesc = getStatusDescription(resp.statusCode);

    let statusClass = 's2xx';
    if (resp.statusCode >= 300 && resp.statusCode < 400) statusClass = 's3xx';
    else if (resp.statusCode >= 400 && resp.statusCode < 500) statusClass = 's4xx';
    else if (resp.statusCode >= 500) statusClass = 's5xx';

    // Intelligently strip leading status code from name if user wrote e.g. "200 Sucesso" or "200 OK"
    let cleanName = (resp.name || '').trim();
    const codePrefixRegex = new RegExp(`^${resp.statusCode}\\s*[-:]?\\s*`, 'i');
    cleanName = cleanName.replace(codePrefixRegex, '').trim();
    if (!cleanName) {
      cleanName = statusDesc || 'Resposta';
    }

    const tab = document.createElement('div');
    tab.className = `resp-tab ${isSelected ? 'active' : ''}`;
    tab.innerHTML = `
      <span class="tab-status-pill ${statusClass}">${resp.statusCode}</span>
      <span class="tab-label-text">${escapeHtml(cleanName)}</span>
      ${isActive ? '<span class="tab-star-indicator" title="Resposta Ativa">★</span>' : ''}
    `;

    tab.addEventListener('click', () => {
      syncResponseHeadersToModel();
      state.selectedResponseId = resp.id;
      const r = getSelectedResponse();
      if (r) {
        state.responseHeadersList = Object.entries(r.headers || {}).map(([k, v], i) => ({
          id: 'rh_' + i + '_' + Date.now(),
          key: k,
          value: v
        }));
      }
      renderResponsesTabs();
      renderResponseDetails();
    });

    el.responsesTabs.appendChild(tab);
  });
}

function renderResponseDetails() {
  const route = getSelectedRoute();
  const resp = getSelectedResponse();
  if (!route || !resp) return;

  // Set name (clean display without repeated status code)
  let cleanName = (resp.name || '').trim();
  const codePrefixRegex = new RegExp(`^${resp.statusCode}\\s*[-:]?\\s*`, 'i');
  cleanName = cleanName.replace(codePrefixRegex, '').trim();
  el.respNameInput.value = cleanName;

  const statusCode = resp.statusCode || 200;
  el.respStatusCode.value = statusCode;

  // Set quick dropdown and toggle manual input
  const opt = el.respStatusQuick.querySelector(`option[value="${statusCode}"]`);
  if (opt) {
    el.respStatusQuick.value = String(statusCode);
    el.respStatusCode.classList.add('hidden');
  } else {
    el.respStatusQuick.value = 'custom';
    el.respStatusCode.classList.remove('hidden');
  }

  el.respDelayInput.value = resp.delay || 0;
  highlightActiveDelay(resp.delay || 0);

  el.respBodyTextarea.value = resp.body || '';

  renderStarButton();
  validateJson(resp.body || '', el.jsonValidIndicator);
  renderHeaders();
}

function renderStarButton() {
  const route = getSelectedRoute();
  const resp = getSelectedResponse();
  if (!route || !resp || !el.btnSetActiveResp) return;

  const isActive = resp.id === route.activeResponseId;
  if (isActive) {
    el.btnSetActiveResp.className = 'btn-icon btn-star-favorite active';
    el.btnSetActiveResp.title = 'Resposta padrão ativa (favoritada)';
    el.btnSetActiveResp.innerHTML = `
      <svg class="icon-svg star-icon active" width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    `;
  } else {
    el.btnSetActiveResp.className = 'btn-icon btn-star-favorite';
    el.btnSetActiveResp.title = 'Favoritar / Definir como resposta ativa';
    el.btnSetActiveResp.innerHTML = `
      <svg class="icon-svg star-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    `;
  }
}

function renderHeaders() {
  const resp = getSelectedResponse();
  if (!resp) return;

  el.headersCount.textContent = state.responseHeadersList.length.toString();
  el.headersListContainer.innerHTML = '';

  state.responseHeadersList.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'header-row';
    row.innerHTML = `
      <input type="text" class="hdr-key" value="${escapeHtml(item.key)}" placeholder="Header (ex: Content-Type, Cache-Control)" />
      <input type="text" class="hdr-val" value="${escapeHtml(item.value)}" placeholder="Valor (ex: application/json)" />
      <button class="btn-icon btn-del-hdr" title="Remover header">
        <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    const keyInput = row.querySelector('.hdr-key');
    const valInput = row.querySelector('.hdr-val');
    const delBtn = row.querySelector('.btn-del-hdr');

    keyInput.addEventListener('input', (e) => {
      item.key = e.target.value;
      syncResponseHeadersToModel();
      markDirty();
    });

    valInput.addEventListener('input', (e) => {
      item.value = e.target.value;
      syncResponseHeadersToModel();
      markDirty();
    });

    delBtn.addEventListener('click', () => {
      state.responseHeadersList = state.responseHeadersList.filter((x) => x.id !== item.id);
      syncResponseHeadersToModel();
      renderHeaders();
      markDirty();
    });

    el.headersListContainer.appendChild(row);
  });
}

function focusLastRowInput(containerEl) {
  if (!containerEl) return;
  setTimeout(() => {
    const rows = containerEl.querySelectorAll('.header-row');
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const keyInput = lastRow.querySelector('.hdr-key');
      if (keyInput) {
        keyInput.focus();
      }
    }
  }, 50);
}

// Helpers
function getSelectedServer() {
  return state.config.servers.find((s) => s.id === state.selectedServerId);
}

function getSelectedRoute() {
  const srv = getSelectedServer();
  if (!srv) return null;
  return srv.routes.find((r) => r.id === state.selectedRouteId);
}

function getSelectedResponse() {
  const route = getSelectedRoute();
  if (!route) return null;
  return route.responses.find((r) => r.id === state.selectedResponseId) || route.responses[0];
}

function getFullUrl() {
  const srv = getSelectedServer();
  const route = getSelectedRoute();
  if (!srv || !route) return '';
  const prefix = (srv.prefix || '').trim().replace(/\/+$/, '');
  let rPath = (route.path || '').trim();
  if (!rPath.startsWith('/')) {
    rPath = '/' + rPath;
  }
  return `http://localhost:${srv.port}${prefix}${rPath}`;
}

function updateUrlPreview() {
  if (el.urlPreviewText) {
    el.urlPreviewText.textContent = getFullUrl();
  }
}

function updatePathParameters(path) {
  if (!el.pathParamsContainer || !el.pathParamsList) return;
  const matches = (path || '').match(/:([a-zA-Z0-9_]+)/g);
  if (matches && matches.length > 0) {
    el.pathParamsContainer.classList.remove('hidden');
    el.pathParamsList.innerHTML = '';
    const uniqueParams = [...new Set(matches)];
    uniqueParams.forEach((param) => {
      const badge = document.createElement('span');
      badge.className = 'param-badge';
      badge.textContent = param;
      badge.title = `Parâmetro de URL '${param}' disponível para interpolação nos mocks`;
      el.pathParamsList.appendChild(badge);
    });
  } else {
    el.pathParamsContainer.classList.add('hidden');
    el.pathParamsList.innerHTML = '';
  }
}

function syncResponseHeadersToModel() {
  const resp = getSelectedResponse();
  if (!resp) return;
  const map = {};
  state.responseHeadersList.forEach((item) => {
    const k = (item.key || '').trim();
    if (k) {
      map[k] = item.value || '';
    }
  });
  resp.headers = map;
}

function syncRequestHeadersToModel() {
  const route = getSelectedRoute();
  if (!route) return;
  route.request = route.request || {};
  const map = {};
  state.requestHeadersList.forEach((item) => {
    const k = (item.key || '').trim();
    if (k) {
      map[k] = item.value || '';
    }
  });
  route.request.headers = map;
}

function syncQueryParamsToModel() {
  const route = getSelectedRoute();
  if (!route) return;
  route.request = route.request || {};
  const map = {};
  state.queryParamsList.forEach((item) => {
    const k = (item.key || '').trim();
    if (k) {
      map[k] = item.value || '';
    }
  });
  route.request.queryParams = map;
}

function syncCurrentListsToModel() {
  syncResponseHeadersToModel();
  syncRequestHeadersToModel();
  syncQueryParamsToModel();
}

function handleAddRoute() {
  const server = getSelectedServer();
  if (!server) return;

  const newId = 'route_' + Date.now();
  const respId = 'resp_' + Date.now();
  const newRoute = {
    id: newId,
    path: '/new-route',
    method: 'GET',
    description: '',
    request: {
      headers: {},
      queryParams: {},
      body: ''
    },
    activeResponseId: respId,
    responses: [
      {
        id: respId,
        name: 'Success',
        statusCode: 200,
        delay: 0,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Mock generated successfully!" }, null, 2)
      }
    ]
  };

  server.routes.push(newRoute);
  state.selectedRouteId = newId;
  state.selectedResponseId = respId;

  renderRoutesList();
  renderEditor();
  markDirty();
  focusRoutePathInput();
}

function handleAddResponse() {
  const route = getSelectedRoute();
  if (!route) return;

  const respId = 'resp_' + Date.now();
  const newResp = {
    id: respId,
    name: 'Bad Request',
    statusCode: 400,
    delay: 0,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: "BadRequest", message: "Simulated error example" }, null, 2)
  };

  route.responses.push(newResp);
  state.selectedResponseId = respId;

  state.responseHeadersList = Object.entries(newResp.headers).map(([k, v], i) => ({
    id: 'rh_' + i + '_' + Date.now(),
    key: k,
    value: v
  }));

  renderResponsesTabs();
  renderResponseDetails();
  markDirty();
}

function handleDuplicateResponse() {
  const route = getSelectedRoute();
  const resp = getSelectedResponse();
  if (!route || !resp) return;

  syncResponseHeadersToModel();

  const respId = 'resp_' + Date.now();
  let baseName = (resp.name || '').trim();
  const codePrefixRegex = new RegExp(`^${resp.statusCode}\\s*[-:]?\\s*`, 'i');
  baseName = baseName.replace(codePrefixRegex, '').trim() || getStatusDescription(resp.statusCode);

  const clonedResp = {
    id: respId,
    name: `${baseName} (Cópia)`,
    statusCode: resp.statusCode,
    delay: resp.delay || 0,
    headers: { ...(resp.headers || {}) },
    body: resp.body || ''
  };

  route.responses.push(clonedResp);
  state.selectedResponseId = respId;

  state.responseHeadersList = Object.entries(clonedResp.headers).map(([k, v], i) => ({
    id: 'rh_' + i + '_' + Date.now(),
    key: k,
    value: v
  }));

  renderResponsesTabs();
  renderResponseDetails();
  markDirty();
}

// Dirty state tracking (Manual saving ONLY!)
function markDirty() {
  state.isDirty = true;
  updateSaveIndicator();
}

function updateSaveIndicator() {
  if (state.isDirty) {
    if (el.btnSaveAll) el.btnSaveAll.classList.add('dirty');
    if (el.saveStatusIndicator) el.saveStatusIndicator.className = 'save-status unsaved';
    if (el.saveStatusText) el.saveStatusText.textContent = t('unsaved', 'Não salvo (Ctrl+S)');
  } else {
    if (el.btnSaveAll) el.btnSaveAll.classList.remove('dirty');
    if (el.saveStatusIndicator) el.saveStatusIndicator.className = 'save-status saved';
    if (el.saveStatusText) el.saveStatusText.textContent = t('saved', 'Salvo');
  }
}

function saveConfig() {
  syncCurrentListsToModel();

  vscode.postMessage({
    type: 'saveConfig',
    config: state.config
  });
}

function showTransientToast(text) {
  const btn = el.btnSaveAll;
  if (!btn) return;
  const origHtml = btn.innerHTML;
  btn.innerHTML = `
    <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <span>${text}</span>
  `;
  btn.style.background = '#10b981';
  btn.style.borderColor = '#10b981';
  setTimeout(() => {
    btn.innerHTML = origHtml;
    btn.style.background = '';
    btn.style.borderColor = '';
  }, 1800);
}

// New Server Screen Management
function openNewServerScreen() {
  if (!el.newServerScreen) return;

  const existingPorts = (state.config.servers || []).map((s) => Number(s.port));
  let nextPort = 3000;
  while (existingPorts.includes(nextPort)) {
    nextPort++;
  }

  el.modalServerName.value = t('newServer', 'Novo Servidor');
  el.modalServerPort.value = nextPort;
  el.modalServerPrefix.value = '/api';
  el.modalServerCors.checked = true;

  if (el.topBar) {
    el.topBar.classList.add('hidden');
  }
  if (el.mainLayout) {
    el.mainLayout.classList.add('hidden');
  }
  el.newServerScreen.classList.remove('hidden');

  setTimeout(() => {
    el.modalServerName.focus();
    el.modalServerName.select();
  }, 50);
}

function closeNewServerScreen() {
  if (el.newServerScreen) {
    el.newServerScreen.classList.add('hidden');
  }
  if (el.topBar) {
    el.topBar.classList.remove('hidden');
  }
  if (el.mainLayout) {
    el.mainLayout.classList.remove('hidden');
  }
}

function handleSaveServerScreen() {
  const name = (el.modalServerName.value || '').trim() || t('newServer', 'Novo Servidor');
  const port = parseInt(el.modalServerPort.value, 10);
  let prefix = (el.modalServerPrefix.value || '').trim();
  const cors = el.modalServerCors.checked;

  if (isNaN(port) || port < 1024 || port > 65535) {
    vscode.postMessage({
      type: 'notify',
      level: 'warning',
      text: 'A porta deve ser um número válido entre 1024 e 65535.'
    });
    el.modalServerPort.focus();
    return;
  }

  const portConflict = (state.config.servers || []).find((s) => Number(s.port) === port);
  if (portConflict) {
    vscode.postMessage({
      type: 'notify',
      level: 'warning',
      text: t('portInUse', 'A porta {port} já está sendo utilizada pelo servidor "{name}". Escolha outra porta.').replace('{port}', port).replace('{name}', portConflict.name)
    });
    el.modalServerPort.focus();
    return;
  }

  if (prefix && !prefix.startsWith('/')) {
    prefix = '/' + prefix;
  }
  prefix = prefix.replace(/\/+$/, '');

  const serverId = 'srv_' + Date.now();

  const newServer = {
    id: serverId,
    name,
    port,
    prefix,
    cors,
    enabled: true,
    routes: []
  };

  if (!state.config.servers) {
    state.config.servers = [];
  }
  state.config.servers.push(newServer);

  vscode.postMessage({
    type: 'saveNewServer',
    config: state.config,
    name,
    port
  });
}

function applyTranslations() {
  if (el.topServerBadge && !state.selectedServerId) el.topServerBadge.textContent = t('server', 'Servidor');
  if (el.saveStatusText) el.saveStatusText.textContent = state.isDirty ? t('unsaved', 'Não salvo (Ctrl+S)') : t('saved', 'Salvo');
  if (el.btnSaveAll) {
    const span = el.btnSaveAll.querySelector('span');
    if (span) span.textContent = t('save', 'Salvar');
    el.btnSaveAll.title = t('saveChangesTitle', 'Salvar alterações no disco (Ctrl+S)');
  }

  // Route Meta Panel
  const methodLabel = document.querySelector('.method-group label');
  if (methodLabel) methodLabel.textContent = t('httpMethod', 'Verbo HTTP');
  const pathLabel = document.querySelector('.path-group label');
  if (pathLabel) pathLabel.textContent = t('routePath', 'Caminho da Rota (ex: /users/:id)');
  if (el.btnCopyUrl) {
    el.btnCopyUrl.title = t('copyUrlTitle', 'Copiar URL completa');
    const span = el.btnCopyUrl.querySelector('span');
    if (span) span.textContent = t('copyUrl', 'Copiar URL');
  }
  if (el.btnCopyCurl) {
    el.btnCopyCurl.title = t('curlTitle', 'Copiar comando cURL completo');
    const span = el.btnCopyCurl.querySelector('span');
    if (span) span.textContent = t('curl', 'cURL');
  }

  // Segmented Navigation
  if (el.tabNavRequest) {
    const span = el.tabNavRequest.querySelector('span');
    if (span) span.textContent = t('requestTab', 'Requisição (Request)');
  }
  if (el.tabNavResponses) {
    const span = el.tabNavResponses.querySelector('span');
    if (span) span.textContent = t('responsesTab', 'Respostas (Responses)');
  }
  const previewLabel = document.querySelector('.url-preview-label');
  if (previewLabel) previewLabel.textContent = t('endpoint', 'Endpoint:');

  // Request Section
  const pathParamsLabel = document.querySelector('#path-params-container label');
  if (pathParamsLabel) pathParamsLabel.textContent = t('pathParameters', 'Parâmetros de Rota (Path Parameters):');
  const reqQueryTitle = document.querySelector('#req-query-head .accordion-title');
  if (reqQueryTitle) reqQueryTitle.textContent = t('expectedQueryParams', 'Query Parameters esperados');
  if (el.btnAddQueryParam) {
    const span = el.btnAddQueryParam.querySelector('span');
    if (span) span.textContent = t('addParameter', 'Adicionar Parâmetro');
  }
  const reqHeadersTitle = document.querySelector('#req-headers-head .accordion-title');
  if (reqHeadersTitle) reqHeadersTitle.textContent = t('requestHeaders', 'Headers da Requisição');
  if (el.btnAddReqHeader) {
    const span = el.btnAddReqHeader.querySelector('span');
    if (span) span.textContent = t('addHeader', 'Adicionar Header');
  }
  const reqBodyLabel = document.querySelector('#section-request .body-header label');
  if (reqBodyLabel) reqBodyLabel.textContent = t('expectedRequestBody', 'Corpo Esperado da Requisição (Payload)');
  if (el.btnFormatReqJson) {
    const span = el.btnFormatReqJson.querySelector('span');
    if (span) span.textContent = t('formatJson', 'Formatar JSON');
  }
  if (el.btnTemplateReqObject) el.btnTemplateReqObject.textContent = t('objectExample', 'Exemplo Objeto');
  if (el.btnClearReqBody) el.btnClearReqBody.textContent = t('clear', 'Limpar');
  if (el.reqBodyTextarea) el.reqBodyTextarea.placeholder = t('requestBodyPlaceholder', 'Exemplo do JSON esperado na requisição enviada pelo cliente...');

  // Responses Section
  const respSubhead = document.querySelector('.section-subhead h4');
  if (respSubhead) respSubhead.textContent = t('routeResponses', 'Respostas da Rota');
  if (el.btnAddResponse) {
    const span = el.btnAddResponse.querySelector('span');
    if (span) span.textContent = t('newResponse', 'Nova Resposta');
  }
  const idLabel = document.querySelector('.response-title-edit label');
  if (idLabel) idLabel.textContent = t('identification', 'Identificação:');
  if (el.respNameInput) el.respNameInput.placeholder = t('responseNamePlaceholder', 'ex: Sucesso');
  if (el.btnSetActiveResp) el.btnSetActiveResp.title = t('setActiveResponseTitle', 'Definir como resposta ativa');
  if (el.btnDuplicateResponse) el.btnDuplicateResponse.title = t('duplicateResponseTitle', 'Duplicar esta resposta');
  if (el.btnDeleteResponse) el.btnDeleteResponse.title = t('deleteResponseTitle', 'Excluir esta resposta');
  const statusLabel = document.querySelector('.status-field label');
  if (statusLabel) statusLabel.textContent = t('statusCode', 'Status Code:');
  const delayLabel = document.querySelector('.delay-field label');
  if (delayLabel) delayLabel.textContent = t('simulatedLatency', 'Latência Simulada (Delay):');
  const customOpt = el.respStatusQuick ? el.respStatusQuick.querySelector('option[value="custom"]') : null;
  if (customOpt) customOpt.textContent = t('customStatus', 'Outro...');
  if (el.respStatusCode) el.respStatusCode.placeholder = t('customStatusPlaceholder', 'Código (ex: 418)');
  const respHeadersTitle = document.querySelector('#headers-head .accordion-title');
  if (respHeadersTitle) respHeadersTitle.textContent = t('responseHeaders', 'Headers de Resposta');
  if (el.btnAddHeader) {
    const span = el.btnAddHeader.querySelector('span');
    if (span) span.textContent = t('addHeader', 'Adicionar Header');
  }
  const respBodyLabel = document.querySelector('#section-responses .body-header label');
  if (respBodyLabel) respBodyLabel.textContent = t('responseBody', 'Corpo da Resposta (Payload)');
  if (el.btnFormatJson) {
    const span = el.btnFormatJson.querySelector('span');
    if (span) span.textContent = t('formatJson', 'Formatar JSON');
  }
  if (el.btnTemplateArray) el.btnTemplateArray.textContent = t('arrayExample', 'Exemplo Lista');
  if (el.btnTemplateObject) el.btnTemplateObject.textContent = t('objectExample', 'Exemplo Objeto');
  if (el.btnClearRespBody) el.btnClearRespBody.textContent = t('clear', 'Limpar');
  if (el.respBodyTextarea) el.respBodyTextarea.placeholder = t('responseBodyPlaceholder', 'Digite o JSON ou texto retornado...');

  // Empty state
  const emptyH3 = document.querySelector('#editor-empty h3');
  if (emptyH3) emptyH3.textContent = t('noRouteSelected', 'Nenhuma rota selecionada');
  const emptyP = document.querySelector('#editor-empty p');
  if (emptyP) emptyP.textContent = t('noRouteSelectedDesc', 'Crie ou selecione uma rota na barra lateral para começar a configurar os mocks.');

  // New Server Screen
  const newServerH2 = document.querySelector('#new-server-screen .form-title-group h2');
  if (newServerH2) newServerH2.textContent = t('newServerTitle', 'Cadastrar Novo Servidor Mock');
  const newServerSub = document.querySelector('#new-server-screen .form-subtitle');
  if (newServerSub) newServerSub.textContent = t('newServerSubtitle', 'Defina as configurações de porta, prefixo e CORS para criar um novo servidor.');
  const serverNameLabel = document.querySelector('label[for="modal-server-name"]');
  if (serverNameLabel) {
    serverNameLabel.innerHTML = `${t('serverName', 'Nome do Servidor')} <span class="required">*</span>`;
    const help = serverNameLabel.parentElement.querySelector('.form-help');
    if (help) help.textContent = t('serverNameHelp', 'Um nome descritivo para identificar este servidor no painel.');
  }
  if (el.modalServerName) el.modalServerName.placeholder = t('serverNamePlaceholder', 'ex: API de Pagamentos, Auth Service...');
  const serverPortLabel = document.querySelector('label[for="modal-server-port"]');
  if (serverPortLabel) {
    serverPortLabel.innerHTML = `${t('serverPort', 'Porta HTTP')} <span class="required">*</span>`;
    const help = serverPortLabel.parentElement.querySelector('.form-help');
    if (help) help.textContent = t('serverPortHelp', 'Porta local (entre 1024 e 65535). Ex: 3000, 8080.');
  }
  const serverPrefixLabel = document.querySelector('label[for="modal-server-prefix"]');
  if (serverPrefixLabel) {
    serverPrefixLabel.textContent = t('serverPrefix', 'Prefixo Global (opcional)');
    const help = serverPrefixLabel.parentElement.querySelector('.form-help');
    if (help) help.textContent = t('serverPrefixHelp', 'Prefixo adicionado antes de todas as rotas deste servidor.');
  }
  if (el.modalServerPrefix) el.modalServerPrefix.placeholder = t('serverPrefixPlaceholder', 'ex: /api ou /v1');
  const corsTitle = document.querySelector('.checkbox-title');
  if (corsTitle) corsTitle.textContent = t('enableCors', 'Habilitar CORS automaticamente');
  const corsDesc = document.querySelector('.checkbox-desc');
  if (corsDesc) corsDesc.textContent = t('enableCorsDesc', 'Adiciona cabeçalhos Access-Control-Allow-Origin e responde automaticamente a requisições OPTIONS pré-voo (pre-flight).');
  if (el.btnModalCancel) el.btnModalCancel.textContent = t('cancel', 'Cancelar');
  if (el.btnModalSave) el.btnModalSave.textContent = t('save', 'Salvar');
}
