# Tarefa: Corrigir Playback de Filmes

## Descrição
O playback de filmes, iniciado a partir do componente `MoviePreview.js`, não está funcionando. A tela fica preta e a requisição do vídeo não é feita. O playback de séries funciona normalmente.

## Passos

- [x] Analisar o componente `MoviePreview.js` para entender como o evento de play é disparado.
- [x] Investigar como o evento `playContent` é tratado na aplicação.
- [x] Comparar o fluxo de reprodução de filmes com o de séries para identificar a divergência.
- [x] Corrigir o problema para que a reprodução de filmes volte a funcionar.
- [x] Marcar esta tarefa como concluída.

## Conclusão
O problema foi resolvido. A `stream_url` no `MoviePreview.js` não estava sendo construída corretamente. A correção envolveu adicionar as credenciais da API e montar a URL completa do stream, de forma similar ao que é feito para a reprodução de séries, adicionando a extensão `.mp4`. 