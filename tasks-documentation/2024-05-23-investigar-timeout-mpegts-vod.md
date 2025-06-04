# Investigar Timeout com mpegts-vod

## Descrição do Problema

Ao tentar reproduzir um vídeo ou série na TV, ocorre um erro de timeout com o `mpegts-vod`. No emulador, o comportamento é instável: vídeos VOD MP4 demoram ~2 minutos para iniciar, com o emulador congelado, devido ao `moov atom` provavelmente estar no final dos arquivos.

## Passos Planejados

- [x] Buscar por `mpegts-vod` no código.
- [x] Analisar os arquivos relevantes.
- [x] Verificar configurações de timeout.
- [x] Propor e implementar solução inicial (aumentar timeout e melhorar log).
- [x] Tentar desabilitar Web Workers para `mpegts-vod`.
- [x] Ajustar `stashBuffer` do `mpegts.js`.
- [x] Tentar `autoCleanupSourceBuffer: true` no `mpegts.js`.
- [x] Ativar e analisar logs detalhados (Transmuxer, MP4Remuxer) do `mpegts.js`.
- [x] **Identificada causa raiz provável da lentidão VOD no emulador: `moov atom` no final dos arquivos MP4.**
- [ ] **Ação Principal Externa:** Otimizar arquivos MP4 de origem para "faststart" (mover `moov atom` para o início).
- [ ] Decidir sobre alterações paliativas no código do player para o emulador (se necessário).
- [ ] Testar a solução na TV e no emulador após otimização dos arquivos ou aplicação de paliativo.
- [ ] Marcar esta tarefa como concluída.

## Detalhes da Implementação e Diagnóstico

### Tentativa 1 (23/05/2024)
- Timeout aumentado para 30s e log de erro melhorado.

### Tentativa 2 (23/05/2024)
- `enableWorker: false` no `mpegts.js`. Alterou travamento total para congelamento longo com auto-recuperação.

### Tentativa 3 (23/05/2024)
- Buffers `stashInitialSize` e `stashBufferSize` do `mpegts.js` aumentados. Sem melhora significativa no emulador.

### Tentativa 4 (23/05/2024)
- `autoCleanupSourceBuffer: true` no `mpegts.js`. Sem melhora significativa no emulador.

### Tentativa 5 (23/05/2024) - Diagnóstico com Logs Detalhados
- Logs detalhados do `mpegts.js` (Transmuxer, MP4Remuxer) foram ativados.
- A análise dos logs revelou que o `moov atom` nos arquivos MP4 testados aparece após o `mdat` atom (`ftyp, free, mdat, moov`).
- **Conclusão:** Esta é a causa mais provável do longo atraso (~2 minutos) e congelamento na inicialização de VOD MP4 no emulador, pois o player precisa baixar dados até encontrar o `moov atom`.
- Os logs detalhados foram removidos do código após o diagnóstico.

### Próximos Passos Imediatos

1.  **Prioridade Alta (Ação Externa):** Verificar e reprocessar os arquivos MP4 no servidor de origem para mover o `moov atom` para o início dos arquivos (otimização "faststart").
2.  **Decisão Pendente (Código do Player):** Escolher uma estratégia paliativa para o emulador enquanto os arquivos não são otimizados:
    *   Não alterar o código.
    *   Aumentar o timeout do `VideoPlayer.js` para ~150s (evita erro no console, mas não o atraso).
    *   Modificar `detectPlayerType` para usar `html5-direct` para VOD MP4 no emulador.

player.on(mpegts.Events.LOADING_COMPLETE, () => {
  console.log('✅ mpegts VOD: LOADING_COMPLETE');
  setLoadingMessage('Iniciando...');
});
  ``` 