# Diretrizes para CSS em Aplicações Tizen TV

Este documento resume as melhores práticas e correções identificadas para desenvolver CSS que funcione de forma confiável em dispositivos Tizen TV, com foco na compatibilidade com versões mais antigas da plataforma (como Tizen 5.0-6.5).

## 1. Configuração da Viewport

A configuração correta da viewport é fundamental para o layout em TVs.

*   **Use uma viewport de largura fixa:** No seu arquivo HTML principal (geralmente `public/index.html` ou `index.html`), defina a meta tag viewport para a resolução de design alvo da sua aplicação. Para Full HD (1920x1080), que é comum:
    ```html
    <meta name="viewport" content="width=1920" />
    ```
*   **Por que?** Isso estabelece uma base consistente para todas as suas unidades de medida em pixels e simplifica o design para uma tela de tamanho conhecido, ao contrário da abordagem `width=device-width` usada para web responsiva tradicional.

## 2. Box Sizing

Utilize `box-sizing: border-box;` globalmente.

*   **Implementação:**
    ```css
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }
    ```
    Coloque esta regra no seu arquivo CSS global (ex: `src/index.css` ou `src/App.css`).
*   **Por que?** Isso faz com que as propriedades `padding` e `border` de um elemento não aumentem suas dimensões finais (largura/altura), simplificando cálculos de layout. O uso de `!important` (como visto no projeto) pode ser necessário se houver conflitos, mas o ideal é que esta seja uma das primeiras regras aplicadas.

## 3. Resets de CSS

Seja cauteloso com resets de CSS, especialmente para a propriedade `border`.

*   **Evite Resets Agressivos de Borda:**
    *   **Problema:** Um reset como `div, span, input, button { border: 0; }` aplicado indiscriminadamente (especialmente dentro de arquivos CSS de componentes) pode remover bordas que você define explicitamente depois, ou bordas padrão úteis de elementos como inputs.
    *   **Solução:**
        *   Se precisar de um reset de borda, faça-o de forma seletiva e, preferencialmente, em seus arquivos CSS globais.
        *   Para a maioria dos elementos de layout como `div` ou `span`, `border: 0;` é redundante, pois eles não têm borda por padrão.
        *   Para elementos de formulário, pode ser preferível estilizar suas bordas explicitamente em vez de resetá-las e recriá-las.

## 4. Espaçamento em Layouts Flexbox e Grid

A propriedade `gap` (e suas variantes `row-gap` e `column-gap`) tem suporte limitado em versões mais antigas do Tizen.

*   **Compatibilidade:**
    *   `column-gap`: Geralmente bem suportada para espaçamento horizontal em Flexbox e Grid (Tizen 5.0+).
    *   `row-gap`: **Não suportada em Tizen <= 6.5**. Isso significa que o espaçamento vertical em layouts de múltiplas linhas (flex com `wrap` ou grid) não funcionará se depender apenas de `row-gap`.
    *   `gap` (shorthand): Devido à falta de suporte para `row-gap`, o `gap` shorthand também falhará em criar espaçamento vertical em Tizen <= 6.5.

*   **Solução: Use Margens para Espaçamento Vertical:**
    *   **Para `display: flex; flex-direction: column;`:**
        *   Remova `gap` ou `row-gap`.
        *   Adicione `margin-bottom` a cada item flex, exceto possivelmente o último.
        ```css
        /* Antes (problemático em Tizen antigo) */
        .flex-column-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Depois (compatível) */
        .flex-column-container {
          display: flex;
          flex-direction: column;
        }
        .flex-column-container > * {
          margin-bottom: 20px;
        }
        .flex-column-container > *:last-child {
          margin-bottom: 0;
        }
        ```

    *   **Para `display: flex; flex-direction: row; flex-wrap: wrap;` (para itens que quebram linha):**
        *   Você pode usar `column-gap` para o espaçamento horizontal (ou margens horizontais).
        *   Para o espaçamento vertical (entre as linhas), adicione `margin-bottom` a todos os itens.
        ```css
        /* Antes (problemático em Tizen antigo) */
        .flex-wrap-container {
          display: flex;
          flex-wrap: wrap;
          gap: 15px 20px; /* row-gap column-gap */
        }

        /* Depois (compatível) */
        .flex-wrap-container {
          display: flex;
          flex-wrap: wrap;
          column-gap: 20px; /* Ou use margin-right nos itens */
        }
        .flex-wrap-container > * {
          margin-bottom: 15px;
          /* Se não usar column-gap, adicione margin-right aqui também,
             e lide com a margem extra no último item da linha se necessário. */
        }
        ```

    *   **Para `display: grid;`:**
        *   Use `column-gap` para espaçamento horizontal.
        *   Adicione `margin-bottom` aos itens do grid para simular `row-gap`.
        ```css
        /* Antes (problemático em Tizen antigo) */
        .grid-container {
          display: grid;
          gap: 15px 20px; /* row-gap column-gap */
        }

        /* Depois (compatível) */
        .grid-container {
          display: grid;
          column-gap: 20px;
        }
        .grid-container > * {
          margin-bottom: 15px;
        }
        ```

## 5. Unidades de Medida

Com uma viewport fixa (`width=1920`), o uso de `px` é direto e previsível.

*   **Pixels (`px`):** Unidade mais comum e fácil de gerenciar para uma viewport fixa.
*   **REM (`rem`):** Pode ser usado para escalabilidade de fontes, mas defina um `font-size` base consistente no elemento `html` ou `body` (ex: `font-size: 10px` ou `font-size: 16px` na viewport de 1920px) para que `1rem` tenha um valor pixel conhecido.
*   **Porcentagens (`%`):** Referem-se ao contêiner pai. Útil para larguras/alturas fluidas dentro de um layout estruturado.
*   **Unidades de Viewport (`vw`, `vh`):** Use com cautela. Como a viewport principal já está "fixa" em 1920px (por exemplo), `100vw` será sempre `1920px`. Elas podem ser úteis em contextos específicos, mas `px` e `%` geralmente são suficientes.

## 6. Performance e Otimizações

*   **Aceleração por GPU:** Para animações e transições suaves, pode-se sugerir ao navegador que use aceleração por GPU:
    ```css
    .animated-element {
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
    }
    ```
    Use com moderação em elementos que realmente se beneficiam, pois o uso excessivo pode ter o efeito contrário. `translate3d(0,0,0)` é outra técnica similar.
*   **Evite `!important`:** Use apenas quando estritamente necessário para sobrescrever estilos externos ou de alta especificidade. O uso excessivo dificulta a manutenção.
*   **Seletores Eficientes:** Prefira seletores CSS que sejam eficientes e não sobrecarreguem o motor de renderização.

## 7. Prefixos CSS (-webkit-)

Para garantir compatibilidade com Web Engines mais antigos em Tizen (baseados em WebKit/Chromium mais antigos):

*   Inclua prefixos `-webkit-` para propriedades como:
    *   `transform`
    *   `transition`
    *   `animation`
    *   `flex`, `flex-direction`, `justify-content`, `align-items`, etc. (embora o suporte a flexbox sem prefixo seja bom em versões de Chromium a partir do M60+, é uma boa prática para Tizen mais antigos).
    *   `box-shadow`
    *   `border-radius`
*   **Exemplo:**
    ```css
    .element {
      -webkit-transition: opacity 0.3s ease;
      transition: opacity 0.3s ease;

      display: -webkit-flex;
      display: flex;
      -webkit-justify-content: center;
      justify-content: center;
    }
    ```
    Ferramentas como Autoprefixer (se integradas ao seu processo de build) podem ajudar a gerenciar isso automaticamente.

## 8. Testes em Dispositivos Reais

*   **Fundamental:** Emuladores são úteis, mas o teste em dispositivos Tizen reais, especialmente nas versões de plataforma mais antigas que seu aplicativo precisa suportar (ex: Tizen 5.0, 5.5), é crucial para identificar problemas de layout e performance específicos do ambiente.

Seguindo estas diretrizes, você poderá criar CSS mais robusto e compatível para suas aplicações Tizen TV. 