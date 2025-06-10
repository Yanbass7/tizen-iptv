# Tarefa: Corrigir Erro de Tela Preta no Aplicativo Tizen

Esta tarefa visa resolver o problema de tela preta que ocorre ao carregar o aplicativo em TVs Tizen mais antigas (versão 3.0). A causa provável é a incompatibilidade do JavaScript moderno (usado pelo React 18) com o navegador da TV.

## Passos para a Correção

- [x] **Instalar Polyfills:** Adicionar `react-app-polyfill` para garantir a compatibilidade com navegadores mais antigos.
- [x] **Importar Polyfills:** Incluir os polyfills no ponto de entrada da aplicação (`src/index.js`).
- [x] **Ajustar `browserslist`:** Configurar o `package.json` para gerar código compatível com uma gama maior de navegadores na build de produção.
- [x] **Gerar novo build:** Criar uma nova versão de produção do site com as alterações.
- [ ] **Publicar no Firebase:** Enviar o novo build para o servidor para que o aplicativo da TV possa carregá-lo.

## Status

- [x] Instalar `react-app-polyfill`.
- [x] Editar `src/index.js`.
- [x] Editar `package.json` (Nenhuma alteração necessária).
- [x] Executar `npm run build`.
- [x] Atualizar este documento com o status de conclusão. 