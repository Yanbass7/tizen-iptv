// Função para criar URL proxy - habilitado especificamente para live streams
export const criarUrlProxyStream = (urlOriginal = '', forceProxy = false) => {
  // Se forceProxy for true (live streams), usar proxy
  if (forceProxy && urlOriginal) {
    // Detectar ambiente
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      // Em desenvolvimento, usar proxy local
      return `http://localhost:3001/proxy?url=${encodeURIComponent(urlOriginal)}`;
    } else {
      // Em produção, usar proxy da própria aplicação
      const baseUrl = window.location.origin;
      return `${baseUrl}/api/proxy?url=${encodeURIComponent(urlOriginal)}`;
    }
  }
  
  // Para VOD ou quando não forçar proxy, retorna URL original
  return urlOriginal;
};

export default criarUrlProxyStream; 