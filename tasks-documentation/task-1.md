# Tarefa 1: Corrigir erro no Shaka Player

**Descrição:** Ao rodar o aplicativo na TV, ocorre o erro "Erro no shaka player 3016".

**Status:** Concluído.

**Passos:**
- [x] Investigar a causa do erro 3016 do Shaka Player.
- [x] Localizar a implementação do Shaka Player no código.
- [x] Analisar o código e propor uma correção.
- [x] Validar a correção.

**Resumo da solução:**
O erro 3016 no Shaka Player em TVs Tizen era causado por uma tentativa de usar o player nativo para streams DASH, devido a um bug na versão 2.5.4 do Shaka Player. A solução foi adicionar a configuração `preferNativeHls: false` na inicialização do player para forçá-lo a usar a implementação de streaming via JavaScript (MSE), que é mais compatível.
