# Design Document

## Overview

Esta funcionalidade refatora o fluxo atual de inserção do código de grupo no aplicativo IPTV Tizen. Atualmente, após o login bem-sucedido, o usuário é direcionado para uma tela específica (`IptvSetupScreen`) onde deve inserir o código de grupo antes de acessar o conteúdo. 

O novo design remove essa tela intermediária e permite que o usuário acesse a home imediatamente após o login, com a opção de inserir o código de grupo através de um item na sidebar. Isso proporciona uma experiência mais fluida e permite que o usuário explore a interface mesmo sem ter configurado o código de grupo.

## Architecture

### Current Flow
```
Login → IptvSetupScreen → Home (with content)
```

### New Flow  
```
Login → Home (empty) → Sidebar Group Code Option → Home (with content)
```

### Component Structure

1. **App.js**: Gerencia o estado global e roteamento
2. **Sidebar.js**: Adiciona novo item de menu para código de grupo
3. **Home.js**: Exibe estado vazio quando não há código configurado
4. **GroupCodeModal.js**: Novo componente modal para inserção do código
5. **IptvSetupScreen.js**: Componente removido do fluxo principal

## Components and Interfaces

### Modified Components

#### App.js Changes
- Remove redirecionamento automático para `IPTV_SETUP` após login
- Adiciona estado para controlar se código de grupo está configurado
- Modifica `handleLogin` para ir direto para HOME
- Adiciona handler para configuração de código via sidebar#
### Sidebar.js Changes
- Adiciona novo item de menu "Configurar Grupo" 
- Exibe item apenas quando código não está configurado
- Quando código está configurado, mostra "Alterar Grupo"
- Gerencia navegação para modal de código

#### Home.js Changes  
- Detecta quando não há código de grupo configurado
- Exibe interface vazia com mensagem informativa
- Não faz requisições para API quando código não está presente
- Mantém estrutura visual mas sem conteúdo

#### New GroupCodeModal Component
- Modal responsivo para inserção/alteração do código
- Validação de código em tempo real
- Integração com API de configuração IPTV
- Navegação por controle remoto Tizen
- Estados de loading e erro

### Data Models

#### Group Code State
```javascript
{
  isConfigured: boolean,
  code: string,
  isLoading: boolean,
  error: string
}
```

#### Player Configuration State
```javascript
{
  hasPlayerConfig: boolean,
  config: object | null
}
```

## Error Handling

### Scenarios Covered

1. **Código Inválido**: Exibe mensagem de erro específica
2. **Erro de Rede**: Retry automático com feedback visual
3. **Token Expirado**: Redirecionamento para login
4. **Conta Pendente**: Redirecionamento para tela de espera
5. **Falha na API**: Mensagem de erro genérica com opção de retry

### Error States
- Loading states durante requisições
- Mensagens de erro contextuais
- Opções de retry para falhas temporárias
- Fallbacks para estados inconsistentes

## Testing Strategy

### Unit Tests
- Componente GroupCodeModal isolado
- Validação de código de grupo
- Estados de loading e erro
- Integração com API mock

### Integration Tests  
- Fluxo completo login → home vazia → configuração código
- Navegação entre estados
- Persistência de configuração
- Sincronização entre componentes

### TV Navigation Tests
- Navegação por controle remoto
- Foco em elementos corretos
- Transições suaves entre telas
- Acessibilidade para TV

### API Integration Tests
- Chamadas para criarContaIptv
- Tratamento de respostas de erro
- Validação de token
- Configuração do player após sucesso