# Correção do Erro Live Stream MPEGTS

## Problema Identificado
- **Data**: 2024-12-19
- **Tipo**: Erro de rede em live streams
- **Sintomas**: 
  - Live streams falham com "Failed to fetch"
  - Séries e filmes funcionam normalmente
  - Erro específico do mpegts para conteúdo ao vivo

## Log do Erro
```
[15:42:49] 🎬 Iniciando reprodução para: https://rota66.bar/zBB82J/AMeDHq/147482
[15:42:49] 🎯 Tipo de player detectado: mpegts-live
[15:42:49] 🚀 Inicializando player mpegts-live com URL: https://rota66.bar/zBB82J/AMeDHq/147482
[15:42:49] 📡 Usando mpegts para live stream
[15:42:49] [MSEController] > MediaSource onSourceOpen
[15:42:50] [IOController] > Loader error, code = -1, msg = Failed to fetch
[15:42:50] [TransmuxingController] > IOException: type = Exception, code = -1, msg = Failed to fetch
[15:42:50] ❌ Erro mpegts Live: NetworkError Exception {"code":-1,"msg":"Failed to fetch"}
[15:42:50] 💥 Erro ao criar player: {}
```

## Análise Inicial
1. **URL de teste**: `https://rota66.bar/zBB82J/AMeDHq/147482`
2. **Player usado**: mpegts-live 
3. **Erro**: NetworkError - Failed to fetch
4. **Status**: Séries e filmes funcionam (diferentes tipos de stream)

## Possíveis Causas
1. **Problema CORS**: Live streams podem ter políticas CORS diferentes
2. **Headers necessários**: Live streams podem precisar de headers específicos
3. **Configuração do proxy**: Proxy pode não estar configurado para live streams
4. **Tipo de conteúdo**: Live streams são diferentes de VOD em formato/protocolo

## Plano de Investigação
- [x] Verificar configuração atual do VideoPlayer para live streams
- [x] Analisar diferenças entre mpegts-live e outros players
- [x] Verificar configuração do proxy para live streams
- [x] Testar headers específicos para live streams
- [x] Verificar se o problema é específico do Tizen

## Causa Identificada
O problema estava na configuração do player mpegts para live streams. Diferente do VOD que tinha a configuração `enableWorker: false` (essencial para Tizen), o live stream não estava usando as mesmas configurações de compatibilidade.

## Correções Implementadas

### 1. Configuração do Player Live
**Arquivo**: `src/components/VideoPlayer.js`
- Adicionado `enableWorker: false` (essencial para Tizen TV)
- Adicionado `enableStashBuffer: false` (reduzir buffer para live)
- Adicionado `autoCleanupSourceBuffer: true` (limpeza automática)
- Adicionado `fixAudioTimestampGap: false` (melhor para live streams)
- Adicionado headers seguros para CORS com `getSafeHeaders()`

### 2. Tratamento Específico de Erro
- Adicionado detecção específica para "Failed to fetch"
- Mensagem de erro mais clara para problemas de rede/CORS

### 3. Logs de Debugging
- Adicionado logs detalhados para rastreamento
- URL original e configuração do player logadas

### 4. Estrutura da Configuração
```javascript
const mediaDataSource = {
  type: 'mpegts',
  isLive: true,
  url: streamUrlForPlayer
};

const playerConfig = {
  enableWorker: false, // Essencial para Tizen TV
  enableStashBuffer: false, // Reduzir buffer para live
  autoCleanupSourceBuffer: true, // Limpeza automática do buffer
  fixAudioTimestampGap: false, // Melhor para live streams
  headers: getSafeHeaders() // Headers seguros para CORS
};
```

## Teste Realizado - Erro Persistiu

### Log do Teste (15:47:28)
```
✅ Player mpegts criado com sucesso
✅ Configuração aplicada corretamente
❌ Erro persistiu: "Failed to fetch" no IOController
```

O erro persiste mesmo com as configurações corretas, indicando problema de CORS/rede mais profundo.

## Soluções Adicionais Implementadas

### 1. Teste de Conectividade Pré-Player
- Função `testStreamUrl()` que verifica acesso antes do mpegts
- Tenta HEAD request primeiro, depois GET com Range limitado
- Timeout de 5 segundos para HEAD, 3 segundos para GET

### 2. Player HTML5 Nativo como Fallback
- Função `initNativeLivePlayer()` 
- Usado automaticamente se teste de conectividade falhar
- Configuração específica para live streams:
  - `crossOrigin: 'anonymous'`
  - `preload: 'none'`
  - `autoplay: true`

### 3. Fluxo de Fallback Inteligente
```
URL Live Stream → Teste Conectividade → Se OK: mpegts → Se FALHA: HTML5 Nativo
```

### 4. Logs Detalhados
- Rastreamento completo do processo de fallback
- Identificação clara de qual player está sendo usado

## Arquivos Modificados
- `src/components/VideoPlayer.js` - Adicionadas funções de teste e fallback

## Próximos Passos
1. ✅ Testar com o novo sistema de fallback
2. Verificar se player nativo resolve o problema de CORS
3. Monitorar qual player é usado na prática

## Status
🔄 **FALLBACK IMPLEMENTADO** - Sistema robusto com duas opções de player 