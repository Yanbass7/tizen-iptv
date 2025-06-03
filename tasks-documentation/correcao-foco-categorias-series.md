# Correção do Bug de Foco nas Categorias - Series.js

## Descrição do Problema
A tela de séries possui um bug na navegação de categorias onde ao selecionar uma nova categoria, o foco visual não é removido da categoria anterior, resultando em múltiplas categorias aparentando estarem selecionadas simultaneamente.

## Análise do Problema
Após análise do código `src/components/Series.js`, identifiquei que o problema está na função `updateFocusVisual()` na linha 89-100:

```javascript
// Remover foco de todos os elementos
document.querySelectorAll('.serie, .series-category-button').forEach(el => {
  el.classList.remove('focused');
});
```

O problema está no seletor CSS `.series-category-button` - este seletor não corresponde às classes reais dos botões de categoria, que são renderizados com a classe `.category-button`.

## Solução Implementada
Corrigido o seletor CSS na função `updateFocusVisual` para usar `.category-button` em vez de `.series-category-button`.

### Alteração Realizada
```javascript
// ANTES:
document.querySelectorAll('.serie, .series-category-button').forEach(el => {
  el.classList.remove('focused');
});

// DEPOIS:
document.querySelectorAll('.serie, .category-button').forEach(el => {
  el.classList.remove('focused');
});
```

## Arquivos Afetados
- `src/components/Series.js` - linha 90

## Status
- [x] Corrigir seletor CSS na função updateFocusVisual
- [x] Verificar se o foco é removido corretamente da categoria anterior
- [x] Tarefa concluída com sucesso

## Resultado
Agora o foco visual será corretamente removido da categoria anterior quando uma nova categoria for selecionada, eliminando o bug de múltiplas categorias aparentando estarem selecionadas. 