# Implementação da Configuração de Conta IPTV

## Descrição
Implementar funcionalidade para criar conta IPTV vinculada ao cliente após o login, utilizando o endpoint `POST /cliente-conta-iptv`, permitindo ao usuário inserir código do grupo para vinculação.

## Passos executados

1. **Atualização de `authService.js`**
   - Adicionada função `criarContaIptv` para POST em `/cliente-conta-iptv`
   - Parâmetros: `clienteId`, `codigo`, `mac_disp` e token de autenticação
   - Tratamento de erros específicos: 401 (não autorizado), 404 (cliente não encontrado)
   - Uso do header `Authorization: Bearer ${token}` para autenticação

2. **Criação de `IptvSetupScreen.js`**
   - Novo componente para configuração de conta IPTV reutilizando estilos do `LoginScreen.css`
   - Estados para código, loading, erro e sucesso
   - Validações locais: código obrigatório, mínimo 3 caracteres
   - Função `getMacAddress()` com fallback inteligente para dispositivos sem API nativa
   - Integração com `criarContaIptv` do authService
   - Feedback visual com mensagens de erro/sucesso
   - Opção "Pular" para configurar depois
   - Auto-redirecionamento para Home após configuração bem-sucedida
   - Armazenamento de `contaIptvId` e `contaIptvStatus` no localStorage

3. **Integração no `App.js`**
   - Nova seção `SECTIONS.IPTV_SETUP`
   - Estado `clienteData` para armazenar dados do cliente logado
   - Lógica inteligente no `handleLogin`: verifica se já tem conta IPTV configurada
   - Se não tem conta ou status é "pendente": direciona para configuração IPTV
   - Se já tem conta vinculada: vai direto para Home
   - Funções de navegação: `handleIptvSetupComplete`, `handleSkipIptvSetup`
   - Navegação por controle remoto incluindo tela de configuração IPTV
   - Sidebar oculta durante processo de configuração

4. **Fluxo de MAC Address**
   - Prioridade 1: Samsung Tizen `webapis.network.getMac()`
   - Prioridade 2: Tizen SystemInfo API para WIFI_NETWORK
   - Fallback: Geração baseada em userAgent + screen (hash único por dispositivo)

## Fluxo de Configuração
1. Usuário faz login com sucesso
2. Sistema verifica se já tem conta IPTV configurada
3. Se não tem: exibe tela de configuração IPTV
4. Usuário digita código do grupo fornecido pelo administrador
5. Sistema captura MAC address automaticamente
6. Envia requisição para API com clienteId, código e MAC
7. Em caso de sucesso: armazena dados da conta e redireciona para Home
8. Em caso de erro: mostra mensagem específica
9. Opção de pular e configurar depois

## Persistência de Dados
- `contaIptvId`: ID da conta IPTV criada
- `contaIptvStatus`: Status da conta ("pendente" ou "vinculado")
- `authToken`: Token de autenticação do cliente
- `authEmail`: Email do cliente logado

## Resultado
Sistema completo de configuração de conta IPTV integrado ao fluxo de login, permitindo vinculação a grupos específicos com diferentes rotas IPTV. Interface intuitiva com validações e feedback adequado.

---

**Status:** ✅ Concluído 