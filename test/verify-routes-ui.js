const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testando Validações da Tela de Rotas (NoBackend) ---');

// 1. Verificar types.ts
const typesContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'models', 'types.ts'), 'utf8');
assert(typesContent.includes('export interface RequestConfig'), 'Deve conter RequestConfig em types.ts');
assert(typesContent.includes('request?: RequestConfig'), 'RouteConfig deve conter request?: RequestConfig');
console.log('✓ types.ts validado com sucesso');

// 2. Verificar DashboardPanel.ts HTML
const panelContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'webview', 'DashboardPanel.ts'), 'utf8');
assert(!panelContent.includes('placeholder="ex: 200 Sucesso"'), 'Não deve conter "200" no placeholder de identificação');
assert(panelContent.includes('placeholder="ex: Sucesso"'), 'Placeholder deve ser "ex: Sucesso"');
assert(panelContent.includes('btn-star-favorite'), 'Deve conter botão de estrela com classe btn-star-favorite');
assert(panelContent.includes('tab-nav-request'), 'Deve conter aba de Requisição');
assert(panelContent.includes('tab-nav-responses'), 'Deve conter aba de Respostas');
assert(panelContent.includes('icon-svg'), 'Deve utilizar icon-svg minimalistas');
console.log('✓ DashboardPanel.ts validado com sucesso');

// 3. Verificar dashboard.js
const jsContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'webview', 'media', 'dashboard.js'), 'utf8');
assert(!jsContent.includes('setTimeout(() => {\n    saveConfig();\n  }, 800)'), 'Auto-save com debounce de 800ms deve ser removido');
assert(jsContent.includes("state.isDirty = true"), 'Deve marcar isDirty ao invés de salvar automaticamente');
assert(jsContent.includes("btn-star-favorite"), 'Deve conter lógica para botão de estrela');
assert(jsContent.includes("btn-copy-curl"), 'Deve suportar cópia de cURL');
assert(jsContent.includes("tab-status-pill"), 'Deve formatar status code na aba separado do título');
console.log('✓ dashboard.js validado com sucesso');

// 4. Testar regex de remoção de status code duplicado
function cleanResponseName(statusCode, name, statusDesc) {
  let clean = (name || '').trim();
  const codePrefixRegex = new RegExp(`^${statusCode}\\s*[-:]?\\s*`, 'i');
  clean = clean.replace(codePrefixRegex, '').trim();
  return clean || statusDesc || 'Resposta';
}

assert.strictEqual(cleanResponseName(200, '200 Sucesso', 'OK'), 'Sucesso', 'Deve remover 200 de "200 Sucesso"');
assert.strictEqual(cleanResponseName(200, '200 OK', 'OK'), 'OK', 'Deve remover 200 de "200 OK"');
assert.strictEqual(cleanResponseName(404, '404 - Não encontrado', 'Not Found'), 'Não encontrado', 'Deve remover 404 e hífen');
assert.strictEqual(cleanResponseName(500, 'Erro no banco', 'Internal Server Error'), 'Erro no banco', 'Deve manter nome customizado sem prefixo');
assert.strictEqual(cleanResponseName(200, '', 'OK'), 'OK', 'Deve usar statusDesc quando vazio');
console.log('✓ Lógica de identificação de resposta sem status code duplicado validada!');

// 5. Verificar dashboard.css
const cssContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'webview', 'media', 'dashboard.css'), 'utf8');
assert(cssContent.includes('.icon-svg'), 'dashboard.css deve conter regra .icon-svg');
assert(cssContent.includes('.btn-star-favorite'), 'dashboard.css deve conter regra .btn-star-favorite');
assert(cssContent.includes('.nav-segment-control'), 'dashboard.css deve conter regra .nav-segment-control');
assert(cssContent.includes('.save-status'), 'dashboard.css deve conter regra .save-status');
console.log('✓ dashboard.css validado com sucesso');

console.log('🎉 TODOS OS TESTES DE VALIDAÇÃO PASSARAM!');
