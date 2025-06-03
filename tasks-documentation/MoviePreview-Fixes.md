# Tarefa: Corrigir MoviePreview.js

**Status:** Em andamento

**Descrição:** Aplicar duas correções ao componente `MoviePreview.js`:
1.  Corrigir a URL de streaming para que os filmes possam ser reproduzidos.
2.  Ajustar o layout para que o preview cubra a tela inteira, similar ao `SeriesDetailsPage.js`.

**Passos:**
1.  Modificar a construção da `streamUrl` na função `handleAction` em `src/components/MoviePreview.js` para o formato correto: `https://rota66.bar/movie/username/password/idmovie.mp4`.
2.  Analisar e sugerir/aplicar alterações de CSS para que `.movie-details-page` ocupe a tela inteira quando ativo.
3.  Marcar a tarefa como concluída após os testes.

**Observação para CSS:**
Para fazer o `.movie-details-page` cobrir a tela inteira, considere adicionar os seguintes estilos ao CSS correspondente:
```css
.movie-details-page {
  position: fixed; /* Ou absolute */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
``` 