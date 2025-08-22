import React, { useState, useEffect, useRef, useCallback } from 'react';
import { iptvApi } from '../services/iptvApi';
import { safeScrollTo, safeScrollIntoView } from '../utils/scrollUtils';
import { buildStreamUrl } from '../config/apiConfig';
import { demoMovies, demoSeries } from '../data/demoContent';
import { watchProgressService } from '../services/watchProgressService';
import MoviePreview from './MoviePreview';
import './Home.css';

const Home = ({ onMenu, menuFocus, shelfFocus, itemFocus, hasGroupCode }) => {
  const [lancamentos, setLancamentos] = useState([]);
  const [telenovelas, setTelenovelas] = useState([]);
  const [classicos, setClassicos] = useState([]);
  const [continuarAssistindo, setContinuarAssistindo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [featuredContent, setFeaturedContent] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const previewTimeoutRef = useRef(null);
  const shelfRefs = useRef([]);
  const itemRefs = useRef([]);
  const heroButtonRefs = useRef([]);

  // Verificar se está em modo demo Samsung
  const isDemoMode = () => {
    const testMode = localStorage.getItem('testMode');
    const authEmail = localStorage.getItem('authEmail');
    return testMode === 'true' && authEmail === 'samsungtest1@samsung.com';
  };

  // Carregar dados da API quando o componente montar e houver código de grupo
  useEffect(() => {
    const loadHomeData = async () => {
      const isTestMode = localStorage.getItem('testMode') === 'true';
      
      // Se não há código de grupo E não está em modo teste, não carregar dados
      if (!hasGroupCode && !isTestMode) {
        setLoading(false);
        setLancamentos([]);
        setTelenovelas([]);
        setClassicos([]);
        setContinuarAssistindo([]);
        setFeaturedContent(null);
        setError(null);
        return;
      }

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
            iptvApi.getHomeClassics()
          ]),
          timeout
        ]);

        // Limitar a 10 itens por prateleira para navegação correta
        const moviesFiltered = Array.isArray(moviesData) ? moviesData.slice(0, 10) : [];
        const seriesFiltered = Array.isArray(seriesData) ? seriesData.slice(0, 10) : [];
        let classicosFiltered = Array.isArray(classicosData) ? classicosData.slice(10, 20) : []; // Pegar itens diferentes para clássicos

        // Se está em modo demo Samsung, adicionar séries demo aos clássicos
        if (isDemoMode()) {
          console.log('🧪 Adicionando séries demo à seção Animações Clássicas Demo');
          // Combinar filmes demo e séries demo para a seção clássicos
          classicosFiltered = [
            ...demoMovies.slice(0, 5), // Alguns filmes demo
            ...demoSeries.slice(0, 5)  // Algumas séries demo
          ];
        }

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

        // Carregar séries e filmes para continuar assistindo
        const continuarSeries = watchProgressService.getContinueWatchingSeries();
        const continuarFilmes = watchProgressService.getContinueWatchingMovies();
        
        // Combinar séries e filmes, ordenados por última visualização
        const continuarTodos = [...continuarSeries, ...continuarFilmes]
          .sort((a, b) => b.lastWatched - a.lastWatched);
        
        console.log('📺 Séries para continuar assistindo:', continuarSeries);
        console.log('🎬 Filmes para continuar assistindo:', continuarFilmes);
        console.log('🎭 Total para continuar assistindo:', continuarTodos);
        
        setContinuarAssistindo(continuarTodos);

      } catch (error) {
        console.error('Erro ao carregar dados do home:', error);
        setError('Erro ao carregar conteúdo. Verifique sua conexão.');
        // Definir dados vazios em caso de erro
        setLancamentos([]);
        setTelenovelas([]);
        setClassicos([]);
        setContinuarAssistindo([]);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, [hasGroupCode]);

  // Verificar se está em modo demo
  const isTestMode = localStorage.getItem('testMode') === 'true';
  
  // Definir prateleiras com dados carregados
  const shelves = [
    // Adicionar "Continuar Assistindo" apenas se houver conteúdo
    ...(continuarAssistindo.length > 0 ? [{
      id: 'continuar-assistindo',
      title: 'Continuar Assistindo',
      /* icon: 'fa-solid fa-play', /* Ícone para Continuar Assistindo */
      items: continuarAssistindo,
      type: 'continue-watching',
      emptyMessage: 'Nenhuma série em progresso'
    }] : []),
    {
      id: 'lancamentos',
      title: isTestMode ? 'Filmes Demo - Open Source' : 'Lançamentos em Destaque',
      /* icon: 'fa-solid fa-film', /* Ícone para Lançamentos */
      items: lancamentos,
      type: 'movie',
      emptyMessage: 'Nenhum lançamento disponível'
    },
    {
      id: 'telenovelas',
      title: isTestMode ? 'Séries Demo - Blender Studio' : 'Séries e Telenovelas',
      /* icon: 'fa-solid fa-tv', /* Ícone para Séries e Telenovelas */
      items: telenovelas,
      type: 'series',
      emptyMessage: 'Nenhuma série disponível'
    },
    {
      id: 'classicos',
      title: isTestMode ? 'Animações Clássicas Demo' : 'Clássicos do Cinema',
      /* icon: 'fa-solid fa-trophy', /* Ícone para Clássicos do Cinema */
      items: classicos,
      type: isDemoMode() ? 'mixed' : 'movie', // Tipo misto para demo Samsung
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
    // Esconder o preview quando o mouse sai do item
    setShowPreview(false);
  };

  const handleItemClick = (item, type) => {
    console.log('🎬 Item selecionado na Home:', item, 'Tipo:', type);

    // Lógica específica para "Continuar Assistindo"
    if (type === 'continue-watching') {
      console.log('🔄 Item de Continuar Assistindo selecionado:', item);
      
      // Verificar se é série ou filme
      if (item.seriesId && item.lastEpisode) {
        // É uma série - reproduzir diretamente o episódio de onde parou
        console.log('📺 Continuando série diretamente:', item.seriesName, 'Episódio:', item.lastEpisode.episodeTitle);
        
        // Construir streamInfo para o episódio da série
        const streamInfo = {
          name: `${item.seriesName} - Episódio ${item.lastEpisode.episodeNumber}`,
          type: 'series',
          category: 'Série',
          description: item.lastEpisode.episodeTitle || 'Descrição não disponível',
          poster: item.poster,
          stream_icon: item.stream_icon,
          cover: item.cover,
          genre: item.genre,
          year: item.year,
          // Tempo para continuar reprodução
          continueFromTime: item.lastEpisode.progress.currentTime || 0,
          // Informações para voltar aos detalhes da série (origem: HOME)
          returnToSeriesDetails: {
            seriesId: item.seriesId,
            seriesName: item.seriesName,
            poster: item.poster,
            stream_icon: item.stream_icon,
            cover: item.cover,
            genre: item.genre,
            year: item.year,
            // Marcar que veio da HOME para navegação correta
            origin: 'home'
          },
          seriesInfo: {
            seriesId: item.seriesId,
            seriesName: item.seriesName,
            currentSeason: item.lastEpisode.seasonNumber,
            currentEpisode: {
              id: item.lastEpisode.episodeId,
              stream_id: item.lastEpisode.episodeId,
              title: item.lastEpisode.episodeTitle,
              name: item.lastEpisode.episodeTitle,
              episode_num: item.lastEpisode.episodeNumber
            },
            // Para continuar assistindo, não precisamos do próximo episódio ainda
            nextEpisode: null,
            allEpisodes: [] // Será carregado pela SeriesDetailsPage se necessário
          }
        };
        
        // Construir URL do stream para o episódio
        const streamUrl = buildStreamUrl('series', item.lastEpisode.episodeId, 'mp4');
        
        // Disparar evento para reproduzir o episódio diretamente
        const playEvent = new CustomEvent('playContent', {
          detail: { streamUrl, streamInfo }
        });
        window.dispatchEvent(playEvent);
        return;
        
      } else if (item.movieId) {
        // É um filme - continuar reprodução do filme
        console.log('🎬 Continuando filme:', item.movieName, 'Tempo:', item.currentTimeFormatted);
        
        // Construir URL do filme e reproduzir no tempo salvo
        let streamUrl;
        let streamInfo;
        
        if (isDemoMode() && item.stream_url) {
          // Para filmes demo, usar URL direta
          streamUrl = item.stream_url;
        } else {
          // Filme normal
          streamUrl = buildStreamUrl('movie', item.movieId, 'mp4');
        }
        
        streamInfo = {
          name: item.movieName || item.name,
          stream_id: item.movieId,
          id: item.movieId,
          type: 'movie',
          category: 'Filme',
          description: 'Continuar assistindo',
          year: item.year || 'N/A',
          rating: item.rating || 'N/A',
          genre: item.genre,
          poster: item.poster || item.stream_icon || item.cover,
          stream_icon: item.stream_icon || item.poster,
          cover: item.cover || item.poster,
          // Tempo para continuar reprodução (para filmes, não há lastEpisode)
          continueFromTime: item.currentTime || 0,
          progressPercent: item.progressPercent
        };

        // Disparar evento para reproduzir o filme do tempo salvo
        const playEvent = new CustomEvent('playContent', {
          detail: {
            streamUrl: streamUrl,
            streamInfo: streamInfo,
            continueFromTime: streamInfo.continueFromTime
          }
        });

        console.log('🎬 Disparando evento playContent para continuar filme:', streamInfo);
        window.dispatchEvent(playEvent);
        return;
      }
    }

    // Detectar automaticamente o tipo quando for "mixed"
    let actualType = type;
    if (type === 'mixed') {
      // Detectar se é série (tem series_id) ou filme (tem stream_id)
      actualType = item.series_id ? 'series' : 'movie';
      console.log('🔍 Tipo detectado automaticamente:', actualType);
    }

    if (actualType === 'movie') {
      // Para filmes, reproduzir diretamente
      console.log('🎬 Filme selecionado na Home - reproduzindo diretamente:', item);

      let streamUrl;
      let streamInfo;

      if (isDemoMode() && item.stream_url) {
        // Para filmes demo, usar URL direta
        streamUrl = item.stream_url;
        streamInfo = {
          name: item.name,
          stream_id: item.stream_id, // CRUCIAL: ID do filme
          id: item.id || item.stream_id,
          type: 'movie',
          category: 'Filme Demo',
          description: item.plot || 'Descrição não disponível',
          year: item.releasedate || 'N/A',
          releasedate: item.releasedate,
          rating: item.rating || 'N/A',
          genre: item.genre,
          poster: item.stream_icon || item.cover,
          stream_icon: item.stream_icon,
          cover: item.cover
        };
        console.log('🧪 Reproduzindo filme demo da Home:', streamInfo);
      } else {
        // Filme normal
        streamUrl = buildStreamUrl('movie', item.stream_id, 'mp4');
        streamInfo = {
          name: item.name,
          stream_id: item.stream_id, // CRUCIAL: ID do filme
          id: item.id || item.stream_id,
          type: 'movie',
          category: 'Filme',
          description: item.plot || 'Descrição não disponível',
          year: item.releasedate || 'N/A',
          releasedate: item.releasedate,
          rating: item.rating || 'N/A',
          genre: item.genre,
          poster: item.stream_icon || item.cover,
          stream_icon: item.stream_icon,
          cover: item.cover
        };
      }

      // Disparar evento para reproduzir o filme diretamente
      const playEvent = new CustomEvent('playContent', {
        detail: {
          streamUrl: streamUrl,
          streamInfo: streamInfo
        }
      });

      console.log('🎬 Disparando evento playContent para filme da Home:', streamInfo);
      window.dispatchEvent(playEvent);

    } else if (actualType === 'series') {
      // Para séries, disparar evento para abrir página de detalhes
      console.log('🎬 Série selecionada na Home - abrindo detalhes:', item);

      const seriesWithCategory = {
        ...item,
        category_name: isDemoMode() ? item.category_name || 'Série Demo' : 'Série'
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

  // Listener para cliques nos itens das prateleiras via navegação
  useEffect(() => {
    const handleShelfItemClick = (event) => {
      const { shelfIndex, itemIndex } = event.detail;

      // Verificar se os índices são válidos
      if (shelfIndex >= 0 && shelfIndex < shelves.length) {
        const shelf = shelves[shelfIndex];
        if (itemIndex >= 0 && itemIndex < shelf.items.length) {
          const item = shelf.items[itemIndex];
          handleItemClick(item, shelf.type);
        }
      }
    };

    window.addEventListener('shelfItemClick', handleShelfItemClick);
    return () => window.removeEventListener('shelfItemClick', handleShelfItemClick);
  }, [shelves]);



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

  // Estado vazio quando não há código de grupo configurado
  if (!hasGroupCode) {
    return (
      <div className="home-empty">
        <div className="empty-content">
          <div className="empty-icon">
            <i className="fa-solid fa-door-open"></i>
          </div>
          <h2 className="empty-title">Bem-vindo ao BIGTV</h2>
          <p className="empty-message">
            Para acessar o conteúdo, você precisa configurar o código do seu grupo IPTV.
          </p>
          <p className="empty-instruction">
            Use a sidebar e selecione "Configurar Grupo" para começar.
          </p>
          <div className="empty-hint">
            <i className="fa-solid fa-arrow-left"></i>
            <span>Pressione a seta esquerda para abrir o menu</span>
          </div>
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
                >
                  <i className="fa-solid fa-play"></i>
                  Assistir
                </button>

                {featuredContent.type === 'series' && (
                  <button
                    ref={el => (heroButtonRefs.current[1] = el)}
                    className={`hero-btn secondary ${!onMenu && shelfFocus === -1 && itemFocus === 1 ? 'focused' : ''}`}
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
                        onMouseEnter={() => handleItemFocus(item, shelf.type)}
                        onMouseLeave={handleItemBlur}
                      >
                        <div className="card-image">
                          <img
                            src={item.stream_icon || item.cover || '/images/BIGTV-transparente.png'}
                            alt={shelf.type === 'continue-watching' ? item.seriesName : item.name}
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

                          {/* Barra de progresso para itens de continuar assistindo */}
                          {shelf.type === 'continue-watching' && (
                            <div className="continue-watching-progress">
                              <div 
                                className="progress-fill"
                                style={{ width: `${item.progressPercent}%` }}
                              ></div>
                            </div>
                          )}

                          {item.rating && shelf.type !== 'continue-watching' && (
                            <div className="card-rating">
                              <i className="fa-solid fa-star"></i>
                              <span>{item.rating}</span>
                            </div>
                          )}
                        </div>

                        <div className="card-info">
                          <h3 className="card-title">
                            {shelf.type === 'continue-watching' ? 
                              (item.seriesName || item.movieName || item.name) : 
                              item.name
                            }
                          </h3>
                          <div className="card-meta">
                            {shelf.type === 'continue-watching' && item.lastEpisode ? (
                              <div className="card-meta-continue">
                                <span className="card-episode">
                                  Episódio {item.lastEpisode.episodeNumber}
                                </span>
                                <span className="card-type">Série</span>
                              </div>
                            ) : (
                              <>
                                <span className="card-type">
                                  {shelf.type === 'continue-watching' ? 
                                    (item.lastEpisode ? 'Série' : 'Filme') :
                                    (shelf.type === 'mixed' 
                                      ? (item.series_id ? 'Série' : 'Filme')
                                      : (shelf.type === 'series' ? 'Série' : 'Filme')
                                    )
                                  }
                                </span>
                                {item.episode_run_time && (
                                  <span className="card-duration">
                                    {item.episode_run_time}min
                                  </span>
                                )}
                              </>
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

      {/* Modal de Preview */}
      {showPreview && previewContent && (
        <MoviePreview
          movie={previewContent}
          isActive={showPreview}
          onBack={() => setShowPreview(false)}
        />
      )}

    </div>
  );
};

export default Home;