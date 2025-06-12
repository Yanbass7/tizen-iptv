# Erro "`user directive is not allowed here`" ao testar Nginx

## Problema
Você copiou o `nginx.conf` completo para **/etc/nginx/sites-enabled/proxy.conf**. Arquivos dentro de `sites-enabled` ficam **dentro** do bloco `http { … }` na geração final, portanto só podem conter diretivas de `server` ou `location`. Instruções de contexto principal (`user`, `worker_processes`, etc.) não são permitidas ali e geram:

```
"user" directive is not allowed here in /etc/nginx/sites-enabled/proxy.conf:1
```

## Soluções
1. **Opção A – Usar realmente o nginx.conf completo**
   • Mova o arquivo criado para `/etc/nginx/nginx.conf`, sobrescrevendo o original (faça backup antes).

   ```bash
   sudo cp /etc/nginx/sites-available/proxy.conf /etc/nginx/nginx.conf
   sudo nginx -t && sudo systemctl reload nginx
   ```

2. **Opção B – Manter only vhost (recomendado)**
   • Deixe em `sites-available` apenas as seções `server` (HTTP redirect + HTTPS). Remova tudo que está **acima** do primeiro `server {`.
   • Exemplo mínimo de **/etc/nginx/sites-available/proxy.conf**:

```nginx
server {
    listen 80;
    server_name bigtv-proxy-teste.duckdns.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bigtv-proxy-teste.duckdns.org;

    ssl_certificate     /etc/letsencrypt/live/bigtv-proxy-teste.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bigtv-proxy-teste.duckdns.org/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    location /api/ {
        proxy_pass  http://131.0.245.253:3001;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        add_header Access-Control-Allow-Origin  "*" always;
        add_header Access-Control-Allow-Headers "*" always;
    }

    location ~ ^/stream/(?<ip_host>[0-9.]+)/(?<stream_path>.*)$ {
        resolver 8.8.8.8;
        proxy_pass http://$ip_host/$stream_path$is_args$args;
        proxy_set_header Host            $ip_host;
        proxy_set_header X-Real-IP       $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
        proxy_set_header Connection      "";

        add_header Access-Control-Allow-Origin  "*" always;
        add_header Access-Control-Allow-Headers "*" always;

        proxy_redirect ~^http://([0-9.]+)/(.+)$ /stream/$1/$2;
        proxy_redirect ~^http://([^/]+)/(.+)$  /stream/$1/$2;
    }

    location ~ ^/stream/(?<domain_host>[^/]+)/(?<stream_path>.*)$ {
        resolver 8.8.8.8;
        proxy_pass https://$domain_host/$stream_path$is_args$args;
        proxy_ssl_server_name on;
        proxy_ssl_name        $domain_host;
        proxy_set_header Host            $domain_host;
        proxy_set_header User-Agent      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
        proxy_set_header Referer         "https://$domain_host/";
        proxy_set_header Origin          "https://$domain_host";
        proxy_set_header Accept          "application/x-mpegURL,video/*;q=0.9,*/*;q=0.8";
        proxy_set_header Accept-Encoding "gzip, deflate, br";
        proxy_set_header Accept-Language "en-US,en;q=0.9";
        proxy_set_header Sec-Fetch-Site  "cross-site";
        proxy_set_header Sec-Fetch-Mode  "no-cors";
        proxy_set_header Sec-Fetch-Dest  "video";
        proxy_set_header sec-ch-ua        "\"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"";
        proxy_set_header sec-ch-ua-mobile "?0";
        proxy_set_header sec-ch-ua-platform "\"Windows\"";
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        add_header Access-Control-Allow-Origin  "*" always;
        add_header Access-Control-Allow-Headers "*" always;

        proxy_redirect ~^http://([0-9.]+)/(.+)$ /stream/$1/$2;
        proxy_redirect ~^http://([^/]+)/(.+)$  /stream/$1/$2;
    }
}
```

   Depois:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Conclusão
Escolha uma das opções. A opção B mantém o `nginx.conf` original do sistema e reduz a chance de erros futuros.

_Status: instruções registradas._ 