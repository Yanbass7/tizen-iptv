# Melhoria: Navegação por Controle Remoto nos Controles VOD

## Problema Reportado
O usuário não consegue selecionar os botões de controle VOD (retroceder, play/pause, avançar) utilizando o controle remoto da TV no componente `VideoPlayer.js`.

## Causa Provável
Os botões de controle VOD atualmente não possuem gerenciamento de foco adequado para navegação via controle remoto.

## Solução Implementada
1.  **Referências e Estado para Foco Adicionados**:
    *   Criadas `useRef` para os botões: `rewindButtonRef`, `playPauseButtonRef`, `forwardButtonRef`.
    *   Adicionado estado `focusedVodButtonIndex` (0: Rewind, 1: Play/Pause, 2: Forward) para rastrear o botão VOD focado.

2.  **Botões VOD Modificados no JSX**:
    *   Atributo `ref` correspondente adicionado a cada botão.
    *   `tabIndex="0"` adicionado a cada botão para permitir foco programático.
    *   Classe CSS `focused` adicionada condicionalmente (`.control-button.focused`) baseada no `focusedVodButtonIndex` para feedback visual.

3.  **Lógica de Foco Inicial e Reset Implementada**:
    *   Utilizado `useEffect` para observar `showOverlay`, `isVOD`, `isPlaying`, `useIframe`.
        *   Quando o overlay VOD se torna visível e `focusedVodButtonIndex` é `null`, ele é definido como `1` (Play/Pause).
        *   Quando o overlay VOD se torna invisível, `focusedVodButtonIndex` é resetado para `null`.
    *   Um segundo `useEffect` observa `focusedVodButtonIndex` e chama `.focus()` no elemento do botão correspondente quando o índice muda.

4.  **`handlePlayerNavigation` Atualizado**:
    *   Adicionada verificação `vodControlsActive = isVOD && isPlaying && showOverlay && !useIframe`.
    *   Se `vodControlsActive`:
        *   **Tecla Esquerda (keyCode 37)**: Atualiza `focusedVodButtonIndex` para o botão anterior (com loop) e chama `showOverlayTemporarily()`.
        *   **Tecla Direita (keyCode 39)**: Atualiza `focusedVodButtonIndex` para o próximo botão (com loop) e chama `showOverlayTemporarily()`.
        *   **Tecla OK/Enter (keyCode 13)**: Simula `.click()` no botão VOD focado e chama `showOverlayTemporarily()`.
        *   `event.preventDefault()` e `event.stopPropagation()` são chamados para essas teclas para evitar comportamento padrão.
    *   As ações de REWIND (412) e FAST_FORWARD (417) foram ajustadas para só operar diretamente no vídeo se `!vodControlsActive`.
    *   As dependências do `useEffect` de `handlePlayerNavigation` foram atualizadas para incluir `isVOD`, `showOverlay`, `useIframe`, `focusedVodButtonIndex`.

## Status
- [x] Identificação do problema e planejamento da solução
- [x] Criação da documentação
- [x] Implementação da lógica de foco e navegação
- [ ] Teste da funcionalidade (simulado ou pelo usuário)
- [ ] Conclusão da tarefa 