# Diagnóstico do Nginx (porta 443)

## Contexto
Após reiniciar o Nginx no VPS `srv820279`, o serviço ainda não responde em `https://localhost:443` nem externamente em `bigtv-proxy-teste.duckdns.org`. Precisamos descobrir por que o Nginx não está escutando na porta 443.

## Passos de diagnóstico sugeridos

1. **Verificar status do serviço**
   ```bash
   sudo systemctl status nginx -l --no-pager
   ```
   - Confirma se o serviço está `active (running)` ou se falhou.

2. **Testar a configuração**
   ```bash
   sudo nginx -t
   ```
   - Detecta erros de sintaxe ou problemas em arquivos incluídos.

3. **Consultar logs detalhados**
   ```bash
   sudo journalctl -xeu nginx --no-pager | tail -n 50
   sudo tail -n 50 /var/log/nginx/error.log
   ```
   - Mensagens de erro de certificados, portas já em uso ou sintaxe incorreta.

4. **Checar arquivos de certificado**
   - Garantir que os caminhos em `ssl_certificate` e `ssl_certificate_key` existam e tenham permissões corretas.
   - Em caso de LetsEncrypt, verifique `/etc/letsencrypt/live/bigtv-proxy-teste.duckdns.org/`.

5. **Confirmar blocos de servidor para 443**
   - Abrir `/etc/nginx/sites-enabled/default` ou outros vhosts e confirmar:
     ```nginx
     server {
         listen 443 ssl;
         server_name bigtv-proxy-teste.duckdns.org;
         ...
     }
     ```
   - Se o bloco `listen 443 ssl;` estiver ausente ou comentado, o Nginx não ficará na porta 443.

6. **Recarregar serviço após correções**
   ```bash
   sudo systemctl reload nginx
   ```

---
_Status: documento de diagnóstico criado. Aguardando execução dos comandos no servidor._ 