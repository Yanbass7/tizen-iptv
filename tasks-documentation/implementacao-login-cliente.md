# Implementação da tela de Login (Cliente)

## Descrição
Adicionar a integração real da tela de login com o endpoint interno `POST /auth/cliente`, retornando token de autenticação e armazenando no `localStorage`.

## Passos executados
1. **Criação de `authService`**  
   - Novo arquivo `src/services/authService.js` com funções:
     - `loginCliente` – realiza POST para `/auth/cliente`.
     - `validarToken` – valida token em `/auth/validar-token`.
   - Tratamento completo de erros conforme status (404, 401, 500).

2. **Atualização de `LoginScreen.js`**  
   - Inclusão de estados `loading` e `error`.  
   - Implementação de função `getMacAddress()` para capturar MAC em TVs Samsung/Tizen, com fallback seguro.  
   - Utilização de `loginCliente` para autenticar usuário.  
   - Armazenamento de `token` e `email` no `localStorage`.  
   - Feedback visual de carregamento e mensagens de erro.

3. **Persistência de Autenticação**  
   - `localStorage` agora mantém `authToken` e `authEmail` para reutilização futura.

## Resultado
A tela de login agora efetua autenticação real contra a API e redireciona para a Home somente quando o login for bem-sucedido. Qualquer falha apresenta mensagem de erro apropriada ao usuário.

## Próximos passos
- Utilizar `validarToken` na inicialização do app para sessão persistente.  
- Proteger rotas internas com verificação de token expirado.

---

**Status:** ✅ Concluído 