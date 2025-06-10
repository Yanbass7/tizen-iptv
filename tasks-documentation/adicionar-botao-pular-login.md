# Adição de Botão "Pular Login" para Desenvolvimento

## Problema
Durante o desenvolvimento e testes frequentes, o processo de realizar login repetidamente a cada recarregamento do aplicativo se torna tedioso e consome tempo, atrasando a iteração em outras funcionalidades.

## Solução Implementada
Foi adicionado um botão de atalho na tela de login, visível apenas para fins de desenvolvimento, que permite pular todo o fluxo de autenticação e ir diretamente para a tela `Home` do aplicativo.

### 1. Adição do Botão em `LoginScreen.js`
- Um novo botão com o texto "Pular Login (Dev)" foi adicionado ao final do formulário de login.
- **Estilo:** O botão foi estilizado com uma cor roxa distinta para diferenciá-lo dos botões normais e deixar claro que se trata de uma ferramenta de desenvolvimento.
- **Funcionalidade:** Ele recebe uma nova prop `onSkipLogin` vinda do `App.js`.
- **Navegação Remota:** O botão foi incluído no array `focusableElements` para ser acessível via controle remoto, sendo o último item na ordem de foco da tela.

### 2. Implementação do Handler em `App.js`
- Uma nova função, `handleSkipLogin`, foi criada.
- **Lógica:**
  - Exibe um `console.warn` para notificar que o fluxo de login foi pulado.
  - Altera o estado `currentSection` diretamente para `SECTIONS.HOME`.
  - Garante que o foco do menu (`onMenu`) seja desativado, para que a navegação comece no conteúdo principal da Home.
- A função `handleSkipLogin` é passada como prop para o componente `LoginScreen`.

## Resultado
- ✅ **Agilidade no Desenvolvimento:** Reduz drasticamente o tempo necessário para acessar as áreas internas do aplicativo durante os testes.
- ✅ **Fluxo de Autenticação Intacto:** A funcionalidade de login real permanece inalterada e funcional para testes de produção.
- ✅ **Clareza Visual:** O botão de atalho é visualmente distinto, evitando cliques acidentais em um ambiente de produção.
- ✅ **Acessibilidade:** Totalmente integrado à navegação por controle remoto.

**Nota:** Este botão é uma ferramenta de desenvolvimento e deve ser removido ou desabilitado através de variáveis de ambiente antes da compilação final da versão de produção do aplicativo.

---

**Status:** ✅ Concluído 