// Utilitários de scroll seguros para compatibilidade com Tizen TV

/**
 * Função auxiliar para scroll seguro compatível com Tizen
 * @param {Element} element - Elemento para fazer scroll
 * @param {Object} options - Opções de scroll (left, top, behavior)
 */
export const safeScrollTo = (element, options) => {
  if (!element) return;
  
  try {
    // Verifica se scrollTo está disponível e é uma função
    if (typeof element.scrollTo === 'function') {
      element.scrollTo(options);
    } else {
      // Fallback para navegadores que não suportam scrollTo
      if (options.left !== undefined) {
        element.scrollLeft = options.left;
      }
      if (options.top !== undefined) {
        element.scrollTop = options.top;
      }
    }
  } catch (error) {
    console.warn('Erro no scroll, usando fallback:', error);
    // Fallback manual em caso de erro
    if (options.left !== undefined) {
      element.scrollLeft = options.left;
    }
    if (options.top !== undefined) {
      element.scrollTop = options.top;
    }
  }
};

/**
 * Função auxiliar para scrollIntoView seguro
 * @param {Element} element - Elemento para fazer scroll
 * @param {Object} options - Opções de scrollIntoView
 */
export const safeScrollIntoView = (element, options = {}) => {
  if (!element) return;
  
  try {
    if (typeof element.scrollIntoView === 'function') {
      element.scrollIntoView(options);
    } else {
      // Fallback simples para navegadores que não suportam scrollIntoView
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset + rect.top - (window.innerHeight / 2);
      
      // Usa safeScrollTo para window também
      if (typeof window.scrollTo === 'function') {
        window.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: options.behavior || 'smooth'
        });
      } else {
        window.scrollTop = Math.max(0, scrollTop);
      }
    }
  } catch (error) {
    console.warn('Erro no scrollIntoView, usando fallback:', error);
    // Fallback básico
    try {
      element.scrollIntoView();
    } catch (fallbackError) {
      console.warn('Fallback também falhou:', fallbackError);
    }
  }
};

/**
 * Função para scroll horizontal em carrosséis
 * @param {Element} container - Container do carrossel
 * @param {Element} targetElement - Elemento alvo
 * @param {String} behavior - Comportamento do scroll ('smooth' ou 'auto')
 */
export const scrollToElementInCarousel = (container, targetElement, behavior = 'smooth') => {
  if (!container || !targetElement) return;
  
  const elementWidth = targetElement.offsetWidth;
  const containerWidth = container.offsetWidth;
  const scrollLeft = targetElement.offsetLeft - (containerWidth / 2) + (elementWidth / 2);
  
  safeScrollTo(container, {
    left: Math.max(0, scrollLeft),
    behavior: behavior
  });
};

/**
 * Verifica se o elemento está visível no viewport
 * @param {Element} element - Elemento para verificar
 * @param {Element} container - Container de referência (opcional)
 * @returns {boolean} - True se visível
 */
export const isElementVisible = (element, container = null) => {
  if (!element) return false;
  
  try {
    const rect = element.getBoundingClientRect();
    const containerRect = container ? container.getBoundingClientRect() : {
      top: 0,
      left: 0,
      bottom: window.innerHeight,
      right: window.innerWidth
    };
    
    return (
      rect.left >= containerRect.left &&
      rect.right <= containerRect.right &&
      rect.top >= containerRect.top &&
      rect.bottom <= containerRect.bottom
    );
  } catch (error) {
    console.warn('Erro ao verificar visibilidade:', error);
    return false;
  }
}; 