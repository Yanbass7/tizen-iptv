# Correção: 403 Cloudflare nos streams rota66.bar

## Contexto
Após ativar o proxy, requisições a `https://rota66.bar/...` passaram a retornar **HTTP 403 – Cloudflare "Sorry, you have been blocked"**. O proxy devolve o HTML de bloqueio, impedindo o player.

Motivo provável: Cloudflare detecta nosso servidor VPS (data-center) como bot porque faltam cabeçalhos típicos de navegador.

## Estratégia
• Enviar cabeçalhos "humanos" (`Referer`, `Origin`, `Accept-Language`, `Accept`, `Accept-Encoding`).
• Manter `User-Agent` moderno.
• Evitar compressão em segmentos TS (mas Cloudflare lida).

## Ajuste no bloco `location ~ ^/stream/(?<domain_host>[^/]+)/…$`
```nginx
    proxy_set_header Host            $domain_host;
    proxy_set_header User-Agent      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
    proxy_set_header Referer         "https://$domain_host/";
    proxy_set_header Origin          "https://$domain_host";
    proxy_set_header Accept          "*/*";
    proxy_set_header Accept-Language "en-US,en;q=0.9";
    proxy_set_header Accept-Encoding "identity";  # evita gzip
```

> **Nota**: `Accept-Encoding identity` força conteúdo bruto (TS, m3u8) sem compressão, minimizando variações de resposta.

## Passos
1. Editar `/etc/nginx/sites-available/proxy.conf` e inserir cabeçalhos acima.
2. Testar:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   curl -vk https://bigtv-proxy-teste.duckdns.org/stream/rota66.bar/zBB82J/AMeDHq/147482
   ```
3. Se 200/302 obtido, player deve funcionar sem 403.

---
_Status: concluído_ 