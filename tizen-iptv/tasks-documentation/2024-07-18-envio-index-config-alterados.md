# Envio das versões alteradas – `index.html` e `config.xml`

Data: 18/07/2024

## Arquivos entregues

A seguir apresento **os dois arquivos completos** já com as alterações necessárias para capturar o MAC da TV Tizen e redirecionar ao seu site.

---

### 1. `index.html`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <title>Carregando…</title>

    <!-- Script para capturar MAC e redirecionar -->
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        function redirect(mac) {
          location.replace('https://bigtvplay.web.app/?mac=' + encodeURIComponent(mac || 'unknown'));
        }

        // Verifica se está rodando na TV Tizen
        if (typeof tizen !== 'undefined' && tizen.systeminfo) {
          const props = ['ETHERNET_NETWORK', 'WIFI_NETWORK'];
          let i = 0;

          const tryNext = () => {
            if (i >= props.length) {
              return redirect('unknown');
            }
            tizen.systeminfo.getPropertyValue(
              props[i++],
              (net) => {
                if (net && net.macAddress) {
                  redirect(net.macAddress);
                } else {
                  tryNext();
                }
              },
              tryNext // Em caso de erro, tenta a próxima propriedade
            );
          };

          tryNext();
        } else {
          // Executado fora da TV Tizen ou sem API disponível
          redirect('unsupported');
        }
      });
    </script>

    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #000;
      }
    </style>
</head>
<body>
    <!-- Tela preta "Carregando…" -->
</body>
</html>
```

Principais mudanças em relação ao seu HTML:

1. Uso de `ETHERNET_NETWORK` e `WIFI_NETWORK` em vez de `NETWORK` (garante campo `macAddress`).
2. Fallback em cadeia: se falhar numa, testa a próxima; senão envia `unknown`.
3. Redirecionamento via `location.replace` (não deixa histórico).

---

### 2. `config.xml` (widget)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets"
        xmlns:tizen="http://tizen.org/ns/widgets"
        id="http://yourdomain/bigtvapp"
        version="1.0.0"
        viewmodes="maximized"
        tizen:access-origin-in-widget="true">

    <tizen:application id="x5egOTKK94.bigtvapp" package="x5egOTKK94" required_version="2.3" />

    <!-- Carrega o index.html acima -->
    <content src="index.html" />

    <!-- Libera navegação e requisições externas -->
    <access origin="*" subdomains="true" />
    <tizen:allow-navigation>*</tizen:allow-navigation>

    <!-- Política CSP relaxada (apenas exemplo, ajuste conforme a loja) -->
    <tizen:content-security-policy>default-src *; frame-src *; connect-src *; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src 'self' 'unsafe-inline' *;</tizen:content-security-policy>

    <icon src="icon.png" />
    <name>bigtvapp</name>

    <feature name="http://tizen.org/feature/screen.size.all" />
    <feature name="http://tizen.org/feature/network.wifi" />
    <feature name="http://tizen.org/feature/network.ethernet" />

    <tizen:profile name="tv" />

    <tizen:setting screen-orientation="landscape"
                   context-menu="disable"
                   background-support="disable"
                   encryption="disable"
                   install-location="auto"
                   hwkey-event="enable" />

    <!-- Privilégios necessários -->
    <tizen:privilege name="http://tizen.org/privilege/internet" />
    <tizen:privilege name="http://tizen.org/privilege/systeminfo" />
    <tizen:privilege name="http://tizen.org/privilege/network.get" />

</widget>
```

Principais mudanças:

1. Inclusão das *features* `network.wifi` e `network.ethernet` (exigidas em TVs mais novas).
2. Inclusão do privilégio `network.get` (recomendado a partir das últimas versões da SDK).
3. Reorganização: `<tizen:allow-navigation>` logo após `<access>`.

---

## Conclusão

Os dois arquivos acima já contêm tudo o que precisa para:
1. Coletar o MAC em TVs Tizen (ethernet ou Wi-Fi).
2. Redirecionar para `https://bigtvplay.web.app` com `?mac=...`.

Tarefa concluída ✅ 