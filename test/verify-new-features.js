const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Validando Novas Alterações (Exclusão & Status Code) ---');

// 1. DashboardPanel.ts
const panelContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'webview', 'DashboardPanel.ts'), 'utf8');
assert(!panelContent.includes('id="btn-delete-route"'), 'Botão btn-delete-route deve ter sido removido');
assert(!panelContent.includes('quick-status-pills'), 'Pills de status rápido devem ter sido removidas do HTML');
assert(panelContent.includes('id="resp-status-code" class="hidden"'), 'resp-status-code deve iniciar com classe hidden');
assert(panelContent.includes('closeIfRouteOpen'), 'DashboardPanel deve conter método closeIfRouteOpen');
assert(panelContent.includes("case 'routeSelected':"), 'DashboardPanel deve escutar routeSelected');
console.log('✓ DashboardPanel.ts validado');

// 2. extension.ts
const extContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'extension.ts'), 'utf8');
assert(extContent.includes('DashboardPanel.closeIfRouteOpen(item.route.id)'), 'deleteRoute deve fechar tela da rota se aberta');
console.log('✓ extension.ts validado');

// 3. dashboard.js
const jsContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'webview', 'media', 'dashboard.js'), 'utf8');
assert(!jsContent.includes('btnDeleteRoute:'), 'btnDeleteRoute não deve estar no mapa el');
assert(!jsContent.includes('quickStatusPills:'), 'quickStatusPills não deve estar no mapa el');
assert(!jsContent.includes('function highlightActiveStatusPill'), 'highlightActiveStatusPill deve ter sido removida');
assert(jsContent.includes("type: 'routeSelected'"), 'dashboard.js deve notificar routeSelected');
assert(jsContent.includes("el.respStatusCode.classList.remove('hidden')"), 'dashboard.js deve exibir respStatusCode ao selecionar custom');
assert(jsContent.includes("el.respStatusCode.classList.add('hidden')"), 'dashboard.js deve ocultar respStatusCode ao selecionar padrão');
console.log('✓ dashboard.js validado');

// 4. dashboard.css
const cssContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'webview', 'media', 'dashboard.css'), 'utf8');
assert(!cssContent.includes('.quick-status-pills'), 'dashboard.css não deve conter .quick-status-pills');
assert(!cssContent.includes('.btn-pill-status'), 'dashboard.css não deve conter .btn-pill-status');
console.log('✓ dashboard.css validado');

console.log('🎉 TODAS AS VALIDAÇÕES DAS NOVAS REGRAS PASSARAM COM SUCESSO!');
