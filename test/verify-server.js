const http = require('http');
const assert = require('assert');

// Simulate the MockServer logic directly or load compiled dist/
// Let's create a test that boots MockServer from our implementation
const { MockServer } = require('./dist-test-helper');

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Iniciando Testes de Verificação do NoBackend Mock Engine ---');

  const testConfig = {
    id: 'test_server_3099',
    name: 'Servidor de Teste',
    port: 3099,
    prefix: '/api',
    cors: true,
    enabled: true,
    routes: [
      {
        id: 'r_users',
        path: '/users',
        method: 'GET',
        activeResponseId: 'resp_200',
        responses: [
          {
            id: 'resp_200',
            name: '200 OK',
            statusCode: 200,
            delay: 50,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }])
          },
          {
            id: 'resp_500',
            name: '500 Server Error',
            statusCode: 500,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal Server Error' })
          }
        ]
      },
      {
        id: 'r_users_post',
        path: '/users',
        method: 'POST',
        activeResponseId: 'resp_201',
        responses: [
          {
            id: 'resp_201',
            name: '201 Created',
            statusCode: 201,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 3, name: 'Charlie', status: 'created' })
          }
        ]
      },
      {
        id: 'r_users_id',
        path: '/users/:id',
        method: 'GET',
        activeResponseId: 'resp_id_200',
        responses: [
          {
            id: 'resp_id_200',
            name: '200 User Found',
            statusCode: 200,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: ':id', name: 'User :id' })
          }
        ]
      },
      {
        id: 'r_users_put',
        path: '/users/:id',
        method: 'PUT',
        activeResponseId: 'resp_put_200',
        responses: [
          {
            id: 'resp_put_200',
            name: '200 Updated',
            statusCode: 200,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: ':id', updated: true })
          }
        ]
      },
      {
        id: 'r_users_patch',
        path: '/users/:id',
        method: 'PATCH',
        activeResponseId: 'resp_patch_200',
        responses: [
          {
            id: 'resp_patch_200',
            name: '200 Patched',
            statusCode: 200,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: ':id', patched: true })
          }
        ]
      },
      {
        id: 'r_users_delete',
        path: '/users/:id',
        method: 'DELETE',
        activeResponseId: 'resp_del_204',
        responses: [
          {
            id: 'resp_del_204',
            name: '204 No Content',
            statusCode: 204,
            delay: 0,
            headers: {},
            body: ''
          }
        ]
      },
      {
        id: 'r_search_qp',
        path: '/search',
        method: 'GET',
        activeResponseId: 'resp_search_200',
        request: {
          queryParams: { page: '12' }
        },
        responses: [
          {
            id: 'resp_search_200',
            name: '200 Search OK',
            statusCode: 200,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: '12', results: ['item1', 'item2'] })
          }
        ]
      },
      {
        id: 'r_auth_login',
        path: '/auth/login',
        method: 'POST',
        activeResponseId: 'resp_login_200',
        request: {
          queryParams: { page: '12' },
          body: JSON.stringify({ usuario: 'teste', senha: '123' })
        },
        responses: [
          {
            id: 'resp_login_200',
            name: '200 Login OK',
            statusCode: 200,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: 'mock-token-xyz' })
          }
        ]
      },
      {
        id: 'r_products_vip',
        path: '/products',
        method: 'GET',
        activeResponseId: 'resp_prod_vip',
        request: {
          queryParams: { type: 'vip' }
        },
        responses: [
          {
            id: 'resp_prod_vip',
            name: '200 VIP Products',
            statusCode: 200,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'vip', list: ['vip-gold', 'vip-platinum'] })
          }
        ]
      },
      {
        id: 'r_products_all',
        path: '/products',
        method: 'GET',
        activeResponseId: 'resp_prod_all',
        responses: [
          {
            id: 'resp_prod_all',
            name: '200 All Products',
            statusCode: 200,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'all', list: ['product-1', 'product-2'] })
          }
        ]
      },
      {
        id: 'r_sessions_admin',
        path: '/sessions',
        method: 'POST',
        activeResponseId: 'resp_sess_admin',
        request: {
          body: JSON.stringify({ role: 'admin' })
        },
        responses: [
          {
            id: 'resp_sess_admin',
            name: '200 Admin Session',
            statusCode: 200,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'admin', permissions: ['*'] })
          }
        ]
      },
      {
        id: 'r_sessions_user',
        path: '/sessions',
        method: 'POST',
        activeResponseId: 'resp_sess_user',
        request: {
          body: JSON.stringify({ role: 'user' })
        },
        responses: [
          {
            id: 'resp_sess_user',
            name: '200 User Session',
            statusCode: 200,
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'user', permissions: ['read'] })
          }
        ]
      }
    ]
  };

  const logs = [];
  const fakeOutputChannel = {
    appendLine: (msg) => logs.push(msg)
  };

  const server = new MockServer(testConfig, fakeOutputChannel, () => {});
  await server.start();
  console.log('✓ Servidor de teste iniciado na porta 3099');

  try {
    // Test 1: GET /api/users (200 OK + delay + JSON array)
    const tStart = Date.now();
    const res1 = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/users',
      method: 'GET'
    });
    const duration = Date.now() - tStart;
    assert.strictEqual(res1.statusCode, 200, 'GET /api/users deve retornar status 200');
    assert(duration >= 45, 'Latência de 50ms deve ter sido respeitada');
    const parsed1 = JSON.parse(res1.body);
    assert.strictEqual(parsed1.length, 2);
    assert.strictEqual(res1.headers['access-control-allow-origin'], '*', 'CORS header deve estar presente');
    console.log('✓ Teste 1 passou: GET /api/users retornou 200 com delay e CORS');

    // Test 2: POST /api/users (201 Created)
    const res2 = await makeRequest(
      {
        hostname: 'localhost',
        port: 3099,
        path: '/api/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      JSON.stringify({ name: 'Charlie' })
    );
    assert.strictEqual(res2.statusCode, 201, 'POST /api/users deve retornar status 201');
    const parsed2 = JSON.parse(res2.body);
    assert.strictEqual(parsed2.id, 3);
    console.log('✓ Teste 2 passou: POST /api/users retornou 201');

    // Test 3: GET /api/users/99 (Route params substitution)
    const res3 = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/users/99',
      method: 'GET'
    });
    assert.strictEqual(res3.statusCode, 200);
    const parsed3 = JSON.parse(res3.body);
    assert.strictEqual(parsed3.id, '99', 'Parâmetro :id deve ter sido substituído');
    console.log('✓ Teste 3 passou: Parâmetro :id substituído com sucesso na resposta');

    // Test 4: PUT /api/users/42
    const res4 = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/users/42',
      method: 'PUT'
    });
    assert.strictEqual(res4.statusCode, 200);
    assert.strictEqual(JSON.parse(res4.body).updated, true);
    console.log('✓ Teste 4 passou: PUT /api/users/42 retornou 200');

    // Test 5: PATCH /api/users/42
    const res5 = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/users/42',
      method: 'PATCH'
    });
    assert.strictEqual(res5.statusCode, 200);
    assert.strictEqual(JSON.parse(res5.body).patched, true);
    console.log('✓ Teste 5 passou: PATCH /api/users/42 retornou 200');

    // Test 6: DELETE /api/users/42 (204 No Content)
    const res6 = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/users/42',
      method: 'DELETE'
    });
    assert.strictEqual(res6.statusCode, 204, 'DELETE deve retornar 204');
    assert.strictEqual(res6.body, '');
    console.log('✓ Teste 6 passou: DELETE /api/users/42 retornou 204 No Content');

    // Test 7: CORS OPTIONS Preflight
    const res7 = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/users',
      method: 'OPTIONS'
    });
    assert.strictEqual(res7.statusCode, 204);
    assert.strictEqual(res7.headers['access-control-allow-origin'], '*');
    assert.strictEqual(res7.headers['access-control-allow-methods'], 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    console.log('✓ Teste 7 passou: OPTIONS retornou preflight CORS 204');

    // Test 8: Hot-swap active response to 500
    testConfig.routes[0].activeResponseId = 'resp_500';
    server.updateConfig(testConfig);
    const res8 = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/users',
      method: 'GET'
    });
    assert.strictEqual(res8.statusCode, 500, 'Após troca de variante, deve retornar 500');
    assert.strictEqual(JSON.parse(res8.body).error, 'Internal Server Error');
    console.log('✓ Teste 8 passou: Troca de variante ativa para 500 funcionou em tempo real');

    // Test 9: 404 Route Not Found
    const res9 = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/rota-inexistente',
      method: 'GET'
    });
    assert.strictEqual(res9.statusCode, 404);
    console.log('✓ Teste 9 passou: Rota inexistente retornou 404 com JSON explicativo');

    // Test 10: Rota com Query Param esperado (?page=12) -> 200 OK
    const res10 = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/search?page=12',
      method: 'GET'
    });
    assert.strictEqual(res10.statusCode, 200, 'GET /api/search?page=12 deve retornar 200');
    assert.strictEqual(JSON.parse(res10.body).page, '12');
    console.log('✓ Teste 10 passou: Rota com Query Param esperado (?page=12) retornou 200 OK');

    // Test 11: Rota com Query Param ausente (/api/search sem ?page=12) -> 404
    const res11 = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/search',
      method: 'GET'
    });
    assert.strictEqual(res11.statusCode, 404, 'GET /api/search sem query param deve retornar 404');
    assert(res11.body.includes('Query param'), 'Resposta deve indicar motivo do 404');
    console.log('✓ Teste 11 passou: Rota com Query Param ausente retornou 404');

    // Test 12: Rota com Query Param de valor incorreto (?page=99) -> 404
    const res12 = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/search?page=99',
      method: 'GET'
    });
    assert.strictEqual(res12.statusCode, 404, 'GET /api/search?page=99 deve retornar 404');
    console.log('✓ Teste 12 passou: Rota com Query Param incorreto retornou 404');

    // Test 13: Rota com Query Param e Payload esperados -> 200 OK
    const res13 = await makeRequest(
      {
        hostname: 'localhost',
        port: 3099,
        path: '/api/auth/login?page=12',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      JSON.stringify({ usuario: 'teste', senha: '123' })
    );
    assert.strictEqual(res13.statusCode, 200, 'POST /api/auth/login?page=12 com payload correto deve retornar 200');
    assert.strictEqual(JSON.parse(res13.body).token, 'mock-token-xyz');
    console.log('✓ Teste 13 passou: Rota com Query Param e Payload corretos retornou 200 OK');

    // Test 14: Rota com Payload ausente -> 404
    const res14 = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/auth/login?page=12',
      method: 'POST'
    });
    assert.strictEqual(res14.statusCode, 404, 'POST /api/auth/login sem payload deve retornar 404');
    console.log('✓ Teste 14 passou: Rota com Payload ausente retornou 404');

    // Test 15: Rota com Payload incorreto (senha errada) -> 404
    const res15 = await makeRequest(
      {
        hostname: 'localhost',
        port: 3099,
        path: '/api/auth/login?page=12',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      JSON.stringify({ usuario: 'teste', senha: 'errada' })
    );
    assert.strictEqual(res15.statusCode, 404, 'POST /api/auth/login com payload incorreto deve retornar 404');
    console.log('✓ Teste 15 passou: Rota com Payload incorreto retornou 404');

    // Test 16: Desambiguação de rotas por Query Param (/products?type=vip vs /products)
    const res16Vip = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/products?type=vip',
      method: 'GET'
    });
    assert.strictEqual(res16Vip.statusCode, 200);
    assert.strictEqual(JSON.parse(res16Vip.body).category, 'vip');

    const res16All = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/products',
      method: 'GET'
    });
    assert.strictEqual(res16All.statusCode, 200);
    assert.strictEqual(JSON.parse(res16All.body).category, 'all');
    console.log('✓ Teste 16 passou: Desambiguação entre rotas específicas e genéricas por Query Params');

    // Test 17: Desambiguação de rotas por Payload (/sessions com role: admin vs role: user)
    const res17Admin = await makeRequest(
      {
        hostname: 'localhost',
        port: 3099,
        path: '/api/sessions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      JSON.stringify({ role: 'admin' })
    );
    assert.strictEqual(res17Admin.statusCode, 200);
    assert.strictEqual(JSON.parse(res17Admin.body).role, 'admin');

    const res17User = await makeRequest(
      {
        hostname: 'localhost',
        port: 3099,
        path: '/api/sessions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      JSON.stringify({ role: 'user' })
    );
    assert.strictEqual(res17User.statusCode, 200);
    assert.strictEqual(JSON.parse(res17User.body).role, 'user');
    console.log('✓ Teste 17 passou: Desambiguação entre rotas por Payload JSON recebido');

    console.log('\n🎉 TODOS OS 17 TESTES PASSARAM COM SUCESSO!');
  } finally {
    await server.stop();
    console.log('✓ Servidor de teste parado');
  }
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});
