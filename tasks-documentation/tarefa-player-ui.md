# Tarefa: Implementar Controles de Player de Vídeo

Esta tarefa foca em adicionar controles de interface (UI) para o `VideoPlayer`, incluindo uma barra de progresso e funcionalidade de play/pause, otimizados para Tizen.

## Passos da Tarefa

- [x] **1. Criar Estrutura do State:**
    - [x] Adicionar estados para `currentTime`, `duration`, e `isControlsVisible`.
    - [x] O estado `isPlaying` já existe e será reutilizado.

- [x] **2. Atualizar o Elemento de Vídeo:**
    - [x] Adicionar `event listeners` ao elemento de vídeo para os eventos `timeupdate` e `loadedmetadata`.
    - [x] Esses listeners irão atualizar os estados de `currentTime` e `duration`.

- [x] **3. Criar Componentes da UI:**
    - [x] Desenvolver a estrutura HTML/JSX para a sobreposição de controles (`controls-overlay`).
    - [x] Dentro da sobreposição, adicionar:
        - [x] Indicadores de tempo (tempo atual / duração total).
        - [x] Barra de progresso visual (background, buffer, progresso atual).
        - [x] Ícone de Play/Pause.

- [x] **4. Estilizar a UI com CSS (Otimizado para Tizen):**
    - [x] Criar e aplicar estilos no arquivo `VideoPlayer.css`.
    - [x] Seguir as diretrizes do `diretrizes-css-tizen.md`, especialmente:
        - [x] Usar `flexbox` com `margin` em vez de `gap`.
        - [x] Usar unidades em `px`.
        - [x] Adicionar prefixos `-webkit-` quando necessário.

- [x] **5. Implementar Lógica de Controle:**
    - [x] Criar a função `togglePlayPause`.
    - [x] Implementar a lógica para exibir/ocultar a sobreposição de controles. A sobreposição deve aparecer com a interação do usuário (ex: pressionar uma tecla) e desaparecer após alguns segundos de inatividade.
    - [x] Adicionar funcionalidade de busca (seek) para frente e para trás usando as setas do controle remoto.

- [x] **6. Integrar com o Controle Remoto (Tizen):**
    - [x] Atualizar a função `handlePlayerNavigation` para mapear as teclas do controle remoto (Play/Pause, OK, Setas) para as funções correspondentes (`togglePlayPause`, `seekForward`, `seekBackward`, `showControls`).

- [x] **7. Limpeza e Refatoração:**
    - [x] Garantir que a nova UI não interfira com a lógica de carregamento e tratamento de erros existente.
    - [x] Verificar se a limpeza de `event listeners` e `timeouts` está correta quando o componente é desmontado ou o vídeo é trocado.

## Conclusão

- [x] A tarefa será marcada como concluída quando o player de vídeo tiver uma UI funcional e otimizada para Tizen, com barra de progresso, play/pause e navegação básica. 