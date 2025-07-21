import React, { useState, useEffect, useRef, useCallback } from 'react';
import { iptvApi } from '../services/iptvApi';
import { safeScrollTo, safeScrollIntoView } from '../utils/scrollUtils';
import { buildStreamUrl } from '../config/apiConfig';
import './Home.css';

const Home = ({ onMenu, menuFocus, shelfFocus, itemFocus }) => {
  const [lancamentos, setLancamentos] = useState([]);
  const [telenovelas, setTelenovelas] = useState([]);
  const [classicos, setClassicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [featuredContent, setFeaturedContent] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const previewTimeoutRef = useRef(null);
  const shelfRefs = useRef([]);
  const itemRefs = useRef([]);
  const heroButtonRefs = useRef([]);

  // Carregar dados da API quando o componente montar
  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Carregar dados em paralelo com timeout para TV
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na requisição')), 10000)
        );
        
        const [moviesData, seriesData, classicosData] = await Promise.race([
          Promise.all([
            iptvApi.getHomeMovies(),
            iptvApi.getHomeSeries(),
            iptvApi.getHomeMovies() // Usar filmes também para clássicos por enquanto
          ]),
          timeout
        ]);

        // Limitar a 10 itens por prateleira para navegação correta
        const moviesFiltered = Array.isArray(moviesData) ? moviesData.slice(0, 10) : [];
        const seriesFiltered = Array.isArray(seriesData) ? seriesData.slice(0, 10) : [];
        const classicosFiltered = Array.isArray(classicosData) ? classicosData.slice(10, 20) : []; // Pegar itens diferentes para clássicos
        
        setLancamentos(moviesFiltered);
        setTelenovelas(seriesFiltered);
        setClassicos(classicosFiltered);
        
        // Definir conteúdo em destaque (primeiro item dos filmes ou séries disponíveis)
        const featured = moviesFiltered[0] || seriesFiltered[0] || classicosFiltered[0];
        if (featured) {
          setFeaturedContent({
            ...featured,
            type: moviesFiltered[0] ? 'movie' : seriesFiltered[0] ? 'series' : 'movie'
          });
        }
        
      } catch (error) {
        console.error('Erro ao carregar dados do home:', error);
        setError('Erro ao carregar conteúdo. Verifique sua conexão.');
        // Definir dados vazios em caso de erro
        setLancamentos([]);
        setTelenovelas([]);
        setClassicos([]);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  // Definir prateleiras com dados carregados
  const shelves = [
    { 
      id: 'lancamentos',
      title: 'Lançamentos em Destaque', 
      /* icon: 'fa-solid fa-film', /* Ícone para Lançamentos */
      items: lancamentos, 
      type: 'movie',
      emptyMessage: 'Nenhum lançamento disponível'
    },
    { 
      id: 'telenovelas',
      title: 'Séries e Telenovelas', 
      /* icon: 'fa-solid fa-tv', /* Ícone para Séries e Telenovelas */
      items: telenovelas, 
      type: 'series',
      emptyMessage: 'Nenhuma série disponível'
    },
    { 
      id: 'classicos',
      title: 'Clássicos do Cinema', 
      /* icon: 'fa-solid fa-trophy', /* Ícone para Clássicos do Cinema */
      items: classicos, 
      type: 'movie',
      emptyMessage: 'Nenhum clássico disponível'
    }
  ];

  // Scroll automático para o item focado
  useEffect(() => {
    if (onMenu) {
      return;
    }

    // Foco nos botões do Hero
    if (shelfFocus === -1 && itemFocus !== null && heroButtonRefs.current[itemFocus]) {
      safeScrollIntoView(heroButtonRefs.current[itemFocus], {
        behavior: 'smooth',
        block: 'center'
      });
    } 
    // Foco nas prateleiras
    else if (shelfFocus !== null && shelfFocus > -1 && itemFocus !== null) {
      const currentShelfRef = shelfRefs.current[shelfFocus];
      const currentItemRef = itemRefs.current[`${shelfFocus}-${itemFocus}`];
      
      if (currentShelfRef && currentItemRef) {
        // Scroll da prateleira para mostrar o item focado
        const shelfContainer = currentShelfRef.querySelector('.carousel-track');
        if (shelfContainer) {
          const itemRect = currentItemRef.getBoundingClientRect();
          const containerRect = shelfContainer.getBoundingClientRect();
          
          if (itemRect.left < containerRect.left || itemRect.right > containerRect.right) {
            const scrollLeft = currentItemRef.offsetLeft - (shelfContainer.offsetWidth / 2) + (currentItemRef.offsetWidth / 2);
            safeScrollTo(shelfContainer, {
              left: Math.max(0, scrollLeft),
              behavior: 'smooth'
            });
          }
        }
        
        // Scroll da página para mostrar a prateleira focada
        const shelfRect = currentShelfRef.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        if (shelfRect.top < 100 || shelfRect.bottom > windowHeight - 100) {
          safeScrollIntoView(currentShelfRef, {
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    }
  }, [onMenu, shelfFocus, itemFocus]);

  // Função para lidar com foco em item (preview após delay)
  const handleItemFocus = (item, type) => {
    // Limpar timeout anterior
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    // Definir novo timeout para preview
    previewTimeoutRef.current = setTimeout(() => {
      setPreviewContent({ ...item, type });
      setShowPreview(true);
    }, 1000); // 1 segundo de delay
  };

  // Função para lidar com saída de foco
  const handleItemBlur = () => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    setShowPreview(false);
    setPreviewContent(null);
  };

  const handleItemClick = (item, type) => {
    console.log('Item selecionado na Home:', item, 'Tipo:', type);
    
    if (type === 'movie') {
      // Para filmes, disparar evento para abrir modal de preview
      console.log('🎬 Filme selecionado na Home - abrindo preview:', item);
      
      const movieWithCategory = {
        ...item,
        category_name: 'Filme'
      };
      
      // Disparar evento para abrir o modal de preview do filme
      const moviePreviewEvent = new CustomEvent('moviePreviewActive', {
        detail: { 
          active: true,
          movie: movieWithCategory
        }
      });
      window.dispatchEvent(moviePreviewEvent);
      
    } else if (type === 'series') {
      // Para séries, disparar evento para abrir página de detalhes
      console.log('🎬 Série selecionada na Home - abrindo detalhes:', item);
      
      const seriesWithCategory = {
        ...item,
        category_name: 'Série'
      };
      
      // Disparar evento para navegar para a página de detalhes
      const showDetailsEvent = new CustomEvent('showSeriesDetails', {
        detail: { series: seriesWithCategory }
      });
      window.dispatchEvent(showDetailsEvent);
    }
  };

  const handleFeaturedPlay = () => {
    if (featuredContent) {
      handleItemClick(featuredContent, featuredContent.type);
    }
  };

  const handleFeaturedInfo = () => {
    if (featuredContent && featuredContent.type === 'series') {
      const seriesDetailsEvent = new CustomEvent('showSeriesDetails', {
        detail: {
          seriesData: featuredContent
        }
      });
      window.dispatchEvent(seriesDetailsEvent);
    }
  };

  // Limpar timeout ao desmontar componente
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  // Listener para cliques nos botões do hero via navegação
  useEffect(() => {
    const handleHeroButtonClick = (event) => {
      const { buttonIndex } = event.detail;
      
      if (buttonIndex === 0) {
        // Botão "Assistir"
        handleFeaturedPlay();
      } else if (buttonIndex === 1) {
        // Botão "Mais Informações"
        handleFeaturedInfo();
      }
    };

    window.addEventListener('heroButtonClick', handleHeroButtonClick);
    return () => window.removeEventListener('heroButtonClick', handleHeroButtonClick);
  }, [featuredContent]);

  // Estado de loading otimizado para TV
  if (loading) {
    return (
      <div className="home-loading">
        <div className="loading-content">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
          </div>
          <h2 className="loading-title">BIGTV</h2>
          <p className="loading-text">Carregando seu entretenimento...</p>
        </div>
      </div>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <div className="home-error">
        <div className="error-content">
          <div className="error-icon">
            <i className="fa-solid fa-wifi"></i>
          </div>
          <h2 className="error-title">Ops! Algo deu errado</h2>
          <p className="error-message">{error}</p>
          <button 
            className="error-retry-btn"
            onClick={() => window.location.reload()}
          >
            <i className="fa-solid fa-refresh"></i>
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Hero Banner - Estilo Netflix */}
      {featuredContent && (
        <section className="hero-banner">
          <div className="hero-background">
            <img 
              src={featuredContent.stream_icon || featuredContent.cover || '/images/banner (1).jpg'} 
              alt={featuredContent.name}
              className="hero-bg-image"
              loading="eager"
            />
            <div className="hero-color"></div>
          </div>
          
          <div className="hero-content">
            <div className="hero-info">
              
              <h1 className="hero-title">{featuredContent.name}</h1>
              
              <div className="hero-meta">
                <span className="content-type">
                  {featuredContent.type === 'series' ? 'SÉRIE' : 'FILME'}
                </span>
                {featuredContent.rating && (
                  <span className="content-rating">
                    <i className="fa-solid fa-star"></i>
                    {featuredContent.rating}
                  </span>
                )}
                <span className="content-year">2024</span>
              </div>
              
              <p className="hero-description">
                {featuredContent.plot || 
                 `${featuredContent.type === 'series' ? 'Uma série' : 'Um filme'} imperdível que vai te manter grudado na tela. Entretenimento de qualidade com a melhor experiência de streaming.`}
              </p>
              
              <div className="hero-actions">
                <button 
                  ref={el => (heroButtonRefs.current[0] = el)}
                  className={`hero-btn primary ${!onMenu && shelfFocus === -1 && itemFocus === 0 ? 'focused' : ''}`}
                  onClick={handleFeaturedPlay}
                >
                  <i className="fa-solid fa-play"></i>
                  Assistir
                </button>
                
                {featuredContent.type === 'series' && (
                  <button
                    ref={el => (heroButtonRefs.current[1] = el)}
                    className={`hero-btn secondary ${!onMenu && shelfFocus === -1 && itemFocus === 1 ? 'focused' : ''}`}
                    onClick={handleFeaturedInfo}
                  >
                    <i className="fa-solid fa-info-circle"></i>
                    Mais Informações
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Prateleiras de Conteúdo - Estilo Streaming */}
      <section className="content-shelves">
        {shelves.map((shelf, shelfIndex) => (
          <div 
            key={shelf.id} 
            className="content-shelf"
            ref={el => shelfRefs.current[shelfIndex] = el}
          >
            <h2 className="shelf-title">
              <i className={shelf.icon}></i> {shelf.title}
            </h2>
            
            <div className="shelf-carousel">
              {shelf.items.length > 0 ? (
                <div className="carousel-track">
                  {shelf.items.map((item, itemIndex) => {
                    const isFocused = !onMenu && shelfFocus === shelfIndex && itemFocus === itemIndex;
                    
                    return (
                      <div
                        key={item.stream_id || item.series_id || itemIndex}
                        ref={el => itemRefs.current[`${shelfIndex}-${itemIndex}`] = el}
                        className={`content-card ${isFocused ? 'focused' : ''}`}
                        onClick={() => handleItemClick(item, shelf.type)}
                        onMouseEnter={() => handleItemFocus(item, shelf.type)}
                        onMouseLeave={handleItemBlur}
                      >
                        <div className="card-image">
                          <img
                            src={item.stream_icon || item.cover || '/images/BIGTV-transparente.png'}
                            alt={item.name}
                            loading="lazy"
                            onError={(e) => {
                              e.target.src = '/images/BIGTV-transparente.png';
                            }}
                          />
                          
                          <div className="card-overlay">
                            <div className="play-button">
                              <i className="fa-solid fa-play"></i>
                            </div>
                          </div>
                          
                          {item.rating && (
                            <div className="card-rating">
                              <i className="fa-solid fa-star"></i>
                              <span>{item.rating}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="card-info">
                          <h3 className="card-title">{item.name}</h3>
                          <div className="card-meta">
                            <span className="card-type">
                              {shelf.type === 'series' ? 'Série' : 'Filme'}
                            </span>
                            {item.episode_run_time && (
                              <span className="card-duration">
                                {item.episode_run_time}min
                              </span>
                            )}
                          </div>
                        </div>
                      
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="shelf-empty">
                  <div className="empty-content">
                    <i className="fa-solid fa-film"></i>
                    <p>{shelf.emptyMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Navegação Helper - Canto inferior */}
      <div className="navigation-helper">
        
      </div>
    </div>
  );
};

export default Home;