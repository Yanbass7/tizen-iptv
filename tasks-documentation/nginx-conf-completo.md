# nginx.conf completo – Proxy HTTPS para streams IPTV

> Copie o conteúdo abaixo para **/etc/nginx/nginx.conf** (ou crie um novo arquivo em *sites-available* e faça o symlink) e depois execute `sudo nginx -t && sudo systemctl reload nginx`.

```nginx

user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;


events {
    worker_connections 1024;
}


http {
   
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    access_log /var/log/nginx/access.log;
    error_log  /var/log/nginx/error.log;


    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout 65;
    types_hash_max_size 4096;

   
    proxy_buffering         off;
    proxy_request_buffering off;


    resolver 8.8.8.8;


    server {
        listen 80;
        server_name bigtv-proxy-teste.duckdns.org;
        return 301 https://$host$request_uri;
    }

 
    server {
        listen 80;
        server_name _;
        location /.well-known/acme-challenge/ {
            root /var/www/html;
        }
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

            add_header Access-Control-Allow-Origin  "*";
            add_header Access-Control-Allow-Headers "*";
        }

     
        location ~ ^/stream/(?<ip_host>[0-9.]+)/(?<stream_path>.*)$ {
            resolver 8.8.8.8;
            proxy_pass http://$ip_host/$stream_path$is_args$args;

            proxy_set_header Host            $ip_host;
            proxy_set_header X-Real-IP       $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

            proxy_http_version 1.1;
            proxy_set_header Connection "";

            add_header Access-Control-Allow-Origin  "*";
            add_header Access-Control-Allow-Headers "*";
        }

   
        location ~ ^/stream/(?<domain_host>[^/]+)/(?<stream_path>.*)$ {
            resolver 8.8.8.8;
            proxy_pass http://$domain_host/$stream_path$is_args$args;

            proxy_set_header Host            $domain_host;
            proxy_set_header User-Agent      "Mozilla/5.0";

            proxy_http_version 1.1;
            proxy_set_header Connection "";

            add_header Access-Control-Allow-Origin  "*";
            add_header Access-Control-Allow-Headers "*";
        }
    }
}
```

---
**Observações**
1. Se já existir outro `nginx.conf`, você pode colocar este conteúdo em `/etc/nginx/sites-available/proxy.conf` e habilitar com `ln -s ... sites-enabled/`.
2. Garanta que não haja *outros* blocos `server 443` com o mesmo `server_name` para evitar conflitos.
3. Depois de salvar, sempre execute `sudo nginx -t` para validar antes de recarregar.

_Atualizado em 11-06-2025 – inclui cabeçalhos CORS e User-Agent para contornar Cloudflare._ 