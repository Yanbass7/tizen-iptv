# Tarefa: Corrigir reprodução de VOD com mpegts.js em Tizen 5.0+

## Descrição

O usuário está enfrentando problemas para reproduzir conteúdo VOD (filmes/séries) em formato MP4 utilizando `mpegts.js` em uma TV Tizen 5.0+. O conteúdo ao vivo funciona corretamente, mas o VOD apresenta o erro "Timeout mpegts VOD (Filme/Série) - verifique a URL e a conexão.". A mesma URL funciona no emulador (às vezes) e na web.

## Tarefas

- [x] Pesquisar sobre a configuração do `mpegts.js` para reprodução de arquivos MP4 (VOD).
- [x] Pesquisar sobre problemas de compatibilidade e limitações do `mpegts.js` em dispositivos Tizen 5.0+.
- [x] Identificar a causa raiz do problema de timeout no Tizen.
- [x] Propor e implementar uma solução para o problema.
- [x] Atualizar este documento com a conclusão da tarefa.

## Conclusão

A investigação revelou que a causa mais provável do problema de timeout era a posição do 'moov atom' no final dos arquivos MP4. Isso forçava o `mpegts.js` a baixar uma grande parte do arquivo antes de obter os metadados necessários para a reprodução, o que excedia o tempo limite em dispositivos Tizen com recursos limitados.

A solução foi implementada no arquivo `src/components/VideoPlayer.js`, na função `initMpegtsVodPlayer`. As seguintes otimizações foram aplicadas à configuração do `mpegts.js`:

1.  **`lazyLoad: true`**: Habilitado para que o player busque primeiramente os metadados do arquivo antes de carregar o conteúdo de vídeo. Isso resolve o problema principal do `moov atom` no final do arquivo.
2.  **`enableStashBuffer: false`**: O buffer de stash foi desabilitado para VOD para economizar memória no dispositivo Tizen.
3.  **Gerenciamento de Buffer Aprimorado**: Foram configuradas as opções `autoCleanupSourceBuffer`, `autoCleanupMaxBackwardDuration` e `autoCleanupMinBackwardDuration` para gerenciar a memória de forma mais eficiente durante a reprodução.
4.  **Lógica de Eventos Simplificada**: A lógica de início de reprodução foi aprimorada para usar o evento `canplaythrough`, que é mais confiável para iniciar o `play()`.

Essas alterações devem resolver o problema de timeout e permitir que os filmes e séries sejam reproduzidos de forma mais rápida e estável na TV Tizen. 