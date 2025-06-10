# Implementação de Navegação por Controle Remoto nas Telas de Autenticação

## Problema
As telas de Login, Cadastro e Configuração de IPTV, criadas anteriormente, não possuíam suporte para navegação via controle remoto de TV, impossibilitando o uso do aplicativo em dispositivos Tizen sem um teclado.

## Solução Implementada
Foi implementado um sistema de gerenciamento de foco baseado em eventos, consistente com o restante do aplicativo, para habilitar a navegação completa por controle remoto.

### 1. Delegação de Eventos no `App.js`
- **Lógica:** O principal manipulador de eventos de teclado (`handleKeyDown`) no `App.js` foi modificado.
- Quando o usuário está nas seções `LOGIN`, `SIGNUP`, ou `IPTV_SETUP`, em vez de tratar as teclas diretamente, o `App.js` agora dispara um evento customizado chamado `authNavigation`.
- Este evento carrega o `keyCode` da tecla pressionada, delegando a responsabilidade de manipulação para o componente que estiver ativo.

### 2. Gerenciamento de Foco nos Componentes
- **Arquivos Afetados:** `LoginScreen.js`, `SignupScreen.js`, `IptvSetupScreen.js`.
- **Lógica Implementada em Cada Componente:**
  - **`isActive` prop:** Recebem uma nova prop do `App.js` para saberem quando estão visíveis e, portanto, quando devem ouvir os eventos de navegação.
  - **Referências (`useRef`):** Um array de referências (`focusableElements`) foi criado para manter uma lista ordenada de todos os elementos interativos (inputs e botões).
  - **Estado de Foco (`focusIndex`):** Um novo estado (`useState`) rastreia o índice do elemento atualmente focado no array de referências.
  - **Listener de Evento:** Um `useEffect` foi adicionado para escutar o evento `authNavigation` quando o componente está ativo.
    - **`ArrowDown` (keyCode 40):** Incrementa o `focusIndex`, movendo o foco para o próximo elemento da lista (com _looping_).
    - **`ArrowUp` (keyCode 38):** Decrementa o `focusIndex`, movendo o foco para o elemento anterior (com _looping_).
    - **`Enter` (keyCode 13):** Dispara o método `.click()` no elemento atualmente focado, ativando sua ação (ex: submeter um formulário ou navegar).
  - **Efeito de Foco Visual:** Um segundo `useEffect` monitora as mudanças no `focusIndex`. Quando o índice muda, ele:
    - Chama o método `.focus()` no elemento do DOM correspondente.
    - Adiciona a classe CSS `.focused` ao elemento focado e a remove dos outros, garantindo um indicador visual claro.

### 3. Estilo Visual de Foco
- **Arquivo Afetado:** `LoginScreen.css` (compartilhado entre as três telas).
- **Lógica:** Foi adicionado um novo conjunto de regras CSS para a classe `.focused`:
  ```css
  .login-form input.focused,
  .login-form button.focused {
    outline: 3px solid #00a8e6;
    box-shadow: 0 0 15px rgba(0, 168, 230, 0.7);
    border-color: #00a8e6;
    transform: scale(1.02);
    transition: all 0.2s ease-in-out;
  }
  ```
- Este estilo cria um contorno azul brilhante e um leve zoom no elemento focado, tornando a navegação intuitiva na TV.

## Resultado
- ✅ **Navegação Completa:** Todas as telas de autenticação são agora 100% funcionais utilizando apenas um controle remoto de TV (setas direcionais e 'Enter').
- ✅ **Experiência de Usuário Consistente:** O sistema de foco e o indicador visual são consistentes com outras partes do aplicativo.
- ✅ **Código Modular:** A lógica de foco está contida dentro de cada componente, mantendo o `App.js` limpo e apenas como um despachante de eventos.

---

**Status:** ✅ Concluído 