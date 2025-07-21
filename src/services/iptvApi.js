// IPTV API Service
// Baseado no sistema original do APP-bigtv-main

import { API_BASE_URL, API_CREDENTIALS } from '../config/apiConfig';

// As funções getCreds e buildBaseQuery foram removidas para simplificar
// e alinhar com a implementação original que funcionava. A URL agora
// é construída diretamente, sem parsing/re-stringifying intermediário.

const endpoint = (action, extra = '') => {
  return `${API_BASE_URL}?${API_CREDENTIALS}&action=${action}${extra}`;
};

// URLs da API (migradas do app antigo)
export const API_ENDPOINTS = {
  vodCategories: () => endpoint('get_vod_categories'),
  seriesCategories: () => endpoint('get_series_categories'),
  liveCategories: () => endpoint('get_live_categories'),
  
  // Conteúdo específico (IDs fixos do app)
  lancamentos: () => endpoint('get_vod_streams', '&category_id=82'),
  telenovelas: () => endpoint('get_series', '&category_id=81'),
  classicos: () => endpoint('get_vod_streams', '&category_id=50'),
};

// Função para construir URLs dinâmicas
export const buildApiUrl = (action, categoryId = null) => {
  let url = endpoint(action);
  if (categoryId) {
    url += `&category_id=${categoryId}`;
  }
  return url;
};

// Função genérica para fazer requisições
const fetchApiData = async (url) => {
  try {
    console.log('Fetching:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar dados da API:', error);
    throw error;
  }
};

// Serviços específicos
export const iptvApi = {
  // Categorias
  getVodCategories: () => fetchApiData(API_ENDPOINTS.vodCategories()),
  getSeriesCategories: () => fetchApiData(API_ENDPOINTS.seriesCategories()),
  getLiveCategories: () => fetchApiData(API_ENDPOINTS.liveCategories()),
  
  // Conteúdo por categoria
  getVodStreams: (categoryId) => fetchApiData(buildApiUrl('get_vod_streams', categoryId)),
  getSeries: (categoryId) => fetchApiData(buildApiUrl('get_series', categoryId)),
  getLiveStreams: (categoryId) => fetchApiData(buildApiUrl('get_live_streams', categoryId)),
  
  // Conteúdo específico (home) - usando categorias dinâmicas
  getHomeMovies: async () => {
    try {
      // Primeiro, buscar categorias de filmes
      const categoriesResponse = await fetchApiData(API_ENDPOINTS.vodCategories());
      if (categoriesResponse && categoriesResponse.length > 0) {
        // Pegar a primeira categoria disponível
        const firstCategory = categoriesResponse[0];
        console.log('Carregando filmes da categoria:', firstCategory.category_name);
        return fetchApiData(buildApiUrl('get_vod_streams', firstCategory.category_id));
      }
      return [];
    } catch (error) {
      console.error('Erro ao carregar filmes para home:', error);
      return [];
    }
  },
  
  getHomeSeries: async () => {
    try {
      // Primeiro, buscar categorias de séries
      const categoriesResponse = await fetchApiData(API_ENDPOINTS.seriesCategories());
      if (categoriesResponse && categoriesResponse.length > 0) {
        // Pegar a primeira categoria disponível
        const firstCategory = categoriesResponse[0];
        console.log('Carregando séries da categoria:', firstCategory.category_name);
        return fetchApiData(buildApiUrl('get_series', firstCategory.category_id));
      }
      return [];
    } catch (error) {
      console.error('Erro ao carregar séries para home:', error);
      return [];
    }
  },
  
  getHomeClassics: async () => {
    try {
      // Buscar categorias de filmes e pegar uma categoria diferente para clássicos
      const categoriesResponse = await fetchApiData(API_ENDPOINTS.vodCategories());
      if (categoriesResponse && categoriesResponse.length > 1) {
        // Pegar a segunda categoria disponível para ter variedade
        const secondCategory = categoriesResponse[1];
        console.log('Carregando clássicos da categoria:', secondCategory.category_name);
        return fetchApiData(buildApiUrl('get_vod_streams', secondCategory.category_id));
      } else if (categoriesResponse && categoriesResponse.length > 0) {
        // Se só houver uma categoria, usar ela mesmo
        const firstCategory = categoriesResponse[0];
        return fetchApiData(buildApiUrl('get_vod_streams', firstCategory.category_id));
      }
      return [];
    } catch (error) {
      console.error('Erro ao carregar clássicos para home:', error);
      return [];
    }
  },
  
  // Manter funções antigas para compatibilidade (mas usar as novas)
  getLancamentos: () => fetchApiData(API_ENDPOINTS.lancamentos()),
  getTelenovelas: () => fetchApiData(API_ENDPOINTS.telenovelas()),
  getClassicos: () => fetchApiData(API_ENDPOINTS.classicos()),
  
  // Busca (para implementar no futuro)
  search: (query) => {
    // TODO: Implementar busca quando disponível na API
    console.log('Search not implemented yet:', query);
    return Promise.resolve([]);
  }
};

export default iptvApi; 