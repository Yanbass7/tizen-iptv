# Porta 443 não está escutando

## Sintoma
- `curl -I https://localhost` falha imediatamente.
- `systemctl status nginx` mostra serviço ativo.
- `nginx -t` sem erros.
- Indica que **não há bloco de servidor ouvindo em 443**.

## Verificações rápidas

1. Listar portas que o Nginx abriu:
   ```bash
   sudo ss -tlnp | grep nginx
   # ou
   sudo lsof -i -P -n | grep LISTEN | grep nginx
   ```
   - Se retornar apenas `0.0.0.0:80`, confirma que falta 443.

2. Procurar diretivas `listen 443`:
   ```bash
   sudo grep -R "listen .*443" /etc/nginx 2>/dev/null
   ```
   - Ideal: algo como `listen 443 ssl;` no vhost do domínio.

3. Se não achar, adicionar bloco para TLS (exemplo mínimo):
   ```nginx
   server {
       listen 443 ssl;
       server_name bigtv-proxy-teste.duckdns.org;

       ssl_certificate /etc/letsencrypt/live/bigtv-proxy-teste.duckdns.org/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/bigtv-proxy-teste.duckdns.org/privkey.pem;

       include snippets/ssl-params.conf;  # se existir

       location / {
           proxy_pass http://127.0.0.1; # placeholder
       }

       # ... demais locations /stream e /api
   }
   ```

4. Após editar:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

## Observação
Os erros antigos de `bind() to 0.0.0.0:80 failed (98: Address already in use)` surgiram quando havia dois blocos `listen 80;` default_server simultâneos. Resolver removendo duplicidade ou usando `listen 80 default_server;` apenas em um bloco.

---
_Status: documento criado. Próximo passo é o usuário verificar/configurar o bloco SSL._ 