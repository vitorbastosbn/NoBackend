// Acquire VS Code API
const vscode = acquireVsCodeApi();

// Application State
let state = {
  config: { version: '1.0.0', servers: [] },
  statusList: [],
  selectedServerId: null,
  selectedRouteId: null,
  selectedResponseId: null,
  filterQuery: ''
};

// DOM Elements
const el = {
  // Top bar
  btnStartAll: document.getElementById('btn-start-all'),
  btnStopAll: document.getElementById('btn-stop-all'),
  btnOpenJson: document.getElementById('btn-open-json'),
  btnSaveAll: document.getElementById('btn-save-all'),

  // Column 1
  serversList: document.getElementById('servers-list'),
  btnAddServer: document.getElementById('btn-add-server'),

  // Column 2
  routesList: document.getElementById('routes-list'),
  routesCountBadge: document.getElementById('routes-count-badge'),
  inputRouteFilter: document.getElementById('input-route-filter'),
  btnAddRoute: document.getElementById('btn-add-route'),

  // Column 3
  editorEmpty: document.getElementById('editor-empty'),
  editorContent: document.getElementById('editor-content'),
  routeMethodSelect: document.getElementById('route-method-select'),
  routePathInput: document.getElementById('route-path-input'),
  routePrefixDisplay: document.getElementById('route-prefix-display'),
  btnCopyUrl: document.getElementById('btn-copy-url'),
  btnDeleteRoute: document.getElementById('btn-delete-route'),

  // Responses
  btnAddResponse: document.getElementById('btn-add-response'),
  responsesTabs: document.getElementById('responses-tabs'),
  respNameInput: document.getElementById('resp-name-input'),
  btnSetActiveResp: document.getElementById('btn-set-active-resp'),
  btnDeleteResponse: document.getElementById('btn-delete-response'),
  respStatusQuick: document.getElementById('resp-status-quick'),
  respStatusCode: document.getElementById('resp-status-code'),
  respDelayInput: document.getElementById('resp-delay-input'),
  quickDelayBtns: document.querySelectorAll('.btn-pill[data-delay]'),

  // Headers
  headersHead: document.getElementById('headers-head'),
  headersBody: document.getElementById('headers-body'),
  headersCount: document.getElementById('headers-count'),
  headersListContainer: document.getElementById('headers-list-container'),
  btnAddHeader: document.getElementById('btn-add-header'),

  // Body
  jsonValidIndicator: document.getElementById('json-valid-indicator'),
  btnFormatJson: document.getElementById('btn-format-json'),
  btnTemplateArray: document.getElementById('btn-template-array'),
  btnTemplateObject: document.getElementById('btn-template-object'),
  respBodyTextarea: document.getElementById('resp-body-textarea'),

  // Modal
  serverModal: document.getElementById('server-modal'),
  modalServerName: document.getElementById('modal-server-name'),
  modalServerPort: document.getElementById('modal-server-port'),
  modalServerPrefix: document.getElementById('modal-server-prefix'),
  modalServerCors: document.getElementById('modal-server-cors'),
  btnModalCancel: document.getElementById('btn-modal-cancel'),
  btnModalSave: document.getElementById('btn-modal-save')
};

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  vscode.postMessage({ type: 'ready' });
});

// Handle incoming messages from Extension Host
window.addEventListener('message', (event) => {
  const msg = event.data;
  switch (msg.type) {
    case 'initData':
      state.config = msg.config;
      state.statusList = msg.statusList || [];
      if (state.config.servers.length > 0) {
        state.selectedServerId = msg.initialServerId || state.config.servers[0].id;
        const currentServer = state.config.servers.find((s) => s.id === state.selectedServerId);
        if (currentServer && currentServer.routes.length > 0) {
          state.selectedRouteId = msg.initialRouteId || currentServer.routes[0].id;
          state.selectedResponseId = currentServer.routes[0].activeResponseId;
        }
      }
      renderAll();
      break;

    case 'configUpdated':
      state.config = msg.config;
      if (msg.statusList) {
        state.statusList = msg.statusList;
      }
      renderAll();
      break;

    case 'statusUpdated':
      state.statusList = msg.statusList || [];
      renderServersList();
      break;

    case 'selectTarget':
      if (msg.serverId) {
        state.selectedServerId = msg.serverId;
      }
      if (msg.routeId) {
        state.selectedRouteId = msg.routeId;
      }
      renderAll();
      break;

    case 'saveSuccess':
      showTransientToast('Salvo com sucesso!');
      break;
  }
});

// Setup Events
function setupEventListeners() {
  // Top actions
  el.btnStartAll.addEventListener('click', () => vscode.postMessage({ type: 'startAll' }));
  el.btnStopAll.addEventListener('click', () => vscode.postMessage({ type: 'stopAll' }));
  el.btnOpenJson.addEventListener('click', () => vscode.postMessage({ type: 'openConfigFile' }));
  el.btnSaveAll.addEventListener('click', () => saveConfig());

  // Server actions
  el.btnAddServer.addEventListener('click', () => openServerModal());
  el.btnModalCancel.addEventListener('click', () => closeServerModal());
  el.btnModalSave.addEventListener('click', () => handleSaveServerModal());

  // Route actions
  el.btnAddRoute.addEventListener('click', () => handleAddRoute());
  el.inputRouteFilter.addEventListener('input', (e) => {
    state.filterQuery = e.target.value.toLowerCase();
    renderRoutesList();
  });

  // Editor route fields
  el.routeMethodSelect.addEventListener('change', (e) => {
    const route = getSelectedRoute();
    if (route) {
      route.method = e.target.value;
      renderRoutesList();
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
      renderRoutesList();
      markDirty();
    }
  });

  el.btnCopyUrl.addEventListener('click', () => {
    const srv = getSelectedServer();
    const route = getSelectedRoute();
    if (srv && route) {
      const prefix = (srv.prefix || '').trim().replace(/\/+$/, '');
      let rPath = route.path.trim();
      if (!rPath.startsWith('/')) {
        rPath = '/' + rPath;
      }
      const fullUrl = `http://localhost:${srv.port}${prefix}${rPath}`;
      vscode.postMessage({ type: 'copyToClipboard', text: fullUrl });
    }
  });

  el.btnDeleteRoute.addEventListener('click', () => {
    const srv = getSelectedServer();
    const route = getSelectedRoute();
    if (srv && route && confirm(`Excluir a rota [${route.method}] ${route.path}?`)) {
      srv.routes = srv.routes.filter((r) => r.id !== route.id);
      state.selectedRouteId = srv.routes.length > 0 ? srv.routes[0].id : null;
      renderRoutesList();
      renderEditor();
      markDirty();
    }
  });

  // Response actions
  el.btnAddResponse.addEventListener('click', () => handleAddResponse());
  el.respNameInput.addEventListener('input', (e) => {
    const resp = getSelectedResponse();
    if (resp) {
      resp.name = e.target.value;
      renderResponsesTabs();
      markDirty();
    }
  });

  el.btnSetActiveResp.addEventListener('click', () => {
    const route = getSelectedRoute();
    if (route && state.selectedResponseId) {
      route.activeResponseId = state.selectedResponseId;
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
  el.respStatusQuick.addEventListener('change', (e) => {
    if (e.target.value !== 'custom') {
      const code = parseInt(e.target.value, 10);
      el.respStatusCode.value = code;
      updateStatusCode(code);
    }
  });

  el.respStatusCode.addEventListener('input', (e) => {
    const code = parseInt(e.target.value, 10) || 200;
    updateStatusCode(code);
  });

  // Latency / Delay
  el.respDelayInput.addEventListener('input', (e) => {
    const resp = getSelectedResponse();
    if (resp) {
      resp.delay = Math.max(0, parseInt(e.target.value, 10) || 0);
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
        markDirty();
      }
    });
  });

  // Headers
  el.headersHead.addEventListener('click', () => {
    el.headersHead.classList.toggle('collapsed');
    el.headersBody.classList.toggle('collapsed');
  });

  el.btnAddHeader.addEventListener('click', () => {
    const resp = getSelectedResponse();
    if (resp) {
      if (!resp.headers) {
        resp.headers = {};
      }
      resp.headers['X-Custom-Header'] = 'example-value';
      renderHeaders();
      markDirty();
    }
  });

  // Body editor
  el.respBodyTextarea.addEventListener('input', (e) => {
    const resp = getSelectedResponse();
    if (resp) {
      resp.body = e.target.value;
      validateJson(e.target.value);
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
        validateJson(formatted);
        markDirty();
      }
    } catch {
      vscode.postMessage({ type: 'notify', level: 'warning', text: 'Não foi possível formatar: JSON contém erros de sintaxe.' });
    }
  });

  el.btnTemplateArray.addEventListener('click', () => {
    const sample = JSON.stringify([
      { id: 1, name: "Item Exemplo A", active: true },
      { id: 2, name: "Item Exemplo B", active: false }
    ], null, 2);
    setBodyTemplate(sample);
  });

  el.btnTemplateObject.addEventListener('click', () => {
    const sample = JSON.stringify({
      id: 1,
      message: "Operação executada com sucesso",
      timestamp: new Date().toISOString()
    }, null, 2);
    setBodyTemplate(sample);
  });

  // Keyboard shortcut Ctrl+S / Cmd+S
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveConfig();
    }
  });
}

function updateStatusCode(code) {
  const resp = getSelectedResponse();
  if (resp) {
    resp.statusCode = code;
    // Sync quick dropdown
    const opt = el.respStatusQuick.querySelector(`option[value="${code}"]`);
    el.respStatusQuick.value = opt ? code : 'custom';
    renderResponsesTabs();
    renderRoutesList();
    markDirty();
  }
}

function setBodyTemplate(sample) {
  el.respBodyTextarea.value = sample;
  const resp = getSelectedResponse();
  if (resp) {
    resp.body = sample;
    validateJson(sample);
    markDirty();
  }
}

function validateJson(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    el.jsonValidIndicator.textContent = 'Vazio';
    el.jsonValidIndicator.className = 'valid-tag';
    return;
  }
  try {
    JSON.parse(trimmed);
    el.jsonValidIndicator.textContent = 'JSON Válido';
    el.jsonValidIndicator.className = 'valid-tag valid';
  } catch (err) {
    el.jsonValidIndicator.textContent = 'JSON Inválido';
    el.jsonValidIndicator.className = 'valid-tag invalid';
  }
}

// Rendering
function renderAll() {
  renderServersList();
  renderRoutesList();
  renderEditor();
}

function renderServersList() {
  el.serversList.innerHTML = '';

  state.config.servers.forEach((srv) => {
    const status = state.statusList.find((st) => st.serverId === srv.id);
    const isRunning = status ? status.running : false;
    const isSelected = srv.id === state.selectedServerId;

    const card = document.createElement('div');
    card.className = `server-card ${isSelected ? 'active' : ''}`;
    card.innerHTML = `
      <div class="server-card-top">
        <div class="server-name" title="${srv.name}">${srv.name}</div>
        <button class="server-toggle-btn ${isRunning ? 'running' : 'stopped'}" title="${isRunning ? 'Clique para Parar' : 'Clique para Iniciar'}">
          ${isRunning ? '● Rodando' : '○ Parado'}
        </button>
      </div>
      <div class="server-card-bottom">
        <span class="server-port-pill">:${srv.port}</span>
        <span>${srv.routes.length} rota(s)</span>
      </div>
    `;

    // Click select
    card.addEventListener('click', (e) => {
      if (e.target.closest('.server-toggle-btn')) {
        return; // Handled below
      }
      state.selectedServerId = srv.id;
      state.selectedRouteId = srv.routes.length > 0 ? srv.routes[0].id : null;
      renderAll();
    });

    // Click toggle
    const toggleBtn = card.querySelector('.server-toggle-btn');
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      vscode.postMessage({ type: 'toggleServer', serverId: srv.id });
    });

    el.serversList.appendChild(card);
  });
}

function renderRoutesList() {
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

    let statusClass = 's2xx';
    if (statusCode >= 400 && statusCode < 500) statusClass = 's4xx';
    else if (statusCode >= 500) statusClass = 's5xx';

    const card = document.createElement('div');
    card.className = `route-card ${isSelected ? 'active' : ''}`;
    card.innerHTML = `
      <div class="route-card-left">
        <span class="method-tag ${route.method}">${route.method}</span>
        <span class="route-path-text" title="${route.path}">${route.path}</span>
      </div>
      <span class="status-pill ${statusClass}">${statusCode}</span>
    `;

    card.addEventListener('click', () => {
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

  // Set route metadata
  el.routeMethodSelect.value = route.method;
  el.routePathInput.value = route.path;
  el.routePrefixDisplay.textContent = server.prefix ? server.prefix : ': ' + server.port;

  // Render responses tabs
  renderResponsesTabs();
  renderResponseDetails();
}

function renderResponsesTabs() {
  const route = getSelectedRoute();
  if (!route) return;

  el.responsesTabs.innerHTML = '';

  if (!state.selectedResponseId && route.responses.length > 0) {
    state.selectedResponseId = route.activeResponseId || route.responses[0].id;
  }

  route.responses.forEach((resp) => {
    const isActive = resp.id === route.activeResponseId;
    const isSelected = resp.id === state.selectedResponseId;

    const tab = document.createElement('div');
    tab.className = `resp-tab ${isSelected ? 'active' : ''}`;
    tab.innerHTML = `
      ${isActive ? '<span class="active-star">★</span>' : ''}
      <span>${resp.statusCode} ${resp.name || ''}</span>
    `;

    tab.addEventListener('click', () => {
      state.selectedResponseId = resp.id;
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

  el.respNameInput.value = resp.name || '';
  el.respStatusCode.value = resp.statusCode || 200;

  // Set quick dropdown
  const opt = el.respStatusQuick.querySelector(`option[value="${resp.statusCode}"]`);
  el.respStatusQuick.value = opt ? resp.statusCode : 'custom';

  el.respDelayInput.value = resp.delay || 0;
  el.respBodyTextarea.value = resp.body || '';

  // Active button appearance
  const isCurrentlyActive = resp.id === route.activeResponseId;
  if (isCurrentlyActive) {
    el.btnSetActiveResp.className = 'btn btn-sm btn-success';
    el.btnSetActiveResp.innerHTML = '★ Resposta Ativa';
  } else {
    el.btnSetActiveResp.className = 'btn btn-sm btn-outline';
    el.btnSetActiveResp.innerHTML = 'Definir como Ativa';
  }

  validateJson(resp.body || '');
  renderHeaders();
}

function renderHeaders() {
  const resp = getSelectedResponse();
  if (!resp) return;

  if (!resp.headers) {
    resp.headers = {};
  }

  const entries = Object.entries(resp.headers);
  el.headersCount.textContent = entries.length.toString();
  el.headersListContainer.innerHTML = '';

  entries.forEach(([key, value]) => {
    const row = document.createElement('div');
    row.className = 'header-row';
    row.innerHTML = `
      <input type="text" class="hdr-key" value="${key}" placeholder="Header (ex: Content-Type)" />
      <input type="text" class="hdr-val" value="${value}" placeholder="Valor (ex: application/json)" />
      <button class="btn-icon btn-del-hdr" title="Remover header">✕</button>
    `;

    const keyInput = row.querySelector('.hdr-key');
    const valInput = row.querySelector('.hdr-val');
    const delBtn = row.querySelector('.btn-del-hdr');

    keyInput.addEventListener('change', (e) => {
      const newKey = e.target.value.trim();
      if (newKey && newKey !== key) {
        delete resp.headers[key];
        resp.headers[newKey] = valInput.value;
        renderHeaders();
        markDirty();
      }
    });

    valInput.addEventListener('change', (e) => {
      resp.headers[keyInput.value.trim()] = e.target.value;
      markDirty();
    });

    delBtn.addEventListener('click', () => {
      delete resp.headers[key];
      renderHeaders();
      markDirty();
    });

    el.headersListContainer.appendChild(row);
  });
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

function handleAddRoute() {
  const server = getSelectedServer();
  if (!server) return;

  const newId = 'route_' + Date.now();
  const respId = 'resp_' + Date.now();
  const newRoute = {
    id: newId,
    path: '/nova-rota',
    method: 'GET',
    description: '',
    activeResponseId: respId,
    responses: [
      {
        id: respId,
        name: '200 Sucesso',
        statusCode: 200,
        delay: 0,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Mock gerado com sucesso!" }, null, 2)
      }
    ]
  };

  server.routes.push(newRoute);
  state.selectedRouteId = newId;
  state.selectedResponseId = respId;

  renderRoutesList();
  renderEditor();
  markDirty();
}

function handleAddResponse() {
  const route = getSelectedRoute();
  if (!route) return;

  const respId = 'resp_' + Date.now();
  const newResp = {
    id: respId,
    name: '400 Erro',
    statusCode: 400,
    delay: 0,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: "BadRequest", message: "Exemplo de erro simulado" }, null, 2)
  };

  route.responses.push(newResp);
  state.selectedResponseId = respId;

  renderResponsesTabs();
  renderResponseDetails();
  markDirty();
}

// Modals
function openServerModal() {
  el.modalServerName.value = 'Novo Servidor';
  // Compute next free port recommendation
  const existingPorts = state.config.servers.map((s) => s.port);
  let nextPort = 3000;
  while (existingPorts.includes(nextPort)) {
    nextPort++;
  }
  el.modalServerPort.value = nextPort;
  el.modalServerPrefix.value = '/api';
  el.modalServerCors.checked = true;
  el.serverModal.classList.remove('hidden');
}

function closeServerModal() {
  el.serverModal.classList.add('hidden');
}

function handleSaveServerModal() {
  const name = el.modalServerName.value.trim() || 'Servidor Mock';
  const port = parseInt(el.modalServerPort.value, 10) || 3000;
  const prefix = el.modalServerPrefix.value.trim();
  const cors = el.modalServerCors.checked;

  const serverId = 'srv_' + Date.now();
  const defaultRouteId = 'route_' + Date.now();
  const defaultRespId = 'resp_' + Date.now();

  const newServer = {
    id: serverId,
    name,
    port,
    prefix,
    cors,
    enabled: true,
    routes: [
      {
        id: defaultRouteId,
        path: '/status',
        method: 'GET',
        description: 'Status do mock',
        activeResponseId: defaultRespId,
        responses: [
          {
            id: defaultRespId,
            name: '200 OK',
            statusCode: 200,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: "online", server: name, timestamp: new Date().toISOString() }, null, 2)
          }
        ]
      }
    ]
  };

  state.config.servers.push(newServer);
  state.selectedServerId = serverId;
  state.selectedRouteId = defaultRouteId;
  state.selectedResponseId = defaultRespId;

  closeServerModal();
  renderAll();
  saveConfig();
}

// Auto-save debouncing & save triggering
let saveTimeout = null;
function markDirty() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveConfig();
  }, 800);
}

function saveConfig() {
  clearTimeout(saveTimeout);
  vscode.postMessage({
    type: 'saveConfig',
    config: state.config
  });
}

function showTransientToast(text) {
  const btn = el.btnSaveAll;
  const origHtml = btn.innerHTML;
  btn.innerHTML = `✓ ${text}`;
  btn.style.background = '#10b981';
  setTimeout(() => {
    btn.innerHTML = origHtml;
    btn.style.background = '';
  }, 1500);
}
