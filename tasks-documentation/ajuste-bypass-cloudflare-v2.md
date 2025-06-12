# Ajuste v2 – Bypass Cloudflare persistente nos streams

## Problema
Mesmo após adicionar cabeçalhos "humanos", o Cloudflare do domínio `rota66.bar` ainda devolve **403 / Sorry, you have been blocked**.

## Causa provável
• Conexão via **HTTP** (porta 80) ao endpoint Cloudflare pode acionar regras WAF mais estritas.  
• Falta de cabeçalhos `sec-` e `Accept-Encoding` típicos de browsers modernos.

## Solução proposta
1. **Trocar o `proxy_pass` para HTTPS** – estabelece handshake TLS com SNI; Cloudflare ajusta heurística.
2. Enviar conjunto completo de cabeçalhos de navegador (UA-Chrome, `sec-ch-ua`, `Sec-Fetch-*`, compressão).

### Bloco `location` atualizado
```nginx
location ~ ^/stream/(?<domain_host>[^/]+)/(?<stream_path>.*)$ {
    resolver 8.8.8.8;

    # usa TLS até Cloudflare + SNI
    proxy_pass https://$domain_host/$stream_path$is_args$args;
    proxy_ssl_server_name on;
    proxy_ssl_name        $domain_host;

    # cabeçalhos típicos de navegador
    proxy_set_header Host            $domain_host;
    proxy_set_header User-Agent      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
    proxy_set_header Referer         "https://$domain_host/";
    proxy_set_header Origin          "https://$domain_host";
    proxy_set_header Accept          "application/x-mpegURL,video/*;q=0.9,*/*;q=0.8";
    proxy_set_header Accept-Language "en-US,en;q=0.9";
    proxy_set_header Accept-Encoding "gzip, deflate, br";
    proxy_set_header Sec-Fetch-Site  "cross-site";
    proxy_set_header Sec-Fetch-Mode  "no-cors";
    proxy_set_header Sec-Fetch-Dest  "video";
    proxy_set_header sec-ch-ua        "\"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"";
    proxy_set_header sec-ch-ua-mobile "?0";
    proxy_set_header sec-ch-ua-platform "\"Windows\"";

    proxy_http_version 1.1;
    proxy_set_header Connection      "";

    add_header Access-Control-Allow-Origin  "*" always;
    add_header Access-Control-Allow-Headers "*" always;

    # mantém redirect dentro do proxy
    proxy_redirect   ~^http://([0-9.]+)/(.+)$   /stream/$1/$2;
    proxy_redirect   ~^http://([^/]+)/(.+)$     /stream/$1/$2;
}
```

## Passos para aplicar
```bash
sudo nano /etc/nginx/sites-available/proxy.conf   # inserir bloco acima
sudo nginx -t && sudo systemctl reload nginx
```

## Teste
```bash
curl -vk "https://bigtv-proxy-teste.duckdns.org/stream/rota66.bar/zBB82J/AMeDHq/147482" | head
```
Se receber trechos `.m3u8` ou bytes binários, o bypass funcionou; o player deve tocar sem 403.

---
_Status: concluído_ 