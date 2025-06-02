import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  // Referencias para navegação
  const categoriesRef = useRef([]);
  const seriesRef = useRef([]);
  const containerRef = useRef(null);

  // Detectar ambiente Tizen TV
  const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const API_BASE_URL = 'https://rota66.bar/player_api.php';
  const API_CREDENTIALS = 'username=zBB82J&password=AMeDHq';

  // Carregar categorias de séries
  useEffect(() => {
    const loadSeriesCategories = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}?${API_CREDENTIALS}&action=get_series_categories`
        );
        const data = await response.json();
        setCategories(data);
        
        // Selecionar primeira categoria automaticamente
        if (data.length > 0) {
          setSelectedCategory(data[0].category_id);
          setCategoryFocus(0);
          loadSeries(data[0].category_id);
        }
      } catch (error) {
        console.error('Erro ao carregar categorias de séries:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    const loadSeries = async (categoryId) => {
      setSeriesLoading(true);
      setSeriesFocus(0); // Reset series focus
      setCurrentPage(0); // Reset para primeira página
      try {
        const response = await fetch(
          `${API_BASE_URL}?${API_CREDENTIALS}&action=get_series&category_id=${categoryId}`
        );
        const data = await response.json();
        setSeries(data);
        
        // Se estivermos no grid de series, voltar o foco para as series
        if (focusArea === 'series') {
          setSeriesFocus(0);
        }
      } catch (error) {
        console.error('Erro ao carregar series:', error);
        setSeries([]);
      } finally {
        setSeriesLoading(false);
      }
    };

    if (isActive) {
      loadSeriesCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Atualizar foco visual
  const updateFocusVisual = useCallback(() => {
    // Remover foco de todos os elementos
    document.querySelectorAll('.serie, .series-category-button').forEach(el => {
      el.classList.remove('focused');
    });

    // Adicionar foco ao elemento atual
    if (focusArea === 'categories' && categoriesRef.current[categoryFocus]) {
      categoriesRef.current[categoryFocus].classList.add('focused');
      categoriesRef.current[categoryFocus].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    } else if (focusArea === 'series' && seriesRef.current[seriesFocus]) {
      seriesRef.current[seriesFocus].classList.add('focused');
      seriesRef.current[seriesFocus].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }
  }, [focusArea, categoryFocus, seriesFocus]);

  useEffect(() => {
    updateFocusVisual();
  }, [updateFocusVisual]);

  // Função para carregar séries de uma categoria
  const loadSeries = useCallback(async (categoryId) => {
    setSeriesLoading(true);
    setSeriesFocus(0); // Reset series focus
    setCurrentPage(0); // Reset para primeira página
    try {
      const response = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_series&category_id=${categoryId}`
      );
      const data = await response.json();
      setSeries(data);
      
      // Se estivermos no grid de series, voltar o foco para as series
      if (focusArea === 'series') {
        setSeriesFocus(0);
      }
    } catch (error) {
      console.error('Erro ao carregar series:', error);
      setSeries([]);
    } finally {
      setSeriesLoading(false);
    }
  }, [API_BASE_URL, API_CREDENTIALS, focusArea]);

  // Função para navegar para detalhes da série
  const handleSeriesDetails = useCallback((series) => {
    const categoryInfo = categories.find(cat => cat.category_id === selectedCategory);
    const seriesWithCategory = {
      ...series,
      category_name: categoryInfo?.category_name || 'Série'
    };
    
    // Disparar evento para navegar para a página de detalhes
    const showDetailsEvent = new CustomEvent('showSeriesDetails', {
      detail: { series: seriesWithCategory }
    });
    window.dispatchEvent(showDetailsEvent);
  }, [categories, selectedCategory]);

  // Função para reproduzir série diretamente (primeira temporada, primeiro episódio)
  const handleSeriesSelect = useCallback(async (series) => {
    console.log('🎬 Série selecionada:', series);
    console.log('🔧 Ambiente detectado:', { isTizenTV, isDevelopment });
    
    try {
      // Tentar carregar informações da série para reproduzir primeiro episódio
      const response = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_series_info&series_id=${series.series_id}`
      );
      const data = await response.json();
      
      if (data.episodes && Object.keys(data.episodes).length > 0) {
        const firstSeason = Object.keys(data.episodes)[0];
        const firstEpisode = data.episodes[firstSeason][0];
        
        if (firstEpisode) {
          // URL com .mp4 para usar com HTML5 player
          const streamUrl = `https://rota66.bar/series/zBB82J/AMeDHq/${firstEpisode.id || firstEpisode.stream_id}.mp4`;
          
          const streamInfo = {
            name: `${series.name} - S${String(firstSeason).padStart(2, '0')}E${String(firstEpisode.episode_num || 1).padStart(2, '0')} - ${firstEpisode.title || firstEpisode.name || 'Episódio'}`,
            type: 'series',
            category: selectedCategory ? categories.find(cat => cat.category_id === selectedCategory)?.category_name : 'Série',
            description: firstEpisode.plot || firstEpisode.info?.plot || series.plot || 'Descrição não disponível',
            year: series.releasedate || 'N/A',
            rating: series.rating || firstEpisode.rating || 'N/A',
            poster: series.cover || series.stream_icon
          };
          
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
      }
    } catch (error) {
      console.error('Erro ao carregar informações da série:', error);
      
      // Fallback: tentar reproduzir primeiro episódio com URL genérica
      const streamUrl = `https://rota66.bar/series/zBB82J/AMeDHq/${series.series_id}.mp4`;
      
      const streamInfo = {
        name: series.name,
        category: selectedCategory ? categories.find(cat => cat.category_id === selectedCategory)?.category_name : 'Série',
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
  }, [selectedCategory, categories, API_BASE_URL, API_CREDENTIALS, isTizenTV, isDevelopment]);

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
        setSeriesFocus(seriesFocus + 1);
      } else {
        // Se estiver na última coluna e houver próxima página
        if (currentPage < totalPages - 1) {
          setCurrentPage(currentPage + 1);
          const newRow = Math.floor(seriesFocus / GRID_COLUMNS);
          setSeriesFocus(newRow * GRID_COLUMNS); // Ir para primeira coluna da mesma linha na próxima página
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

  // Função para tratar erros de imagem
  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  if (!isActive) return null;

  return (
    <div className="series-page" ref={containerRef}>
      <div className="category-sidebar">
        
        {loading ? (
          <div className="loading">Carregando categorias...</div>
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
            <div className="loading">Carregando séries...</div>
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
                {currentPageSeries.map((series, index) => (
                  <div
                    key={series.series_id}
                    ref={el => seriesRef.current[index] = el}
                    className="serie"
                    onClick={() => {
                      const actualSeriesIndex = currentPage * ITEMS_PER_PAGE + index;
                      handleSeriesDetails(series[actualSeriesIndex]);
                    }}
                  >
                    <div className="serie-poster">
                      <img
                        src={series.cover}
                        alt={series.name}
                        onError={handleImageError}
                      />
                      <div className="serie-overlay">
                        <h3 className="serie-title">{series.name}</h3>
                        <div className="serie-info">
                          <span className="serie-year">{series.year || 'N/A'}</span>
                          <span className="serie-rating">
                            ⭐ {series.rating || 'N/A'}
                          </span>
                        </div>
                        <p className="serie-description">
                          {series.plot ? 
                            (series.plot.length > 120 ? 
                              series.plot.substring(0, 120) + '...' : 
                              series.plot
                            ) : 
                            'Descrição não disponível'
                          }
                        </p>
                        <div className="serie-actions">
                          <span className="action-hint">ENTER Ver detalhes</span>
                          <span className="action-hint">P Reproduzir</span>
                        </div>
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