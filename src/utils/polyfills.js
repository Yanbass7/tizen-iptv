// Polyfills para compatibilidade com Tizen TV e navegadores mais antigos

/**
 * Polyfill para String.prototype.padStart
 * Necessário para Tizen TV que não suporta ES2017
 */
if (!String.prototype.padStart) {
  String.prototype.padStart = function padStart(targetLength, padString) {
    targetLength = Math.floor(targetLength) || 0;
    if (targetLength < this.length) return String(this);
    
    padString = padString !== undefined ? String(padString) : ' ';
    if (padString.length === 0) return String(this);
    
    const str = String(this);
    const padLength = targetLength - str.length;
    
    if (padLength <= 0) return str;
    
    // Repetir padString quantas vezes necessário
    let pad = '';
    let repeatCount = Math.ceil(padLength / padString.length);
    for (let i = 0; i < repeatCount; i++) {
      pad += padString;
    }
    
    return pad.slice(0, padLength) + str;
  };
}

/**
 * Polyfill para String.prototype.padEnd
 * Para completude, caso seja necessário no futuro
 */
if (!String.prototype.padEnd) {
  String.prototype.padEnd = function padEnd(targetLength, padString) {
    targetLength = Math.floor(targetLength) || 0;
    if (targetLength < this.length) return String(this);
    
    padString = padString !== undefined ? String(padString) : ' ';
    if (padString.length === 0) return String(this);
    
    const str = String(this);
    const padLength = targetLength - str.length;
    
    if (padLength <= 0) return str;
    
    // Repetir padString quantas vezes necessário
    let pad = '';
    let repeatCount = Math.ceil(padLength / padString.length);
    for (let i = 0; i < repeatCount; i++) {
      pad += padString;
    }
    
    return str + pad.slice(0, padLength);
  };
}

/**
 * Polyfill para Array.prototype.includes
 * Tizen TV mais antigo pode não suportar
 */
if (!Array.prototype.includes) {
  Array.prototype.includes = function includes(valueToFind, fromIndex) {
    return this.indexOf(valueToFind, fromIndex) !== -1;
  };
}

/**
 * Polyfill para Array.prototype.find
 * Necessário para Tizen TV
 */
if (!Array.prototype.find) {
  Array.prototype.find = function find(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    const list = Object(this);
    const length = parseInt(list.length) || 0;
    const thisArg = arguments[1];
    for (let i = 0; i < length; i++) {
      const element = list[i];
      if (predicate.call(thisArg, element, i, list)) {
        return element;
      }
    }
    return undefined;
  };
}

/**
 * Polyfill para Array.prototype.findIndex
 * Útil para encontrar índices
 */
if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function findIndex(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.findIndex called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    const list = Object(this);
    const length = parseInt(list.length) || 0;
    const thisArg = arguments[1];
    for (let i = 0; i < length; i++) {
      const element = list[i];
      if (predicate.call(thisArg, element, i, list)) {
        return i;
      }
    }
    return -1;
  };
}

/**
 * Polyfill para String.prototype.includes
 * Tizen TV pode não suportar
 */
if (!String.prototype.includes) {
  String.prototype.includes = function includes(search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

/**
 * Polyfill para String.prototype.startsWith
 * Tizen TV pode não suportar
 */
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function startsWith(searchString, position) {
    position = position || 0;
    return this.substr(position, searchString.length) === searchString;
  };
}

/**
 * Polyfill para String.prototype.endsWith
 * Tizen TV pode não suportar
 */
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function endsWith(searchString, length) {
    if (length === undefined || length > this.length) {
      length = this.length;
    }
    return this.substring(length - searchString.length, length) === searchString;
  };
}

/**
 * Polyfill para Object.entries
 * Útil para iteração de objetos
 */
if (!Object.entries) {
  Object.entries = function entries(obj) {
    const ownProps = Object.keys(obj);
    let i = ownProps.length;
    const resArray = new Array(i);
    while (i--) {
      resArray[i] = [ownProps[i], obj[ownProps[i]]];
    }
    return resArray;
  };
}

/**
 * Polyfill para Object.values
 * Útil para extrair valores de objetos
 */
if (!Object.values) {
  Object.values = function values(obj) {
    const ownProps = Object.keys(obj);
    let i = ownProps.length;
    const resArray = new Array(i);
    while (i--) {
      resArray[i] = obj[ownProps[i]];
    }
    return resArray;
  };
}

/**
 * Função auxiliar para formatação de números com zeros à esquerda
 * Alternativa segura ao padStart para casos específicos
 */
export const padNumber = (num, length = 2, char = '0') => {
  const str = String(num);
  if (str.length >= length) return str;
  
  const pad = Array(length - str.length + 1).join(char);
  return pad + str;
};

/**
 * Função auxiliar para formatação de episódios
 * Uso: formatEpisode(1, 5) -> "S01E05"
 */
export const formatEpisode = (season, episode) => {
  return `S${padNumber(season, 2)}E${padNumber(episode, 2)}`;
};

// Log de inicialização dos polyfills
console.log('🔧 Polyfills carregados para Tizen TV:', {
  padStart: typeof String.prototype.padStart === 'function',
  padEnd: typeof String.prototype.padEnd === 'function',
  arrayIncludes: typeof Array.prototype.includes === 'function',
  arrayFind: typeof Array.prototype.find === 'function',
  arrayFindIndex: typeof Array.prototype.findIndex === 'function',
  stringIncludes: typeof String.prototype.includes === 'function',
  stringStartsWith: typeof String.prototype.startsWith === 'function',
  stringEndsWith: typeof String.prototype.endsWith === 'function',
  objectEntries: typeof Object.entries === 'function',
  objectValues: typeof Object.values === 'function'
}); 