// Configuração central do domínio do proxy HTTPS
// Permite leitura de variável de ambiente e atualização dinâmica (caso futuro)

const DEFAULT_PROXY_DOMAIN = process.env.REACT_APP_PROXY_DOMAIN || 'https://bigtv-proxy-teste.duckdns.org';

let currentProxyDomain = DEFAULT_PROXY_DOMAIN;

/**
 * Atualiza o domínio do proxy em tempo de execução.
 * Útil caso o backend informe um domínio diferente após login.
 * @param {string} domain Domínio completo, incluindo protocolo (https://)
 */
export const setProxyDomain = (domain) => {
  if (domain && typeof domain === 'string') {
    currentProxyDomain = domain.replace(/\/$/, ''); // remove barra final
    console.info(`[proxyConfig] Proxy domain atualizado para: ${currentProxyDomain}`);
  }
};

/** Recupera o domínio corrente do proxy */
export const getProxyDomain = () => currentProxyDomain;

/** URL base da API que será redirecionada pelo nginx para o backend */
export const getApiBaseUrl = () => `${currentProxyDomain}/api`;

/**
 * Converte uma URL de stream HTTP direta para o formato seguro via proxy.
 * @param {string} urlOriginal URL original iniciando com http://
 * @returns {string} URL convertida ou a mesma se não precisar conversão
 */
export const convertStreamUrlViaProxy = (urlOriginal = '') => {
  if (!urlOriginal) return urlOriginal;

  // Já usando proxy
  if (urlOriginal.startsWith(currentProxyDomain)) return urlOriginal;

  // Remove http:// ou https://
  const urlSemProtocolo = urlOriginal.replace(/^https?:\/\//, '');
  return `${currentProxyDomain}/stream/${urlSemProtocolo}`;
}; 