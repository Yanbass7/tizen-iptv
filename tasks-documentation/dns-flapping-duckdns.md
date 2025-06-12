# Falha intermitente na resolução DNS – DuckDNS

## Sintoma
`curl -vk https://bigtv-proxy-teste.duckdns.org/...` retorna imediatamente:
```
Could not resolve host: bigtv-proxy-teste.duckdns.org
```
O mesmo domínio havia resolvido segundos antes (nslookup + ping OK).

## Hipóteses
1. **TTL muito baixo**: DuckDNS atualiza o registro a cada chamada; se um script incorreto publica IP `0.0.0.0` ou um IP antigo, o resolver recebe NXDOMAIN temporário.
2. **Rate-limit/Bloqueio** do lado DuckDNS: muitos updates em curto período ⇒ resposta vacia.
3. **Cache negativo no ISP**: Após NXDOMAIN, Chrome cacha status por 30 s.
4. **Firewall VPS/Cloudflare**: se o IP muda ou fica offline, DuckDNS pode remover registro.

## Passos de verificação
1. Consultar registro público diretamente nos servidores DuckDNS (sem cache):
   ```bash
   dig @ns1.duckdns.org bigtv-proxy-teste.duckdns.org +short
   ```
2. Verificar cron de update na VPS:
   ```bash
   cat /etc/cron.d/duckdns
   sudo systemctl status duckdns-updater.service  # se usar systemd
   ```
3. Conferir último log de update:
   ```bash
   tail -n 20 ~/duckdns/duck.log
   ```
4. Se IP da VPS mudou:
   ```bash
   curl -s http://ipinfo.io/ip
   ```
   Compare com valor retornado pelo passo 1.
5. Forçar update manual:
   ```bash
   curl "https://www.duckdns.org/update?domains=bigtv-proxy-teste&token=<TOKEN>&ip="
   ```
   Resposta `OK` seguida do IP.
6. Limpar cache DNS local (Windows):
   ```powershell
   ipconfig /flushdns
   ```

## Mitigação rápida
* Configurar segundo registro DuckDNS (bigtv-proxy-teste2) apontando mesmo IP e colocar no código como fallback.
* Aumentar intervalo de update para 5 min.

## Resultado do nameserver autoritativo
O comando executado no servidor:
```bash
root@srv820279:~# dig @ns1.duckdns.org bigtv-proxy-teste.duckdns.org +short
212.85.14.48
```
Confirma que o registro **existe** e aponta para o IP correto. O problema de resolução, portanto, é intermitente em caches recursivos/ISP ou no cliente, não no autoritativo.

---
_Status: concluído_ 