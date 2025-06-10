# Tarefa: Resolução de Erro de Conteúdo Misto com mpegts.js

## Descrição

O player de vídeo, ao usar `mpegts.js` para canais ao vivo, encontrava um erro de "Mixed Content" (conteúdo misto) em produção (HTTPS). Isso ocorria porque o servidor de streaming redirecionava de uma URL HTTPS para uma URL HTTP, e o navegador bloqueava a requisição, impedindo a reprodução do canal.

## Passos para Resolução

1.  **Identificação do Problema**: A análise dos logs do console mostrou claramente o erro de conteúdo misto, onde uma página segura (HTTPS) tentava carregar um recurso inseguro (HTTP).

2.  **Modificação do Player para Canais Ao Vivo**: Foi implementada uma lógica no `VideoPlayer.js`, especificamente na função `initMpegtsLivePlayer`, para interceptar e corrigir as URLs antes de serem passadas para o `mpegts.js`.

3.  **Implementação da Solução**:
    *   Antes de inicializar o player, a aplicação agora faz uma requisição `fetch` para a URL do stream.
    *   Isso resolve qualquer redirecionamento e nos dá a URL final.
    *   Se a URL final for um manifesto de playlist (como `.m3u8`), o conteúdo do manifesto é lido.
    *   Todas as ocorrências de `http://` dentro do manifesto são substituídas por `https://`.
    *   Um `Blob` é criado com o manifesto modificado, e uma URL de `Blob` é gerada (`URL.createObjectURL`).
    *   Essa URL de `Blob` é então passada para o `mpegts.js`, garantindo que todas as requisições subsequentes para os segmentos de vídeo sejam feitas via HTTPS.
    *   Se a URL final não for um manifesto, mas ainda for `http`, o protocolo é simplesmente trocado para `https`.
    *   Um mecanismo de fallback foi incluído para usar a URL original caso o processo de correção falhe.

## Status

- [x] Problema identificado.
- [x] Solução implementada em `src/components/VideoPlayer.js`.
- [x] Testes de validação em ambiente de produção.
- [x] Concluído.

*Este documento será atualizado para "Concluído" assim que a tarefa for validada.* 