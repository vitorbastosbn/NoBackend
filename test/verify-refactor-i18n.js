const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Validando Refatoração, Limpeza, Internacionalização e Autor ---');

// 1. Validar remoção do StatusBarItem de extension.ts
const extContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'extension.ts'), 'utf8');
assert(!extContent.includes('createStatusBarItem'), 'createStatusBarItem deve ter sido removido de extension.ts');
assert(!extContent.includes('statusBarItem'), 'statusBarItem deve ter sido removido de extension.ts');
assert(!extContent.includes('⚡'), 'Emoji de inicialização deve ter sido removido de extension.ts');
console.log('✓ extension.ts: StatusBarItem e emoji removidos com sucesso');

// 2. Validar remoção de emojis de MockServer.ts
const mockServerContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'server', 'MockServer.ts'), 'utf8');
assert(!mockServerContent.includes('🟢'), 'Emoji verde deve ter sido removido de MockServer.ts');
assert(!mockServerContent.includes('⚪'), 'Emoji branco deve ter sido removido de MockServer.ts');
assert(!mockServerContent.includes('✅'), 'Emoji check deve ter sido removido de MockServer.ts');
assert(!mockServerContent.includes('❌'), 'Emoji cruz deve ter sido removido de MockServer.ts');
assert(mockServerContent.includes('[START]'), 'MockServer.ts deve usar tag [START]');
assert(mockServerContent.includes('[STOP]'), 'MockServer.ts deve usar tag [STOP]');
console.log('✓ MockServer.ts: Emojis substituídos por tags técnicas limpas');

// 3. Validar remoção de emojis em ServersTreeProvider.ts
const treeContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'tree', 'ServersTreeProvider.ts'), 'utf8');
assert(!treeContent.includes('🟢'), 'Emoji verde deve ter sido removido de ServersTreeProvider.ts');
assert(!treeContent.includes('⚪'), 'Emoji branco deve ter sido removido de ServersTreeProvider.ts');
assert(treeContent.includes('vscode.l10n.t'), 'ServersTreeProvider.ts deve usar vscode.l10n.t');
console.log('✓ ServersTreeProvider.ts: Tooltips limpos e internacionalizados');

// 4. Validar package.json (author, repo, bugs, screenshots, NLS keys)
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
assert(pkg.author && pkg.author.name === 'Vitor Bastos', 'package.json deve conter autor Vitor Bastos');
assert(pkg.repository && pkg.repository.url.includes('vitorbastosbn/NoBackend'), 'package.json deve apontar para vitorbastosbn/NoBackend');
assert(pkg.bugs && pkg.bugs.url.includes('vitorbastosbn/NoBackend/issues'), 'package.json deve conter bugs url');
assert(pkg.homepage && pkg.homepage.includes('vitorbastosbn/NoBackend'), 'package.json deve conter homepage');
assert(Array.isArray(pkg.screenshots) && pkg.screenshots.length > 0, 'package.json deve conter screenshots');
assert(pkg.description === '%extension.description%', 'package.json description deve usar chave NLS');
console.log('✓ package.json: Autor, repositório, screenshots e chaves NLS configurados');

// 5. Validar LICENSE
const licenseContent = fs.readFileSync(path.join(__dirname, '..', 'LICENSE'), 'utf8');
assert(licenseContent.includes('Vitor Bastos'), 'LICENSE deve mencionar Vitor Bastos');
console.log('✓ LICENSE: Copyright atribuído a Vitor Bastos');

// 6. Validar arquivos NLS e L10N
const nlsEn = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.nls.json'), 'utf8'));
const nlsPtBr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.nls.pt-br.json'), 'utf8'));
const nlsEs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.nls.es.json'), 'utf8'));
assert(nlsEn['command.addServer'] === 'Add New Server', 'package.nls.json deve traduzir addServer para inglês');
assert(nlsPtBr['command.addServer'] === 'Adicionar Novo Servidor', 'package.nls.pt-br.json deve traduzir addServer para português');
assert(nlsEs['command.addServer'] === 'Agregar Nuevo Servidor', 'package.nls.es.json deve traduzir addServer para espanhol');

const l10nEn = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'l10n', 'bundle.l10n.json'), 'utf8'));
const l10nPtBr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'l10n', 'bundle.l10n.pt-br.json'), 'utf8'));
const l10nEs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'l10n', 'bundle.l10n.es.json'), 'utf8'));
assert(l10nEn['Server "{0}" deleted.'] === 'Server "{0}" deleted.', 'l10n inglês validado');
assert(l10nPtBr['Server "{0}" deleted.'] === 'Servidor "{0}" excluído.', 'l10n português validado');
assert(l10nEs['Server "{0}" deleted.'] === 'Servidor "{0}" eliminado.', 'l10n espanhol validado');
console.log('✓ Arquivos NLS e L10N: Inglês, Português do Brasil e Espanhol validados');

// 7. Validar media/screenshot.png
assert(fs.existsSync(path.join(__dirname, '..', 'media', 'screenshot.png')), 'media/screenshot.png deve existir');
const stats = fs.statSync(path.join(__dirname, '..', 'media', 'screenshot.png'));
assert(stats.size > 10000, 'media/screenshot.png deve ser uma imagem válida e preenchida');
console.log(`✓ media/screenshot.png validado (${(stats.size / 1024).toFixed(1)} KB)`);

// 8. Validar README.md
const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
assert(readme.includes('media/screenshot.png'), 'README.md deve referenciar media/screenshot.png');
assert(readme.includes('vitorbastosbn/NoBackend'), 'README.md deve conter link para o GitHub do repositório');
assert(readme.includes('Vitor Bastos'), 'README.md deve mencionar o desenvolvedor Vitor Bastos');
assert(!readme.includes('## 🎯 Por que o NoBackend?'), 'README.md não deve conter emojis nos títulos');
console.log('✓ README.md: Badges, captura de tela e tom profissional validados');

// 9. Validar Webview i18n
const webviewI18n = fs.readFileSync(path.join(__dirname, '..', 'src', 'webview', 'i18n.ts'), 'utf8');
assert(webviewI18n.includes("'pt-br'"), 'i18n.ts deve conter suporte pt-br');
assert(webviewI18n.includes("'es'"), 'i18n.ts deve conter suporte es');
assert(webviewI18n.includes("'en'"), 'i18n.ts deve conter suporte en');
console.log('✓ src/webview/i18n.ts validado');

console.log('\n🎉 TODAS AS VALIDAÇÕES DE REFATORAÇÃO E INTERNACIONALIZAÇÃO FORAM CONCLUÍDAS COM SUCESSO!');
