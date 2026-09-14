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

    console.log('\n🎉 TODOS OS 9 TESTES PASSARAM COM SUCESSO!');
  } finally {
    await server.stop();
    console.log('✓ Servidor de teste parado');
  }
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});
