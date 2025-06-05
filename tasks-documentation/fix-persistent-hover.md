# Tarefa: Corrigir Efeito de Hover Persistente

Esta tarefa corrige um bug visual nas páginas de Filmes, Séries e Canais onde o destaque de foco (hover) permanecia em um card após a navegação para outro.

## Problema Identificado

O código responsável por destacar o item focado (`filme`, `série` ou `canal`) adicionava uma classe CSS (`focused`) ao elemento, mas não a removia do elemento que anteriormente estava em foco. Isso resultava em múltiplos cards aparecendo como "acesos" ou selecionados ao mesmo tempo.

## Solução Aplicada

A correção foi implementada nos `useEffect` de controle de foco dos seguintes componentes:

- `src/components/Movies.js`
- `src/components/Series.js`
- `src/components/Channels.js`

A lógica foi alterada para que, no início de cada execução do `useEffect`, a classe `focused` seja removida de **todos** os itens (tanto das categorias quanto dos cards de conteúdo). Somente depois disso, a classe é adicionada ao item que está atualmente em foco.

Isso garante que apenas um item por vez tenha o destaque visual, resolvendo o problema do "hover aceso".

## Status

- [x] Identificar a causa do problema.
- [x] Implementar a correção nos arquivos afetados.
- [x] Marcar a tarefa como concluída. 