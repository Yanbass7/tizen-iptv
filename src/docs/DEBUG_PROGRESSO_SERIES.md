# Debug: Problema de Restauração de Progresso

## Como Verificar se o Progresso Está Sendo Salvo e Restaurado

### 1. Abrir Console do Navegador
- Pressione **F12** ou **Ctrl+Shift+I**
- Vá para a aba **Console**

### 2. Logs de Debug a Observar

#### Durante a Reprodução (Salvamento):
```
📺 Salvando progresso: { seriesId: "...", seasonNumber: 1, episodeId: "...", currentTime: 125.5 }
💾 Salvando progresso antes de sair...
```

#### Ao Carregar Episódio (Restauração):
```
🔍 VideoPlayer useEffect - Verificando streamInfo: { type: "series", hasSeriesInfo: true }
📺 Série detectada e gerenciador inicializado: { seriesId: "...", currentEpisode: {...} }
🔍 Tentando restaurar progresso: { isSeriesActive: true, hasCurrentEpisode: true, ... }
📺 Progresso encontrado via episodeManager: { tempo: 125, porcentagem: 52 }
✅ Progresso restaurado para: 125 segundos
```

### 3. Possíveis Problemas e Soluções

#### Problema 1: `episodeManager` não está ativo
**Log esperado:**
```
🔍 Tentando restaurar progresso: { isSeriesActive: false, ... }
❌ Não é série ou dados insuficientes para restaurar progresso
```

**Solução:** O sistema tentará usar `streamInfo` como fallback:
```
🔄 Tentando restaurar via streamInfo como fallback
📺 Dados do streamInfo: { seriesId: "...", seasonNumber: 1, episodeId: "..." }
```

#### Problema 2: Dados insuficientes em ambos
**Log esperado:**
```
❌ Dados insuficientes no streamInfo para restaurar progresso
🔄 Tentando inferir dados da série como último fallback
```

**Solução:** O sistema tentará inferir dados baseado no nome:
```
🔍 Série encontrada por nome: "Nome da Série"
📺 Dados inferidos: { seriesId: "...", seasonNumber: 1, episodeId: "..." }
```

### 4. Verificar Dados no localStorage

#### No Console do Navegador:
```javascript
// Ver todos os dados de progresso
JSON.parse(localStorage.getItem('series_watch_progress'))

// Ver dados de uma série específica
const progress = JSON.parse(localStorage.getItem('series_watch_progress'))
console.log(progress['ID_DA_SERIE'])

// Ver dados de um episódio específico
const progress = JSON.parse(localStorage.getItem('series_watch_progress'))
console.log(progress['ID_DA_SERIE'].seasons['1']['ID_DO_EPISODIO'])
```

### 5. Forçar Restauração Manual (Para Teste)

#### No Console enquanto o vídeo está carregando:
```javascript
// Importar o serviço (se disponível globalmente)
// const { watchProgressService } = require('../services/watchProgressService');

// Ou acessar dados diretamente
const progress = JSON.parse(localStorage.getItem('series_watch_progress'))
const episodeData = progress['ID_DA_SERIE'].seasons['1']['ID_DO_EPISODIO']

// Forçar restauração manual
const video = document.querySelector('video')
if (video && episodeData.currentTime > 0) {
  video.currentTime = episodeData.currentTime
  console.log('Progresso restaurado manualmente para:', episodeData.currentTime)
}
```

### 6. Possíveis Causas do Problema

1. **Timing**: O progresso está sendo restaurado antes do vídeo estar realmente pronto
2. **Dados ausentes**: O `episodeManager` não está sendo inicializado corretamente
3. **IDs diferentes**: Os IDs usados para salvar são diferentes dos usados para restaurar
4. **Cache**: O navegador pode estar usando cache antigo

### 7. Como Resolver

#### Se os logs mostram que está tentando restaurar mas falha:
- Verifique se os IDs no console são os mesmos entre salvamento e restauração
- Teste com um delay maior (atualmente 200ms)

#### Se não há logs de tentativa de restauração:
- Verifique se `streamInfo.type === 'series'`
- Verifique se `streamInfo.seriesInfo` existe

#### Se os dados estão no localStorage mas não são encontrados:
- Compare os IDs exatos usados no salvamento vs restauração
- Verifique se a temporada (season) está correta

### 8. Teste Manual Completo

1. **Assista 2-3 minutos** de um episódio
2. **Pause e saia** (verifique logs de salvamento)
3. **Volte ao mesmo episódio**
4. **Observe os logs** no console durante carregamento
5. **Reporte** qual log específico está falhando

### 9. Informações para Reportar

Quando reportar o problema, inclua:
- **Logs completos** do console
- **Dados do localStorage** (JSON.parse(localStorage.getItem('series_watch_progress')))
- **Nome da série** e episódio testado
- **Browser e versão** usados
- **Se é demo ou API real**

Com essas informações, poderemos identificar exatamente onde o processo está falhando!
