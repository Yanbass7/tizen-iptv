# Capturar MAC no login (Tizen TV)

Data: 18/07/2024

## Objetivo

Permitir que o `index.html` local do WebApp capture o endereço MAC do dispositivo Tizen TV e redirecione para a aplicação remota (`https://bigtvplay.web.app`) enviando o parâmetro `mac` na query-string.

## Passos

1. Ajustar `config.xml`
   - Incluir privilégios:
     ```xml
     <tizen:privilege name="http://tizen.org/privilege/systeminfo"/>
     <tizen:privilege name="http://tizen.org/privilege/network.get"/>
     <tizen:privilege name="http://tizen.org/privilege/internet"/>
     ```
   - Se a loja exigir, declarar features de rede:
     ```xml
     <feature name="http://tizen.org/feature/network.wifi"/>
     <feature name="http://tizen.org/feature/network.ethernet"/>
     ```

2. Criar/atualizar `index.html` local com o script abaixo (deve ser o **primeiro** arquivo carregado pelo WebApp):
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <meta charset="utf-8"/>
     <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
     <title>Carregando…</title>
     <script>
       document.addEventListener('DOMContentLoaded', function () {
         function redirect(mac) {
           location.replace('https://bigtvplay.web.app/?mac=' + encodeURIComponent(mac || 'unknown'));
         }

         // Verifica se está rodando num dispositivo Tizen
         if (typeof tizen !== 'undefined' && tizen.systeminfo) {
           const props = ['ETHERNET_NETWORK', 'WIFI_NETWORK'];
           let i = 0;

           function tryNext() {
             if (i >= props.length) return redirect('unknown');
             tizen.systeminfo.getPropertyValue(props[i++], function (net) {
               if (net && net.macAddress) {
                 redirect(net.macAddress);
               } else {
                 tryNext();
               }
             }, tryNext);
           }
           tryNext();
         } else {
           // Executado fora da TV Tizen ou sem permissão
           redirect('unsupported');
         }
       });
     </script>
     <style>
       body { margin: 0; background: #000; }
     </style>
   </head>
   <body></body>
   </html>
   ```

3. Garantir permissão de navegação externa no `config.xml`:
   ```xml
   <tizen:allow-navigation>*</tizen:allow-navigation>
   ```

4. Empacotar, assinar e instalar o aplicativo na TV ou emulador; confirmar no `bigtvplay` que o parâmetro `mac` chega corretamente.

## Conclusão

Tarefa concluída: a tela inicial captura o endereço MAC (via `ETHERNET_NETWORK` ou `WIFI_NETWORK`) e redireciona para a URL remota com o parâmetro `mac` anexado. ✅ 