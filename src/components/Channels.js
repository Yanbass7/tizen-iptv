import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Channels.css';

const Channels = ({ isActive }) => {
  const [categories, setCategories] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(false);
  
  // Estados de navegação
  const [focusArea, setFocusArea] = useState('categories'); // 'categories' ou 'channels'
  const [categoryFocus, setCategoryFocus] = useState(0);
  const [channelFocus, setChannelFocus] = useState(0);

  // Estados de paginação (corrigidos para ficar igual ao Series.js)
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 15; // 5 colunas x 3 linhas
  const GRID_COLUMNS = 5;
  const GRID_ROWS = 3;

  // Referencias para navegação
  const categoriesRef = useRef([]);
  const channelsRef = useRef([]);
  const containerRef = useRef(null);

  const API_BASE_URL = 'https://rota66.bar/player_api.php';
  const API_CREDENTIALS = 'username=zBB82J&password=AMeDHq';

  // Função para carregar categorias de canais ao vivo
  const loadLiveCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_live_categories`
      );
      const data = await response.json();
      setCategories(data);
      
      // Selecionar primeira categoria automaticamente
      if (data.length > 0) {
        setSelectedCategory(data[0].category_id);
        setCategoryFocus(0);
        loadLiveChannels(data[0].category_id);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para carregar canais de uma categoria
  const loadLiveChannels = useCallback(async (categoryId) => {
    setChannelsLoading(true);
    setChannelFocus(0); // Reset channel focus
    setCurrentPage(0); // Resetar para primeira página
    try {
      const response = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_live_streams&category_id=${categoryId}`
      );
      const data = await response.json();
      setChannels(data);
      
      // Se estivermos no grid de canais, voltar o foco para os canais
      if (focusArea === 'channels') {
        setChannelFocus(0);
      }
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
      setChannels([]);
    } finally {
      setChannelsLoading(false);
    }
  }, [focusArea]);

  // Calcular canais da página atual
  const getCurrentPageChannels = useCallback(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return channels.slice(startIndex, endIndex);
  }, [currentPage, channels]);

  const totalPages = Math.ceil(channels.length / ITEMS_PER_PAGE);
  const currentPageChannels = getCurrentPageChannels();

  // Função para selecionar canal
  const handleChannelSelect = useCallback((channel) => {
    console.log('Canal selecionado:', channel);
    
    // Construir URL do stream com a estrutura correta
    const streamUrl = `https://rota66.bar/${API_CREDENTIALS.split('&')[0].split('=')[1]}/${API_CREDENTIALS.split('&')[1].split('=')[1]}/${channel.stream_id}`;
    
    // Informações do canal para o player
    const streamInfo = {
      name: channel.name,
      category: selectedCategory ? categories.find(cat => cat.category_id === selectedCategory)?.category_name : 'Canal',
      description: `Canal ao vivo - ${channel.name}`,
      type: 'live'
    };

    // Disparar evento para reproduzir no VideoPlayer
    const playEvent = new CustomEvent('playContent', {
      detail: { streamUrl, streamInfo }
    });
    window.dispatchEvent(playEvent);
  }, [API_CREDENTIALS, selectedCategory, categories]);

  // Função para clicar em categoria
  const handleCategoryClick = useCallback((categoryId) => {
    setSelectedCategory(categoryId);
    const categoryIndex = categories.findIndex(cat => cat.category_id === categoryId);
    setCategoryFocus(categoryIndex);
    loadLiveChannels(categoryId);
    setFocusArea('channels'); // Mover foco para os canais
  }, [categories, loadLiveChannels]);

  // Carregar categorias de canais ao vivo
  useEffect(() => {
    if (isActive) {
      loadLiveCategories();
    }
  }, [isActive, loadLiveCategories]);

  // Atualizar foco visual
  const updateFocusVisual = useCallback(() => {
    // Remover foco de todos os elementos
    document.querySelectorAll('.channel, .category-button').forEach(el => {
      el.classList.remove('focused');
    });

    // Adicionar foco ao elemento atual
    if (focusArea === 'categories' && categoriesRef.current[categoryFocus]) {
      categoriesRef.current[categoryFocus].classList.add('focused');
      categoriesRef.current[categoryFocus].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    } else if (focusArea === 'channels' && channelsRef.current[channelFocus]) {
      channelsRef.current[channelFocus].classList.add('focused');
      channelsRef.current[channelFocus].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }
  }, [focusArea, categoryFocus, channelFocus]);

  useEffect(() => {
    updateFocusVisual();
  }, [updateFocusVisual]);

  // Função de navegação das categorias
  const handleCategoriesNavigation = useCallback((keyCode) => {
    if (keyCode === 38) { // Cima
      setCategoryFocus(prev => Math.max(0, prev - 1));
    } else if (keyCode === 40) { // Baixo
      setCategoryFocus(prev => Math.min(categories.length - 1, prev + 1));
    } else if (keyCode === 37) { // Esquerda - voltar para sidebar
      const backEvent = new CustomEvent('backToSidebar');
      window.dispatchEvent(backEvent);
    } else if (keyCode === 39) { // Direita - ir para canais
      if (channels.length > 0) {
        setFocusArea('channels');
        setChannelFocus(0);
      }
    } else if (keyCode === 13) { // OK - selecionar categoria
      if (categories[categoryFocus]) {
        const selectedCat = categories[categoryFocus];
        setSelectedCategory(selectedCat.category_id);
        loadLiveChannels(selectedCat.category_id);
      }
    }
  }, [categories, categoryFocus, channels.length, loadLiveChannels]);

  // Função de navegação dos canais (corrigida para ficar igual ao Series.js)
  const handleChannelsNavigationInternal = useCallback((keyCode) => {
    const currentPageChannelsCount = currentPageChannels.length;

    if (keyCode === 38) { // Cima
      const currentRow = Math.floor(channelFocus / GRID_COLUMNS);
      
      if (currentRow > 0) {
        const newFocus = Math.max(0, channelFocus - GRID_COLUMNS);
        setChannelFocus(newFocus);
      } else {
        // Se estiver na primeira linha e houver página anterior
        if (currentPage > 0) {
          setCurrentPage(currentPage - 1);
          const currentCol = channelFocus % GRID_COLUMNS;
          const newFocusAttempt = (GRID_ROWS - 1) * GRID_COLUMNS + currentCol;
          const lastPageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
          const previousPageChannelsCount = channels.slice(lastPageStartIndex, lastPageStartIndex + ITEMS_PER_PAGE).length;
          setChannelFocus(Math.min(newFocusAttempt, previousPageChannelsCount - 1));
        }
      }
    } else if (keyCode === 40) { // Baixo
      const currentRow = Math.floor(channelFocus / GRID_COLUMNS);
      const maxRow = Math.floor((currentPageChannelsCount - 1) / GRID_COLUMNS);
      
      if (currentRow < maxRow) {
        const newFocus = Math.min(currentPageChannelsCount - 1, channelFocus + GRID_COLUMNS);
        setChannelFocus(newFocus);
      } else {
        // Se estiver na última linha e houver próxima página
        if (currentPage < totalPages - 1) {
          setCurrentPage(currentPage + 1);
          setChannelFocus(channelFocus % GRID_COLUMNS); // Manter coluna, ir para primeira linha da próxima página
        }
      }
    } else if (keyCode === 37) { // Esquerda
      const currentCol = channelFocus % GRID_COLUMNS;
      
      if (currentCol > 0) {
        setChannelFocus(channelFocus - 1);
      } else {
        // Se estiver na primeira coluna, voltar para categorias
        setFocusArea('categories');
        const selectedIndex = categories.findIndex(cat => cat.category_id === selectedCategory);
        setCategoryFocus(selectedIndex >= 0 ? selectedIndex : 0);
      }
    } else if (keyCode === 39) { // Direita
      const currentCol = channelFocus % GRID_COLUMNS;
      
      if (currentCol < GRID_COLUMNS - 1 && channelFocus < currentPageChannelsCount - 1) {
        // Mover para próximo item na mesma linha
        setChannelFocus(channelFocus + 1);
      } else if (currentCol === GRID_COLUMNS - 1) {
        // Estamos na última coluna
        const currentRow = Math.floor(channelFocus / GRID_COLUMNS);
        const maxRow = Math.floor((currentPageChannelsCount - 1) / GRID_COLUMNS);
        
        if (currentRow < maxRow) {
          // Há linha abaixo na mesma página → descer para primeira coluna da próxima linha
          setChannelFocus((currentRow + 1) * GRID_COLUMNS);
        } else if (currentPage < totalPages - 1) {
          // Última linha da página → mudar página
          setCurrentPage(currentPage + 1);
          setChannelFocus(0); // Ir para primeiro item da nova página
        }
      }
    } else if (keyCode === 13) { // OK - selecionar canal
      if (currentPageChannels[channelFocus]) {
        const actualChannelIndex = currentPage * ITEMS_PER_PAGE + channelFocus;
        handleChannelSelect(channels[actualChannelIndex]);
      }
    }
  }, [
    currentPageChannels,
    channelFocus,
    currentPage,
    totalPages,
    channels,
    categories,
    selectedCategory,
    handleChannelSelect
  ]);

  // Sistema de navegação por controle remoto
  useEffect(() => {
    if (!isActive) return;

    const handleChannelsNavigation = (event) => {
      const { keyCode } = event.detail;
      
      if (focusArea === 'categories') {
        handleCategoriesNavigation(keyCode);
      } else if (focusArea === 'channels') {
        handleChannelsNavigationInternal(keyCode);
      }
    };

    window.addEventListener('channelsNavigation', handleChannelsNavigation);
    return () => window.removeEventListener('channelsNavigation', handleChannelsNavigation);
  }, [isActive, focusArea, handleCategoriesNavigation, handleChannelsNavigationInternal]);

  // Função para tratar erros de imagem
  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  if (!isActive) return null;

  return (
    <div className="channels-page" ref={containerRef}>
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
                onClick={() => handleCategoryClick(category.category_id)}
              >
                {category.category_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="main-content-area">
        <div className="channels-content">
          {channelsLoading ? (
            <div className="loading">Carregando canais...</div>
          ) : (
            <>
              {totalPages > 1 && (
                <div className="pagination-info">
                  <span>Página {currentPage + 1} de {totalPages}</span>
                  <span className="channels-count">
                    {channels.length} canais • {currentPageChannels.length} nesta página
                  </span>
                </div>
              )}
              <div className="channels-grid">
                {currentPageChannels.map((channel, index) => (
                  <div
                    key={channel.stream_id}
                    ref={el => channelsRef.current[index] = el}
                    className="channel"
                    onClick={() => {
                      const actualChannelIndex = currentPage * ITEMS_PER_PAGE + index;
                      handleChannelSelect(channels[actualChannelIndex]);
                    }}
                  >
                    <div className="channel-poster">
                      {channel.stream_icon && (
                        <img
                          src={channel.stream_icon}
                          alt={channel.name}
                          onError={handleImageError}
                        />
                      )}
                      <div className="channel-overlay">
                        <h3 className="channel-title">{channel.name}</h3>
                        <div className="channel-actions">
                          <span className="action-hint">ENTER Assistir</span>
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

export default Channels; 