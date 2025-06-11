# Tarefa: Receber o Endereço MAC na Tela de Login

## Descrição

O objetivo desta tarefa é modificar a tela de login da aplicação web para que ela possa receber o endereço MAC da TV Tizen, que é passado como um parâmetro na URL (`?mac=...`). Este endereço MAC será utilizado para autenticar o usuário no backend.

## Plano de Ação

- [x] Identificar o componente da tela de login na base de código.
- [x] Implementar a lógica para ler o parâmetro `mac` da URL.
- [x] Utilizar o endereço MAC obtido no processo de login.
- [x] Marcar esta tarefa como concluída.

## Conclusão

A tela de login (`src/components/LoginScreen.js`) foi atualizada para extrair o endereço MAC da URL, priorizando este método. A funcionalidade anterior de busca do MAC foi mantida como um fallback. A tarefa foi concluída com sucesso. 