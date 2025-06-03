# Guia Completo de CSS para Tizen 5.0+

## 📋 Índice
1. [Reset CSS Obrigatório](#reset-css-obrigatório)
2. [Prefixos WebKit Essenciais](#prefixos-webkit-essenciais)
3. [Flexbox Compatível](#flexbox-compatível)
4. [Otimizações de Performance](#otimizações-de-performance)
5. [Animações e Transições](#animações-e-transições)
6. [Estados de Foco](#estados-de-foco)
7. [Media Queries](#media-queries)
8. [Propriedades Problemáticas](#propriedades-problemáticas)
9. [Template Base](#template-base)

---

## 🔧 Reset CSS Obrigatório

**SEMPRE** inclua este reset no início de cada arquivo CSS:

```css
/* ==========================================================================
   RESET CSS ESPECÍFICO PARA TIZEN 5.0+
   ========================================================================== */

/* Reset otimizado para Tizen 5.0+ */
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
}

div, span, p, h1, h2, h3, h4, h5, h6, button, img, input, form {
  margin: 0;
  padding: 0;
  border: 0;
  outline: 0;
  vertical-align: baseline;
}

/* Force o box-sizing com prefixos para Tizen 5.0+ */
*, *:before, *:after {
  -webkit-box-sizing: border-box !important;
  -moz-box-sizing: border-box !important;
  -ms-box-sizing: border-box !important;
  box-sizing: border-box !important;
}

/* Disable smooth scrolling para melhor performance */
* {
  scroll-behavior: auto !important;
  -webkit-scroll-behavior: auto !important;
}
```

---

## 🎯 Prefixos WebKit Essenciais

### Display Flex
```css
/* ❌ ERRADO */
display: flex;

/* ✅ CORRETO */
display: -webkit-box;      /* Fallback antigo */
display: -webkit-flex;     /* WebKit */
display: -ms-flexbox;      /* IE */
display: flex;             /* Padrão */
```

### Flex Direction
```css
/* ❌ ERRADO */
flex-direction: column;

/* ✅ CORRETO */
-webkit-box-orient: vertical;
-webkit-box-direction: normal;
-webkit-flex-direction: column;
-ms-flex-direction: column;
flex-direction: column;
```

### Justify Content
```css
/* ❌ ERRADO */
justify-content: center;

/* ✅ CORRETO */
-webkit-box-pack: center;
-webkit-justify-content: center;
-ms-flex-pack: center;
justify-content: center;
```

### Align Items
```css
/* ❌ ERRADO */
align-items: center;

/* ✅ CORRETO */
-webkit-box-align: center;
-webkit-align-items: center;
-ms-flex-align: center;
align-items: center;
```

### Flex Grow/Shrink
```css
/* ❌ ERRADO */
flex: 1;

/* ✅ CORRETO */
-webkit-box-flex: 1;
-webkit-flex: 1;
-ms-flex: 1;
flex: 1;
```

---

## 📦 Flexbox Compatível

### Container Flex Básico
```css
.flex-container {
  /* Fallback para browsers antigos */
  display: block;
  
  /* Prefixos WebKit para Tizen */
  display: -webkit-box;
  display: -webkit-flex;
  display: -ms-flexbox;
  display: flex;
  
  /* Direção com prefixos */
  -webkit-box-orient: vertical;
  -webkit-box-direction: normal;
  -webkit-flex-direction: column;
  -ms-flex-direction: column;
  flex-direction: column;
  
  /* Alinhamento com prefixos */
  -webkit-box-pack: center;
  -webkit-justify-content: center;
  -ms-flex-pack: center;
  justify-content: center;
  
  -webkit-box-align: center;
  -webkit-align-items: center;
  -ms-flex-align: center;
  align-items: center;
}
```

### Item Flex
```css
.flex-item {
  -webkit-box-flex: 1;
  -webkit-flex: 1;
  -ms-flex: 1;
  flex: 1;
  
  -webkit-flex-shrink: 0;
  -ms-flex-negative: 0;
  flex-shrink: 0;
}
```

---

## ⚡ Otimizações de Performance

### GPU Acceleration Obrigatória
```css
/* Aplicar em TODOS os elementos principais */
.elemento-principal {
  -webkit-transform: translateZ(0);
  -moz-transform: translateZ(0);
  -ms-transform: translateZ(0);
  transform: translateZ(0);
  -webkit-backface-visibility: hidden;
  -moz-backface-visibility: hidden;
  backface-visibility: hidden;
}
```

### Para Elementos Críticos (imagens, vídeos)
```css
.elemento-critico {
  -webkit-transform: translate3d(0, 0, 0);
  -moz-transform: translate3d(0, 0, 0);
  -ms-transform: translate3d(0, 0, 0);
  transform: translate3d(0, 0, 0);
}
```

### Otimização de Texto
```css
.texto-otimizado {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 🎬 Animações e Transições

### Keyframes Cross-Browser
```css
@-webkit-keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@-moz-keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@-o-keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Aplicação de Animação
```css
.elemento-animado {
  -webkit-animation: fadeIn 1s ease-in-out;
  -moz-animation: fadeIn 1s ease-in-out;
  -o-animation: fadeIn 1s ease-in-out;
  animation: fadeIn 1s ease-in-out;
}
```

### Transições Otimizadas
```css
.elemento-transicao {
  -webkit-transition: background-color 0.3s ease, opacity 0.3s ease;
  -moz-transition: background-color 0.3s ease, opacity 0.3s ease;
  -o-transition: background-color 0.3s ease, opacity 0.3s ease;
  transition: background-color 0.3s ease, opacity 0.3s ease;
}
```

---

## 🎯 Estados de Foco

### Para Navegação por Controle Remoto
```css
.elemento-focavel {
  /* Estado normal */
  background: #333;
  outline: none;
  
  /* GPU acceleration */
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}

.elemento-focavel:hover,
.elemento-focavel.focused {
  background: #555;
  outline: 3px solid #FF8C00;
  outline-offset: 2px;
}

/* Para botões principais */
.botao-principal.focused {
  background: #ff8c5a;
  outline: 3px solid rgba(255, 107, 53, 0.6);
  outline-offset: 2px;
}
```

---

## 📱 Media Queries

### Padrão para Smart TVs
```css
/* 4K TVs */
@media (max-width: 3840px) {
  /* Estilos para 4K */
}

/* Full HD TVs */
@media (max-width: 1920px) {
  /* Estilos para Full HD */
}

/* HD TVs */
@media (max-width: 1366px) {
  /* Estilos para HD */
}

/* TVs menores */
@media (max-width: 768px) {
  /* Estilos para TVs menores */
}
```

---

## ⚠️ Propriedades Problemáticas

### Gradientes
```css
/* ❌ EVITAR */
background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);

/* ✅ USAR COM FALLBACK */
background: #1a1a2e; /* Fallback sólido */
background: -webkit-gradient(linear, left top, right bottom, from(#1a1a2e), to(#16213e));
background: -webkit-linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
background: -o-linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
```

### Transform
```css
/* ❌ EVITAR */
transform: translate(-50%, -50%);

/* ✅ USAR COM FALLBACK */
margin-top: -25px;    /* Fallback */
margin-left: -25px;   /* Fallback */
-webkit-transform: translate(-50%, -50%);
-moz-transform: translate(-50%, -50%);
-ms-transform: translate(-50%, -50%);
transform: translate(-50%, -50%);
```

### Placeholders
```css
/* ✅ TODOS OS PREFIXOS */
input::placeholder { color: #888; }
input::-webkit-input-placeholder { color: #888; }
input::-moz-placeholder { color: #888; opacity: 1; }
input:-ms-input-placeholder { color: #888; }
```

### Scrollbar
```css
/* ✅ CROSS-BROWSER */
.container {
  scrollbar-width: none;           /* Firefox */
  -ms-overflow-style: none;        /* IE */
  -webkit-overflow-scrolling: touch; /* iOS */
}

.container::-webkit-scrollbar {
  display: none;                   /* Chrome/Safari */
}
```

---

## 📄 Template Base

### Estrutura Completa de Arquivo CSS
```css
/* ==========================================================================
   RESET CSS ESPECÍFICO PARA TIZEN 5.0+
   ========================================================================== */

/* [INCLUIR RESET COMPLETO AQUI] */

/* ==========================================================================
   [NOME DO COMPONENTE] - OTIMIZADO PARA TIZEN 5.0+
   ========================================================================== */

/* Keyframes com prefixos */
@-webkit-keyframes nomeAnimacao {
  /* animação */
}
@-moz-keyframes nomeAnimacao {
  /* animação */
}
@-o-keyframes nomeAnimacao {
  /* animação */
}
@keyframes nomeAnimacao {
  /* animação */
}

/* Container principal */
.componente-principal {
  /* Fallback para browsers antigos */
  display: block;
  
  /* Prefixos WebKit para Tizen */
  display: -webkit-box;
  display: -webkit-flex;
  display: -ms-flexbox;
  display: flex;
  
  /* Propriedades com prefixos */
  -webkit-box-orient: vertical;
  -webkit-box-direction: normal;
  -webkit-flex-direction: column;
  -ms-flex-direction: column;
  flex-direction: column;
  
  /* Otimizações de performance */
  -webkit-transform: translateZ(0);
  -moz-transform: translateZ(0);
  -ms-transform: translateZ(0);
  transform: translateZ(0);
  -webkit-backface-visibility: hidden;
  -moz-backface-visibility: hidden;
  backface-visibility: hidden;
}

/* Estados de foco */
.elemento-focavel.focused {
  outline: 3px solid #FF8C00;
  outline-offset: 2px;
}

/* ==========================================================================
   OTIMIZAÇÕES ESPECÍFICAS PARA PERFORMANCE TIZEN 5.0+
   ========================================================================== */

/* Media queries responsivas */
@media (max-width: 1920px) {
  /* Ajustes para Full HD */
}

@media (max-width: 1366px) {
  /* Ajustes para HD */
}

/* GPU acceleration para elementos críticos */
.componente-principal,
.elemento-importante {
  -webkit-transform: translateZ(0);
  -moz-transform: translateZ(0);
  -ms-transform: translateZ(0);
  transform: translateZ(0);
  -webkit-backface-visibility: hidden;
  -moz-backface-visibility: hidden;
  backface-visibility: hidden;
}

/* Hardware acceleration para imagens/vídeos */
.imagem-critica,
.video-critico {
  -webkit-transform: translate3d(0, 0, 0);
  -moz-transform: translate3d(0, 0, 0);
  -ms-transform: translate3d(0, 0, 0);
  transform: translate3d(0, 0, 0);
}
```

---

## ✅ Checklist de Refatoração

Ao refatorar cada arquivo CSS, verifique:

- [ ] Reset CSS incluído no início
- [ ] Todos os `display: flex` têm prefixos WebKit
- [ ] Todas as propriedades flex têm prefixos
- [ ] GPU acceleration aplicada em elementos principais
- [ ] Animações têm prefixos cross-browser
- [ ] Transições têm prefixos cross-browser
- [ ] Estados `.focused` implementados
- [ ] Gradientes têm fallbacks sólidos
- [ ] Transforms têm fallbacks de margin/position
- [ ] Placeholders têm todos os prefixos
- [ ] Media queries para diferentes resoluções
- [ ] Scrollbars customizadas têm prefixos

---

## 🚨 Regras Importantes

1. **NUNCA** use propriedades CSS modernas sem prefixos
2. **SEMPRE** inclua fallbacks para cores sólidas
3. **SEMPRE** aplique GPU acceleration em elementos principais
4. **SEMPRE** teste em resolução 1920x1080 (mínimo)
5. **NUNCA** use `smooth-scroll` (causa problemas de performance)
6. **SEMPRE** use `gap` ao invés de margins em flexbox
7. **SEMPRE** inclua estados `.focused` para navegação por controle remoto

---

## 📝 Exemplo Prático

### Antes (Problemático)
```css
.card {
  display: flex;
  flex-direction: column;
  background: linear-gradient(45deg, #333, #666);
  transition: transform 0.3s;
}

.card:hover {
  transform: scale(1.05);
}
```

### Depois (Compatível com Tizen)
```css
.card {
  /* Fallback */
  display: block;
  background: #333;
  
  /* Prefixos WebKit */
  display: -webkit-box;
  display: -webkit-flex;
  display: -ms-flexbox;
  display: flex;
  
  -webkit-box-orient: vertical;
  -webkit-box-direction: normal;
  -webkit-flex-direction: column;
  -ms-flex-direction: column;
  flex-direction: column;
  
  /* Gradiente com fallback */
  background: -webkit-gradient(linear, left top, right bottom, from(#333), to(#666));
  background: -webkit-linear-gradient(45deg, #333, #666);
  background: linear-gradient(45deg, #333, #666);
  
  /* Transição com prefixos */
  -webkit-transition: -webkit-transform 0.3s ease;
  -moz-transition: -moz-transform 0.3s ease;
  -o-transition: -o-transform 0.3s ease;
  transition: transform 0.3s ease;
  
  /* GPU acceleration */
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}

.card:hover,
.card.focused {
  -webkit-transform: scale(1.05) translateZ(0);
  -moz-transform: scale(1.05) translateZ(0);
  -ms-transform: scale(1.05) translateZ(0);
  transform: scale(1.05) translateZ(0);
}
```

---

**Use este guia como referência para refatorar todos os arquivos CSS da codebase e garantir compatibilidade total com Tizen 5.0+** 