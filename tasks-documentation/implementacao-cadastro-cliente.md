# Implementação da tela de Cadastro (Cliente)

## Descrição
Implementar funcionalidade de cadastro de novos clientes utilizando o endpoint `POST /user-cliente`, com validação de senha conforme critérios de segurança estabelecidos.

## Passos executados

1. **Atualização de `authService.js`**
   - Adicionada função `validarSenha` para verificar critérios: 8+ caracteres, 1 maiúscula, 1 símbolo
   - Implementada função `cadastrarCliente` para POST em `/user-cliente`
   - Tratamento de erros específicos: 400 (dados inválidos), 409 (email já cadastrado), 500 (erro interno)

2. **Criação de `SignupScreen.js`**
   - Novo componente para tela de cadastro reutilizando estilos do `LoginScreen.css`
   - Estados para email, senha, confirmação de senha, loading, erro e sucesso
   - Validações locais: email obrigatório/válido, senhas coincidentes
   - Integração com `validarSenha` e `cadastrarCliente`
   - Feedback visual com mensagens de erro/sucesso
   - Auto-redirecionamento para login após cadastro bem-sucedido
   - Instruções visuais sobre critérios de senha

3. **Atualização de `LoginScreen.js`**
   - Adicionado botão "Criar Nova Conta" para navegar ao cadastro
   - Prop `onGoToSignup` para comunicação com App.js

4. **Integração no `App.js`**
   - Nova seção `SECTIONS.SIGNUP` 
   - Funções de navegação: `handleGoToSignup`, `handleBackToLogin`, `handleSignup`
   - Navegação por controle remoto incluindo tela de cadastro
   - Sidebar oculta durante processo de cadastro
   - Renderização condicional do `SignupScreen`

## Critérios de Senha Implementados
- ✅ Mínimo 8 caracteres
- ✅ Pelo menos 1 letra maiúscula
- ✅ Pelo menos 1 símbolo (!@#$%^&*(),.?":{}|<>)

## Fluxo de Cadastro
1. Usuário clica em "Criar Nova Conta" no login
2. Preenche email, senha e confirmação
3. Sistema valida critérios localmente
4. Envia requisição para API
5. Em caso de sucesso: mostra mensagem e redireciona para login
6. Em caso de erro: mostra mensagem específica

## Resultado
Sistema completo de cadastro integrado à aplicação, com validações robustas e experiência de usuário fluida. Clientes podem se registrar seguindo critérios de segurança estabelecidos.

---

**Status:** ✅ Concluído 