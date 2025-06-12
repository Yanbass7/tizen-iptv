# Implementação do Passo 3 – Integração do Proxy HTTPS no Frontend

> **Status:** Em progresso

## Objetivo

Garantir que todo o tráfego do aplicativo React passe pelo novo proxy seguro (`HTTPS`) hospedado em `Duck DNS`, eliminando erros de _Mixed Content_ e preparando a aplicação para receber a URL do proxy vinda do backend.

## Resumo Técnico
1. Substituir as chamadas ao backend interno (`http://131.0.245.253:3001`) para utilizar o proxy: `https://<dominio-duckdns>/api/…`.
2. Criar utilitário que converta URLs de stream geradas em `HTTP` para o formato seguro via proxy:  `https://<dominio-duckdns>/stream/<IP>/<path>`.
3. Centralizar a configuração do domínio do proxy em um único arquivo de configuração (ou variável de ambiente) para permitir ajustes futuros sem alterar múltiplos pontos de código.
4. Refatorar pontos de geração de URL e garantir retro-compatibilidade.

## Passos Detalhados

1. **Arquivo de Configuração**
   - Criar `src/config/proxyConfig.js` exportando:
     ```js
     export const PROXY_DOMAIN = 'https://bigtv-proxy-teste.duckdns.org';
     export const API_BASE_URL = `${PROXY_DOMAIN}/api`;
     ```
   - (Opcional) Ler este domínio de `process.env.REACT_APP_PROXY_DOMAIN` para facilitar _deploys_ futuros.

2. **Refatorar `authService.js`**
   - Substituir `API_BASE_URL` antigo pelo novo `API_BASE_URL` importado de `proxyConfig.js`.

3. **Função de Conversão de Stream**
   - Implementar em `src/utils/streamProxy.js`:
     ```js
     import { PROXY_DOMAIN } from '../config/proxyConfig';

     export const criarUrlProxyStream = (urlOriginal = '') => {
       if (!urlOriginal.startsWith('http://')) return urlOriginal; // já seguro ou inválido
       const urlSemProtocolo = urlOriginal.slice(7); // remove 'http://'
       return `${PROXY_DOMAIN}/stream/${urlSemProtocolo}`;
     };
     ```

4. **Interceptar Evento `playContent`** (`src/App.js`)
   - Antes de chamar `setPlayerData`, converter a URL:
     ```js
     const safeUrl = criarUrlProxyStream(streamUrl);
     setPlayerData({ streamUrl: safeUrl, … })
     ```

5. **Ajustar `VideoPlayer` (se necessário)**
   - Remover/consolidar lógica redundante de troca `HTTP→HTTPS` já que a URL chegará pronta.

6. **Testes Manuais**
   - Local: `npm start` (URLs já devem vir em _HTTPS_).
   - Produção: build + deploy Firebase/hosting.
   - Verificar no DevTools: nenhuma requisição `HTTP` deve aparecer.

## Pendências / Dúvidas
**Todas esclarecidas!**

## Conclusão Parcial
Implementação aplicada em:
1. `src/config/proxyConfig.js` – criação do módulo central de proxy.
2. `src/utils/streamProxy.js` – utilitário de conversão.
3. `src/services/authService.js` – agora usa domínio do proxy.
4. `src/App.js` – converte URLs antes de entrar no player.

> **Status:** Concluído ✅ 