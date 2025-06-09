# Remoção do Player HTML5 Nativo

Esta tarefa remove o uso do player de vídeo HTML5 nativo, padronizando o uso dos players customizados `mpegts.js` para streams ao vivo e `Shaka Player` para conteúdo VOD (Vídeo On Demand).

## Tarefas

- [x] Modificar a função `detectPlayerType` para não selecionar mais o player HTML5.
- [x] Remover a função `initHtml5PlayerDirect` que inicializava o player HTML5.
- [x] Limpar as chamadas à lógica do player HTML5 na função `initPlayer`.
- [x] Marcar esta tarefa como concluída. 