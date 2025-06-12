# proxy.conf final

## Objetivo
Disponibilizar a versão completa do *virtual host* Nginx que atua como proxy HTTPS para API e streams IPTV, já incluindo:

* Cabeçalhos CORS com `always`;
* Reescrita de redirecionamentos 30x via `proxy_redirect` para manter o fluxo dentro do proxy;
* SSL Let's Encrypt.

## Arquivo gerado
O conteúdo deve ser salvo em `/etc/nginx/sites-available/proxy.conf` (ou conforme sua convenção). Lembre-se de criar link simbólico em *sites-enabled* e recarregar o Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/proxy.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

_Status: concluído_ 