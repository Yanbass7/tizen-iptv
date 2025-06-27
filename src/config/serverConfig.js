// Configuração centralizada do servidor IPTV
// Para alterar a rota, modifique apenas este arquivo

export const SERVER_CONFIG = {
  // Configuração principal do servidor
  baseUrl: 'https://rota66.bar',
  
  // URLs alternativas (para fallback)
  alternativeUrls: [
    'https://rota66.bar',
    // Adicione outras rotas aqui
  ],
  
  // Credenciais (podem ser diferentes para cada servidor)
  credentials: {
    username: 'zBB82J',
    password: 'AMeDHq'
  },
  
  // API endpoints
  api: {
    baseUrl: 'https://rota66.bar/player_api.php',
    credentials: 'username=zBB82J&password=AMeDHq'
  }
};

// Função para construir URL de stream
export const buildStreamUrl = (streamId, type = 'movie') => {
  const { baseUrl, credentials } = SERVER_CONFIG;
  
  switch (type) {
    case 'movie':
      return `${baseUrl}/${credentials.username}/${credentials.password}/${streamId}`;
    
    case 'series':
      return `${baseUrl}/series/${credentials.username}/${credentials.password}/${streamId}.mp4`;
    
    case 'live':
      return `${baseUrl}/${credentials.username}/${credentials.password}/${streamId}`;
    
    default:
      return `${baseUrl}/${credentials.username}/${credentials.password}/${streamId}`;
  }
};

// Função para construir URL da API
export const buildApiUrl = (action, params = {}) => {
  const { api } = SERVER_CONFIG;
  
  const queryParams = new URLSearchParams({
    ...api.credentials.split('&').reduce((acc, param) => {
      const [key, value] = param.split('=');
      acc[key] = value;
      return acc;
    }, {}),
    action,
    ...params
  });
  
  return `${api.baseUrl}?${queryParams.toString()}`;
};

// Para facilitar mudanças futuras:
export const CURRENT_SERVER = {
  name: 'Rota66',
  status: 'active', // 'active', 'maintenance', 'blocked'
  description: 'Servidor principal do IPTV'
};

export default SERVER_CONFIG; 