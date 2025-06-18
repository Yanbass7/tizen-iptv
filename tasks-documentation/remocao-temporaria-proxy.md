# Remoção Temporária do Proxy do Sistema

## Objetivo
Remover temporariamente o uso do proxy do sistema para que a aplicação utilize as rotas normais diretamente.

## Arquivos Afetados
1. `src/services/authService.js` - Mudança do endpoint da API de autenticação
2. `src/utils/streamProxy.js` - Desabilitar conversão de URLs via proxy
3. `src/App.js` - Remover uso do proxy nos streams
4. `src/components/VideoPlayer.js` - Remover uso do proxy nos streams

## Alterações Realizadas

### 1. AuthService - Usar API direta
- ✅ Alteração do `getApiBaseUrl()` para endpoint direto `http://131.0.245.253:3001`
- ✅ Remoção da dependência do `proxyConfig`

### 2. StreamProxy - Desabilitar conversão
- ✅ Função `criarUrlProxyStream` retorna URL original sem conversão
- ✅ Mantém interface para compatibilidade

### 3. App.js - Remover proxy nos streams
- ✅ Remoção da conversão de URLs via proxy

### 4. VideoPlayer - Remover proxy nos streams  
- ✅ Remoção da conversão de URLs via proxy

## Status
- [ ] Em andamento
- ✅ Concluído

## Resumo das Alterações

### src/services/authService.js
```javascript
// ANTES:
import { getApiBaseUrl } from '../config/proxyConfig';
const API_BASE_URL = getApiBaseUrl();

// DEPOIS:
// Usando endpoint direto temporariamente (sem proxy)
const API_BASE_URL = 'http://131.0.245.253:3001';
```

### src/utils/streamProxy.js
```javascript
// ANTES:
import { convertStreamUrlViaProxy } from '../config/proxyConfig';
export const criarUrlProxyStream = (urlOriginal = '') => convertStreamUrlViaProxy(urlOriginal);

// DEPOIS:
// Temporariamente desabilitado - retorna URL original sem conversão via proxy
export const criarUrlProxyStream = (urlOriginal = '') => {
  return urlOriginal;
};
```

### src/App.js
```javascript
// ANTES:
const safeStreamUrl = criarUrlProxyStream(streamUrl);
console.log('🔒 URL após conversão de proxy (se aplicada):', safeStreamUrl);

// DEPOIS:
const safeStreamUrl = streamUrl; // criarUrlProxyStream(streamUrl);
console.log('🔒 URL sendo usada (proxy desabilitado):', safeStreamUrl);
```

### src/components/VideoPlayer.js
```javascript
// ANTES:
let streamUrlForPlayer = criarUrlProxyStream(url);

// DEPOIS:
let streamUrlForPlayer = url; // criarUrlProxyStream(url);
```

## Observações
- Alterações são temporárias e reversíveis
- Configuração do proxy permanece intacta para restauração futura
- Endpoints diretos podem ter problemas de CORS em produção
- Para reverter, basta descomentar as linhas comentadas e remover as linhas de endpoint direto 