export type SupportedLocale = 'en' | 'pt-br' | 'es';

export interface WebviewTranslations {
  server: string;
  saved: string;
  unsaved: string;
  save: string;
  saveChangesTitle: string;
  noRouteSelected: string;
  noRouteSelectedDesc: string;
  httpMethod: string;
  routePath: string;
  copyUrl: string;
  copyUrlTitle: string;
  curl: string;
  curlTitle: string;
  requestTab: string;
  responsesTab: string;
  endpoint: string;
  pathParameters: string;
  expectedQueryParams: string;
  addParameter: string;
  requestHeaders: string;
  addHeader: string;
  expectedRequestBody: string;
  empty: string;
  formatJson: string;
  objectExample: string;
  clear: string;
  requestBodyPlaceholder: string;
  routeResponses: string;
  newResponse: string;
  identification: string;
  responseNamePlaceholder: string;
  setActiveResponseTitle: string;
  duplicateResponseTitle: string;
  deleteResponseTitle: string;
  statusCode: string;
  simulatedLatency: string;
  customStatus: string;
  customStatusPlaceholder: string;
  responseHeaders: string;
  responseBody: string;
  validJson: string;
  invalidJson: string;
  arrayExample: string;
  responseBodyPlaceholder: string;
  newServerTitle: string;
  newServerSubtitle: string;
  serverName: string;
  serverNameHelp: string;
  serverNamePlaceholder: string;
  serverPort: string;
  serverPortHelp: string;
  serverPrefix: string;
  serverPrefixHelp: string;
  serverPrefixPlaceholder: string;
  enableCors: string;
  enableCorsDesc: string;
  cancel: string;
  keyHeader: string;
  valueHeader: string;
  savedSuccessfully: string;
  urlCopied: string;
  curlCopied: string;
  atLeastOneResponseRequired: string;
  confirmDeleteResponse: string;
  nameAndPortRequired: string;
  portRangeError: string;
  noServer: string;
  newServer: string;
  portInUse: string;
  formatError: string;
  serverCreated: string;
  serverSaveFailed: string;
  configSaved: string;
}

export const translations: Record<SupportedLocale, WebviewTranslations> = {
  en: {
    server: 'Server',
    saved: 'Saved',
    unsaved: 'Unsaved changes',
    save: 'Save',
    saveChangesTitle: 'Save changes to disk (Ctrl+S)',
    noRouteSelected: 'No route selected',
    noRouteSelectedDesc: 'Create or select a route in the sidebar to configure mocks.',
    httpMethod: 'HTTP Method',
    routePath: 'Route Path (e.g. /users/:id)',
    copyUrl: 'Copy URL',
    copyUrlTitle: 'Copy full endpoint URL for Insomnia/Postman/curl',
    curl: 'cURL',
    curlTitle: 'Copy full cURL command',
    requestTab: 'Request',
    responsesTab: 'Responses',
    endpoint: 'Endpoint:',
    pathParameters: 'Path Parameters:',
    expectedQueryParams: 'Expected Query Parameters',
    addParameter: 'Add Parameter',
    requestHeaders: 'Request Headers',
    addHeader: 'Add Header',
    expectedRequestBody: 'Expected Request Body (Payload)',
    empty: 'Empty',
    formatJson: 'Format JSON',
    objectExample: 'Object Example',
    clear: 'Clear',
    requestBodyPlaceholder: 'Example JSON payload expected in client request...',
    routeResponses: 'Route Responses',
    newResponse: 'New Response',
    identification: 'Identification:',
    responseNamePlaceholder: 'e.g. Success',
    setActiveResponseTitle: 'Set as active response',
    duplicateResponseTitle: 'Duplicate this response',
    deleteResponseTitle: 'Delete this response',
    statusCode: 'Status Code:',
    simulatedLatency: 'Simulated Latency (Delay):',
    customStatus: 'Custom...',
    customStatusPlaceholder: 'Code (e.g. 418)',
    responseHeaders: 'Response Headers',
    responseBody: 'Response Body (Payload)',
    validJson: 'Valid JSON',
    invalidJson: 'Invalid JSON',
    arrayExample: 'Array Example',
    responseBodyPlaceholder: 'Enter returned JSON or text...',
    newServerTitle: 'Register New Mock Server',
    newServerSubtitle: 'Configure port, prefix, and CORS settings to create a new mock server.',
    serverName: 'Server Name',
    serverNameHelp: 'A descriptive name to identify this server in the sidebar.',
    serverNamePlaceholder: 'e.g. Payments API, Auth Service...',
    serverPort: 'HTTP Port',
    serverPortHelp: 'Local port (between 1024 and 65535). E.g. 3000, 8080.',
    serverPrefix: 'Global Prefix (optional)',
    serverPrefixHelp: 'Prefix added before all routes of this server.',
    serverPrefixPlaceholder: 'e.g. /api or /v1',
    enableCors: 'Enable CORS automatically',
    enableCorsDesc: 'Adds Access-Control-Allow-Origin headers and responds to preflight OPTIONS requests.',
    cancel: 'Cancel',
    keyHeader: 'Header / Key',
    valueHeader: 'Value',
    savedSuccessfully: 'Saved successfully!',
    urlCopied: 'Endpoint URL copied to clipboard!',
    curlCopied: 'cURL command copied to clipboard!',
    atLeastOneResponseRequired: 'At least one response is required.',
    confirmDeleteResponse: 'Are you sure you want to delete this response?',
    nameAndPortRequired: 'Server name and port are required.',
    portRangeError: 'Port must be a number between 1024 and 65535.',
    noServer: 'No server',
    newServer: 'New Server',
    portInUse: 'Port {port} is already in use by server "{name}". Choose another port.',
    formatError: 'Unable to format: JSON contains syntax errors.',
    serverCreated: 'Server "{name}" created successfully{port}!',
    serverSaveFailed: 'Failed to save server: {error}',
    configSaved: 'Settings saved successfully!'
  },
  'pt-br': {
    server: 'Servidor',
    saved: 'Salvo',
    unsaved: 'Alterações não salvas',
    save: 'Salvar',
    saveChangesTitle: 'Salvar alterações no disco (Ctrl+S)',
    noRouteSelected: 'Nenhuma rota selecionada',
    noRouteSelectedDesc: 'Crie ou selecione uma rota na barra lateral para começar a configurar os mocks.',
    httpMethod: 'Verbo HTTP',
    routePath: 'Caminho da Rota (ex: /users/:id)',
    copyUrl: 'Copiar URL',
    copyUrlTitle: 'Copiar URL completa para usar no Insomnia/Postman',
    curl: 'cURL',
    curlTitle: 'Copiar comando cURL completo',
    requestTab: 'Requisição (Request)',
    responsesTab: 'Respostas (Responses)',
    endpoint: 'Endpoint:',
    pathParameters: 'Parâmetros de Rota (Path Parameters):',
    expectedQueryParams: 'Query Parameters esperados',
    addParameter: 'Adicionar Parâmetro',
    requestHeaders: 'Headers da Requisição',
    addHeader: 'Adicionar Header',
    expectedRequestBody: 'Corpo Esperado da Requisição (Payload / Exemplo de Envio)',
    empty: 'Vazio',
    formatJson: 'Formatar JSON',
    objectExample: 'Exemplo Objeto',
    clear: 'Limpar',
    requestBodyPlaceholder: 'Exemplo do JSON esperado na requisição enviada pelo cliente...',
    routeResponses: 'Respostas da Rota',
    newResponse: 'Nova Resposta',
    identification: 'Identificação:',
    responseNamePlaceholder: 'ex: Sucesso',
    setActiveResponseTitle: 'Definir como resposta ativa',
    duplicateResponseTitle: 'Duplicar esta resposta',
    deleteResponseTitle: 'Excluir esta resposta',
    statusCode: 'Status Code:',
    simulatedLatency: 'Latência Simulada (Delay):',
    customStatus: 'Outro...',
    customStatusPlaceholder: 'Código (ex: 418)',
    responseHeaders: 'Headers de Resposta',
    responseBody: 'Corpo da Resposta (Payload)',
    validJson: 'JSON Válido',
    invalidJson: 'JSON Inválido',
    arrayExample: 'Exemplo Lista',
    responseBodyPlaceholder: 'Digite o JSON ou texto retornado...',
    newServerTitle: 'Cadastrar Novo Servidor Mock',
    newServerSubtitle: 'Defina as configurações de porta, prefixo e CORS para criar um novo servidor.',
    serverName: 'Nome do Servidor',
    serverNameHelp: 'Um nome descritivo para identificar este servidor no painel.',
    serverNamePlaceholder: 'ex: API de Pagamentos, Auth Service...',
    serverPort: 'Porta HTTP',
    serverPortHelp: 'Porta local (entre 1024 e 65535). Ex: 3000, 8080.',
    serverPrefix: 'Prefixo Global (opcional)',
    serverPrefixHelp: 'Prefixo adicionado antes de todas as rotas deste servidor.',
    serverPrefixPlaceholder: 'ex: /api ou /v1',
    enableCors: 'Habilitar CORS automaticamente',
    enableCorsDesc: 'Adiciona cabeçalhos Access-Control-Allow-Origin e responde automaticamente a requisições OPTIONS pré-voo (pre-flight).',
    cancel: 'Cancelar',
    keyHeader: 'Header / Chave',
    valueHeader: 'Valor',
    savedSuccessfully: 'Salvo com sucesso!',
    urlCopied: 'URL copiada para a área de transferência!',
    curlCopied: 'Comando cURL copiado para a área de transferência!',
    atLeastOneResponseRequired: 'É necessário manter pelo menos uma resposta configurada.',
    confirmDeleteResponse: 'Tem certeza de que deseja excluir esta resposta?',
    nameAndPortRequired: 'Nome e porta do servidor são obrigatórios.',
    portRangeError: 'A porta deve ser um número válido entre 1024 e 65535.',
    noServer: 'Nenhum servidor',
    newServer: 'Novo Servidor',
    portInUse: 'A porta {port} já está sendo utilizada pelo servidor "{name}". Escolha outra porta.',
    formatError: 'Não foi possível formatar: JSON contém erros de sintaxe.',
    serverCreated: 'Servidor "{name}" criado com sucesso{port}!',
    serverSaveFailed: 'Falha ao salvar servidor: {error}',
    configSaved: 'Configurações salvas com sucesso!'
  },
  es: {
    server: 'Servidor',
    saved: 'Guardado',
    unsaved: 'Cambios no guardados',
    save: 'Guardar',
    saveChangesTitle: 'Guardar cambios en disco (Ctrl+S)',
    noRouteSelected: 'Ninguna ruta seleccionada',
    noRouteSelectedDesc: 'Cree o seleccione una ruta en la barra lateral para configurar mocks.',
    httpMethod: 'Método HTTP',
    routePath: 'Ruta del Endpoint (ej: /users/:id)',
    copyUrl: 'Copiar URL',
    copyUrlTitle: 'Copiar URL completa para Insomnia/Postman',
    curl: 'cURL',
    curlTitle: 'Copiar comando cURL completo',
    requestTab: 'Petición (Request)',
    responsesTab: 'Respuestas (Responses)',
    endpoint: 'Endpoint:',
    pathParameters: 'Parámetros de Ruta (Path Parameters):',
    expectedQueryParams: 'Query Parameters esperados',
    addParameter: 'Agregar Parámetro',
    requestHeaders: 'Headers de la Petición',
    addHeader: 'Agregar Header',
    expectedRequestBody: 'Cuerpo Esperado de la Petición (Payload)',
    empty: 'Vacío',
    formatJson: 'Formatear JSON',
    objectExample: 'Ejemplo Objeto',
    clear: 'Limpiar',
    requestBodyPlaceholder: 'Ejemplo de JSON esperado en la petición del cliente...',
    routeResponses: 'Respuestas de la Ruta',
    newResponse: 'Nueva Respuesta',
    identification: 'Identificación:',
    responseNamePlaceholder: 'ej: Éxito',
    setActiveResponseTitle: 'Establecer como respuesta activa',
    duplicateResponseTitle: 'Duplicar esta respuesta',
    deleteResponseTitle: 'Eliminar esta respuesta',
    statusCode: 'Status Code:',
    simulatedLatency: 'Latencia Simulada (Delay):',
    customStatus: 'Otro...',
    customStatusPlaceholder: 'Código (ej: 418)',
    responseHeaders: 'Headers de Respuesta',
    responseBody: 'Cuerpo de la Respuesta (Payload)',
    validJson: 'JSON Válido',
    invalidJson: 'JSON Inválido',
    arrayExample: 'Ejemplo Lista',
    responseBodyPlaceholder: 'Ingrese el JSON o texto devuelto...',
    newServerTitle: 'Registrar Nuevo Servidor Mock',
    newServerSubtitle: 'Configure el puerto, prefijo y CORS para crear un nuevo servidor.',
    serverName: 'Nombre del Servidor',
    serverNameHelp: 'Un nombre descriptivo para identificar este servidor en el panel.',
    serverNamePlaceholder: 'ej: API de Pagos, Auth Service...',
    serverPort: 'Puerto HTTP',
    serverPortHelp: 'Puerto local (entre 1024 y 65535). Ej: 3000, 8080.',
    serverPrefix: 'Prefijo Global (opcional)',
    serverPrefixHelp: 'Prefijo añadido antes de todas las rutas de este servidor.',
    serverPrefixPlaceholder: 'ej: /api o /v1',
    enableCors: 'Habilitar CORS automáticamente',
    enableCorsDesc: 'Añade encabezados Access-Control-Allow-Origin y responde a peticiones OPTIONS pre-flight.',
    cancel: 'Cancelar',
    keyHeader: 'Header / Clave',
    valueHeader: 'Valor',
    savedSuccessfully: '¡Guardado con éxito!',
    urlCopied: '¡URL copiada al portapapeles!',
    curlCopied: '¡Comando cURL copiado al portapapeles!',
    atLeastOneResponseRequired: 'Es necesario mantener al menos una respuesta configurada.',
    confirmDeleteResponse: '¿Está seguro de que desea eliminar esta respuesta?',
    nameAndPortRequired: 'El nombre y el puerto del servidor son obligatorios.',
    portRangeError: 'El puerto debe ser un número válido entre 1024 y 65535.',
    noServer: 'Ningún servidor',
    newServer: 'Nuevo Servidor',
    portInUse: 'El puerto {port} ya está siendo utilizado por el servidor "{name}". Elija otro puerto.',
    formatError: 'No se pudo formatear: el JSON contiene errores de sintaxis.',
    serverCreated: '¡Servidor "{name}" creado con éxito{port}!',
    serverSaveFailed: 'Error al guardar el servidor: {error}',
    configSaved: '¡Configuraciones guardadas con éxito!'
  }
};

export function resolveLocale(lang?: string): SupportedLocale {
  if (!lang) return 'en';
  const lower = lang.toLowerCase();
  if (lower.startsWith('pt')) return 'pt-br';
  if (lower.startsWith('es')) return 'es';
  return 'en';
}

export function getTranslations(lang?: string): WebviewTranslations {
  const locale = resolveLocale(lang);
  return translations[locale];
}
