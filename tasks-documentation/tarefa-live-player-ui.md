# Tarefa: Implementar UI Diferenciada para Player Ao Vivo

Esta tarefa consiste em criar uma interface de sobreposição (overlay) específica para canais ao vivo, que é diferente da interface de VOD (filmes/séries). A nova UI será baseada no modelo de imagem fornecido.

## Passos da Tarefa

- [x] **1. Criar Lógica de Renderização Condicional:**
    - [x] No `VideoPlayer.js`, modificar a renderização para exibir a nova UI de "informações ao vivo" somente quando `streamInfo.type` for `'live'`.
    - [x] Manter a UI de controles de progresso para os tipos `movie` e `series`.

- [x] **2. Desenvolver a Estrutura JSX da UI Ao Vivo:**
    - [x] Criar o container principal `.live-info-overlay`.
    - [x] Dentro do overlay, adicionar os seguintes elementos:
        - [x] Logo do canal (`.channel-logo`), com estilo quadrado.
        - [x] Detalhes do canal e programa (`.channel-details`):
            - [x] Número e nome do canal.
            - [x] Informações do programa atual (título, horário de início).
        - [x] Informações de data/hora e próximo programa (`.additional-info`):
            - [x] Data e hora atual (atualizadas a cada segundo).
            - [x] Informações do próximo programa (título, horário de início).

- [x] **3. Adicionar Estado para Data e Hora:**
    - [x] Implementar um `useState` e um `useEffect` com `setInterval` para manter a data e a hora atualizadas em tempo real.
    - [x] Garantir que o `setInterval` seja limpo quando o componente for desmontado para evitar vazamentos de memória.

- [x] **4. Estilizar a Nova UI com CSS:**
    - [x] No `VideoPlayer.css`, adicionar todos os estilos necessários para a `.live-info-overlay` e seus componentes filhos.
    - [x] Utilizar `flexbox` para o layout, seguindo o modelo da imagem.
    - [x] Aplicar as diretrizes de otimização para Tizen (prefixos `-webkit-`, `px` para unidades, `margin` para espaçamento).

- [x] **5. Integração de Dados:**
    - [x] Garantir que os dados do `streamInfo` (logo, nome do canal, programas) sejam passados corretamente para a nova UI.
    - [x] Assumir a estrutura de dados necessária no `streamInfo` para a UI funcionar.

## Conclusão

- [x] A tarefa estará concluída quando a nova UI para canais ao vivo estiver implementada, funcional e estilizada conforme o modelo, sendo exibida apenas para streams do tipo 'live'. 