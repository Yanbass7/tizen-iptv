# Correção de Erro React Hooks - VideoPlayer.js

## Problema Identificado
- **Arquivo:** `src/components/VideoPlayer.js`
- **Linha:** 1214
- **Erro:** `React Hook "useEffect" is called conditionally. React Hooks must be called in the exact same order in every component render.`

## Causa do Problema
O componente `VideoPlayer` possui um `return null` condicional na linha 1175:
```javascript
if (!isActive) return null;
```

Este return está sendo executado **antes** do `useEffect` na linha 1214, o que viola a regra fundamental dos React Hooks de que eles devem sempre ser chamados na mesma ordem.

## Solução Implementada
1. **Movido o `useEffect`** das linhas 1214-1256 para **antes** do `return null` condicional
2. **Movidas as funções helper** (`handlePlayPause`, `handleSeek`, `formatTime`) para antes do return condicional
3. **Definida a variável `isVOD`** dentro do `useEffect` para evitar dependências desnecessárias
4. **Atualizada a lista de dependências** do `useEffect` de `[isActive, isVOD]` para `[isActive, streamInfo]`

## Código Corrigido
```javascript
// Event listeners para tempo e duração (MOVIDO PARA ANTES DO RETURN CONDICIONAL)
useEffect(() => {
  const videoElement = videoRef.current;
  const isVOD = streamInfo?.type === 'movie' || streamInfo?.type === 'series';
  
  // O efeito só deve anexar listeners se o componente estiver ativo, for VOD, e o elemento de vídeo existir
  if (isActive && isVOD && videoElement) {
    // ... lógica do effect
  } else {
    // Se não estiver ativo ou não for VOD, garantir que currentTime e duration sejam resetados.
    setCurrentTime(0);
    setDuration(0);
  }
}, [isActive, streamInfo]); // Dependências atualizadas

// Funções helper movidas para antes do return condicional
const isVOD = streamInfo?.type === 'movie' || streamInfo?.type === 'series';
// ... outras funções

if (!isActive) return null;
```

## Resultados
✅ **Build executado com sucesso** - O erro específico `React Hook "useEffect" is called conditionally` não aparece mais na saída do ESLint.

✅ **Hooks sempre executados na mesma ordem** - Todos os hooks agora são executados antes de qualquer return condicional.

✅ **Funcionalidade preservada** - A lógica do componente permanece inalterada, apenas reorganizada.

## Status
- [x] Identificação do problema
- [x] Criação da documentação
- [x] Implementação da correção
- [x] Teste da solução
- [x] **Conclusão da tarefa**

## Observações
O build ainda mostra outros warnings do ESLint (variáveis não utilizadas, dependências missing em outros hooks, etc.), mas o **erro crítico de React Hooks foi completamente resolvido**. 