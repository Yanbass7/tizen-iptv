# Teste de conectividade ao proxy `bigtv-proxy-teste.duckdns.org`

## Objetivo
Verificar se o endpoint HTTPS do proxy está acessível e retornando cabeçalhos válidos para o stream.

## Comando executado
```powershell
curl.exe -I "https://bigtv-proxy-teste.duckdns.org/stream/rota66.bar/movie/zBB82J/AMeDHq/338541.mp4"
```

## Resultado obtido (11-06-2024)
```
curl: (28) Failed to connect to bigtv-proxy-teste.duckdns.org port 443 after 42164 ms: Could not connect to server
```

## Análise
O timeout indica que a porta 443 do VPS não está aceitando conexões ou o serviço Nginx não está em execução.

Possíveis causas:
1. Nginx parado ou configuração incorreta.
2. Firewall/iptables bloqueando porta 443.
3. Certbot não renovou/instalou corretamente o certificado e Nginx não subiu.

## Próximas ações
- Conectar ao VPS e verificar status do Nginx: `sudo systemctl status nginx`.
- Testar localmente no VPS: `curl -I https://localhost` para confirmar escuta.
- Validar regras de firewall: `sudo ufw status` ou `sudo iptables -L`.
- Se necessário, `sudo systemctl restart nginx` e revisar logs em `/var/log/nginx/error.log`.

---
_Status: tarefa de teste concluída, proxy ainda inacessível._ 