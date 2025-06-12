# Diagnóstico: Timeout mpegts Live / ERR_NAME_NOT_RESOLVED

## Sintoma
Ao reproduzir stream live, o player falha com:

```
GET https://bigtv-proxy-teste.duckdns.org/stream/rota66.bar/... net::ERR_NAME_NOT_RESOLVED
```

## Interpretação
`ERR_NAME_NOT_RESOLVED` é erro **de DNS no lado do cliente**; o navegador nem chega ao Nginx. Isso difere dos erros anteriores de CORS (onde a resposta chegava, mas faltavam cabeçalhos).

## Possíveis causas
1. **DNS do domínio DuckDNS não propagado** – o IP público da VPS pode ter mudado ou o processo de update do DuckDNS falhou.
2. **Cache DNS do navegador/ISP** – entrada antiga expirada ou host recentemente criado.
3. **Bloqueio de rede** – Wi-Fi/ISP impedindo resolução de duckdns.org.
4. **Typo no domínio** – 'bigtv-proxy-teste' vs 'bigtv-proxy-test' (confirmar). O erro só afeta novas builds porque o domínio foi digitado diferente no código/config.

## Passos de verificação
1. No laptop/local:
   ```bash
   nslookup bigtv-proxy-teste.duckdns.org
   ping    bigtv-proxy-teste.duckdns.org
   ```
   ‑ Se não resolver, atualizar registro DuckDNS.
2. Na VPS (SSH):
   ```bash
   curl -I https://bigtv-proxy-teste.duckdns.org/api/health
   ```
   ‑ Confirma se o Nginx responde.
3. Limpar cache DNS do SO/navegador.
4. No Firebase Hosting (app), testar fetch direto no console:
   ```js
   fetch('https://bigtv-proxy-teste.duckdns.org/api/ping').then(r=>r.text())
   ```
5. Se persistir, considerar CNAME em domínio próprio + Cloudflare.

## Ação imediata
* Validar se o **DuckDNS está atualizado**: `https://www.duckdns.org/update?domains=bigtv-proxy-teste&token=...&ip=`.
* Garantir script de cron (`/etc/cron.d/duckdns`) ativo.

## Próximos passos
* Caso o domínio precise mudar, ajustar `src/config/proxyConfig.js` e variável de ambiente `REACT_APP_PROXY_DOMAIN`.

---
_Status: concluído_ 