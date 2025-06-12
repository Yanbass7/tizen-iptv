# Correção de CORS e redirecionamento nos streams via proxy

## Contexto
Depois de integrar o proxy HTTPS (`bigtv-proxy-teste.duckdns.org`) ao app React, as URLs de stream passaram a ser convertidas para o formato:

```
https://bigtv-proxy-teste.duckdns.org/stream/<host>/<path>
```

Entretanto, ao tentar reproduzir um canal, o navegador bloqueou a requisição por **CORS**:

```
Access to fetch at 'https://bigtv-proxy-teste.duckdns.org/stream/rota66.bar/...'
from origin 'https://bigtvplay.web.app' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Além disso, alguns hosts (ex.: `rota66.bar`) respondem com **HTTP 302** que redireciona para um IP em *HTTP* puro (ex.: `http://198.x.x.x/...`). Se o redirect chega ao navegador, voltamos a ter *Mixed-Content*.

## Diagnóstico
1. O bloco `location /stream` já continha `add_header Access-Control-Allow-Origin "*";`, porém o Nginx só envia o cabeçalho para códigos 200/204/301/302/303/304/307/308 por padrão. Se a resposta for 206 (parcial) ou 403, o header não é enviado.
2. O redirect 302 gerado pelo upstream não era reescrito; o navegador recebia a URL HTTP diretamente.

## Ajustes aplicados no Nginx
```nginx
# Dentro de cada bloco location ~ ^/stream/…$

    # Garante CORS para **qualquer** status
    add_header Access-Control-Allow-Origin  "*"  always;
    add_header Access-Control-Allow-Headers "*"  always;

    # Mantém a chamada dentro do proxy caso o upstream responda 30x
    # Ex.: http://198.255.76.58/zBB82J/...  ->  /stream/198.255.76.58/zBB82J/...
    proxy_redirect ~^http://([0-9.]+)/(.+)$ /stream/$1/$2;
    proxy_redirect ~^http://([^/]+)/(.+)$  /stream/$1/$2;
```

> **Observação**: O primeiro `proxy_redirect` cobre redirecionamentos para IP; o segundo cobre domínios.

Após editar o arquivo **/etc/nginx/sites-available/proxy.conf**:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Resultado
* O player agora recebe os segmentos TS sem bloqueio de CORS.
* Redirecionamentos 302 continuam encapsulados no proxy, evitando *Mixed-Content*.

---
_Status: concluído_ 