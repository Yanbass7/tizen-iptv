import React, { useState, useEffect, useRef, useCallback } from 'react';
import { iptvApi } from '../services/iptvApi';
import { API_BASE_URL, API_CREDENTIALS, buildStreamUrl } from '../config/apiConfig';
import { safeScrollIntoView } from '../utils/scrollUtils';
import { demoSeries, demoSeriesCategories } from '../data/demoContent';
import SeriesDetailsPage from './SeriesDetailsPage';
import './Series.css';

const Series = ({ isActive }) => {
  const [categories, setCategories] = useState([]);
  const [series, setSeries] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seriesLoading, setSeriesLoading] = useState(false);
  
  // Estados de navegação
  const [focusArea, setFocusArea] = useState('categories'); // 'categories' ou 'series'
  const [categoryFocus, setCategoryFocus] = useState(0);
  const [seriesFocus, setSeriesFocus] = useState(0);
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 15; // 5 colunas x 3 linhas
  const GRID_COLUMNS = 5;
  const GRID_ROWS = 3;

  // Ref para restaurar estado ao voltar de player/detalhes
  const restoreStateRef = useRef(null);

  // Referencias para navegação
  const categoriesRef = useRef([]);
  const seriesRef = useRef([]);
  const containerRef = useRef(null);

  // Detectar ambiente Tizen TV
  const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Verificar se está em modo demo (email Samsung)
  const isDemoMode = useCallback(() => {
    const testMode = localStorage.getItem('testMode');
    const authEmail = localStorage.getItem('authEmail');
    return testMode === 'true' && authEmail === 'samsungtest1@samsung.com';
  }, []);

  // Persistência de estado da página de séries
  const saveSeriesState = useCallback(() => {
    try {
      const stateToSave = {
        selectedCategory,
        categoryFocus,
        currentPage,
        seriesFocus,
        focusArea: 'series'
      };
      localStorage.setItem('seriesState', JSON.stringify(stateToSave));
      console.log('💾 Series - Estado salvo:', stateToSave);
    } catch (e) {
      console.warn('Não foi possível salvar o estado das séries:', e);
    }
  }, [selectedCategory, categoryFocus, currentPage, seriesFocus]);

  const loadSavedSeriesState = useCallback(() => {
    try {
      const raw = localStorage.getItem('seriesState');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }, []);

  // Função para carregar séries de uma categoria (declarada antes de loadSeriesCategories para evitar ReferenceError)
  const loadSeries = useCallback(async (categoryId, options = {}) => {
    setSeriesLoading(true);

    const isRestoring = !!options.restoreState;
    if (!options.preserveFocus) {
      setSeriesFocus(0);
      setCurrentPage(0);
    } else if (isRestoring) {
      const restorePage = Math.max(0, options.restoreState.currentPage || 0);
      setCurrentPage(restorePage);
    }
    try {
      let series = [];
      
      if (isDemoMode()) {
        // Em modo demo, usar séries demo
        series = demoSeries.filter(s => s.category_id === categoryId);
        console.log('🧪 Carregando séries demo para categoria:', categoryId, series);
      } else {
        // Modo normal, carregar da API
        const response = await fetch(
          `${API_BASE_URL}?${API_CREDENTIALS}&action=get_series&category_id=${categoryId}`
        );
        series = await response.json();
      }
      
      setSeries(series);
      
      if (isRestoring && options.restoreState) {
        const restorePage = Math.max(0, options.restoreState.currentPage || 0);
        const restoreSeriesFocus = Math.max(0, options.restoreState.seriesFocus || 0);
        const startIndex = restorePage * ITEMS_PER_PAGE;
        const countInPage = series.slice(startIndex, startIndex + ITEMS_PER_PAGE).length;
        const clampedFocus = Math.min(restoreSeriesFocus, Math.max(0, countInPage - 1));
        setSeriesFocus(clampedFocus);
      } else {
        setSeriesFocus(0);
      }
    } catch (error) {
      console.error('Erro ao carregar series:', error);
      setSeries([]);
    } finally {
      setSeriesLoading(false);
    }
  }, [API_BASE_URL, API_CREDENTIALS]);

  // Carregar categorias de séries com suporte a restauração
  const loadSeriesCategories = useCallback(async () => {
    setLoading(true);
    try {
      let loadedCategories = [];
      if (isDemoMode()) {
        loadedCategories = demoSeriesCategories;
        console.log('🧪 Carregando categorias demo para séries:', loadedCategories);
      } else {
        loadedCategories = await iptvApi.getSeriesCategories();
      }

      setCategories(loadedCategories);

      const saved = restoreStateRef.current;
      if (saved && loadedCategories.length > 0) {
        const savedCategoryId = String(saved.selectedCategory);
        const catIndex = loadedCategories.findIndex(c => String(c.category_id) === savedCategoryId);
        if (catIndex >= 0) {
          console.log('📺 Series - Restaurando estado salvo:', saved);
          setSelectedCategory(savedCategoryId);
          setCategoryFocus(catIndex);
          await loadSeries(savedCategoryId, { restoreState: saved, preserveFocus: true });
          setFocusArea('series');
          return;
        }
      }

      if (loadedCategories.length > 0) {
        // Evitar loop: só define defaults se ainda não houver categoria selecionada
        if (selectedCategory == null) {
          setSelectedCategory(loadedCategories[0].category_id);
          setCategoryFocus(0);
          loadSeries(loadedCategories[0].category_id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar categorias de séries:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, loadSeries, selectedCategory]);

  // Efeito para auto-scroll baseado no foco
  useEffect(() => {
    // Limpar focos anteriores
    categoriesRef.current.forEach(ref => ref?.classList.remove('focused'));
    seriesRef.current.forEach(ref => ref?.classList.remove('focused'));

    // Auto-scroll para categoria focada
    if (focusArea === 'categories' && categoriesRef.current[categoryFocus]) {
      categoriesRef.current[categoryFocus].classList.add('focused');
      safeScrollIntoView(categoriesRef.current[categoryFocus], {
        behavior: 'smooth',
        block: 'nearest'
      });
    }
    // Auto-scroll para série focada
    else if (focusArea === 'series' && seriesRef.current[seriesFocus]) {
      seriesRef.current[seriesFocus].classList.add('focused');
      safeScrollIntoView(seriesRef.current[seriesFocus], {
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [focusArea, categoryFocus, seriesFocus]);

  // (Removido: definição duplicada de loadSeries)

  // Função para navegar para detalhes da série
  const handleSeriesDetails = useCallback((series) => {
    const categoryInfo = categories.find(cat => cat.category_id === selectedCategory);
    const seriesWithCategory = {
      ...series,
      category_name: categoryInfo?.category_name || 'Série'
    };
    
    // Salvar estado atual antes de sair para a página de detalhes
    saveSeriesState();

    // Disparar evento para navegar para a página de detalhes
    const showDetailsEvent = new CustomEvent('showSeriesDetails', {
      detail: { series: seriesWithCategory }
    });
    window.dispatchEvent(showDetailsEvent);
  }, [categories, selectedCategory, saveSeriesState]);

  // Função para reproduzir série diretamente (primeira temporada, primeiro episódio)
  const handleSeriesSelect = useCallback(async (series) => {
    console.log('🎬 Série selecionada:', series);
    console.log('🔧 Ambiente detectado:', { isTizenTV, isDevelopment });
    
    // Salvar estado atual antes de sair para o player
    saveSeriesState();

    try {
      let streamUrl;
      let streamInfo;
      
      if (isDemoMode() && series.seasons) {
        // Se for série demo com estrutura de episódios própria
        const firstSeason = series.seasons[0];
        const firstEpisode = firstSeason.episodes[0];
        
        if (firstEpisode) {
          streamUrl = firstEpisode.stream_url;
          streamInfo = {
            name: `${series.name} - T${firstSeason.season_number}E1 - ${firstEpisode.title}`,
            type: 'series',
            category: series.category_name || 'Série Demo',
            description: firstEpisode.plot || series.plot || 'Descrição não disponível',
            year: series.releasedate || 'N/A',
            rating: series.rating || 'N/A',
            poster: series.cover || series.stream_icon
          };
          
          console.log('🧪 Reproduzindo série demo:', streamInfo);
        }
      } else {
        // Lógica original para séries normais ou demo sem estrutura própria
        const response = await fetch(
          `${API_BASE_URL}?${API_CREDENTIALS}&action=get_series_info&series_id=${series.series_id}`
        );
        const data = await response.json();
        
        if (data.episodes && Object.keys(data.episodes).length > 0) {
          const firstSeason = Object.keys(data.episodes)[0];
          const firstEpisode = data.episodes[firstSeason][0];
          
          if (firstEpisode) {
            // URL com .mp4 para usar com HTML5 player
            streamUrl = isDemoMode() ? firstEpisode.stream_url : buildStreamUrl('series', firstEpisode.id || firstEpisode.stream_id, 'mp4');
            
            streamInfo = {
              name: `${series.name} - Episódio ${firstEpisode.episode_num || 1}`,
              type: 'series',
              category: selectedCategory ? categories.find(cat => cat.category_id === selectedCategory)?.category_name : 'Série',
              description: firstEpisode.plot || firstEpisode.info?.plot || series.plot || 'Descrição não disponível',
              year: series.releasedate || 'N/A',
              rating: series.rating || firstEpisode.rating || 'N/A',
              poster: series.cover || series.stream_icon
            };
          }
        }
      }
      
      if (streamUrl && streamInfo) {
        // Para Tizen TV, usar configuração específica que força player interno
        if (isTizenTV) {
          console.log('📺 Configuração Tizen TV ativada para série');
          
          const playEvent = new CustomEvent('playContent', {
            detail: {
              streamUrl,
              streamInfo: {
                ...streamInfo,
                // Flags específicas para Tizen TV
                forceTizenPlayer: true,
                preventBrowserRedirect: true,
                useInternalPlayer: true
              }
            },
            bubbles: false,
            cancelable: false
          });
          
          setTimeout(() => {
            console.log('📺 Disparando evento playContent para Tizen TV (série)');
            window.dispatchEvent(playEvent);
          }, 100);
          
        } else {
          console.log('💻 Configuração padrão ativada para série');
          
          const playEvent = new CustomEvent('playContent', {
            detail: { streamUrl, streamInfo }
          });
          window.dispatchEvent(playEvent);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar informações da série:', error);
      
      // Fallback: tentar reproduzir primeiro episódio com URL genérica
      let streamUrl;
      
      if (isDemoMode() && series.seasons) {
        // Para séries demo, usar o primeiro episódio
        streamUrl = series.seasons[0].episodes[0].stream_url;
      } else {
        streamUrl = buildStreamUrl('series', series.series_id, 'mp4');
      }
      
      const streamInfo = {
        name: series.name,
        category: isDemoMode() ? series.category_name || 'Série Demo' : (selectedCategory ? categories.find(cat => cat.category_id === selectedCategory)?.category_name : 'Série'),
        description: `Série - ${series.name}`,
        type: 'series'
      };

      // Para Tizen TV, usar configuração específica no fallback também
      if (isTizenTV) {
        console.log('📺 Configuração Tizen TV ativada para série (fallback)');
        
        const playEvent = new CustomEvent('playContent', {
          detail: { 
            streamUrl, 
            streamInfo: {
              ...streamInfo,
              forceTizenPlayer: true,
              preventBrowserRedirect: true,
              useInternalPlayer: true
            }
          },
          bubbles: false,
          cancelable: false
        });
        
        setTimeout(() => {
          console.log('📺 Disparando evento playContent para Tizen TV (série fallback)');
          window.dispatchEvent(playEvent);
        }, 100);
        
      } else {
        console.log('💻 Configuração padrão ativada para série (fallback)');
        
        const playEvent = new CustomEvent('playContent', {
          detail: { streamUrl, streamInfo }
        });
        window.dispatchEvent(playEvent);
      }
    }
  }, [selectedCategory, categories, API_BASE_URL, API_CREDENTIALS, isTizenTV, isDevelopment, saveSeriesState]);

  // Calcular séries da página atual
  const getCurrentPageSeries = useCallback(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return series.slice(startIndex, endIndex);
  }, [currentPage, series]);

  const totalPages = Math.ceil(series.length / ITEMS_PER_PAGE);
  const currentPageSeries = getCurrentPageSeries();

  // Função de navegação das categorias
  const handleCategoriesNavigation = useCallback((keyCode) => {
    if (keyCode === 38) { // Cima
      setCategoryFocus(prev => Math.max(0, prev - 1));
    } else if (keyCode === 40) { // Baixo
      setCategoryFocus(prev => Math.min(categories.length - 1, prev + 1));
    } else if (keyCode === 37) { // Esquerda - voltar para sidebar
      const backEvent = new CustomEvent('backToSidebar');
      window.dispatchEvent(backEvent);
    } else if (keyCode === 39) { // Direita - ir para séries
      if (series.length > 0) {
        setFocusArea('series');
        setSeriesFocus(0);
      }
    } else if (keyCode === 13) { // OK - selecionar categoria
      if (categories[categoryFocus]) {
        const selectedCat = categories[categoryFocus];
        setSelectedCategory(selectedCat.category_id);
        loadSeries(selectedCat.category_id);
      }
    }
  }, [categories, categoryFocus, series.length, loadSeries]);

  // Função de navegação das séries
  const handleSeriesNavigationInternal = useCallback((keyCode) => {
    const currentPageSeriesCount = currentPageSeries.length;
    
    if (keyCode === 38) { // Cima
      const currentRow = Math.floor(seriesFocus / GRID_COLUMNS);
      
      if (currentRow > 0) {
        const newFocus = Math.max(0, seriesFocus - GRID_COLUMNS);
        setSeriesFocus(newFocus);
      } else {
        // Se estiver na primeira linha e houver página anterior
        if (currentPage > 0) {
          setCurrentPage(currentPage - 1);
          const currentCol = seriesFocus % GRID_COLUMNS;
          setSeriesFocus((GRID_ROWS - 1) * GRID_COLUMNS + currentCol); // Ir para última linha da página anterior, mesma coluna
        }
      }
    } else if (keyCode === 40) { // Baixo
      const currentRow = Math.floor(seriesFocus / GRID_COLUMNS);
      const maxRow = Math.floor((currentPageSeriesCount - 1) / GRID_COLUMNS);
      
      if (currentRow < maxRow) {
        const newFocus = Math.min(currentPageSeriesCount - 1, seriesFocus + GRID_COLUMNS);
        setSeriesFocus(newFocus);
      } else {
        // Se estiver na última linha e houver próxima página
        if (currentPage < totalPages - 1) {
          setCurrentPage(currentPage + 1);
          setSeriesFocus(seriesFocus % GRID_COLUMNS); // Manter coluna, ir para primeira linha da próxima página
        }
      }
    } else if (keyCode === 37) { // Esquerda
      const currentCol = seriesFocus % GRID_COLUMNS;
      
      if (currentCol > 0) {
        setSeriesFocus(seriesFocus - 1);
      } else {
        // Se estiver na primeira coluna, voltar para categorias
        setFocusArea('categories');
        const selectedIndex = categories.findIndex(cat => cat.category_id === selectedCategory);
        setCategoryFocus(selectedIndex >= 0 ? selectedIndex : 0);
      }
    } else if (keyCode === 39) { // Direita
      const currentCol = seriesFocus % GRID_COLUMNS;
      
      if (currentCol < GRID_COLUMNS - 1 && seriesFocus < currentPageSeriesCount - 1) {
        // Mover para próximo item na mesma linha
        setSeriesFocus(seriesFocus + 1);
      } else if (currentCol === GRID_COLUMNS - 1) {
        // Estamos na última coluna
        const currentRow = Math.floor(seriesFocus / GRID_COLUMNS);
        const maxRow = Math.floor((currentPageSeriesCount - 1) / GRID_COLUMNS);
        
        if (currentRow < maxRow) {
          // Há linha abaixo na mesma página → descer para primeira coluna da próxima linha
          setSeriesFocus((currentRow + 1) * GRID_COLUMNS);
        } else if (currentPage < totalPages - 1) {
          // Última linha da página → mudar página
          setCurrentPage(currentPage + 1);
          setSeriesFocus(0); // Ir para primeiro item da nova página
        }
      }
    } else if (keyCode === 13) { // OK - abrir detalhes
      if (currentPageSeries[seriesFocus]) {
        const actualSeriesIndex = currentPage * ITEMS_PER_PAGE + seriesFocus;
        handleSeriesDetails(series[actualSeriesIndex]);
      }
    } else if (keyCode === 80) { // P - reproduzir diretamente
      if (currentPageSeries[seriesFocus]) {
        const actualSeriesIndex = currentPage * ITEMS_PER_PAGE + seriesFocus;
        handleSeriesSelect(series[actualSeriesIndex]);
      }
    }
  }, [
    currentPageSeries, 
    seriesFocus, 
    currentPage, 
    totalPages, 
    categories, 
    selectedCategory,
    series,
    handleSeriesDetails,
    handleSeriesSelect
  ]);

  // Sistema de navegação por controle remoto
  useEffect(() => {
    if (!isActive) return;

    const handleSeriesNavigation = (event) => {
      const { keyCode } = event.detail;
      
      if (focusArea === 'categories') {
        handleCategoriesNavigation(keyCode);
      } else if (focusArea === 'series') {
        handleSeriesNavigationInternal(keyCode);
      }
    };

    window.addEventListener('seriesNavigation', handleSeriesNavigation);
    return () => window.removeEventListener('seriesNavigation', handleSeriesNavigation);
  }, [isActive, focusArea, handleCategoriesNavigation, handleSeriesNavigationInternal]);

  // Carregar/restaurar estado quando a seção ficar ativa
  useEffect(() => {
    if (!isActive) return;

    // Carregar estado salvo somente uma vez ao ativar a seção
    if (!restoreStateRef.current) {
      restoreStateRef.current = loadSavedSeriesState();
    }

    if (!categories || categories.length === 0) {
      // Dispara carregamento de categorias uma vez
      loadSeriesCategories();
      return;
    }

    // Se já temos categorias e existe estado salvo da mesma categoria, restaurar focos
    const saved = restoreStateRef.current;
    if (saved && saved.selectedCategory && String(saved.selectedCategory) === String(selectedCategory)) {
      setCurrentPage(prev => (prev === saved.currentPage ? prev : Math.max(0, saved.currentPage || 0)));
      setSeriesFocus(prev => (prev === saved.seriesFocus ? prev : Math.max(0, saved.seriesFocus || 0)));
      setFocusArea(prev => (prev === 'series' ? prev : 'series'));
    }
  }, [isActive, loadSeriesCategories, loadSavedSeriesState, categories, selectedCategory]);

  // Salvar estado ao desmontar o componente
  useEffect(() => {
    return () => {
      try {
        const stateToSave = {
          selectedCategory,
          categoryFocus,
          currentPage,
          seriesFocus,
          focusArea: 'series'
        };
        localStorage.setItem('seriesState', JSON.stringify(stateToSave));
        console.log('💾 Series - Estado salvo no unmount:', stateToSave);
      } catch (e) {}
    };
  }, [selectedCategory, categoryFocus, currentPage, seriesFocus]);

  // Função para tratar erros de imagem
  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  if (!isActive) return null;

  return (
    <div className="series-page" ref={containerRef}>
      <div className="category-sidebar">
        
{loading ? (
          <div className="loading"></div>
        ) : (
          <div className="category-list">
            {categories.map((category, index) => (
              <button
                key={category.category_id}
                ref={el => categoriesRef.current[index] = el}
                className={`category-button ${
                  selectedCategory === category.category_id ? 'active' : ''
                }`}
                onClick={() => {
                  setSelectedCategory(category.category_id);
                  setCategoryFocus(index);
                  loadSeries(category.category_id);
                }}
              >
                {category.category_name}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="main-content-area">
        <div className="series-content">
{seriesLoading ? (
            <div className="loading">Carregando séries </div>
          ) : (
            <>
              {totalPages > 1 && (
                <div className="pagination-info">
                  <span>Página {currentPage + 1} de {totalPages}</span>
                  <span className="series-count">
                    {series.length} séries • {currentPageSeries.length} nesta página
                  </span>
                </div>
              )}
              <div className="series-grid">
                {currentPageSeries.map((serieItem, index) => (
                  <div
                    key={serieItem.series_id}
                    ref={el => seriesRef.current[index] = el}
                    className="serie"
                    onClick={() => {
                      const actualSeriesIndex = currentPage * ITEMS_PER_PAGE + index;
                      handleSeriesDetails(series[actualSeriesIndex]);
                    }}
                  >
                    <div className="serie-poster">
                      <img
                        src={serieItem.cover}
                        alt={serieItem.name}
                        onError={handleImageError}
                      />
                      <div className="serie-overlay">
                        <h3 className="serie-title">
                        <span>{serieItem.name}</span>
                        </h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Series;
