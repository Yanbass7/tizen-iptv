# Configuração completa do proxy Nginx

Copie todo o bloco abaixo para **/etc/nginx/sites-available/proxy.conf** na sua VPS e recarregue o serviço (`sudo nginx -t && sudo systemctl reload nginx`).

```nginx
server {
    listen 443 ssl;
    server_name bigtv-proxy-teste.duckdns.org;

    ssl_certificate     /etc/letsencrypt/live/bigtv-proxy-teste.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bigtv-proxy-teste.duckdns.org/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf; 
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    location /api/ {
        proxy_pass  https://bigtv-proxy-teste.duckdns.org;
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

        proxy_buffering          off;
        proxy_request_buffering  off;

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

        proxy_buffering          off;
        proxy_request_buffering  off;

        add_header Access-Control-Allow-Origin  "*";
        add_header Access-Control-Allow-Headers "*";
    }
}
```

> Após adicionar este bloco SSL, execute:
>
> ```bash
> sudo nginx -t && sudo systemctl reload nginx
> ``` 