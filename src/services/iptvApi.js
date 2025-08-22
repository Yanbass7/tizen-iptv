// IPTV API Service
// Baseado no sistema original do APP-bigtv-main

import { API_BASE_URL, API_CREDENTIALS } from '../config/apiConfig';
import {
  demoMovies,
  demoSeries,
  demoChannels,
  demoVodCategories,
  demoSeriesCategories,
  demoLiveCategories
} from '../data/demoContent';

// Função para verificar se está em modo demo
const isDemoMode = () => {
  return localStorage.getItem('testMode') === 'true';
};

// Função para simular delay de rede em modo demo
const simulateNetworkDelay = (data, delay = 800) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(data), delay);
  });
};

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
  getVodCategories: async () => {
    if (isDemoMode()) {
      console.log('🧪 Modo demo - retornando categorias VOD demo');
      return simulateNetworkDelay(demoVodCategories);
    }
    return fetchApiData(API_ENDPOINTS.vodCategories());
  },
  
  getSeriesCategories: async () => {
    if (isDemoMode()) {
      console.log('🧪 Modo demo - retornando categorias de séries demo');
      return simulateNetworkDelay(demoSeriesCategories);
    }
    return fetchApiData(API_ENDPOINTS.seriesCategories());
  },
  
  getLiveCategories: async () => {
    if (isDemoMode()) {
      console.log('🧪 Modo demo - retornando categorias de canais demo');
      return simulateNetworkDelay(demoLiveCategories);
    }
    return fetchApiData(API_ENDPOINTS.liveCategories());
  },

  // Conteúdo por categoria
  getVodStreams: async (categoryId) => {
    if (isDemoMode()) {
      console.log('🧪 Modo demo - retornando filmes demo para categoria:', categoryId);
      // Filtrar filmes por categoria se especificada
      const filteredMovies = categoryId 
        ? demoMovies.filter(movie => movie.category_id === categoryId.toString())
        : demoMovies;
      return simulateNetworkDelay(filteredMovies.length > 0 ? filteredMovies : demoMovies);
    }
    return fetchApiData(buildApiUrl('get_vod_streams', categoryId));
  },
  
  getSeries: async (categoryId) => {
    if (isDemoMode()) {
      console.log('🧪 Modo demo - retornando séries demo para categoria:', categoryId);
      // Filtrar séries por categoria se especificada
      const filteredSeries = categoryId 
        ? demoSeries.filter(series => series.category_id === categoryId.toString())
        : demoSeries;
      return simulateNetworkDelay(filteredSeries.length > 0 ? filteredSeries : demoSeries);
    }
    return fetchApiData(buildApiUrl('get_series', categoryId));
  },
  
  getLiveStreams: async (categoryId) => {
    if (isDemoMode()) {
      console.log('🧪 Modo demo - retornando canais demo para categoria:', categoryId);
      // Filtrar canais por categoria se especificada
      const filteredChannels = categoryId 
        ? demoChannels.filter(channel => channel.category_id === categoryId.toString())
        : demoChannels;
      return simulateNetworkDelay(filteredChannels.length > 0 ? filteredChannels : demoChannels);
    }
    return fetchApiData(buildApiUrl('get_live_streams', categoryId));
  },

  // Conteúdo específico (home) - usando categorias dinâmicas
  getHomeMovies: async () => {
    // Modo demo - retornar filmes demo
    if (isDemoMode()) {
      console.log('🧪 Modo demo - retornando filmes demo');
      return simulateNetworkDelay(demoMovies);
    }

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
    // Modo demo - retornar séries demo
    if (isDemoMode()) {
      console.log('🧪 Modo demo - retornando séries demo');
      return simulateNetworkDelay(demoSeries);
    }

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
    // Modo demo - retornar uma seleção diferente dos filmes demo
    if (isDemoMode()) {
      console.log('🧪 Modo demo - retornando clássicos demo');
      // Retornar os últimos 3 filmes como "clássicos"
      const classics = demoMovies.slice(-3);
      return simulateNetworkDelay(classics);
    }

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