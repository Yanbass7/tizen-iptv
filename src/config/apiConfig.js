// API de IPTV – valores dinâmicos definidos após login (player-config)
// Estas variáveis são bindings vivos; qualquer atualização através de setPlayerConfig
// será refletida em todos os módulos que as importarem.

export let API_BASE_URL = '';
export let API_CREDENTIALS = '';

// Parse util – recebe algo como "https://rota66.bar/usuario/senha"
// e devolve { host: 'rota66.bar', username: 'usuario', password: 'senha' }
export function parseBaseUrl(baseUrl) {
  if (!baseUrl) return { host: '', username: '', password: '' };
  const sanitized = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const parts = sanitized.split('/');
  return {
    host: parts[0] || '',
    username: parts[1] || '',
    password: parts[2] || ''
  };
}

// Atualiza as variáveis globais e persiste em localStorage
export function setPlayerConfig({ baseUrl, user, senha }) {
  const parsed = parseBaseUrl(baseUrl || '');
  const host = parsed.host;
  const username = parsed.username || user;
  const password = parsed.password || senha;

  if (!host || !username || !password) {
    console.warn('[apiConfig] Dados insuficientes para setPlayerConfig', { baseUrl, user, senha });
    return;
  }

  API_BASE_URL = `https://${host}/player_api.php`;
  API_CREDENTIALS = `username=${username}&password=${password}`;

  try {
    localStorage.setItem('iptvApiBaseUrl', API_BASE_URL);
    localStorage.setItem('iptvApiCredentials', API_CREDENTIALS);
  } catch (_) {}
}

// Na inicialização, tenta restaurar das chaves do localStorage (se houver)
(() => {
  try {
    const storedBase = localStorage.getItem('iptvApiBaseUrl');
    const storedCred = localStorage.getItem('iptvApiCredentials');
    if (storedBase && storedCred) {
      API_BASE_URL = storedBase;
      API_CREDENTIALS = storedCred;
    }
  } catch (_) {}
})();

// Constrói a URL final de stream dados tipo, id e formato
export function buildStreamUrl(type, streamId, format = 'mp4') {
  const credsMatch = API_CREDENTIALS.match(/username=([^&]+)&password=(.+)/);
  if (!API_BASE_URL || !credsMatch) return '';
  const username = credsMatch[1];
  const password = credsMatch[2];

  // Extrai host da API_BASE_URL (antes de /player_api.php)
  const host = API_BASE_URL.replace('https://', '').replace('/player_api.php', '');

  switch (type) {
    case 'movie':
      return `https://${host}/movie/${username}/${password}/${streamId}.${format}`;
    case 'series':
      return `https://${host}/series/${username}/${password}/${streamId}.${format}`;
    case 'live':
      return `https://${host}/live/${username}/${password}/${streamId}.ts`;
    default:
      return `https://${host}/${username}/${password}/${streamId}`;
  }
}

export function clearPlayerConfig() {
  console.log("Limpando configuração global da API IPTV.");
  API_BASE_URL = '';
  API_CREDENTIALS = '';
  try {
    localStorage.removeItem('iptvApiBaseUrl');
    localStorage.removeItem('iptvApiCredentials');
  } catch (_) {}
}

export function getPlayerConfig() {
  const credsMatch = API_CREDENTIALS.match(/username=([^&]+)&password=(.+)/);
  if (!credsMatch) {
    // Se não houver credenciais, retorna uma config vazia e segura
    return { baseUrl: '', user: '', password: '' };
  }
  
  return {
    baseUrl: API_BASE_URL.replace('/player_api.php', ''), // Retorna a base URL real
    user: credsMatch[1],
    password: credsMatch[2],
  };
} 

// Constrói a URL do XMLTV (EPG) a partir da base e credenciais atuais
export function buildEpgUrl() {
  const credsMatch = API_CREDENTIALS.match(/username=([^&]+)&password=(.+)/);
  if (!API_BASE_URL || !credsMatch) return '';

  const username = credsMatch[1];
  const password = credsMatch[2];

  // Detecta protocolo da base e extrai host antes de /player_api.php
  const usesHttp = API_BASE_URL.startsWith('http://');
  const protocol = usesHttp ? 'http' : 'https';
  const host = API_BASE_URL
    .replace('https://', '')
    .replace('http://', '')
    .replace('/player_api.php', '');

  return `${protocol}://${host}/xmltv.php?username=${username}&password=${password}`;
}