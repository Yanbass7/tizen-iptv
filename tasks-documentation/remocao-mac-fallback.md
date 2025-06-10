# Remoção de Fallback de MAC Address

## Problema
O sistema estava utilizando fallbacks para gerar um MAC address (um dinâmico e um fixo) quando não conseguia obter o MAC real do dispositivo. Isso entra em conflito com o requisito de negócio de que a assinatura do cliente deve ser estritamente vinculada ao MAC address físico do dispositivo.

## Causa
A implementação anterior priorizava a continuidade do fluxo de login, mesmo que isso significasse usar um MAC address "fictício". O requisito de negócio exige que, na ausência de um MAC real, o processo seja interrompido.

## Solução Implementada

### 1. Modificação da função `getMacAddress()`
- **Arquivos afetados:** `LoginScreen.js`, `IptvSetupScreen.js`
- **Lógica:**
  - Removidos completamente os blocos de código responsáveis por gerar um MAC dinâmico (baseado em `userAgent` e `screen`) e por usar um MAC fixo.
  - A função agora tenta obter o MAC exclusivamente através das APIs nativas do Tizen (`webapis.network.getMac()` e `tizen.systeminfo`).
  - Se ambas as tentativas falharem, a função agora retorna uma **string vazia (`''`)** e loga um erro no console.

### 2. Validação no Fluxo de Login e Configuração
- **Arquivos afetados:** `LoginScreen.js`, `IptvSetupScreen.js`
- **Lógica:**
  - Nas funções `handleContinue` (`LoginScreen`) e `handleConfigurar` (`IptvSetupScreen`), foi adicionada uma verificação logo após a chamada de `getMacAddress()`.
  - `if (!mac_disp)`: Se a função retornar uma string vazia (ou seja, falhou em obter o MAC), uma nova exceção é lançada com uma mensagem clara para o usuário.
  - **Mensagem de Erro:** "Não foi possível obter o MAC do dispositivo. [Ação] não pode ser concluído."

## Resultado
- ✅ **Aderência ao Requisito:** O sistema agora só prossegue com login ou configuração de conta se um MAC address real do dispositivo for obtido.
- ✅ **Feedback Claro:** O usuário é informado diretamente na interface sobre a falha na obtenção do MAC, em vez de receber um erro genérico da API.
- ✅ **Código Mais Limpo:** Remoção de lógica de fallback que não atendia à necessidade de negócio.
- ✅ **Segurança da Assinatura:** Garante que as assinaturas serão sempre vinculadas a um identificador de hardware real, como exigido.

---

**Status:** ✅ Concluído 