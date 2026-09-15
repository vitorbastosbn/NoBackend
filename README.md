# NoBackend - Mock Server for VS Code

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/vitorbastosbn/NoBackend)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/vitorbastosbn/NoBackend/blob/main/LICENSE)
[![GitHub Repository](https://img.shields.io/badge/GitHub-vitorbastosbn%2FNoBackend-181717.svg?logo=github)](https://github.com/vitorbastosbn/NoBackend)
[![Author](https://img.shields.io/badge/Author-Vitor%20Bastos-blueviolet.svg?logo=github)](https://github.com/vitorbastosbn)

Crie e gerencie servidores mock locais completos com rotas HTTP (GET, POST, PUT, PATCH, DELETE), status codes personalizados, latência simulada e CORS direto no VS Code.

Create and manage full local mock servers with HTTP routes (GET, POST, PUT, PATCH, DELETE), custom status codes, simulated latency, and CORS directly inside VS Code.

Cree y administre servidores mock locales completos con rutas HTTP (GET, POST, PUT, PATCH, DELETE), códigos de estado personalizados, latencia simulada y CORS directamente en VS Code.

---

![NoBackend Interface](media/screenshot.png)

---

## Visão Geral

O **NoBackend** é uma extensão projetada para acelerar o desenvolvimento frontend e de integração. Elimina a dependência de APIs externas em desenvolvimento ou ferramentas separadas: servidores mock HTTP são executados diretamente a partir do workspace do VS Code, com suporte a múltiplas portas, respostas variantes em tempo real e regras estritas de correspondência de requisições.

---

## Recursos Principais

### Gerenciamento Visual de Servidores e Rotas
- Configuração de múltiplos servidores locais em portas distintas (ex: 3000, 3001, 8080).
- Editor dedicado para endpoints com prefixos globais configuráveis (ex: `/api`, `/v1`).
- Alternância rápida para iniciar, parar e reiniciar instâncias de servidor individualmente ou em lote.

### Métodos HTTP e Pre-flight CORS
- Suporte nativo aos verbos `GET`, `POST`, `PUT`, `PATCH`, `DELETE` e `OPTIONS`.
- Tratamento automático de requisições pré-voo (CORS Pre-flight) e cabeçalhos `Access-Control-Allow-Origin: *` ativáveis por servidor.

### Variantes de Resposta por Endpoint
- Definição de múltiplos cenários para a mesma rota (ex: `200 Sucesso`, `400 Validação Incorreta`, `404 Não Encontrado`, `500 Erro Interno`).
- Alternância instantânea da resposta ativa sem necessidade de reiniciar o servidor mock.
- Suporte a status codes padronizados e códigos customizados (100 a 599).

### Latência Simulada (Delay)
- Configuração de atraso em milissegundos por variante de resposta para validação de loading states, spinners e políticas de timeout no cliente.

### Parâmetros Dinâmicos e Validação de Requisições
- Extração de parâmetros de rota (ex: `/users/:id`) com interpolação dinâmica no corpo da resposta (`:id` ou `{{id}}`).
- Interpolação de query parameters no payload retornado (`{{query.param}}`).
- Validação opcional de cabeçalhos, parâmetros de consulta e payload JSON recebidos.

### Persistência no Workspace
- Armazenamento em `.nobackend/servers.json` na raiz do projeto.
- Configurações compartilháveis via controle de versão (Git) com toda a equipe.

### Internacionalização Nativa (i18n)
- Suporte completo a três idiomas:
  - **Inglês (English)**
  - **Português do Brasil (Portuguese - Brazil)**
  - **Espanhol (Español)**
- Detecção automática baseada no idioma ativo do VS Code (`vscode.env.language`).

---

## Guia de Uso

### 1. Acessando a Extensão
- Clique no ícone do **NoBackend** na Barra de Atividades (Activity Bar) lateral do VS Code.
- A árvore de servidores exibirá os servidores configurados e suas respectivas rotas.

### 2. Criando um Novo Servidor
- Na barra de títulos da visão lateral, clique no botão `+` (Adicionar Novo Servidor).
- Informe o nome descritivo, porta desejada (ex: 3000), prefixo opcional (ex: `/api`) e confirme.

### 3. Adicionando e Editando Rotas
- Clique no botão `+` em um servidor para criar uma rota.
- Clique sobre a rota na árvore lateral para abrir a tela de configuração.
- Defina o método HTTP, o caminho do endpoint e configure as variantes de resposta com status code, delay e payload JSON.

### 4. Chamando o Endpoint
Execute chamadas HTTP diretamente pelo seu terminal, cliente REST (Insomnia, Postman) ou aplicação frontend:

```bash
# Listar usuários (GET)
curl -i http://localhost:3000/api/users

# Criar usuário (POST)
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Novo Usuário", "email": "usuario@exemplo.com"}'

# Consultar usuário específico por ID
curl -i http://localhost:3000/api/users/42
```

---

## Estrutura do Arquivo de Configuração

As configurações são mantidas em `.nobackend/servers.json`:

```json
{
  "version": "1.0.0",
  "servers": [
    {
      "id": "srv_users_3000",
      "name": "API Principal",
      "port": 3000,
      "prefix": "/api",
      "cors": true,
      "enabled": true,
      "routes": [
        {
          "id": "route_get_users",
          "path": "/users/:id",
          "method": "GET",
          "activeResponseId": "resp_200",
          "responses": [
            {
              "id": "resp_200",
              "name": "200 Sucesso",
              "statusCode": 200,
              "delay": 50,
              "headers": {
                "Content-Type": "application/json"
              },
              "body": "{\n  \"id\": \":id\",\n  \"name\": \"Maria Silva\"\n}"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Informações do Projeto e Desenvolvedor

- **Repositório:** [https://github.com/vitorbastosbn/NoBackend](https://github.com/vitorbastosbn/NoBackend)
- **Problemas / Sugestões (Issues):** [https://github.com/vitorbastosbn/NoBackend/issues](https://github.com/vitorbastosbn/NoBackend/issues)
- **Desenvolvedor:** [Vitor Bastos](https://github.com/vitorbastosbn) (`vitorbastosbn@gmail.com`)

---

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para obter mais informações.

Copyright (c) 2026 Vitor Bastos.
