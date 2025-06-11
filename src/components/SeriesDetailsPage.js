import React, { useState, useEffect, useCallback, useRef } from 'react';
import { safeScrollTo, scrollToElementInCarousel } from '../utils/scrollUtils';
import { formatEpisode, padNumber } from '../utils/formatters';
import './SeriesDetailsPage.css';

import VideoPlayer from './VideoPlayer';

const SeriesDetailsPage = ({ series, isActive, onBack }) => {
  const [focusedElement, setFocusedElement] = useState('play');
  const [isFavorite, setIsFavorite] = useState(false);
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(0);
  const [focusArea, setFocusArea] = useState('actions');
  const [seasonFocus, setSeasonFocus] = useState(0);
  const [episodeFocus, setEpisodeFocus] = useState(0);
  const [loading, setLoading] = useState(false);
  const [episodesAreaExpanded, setEpisodesAreaExpanded] = useState(false);

  // Referencias para navegação com foco
  const actionButtonsRef = useRef([]);
  const seasonElementsRef = useRef([]);
  const episodeElementsRef = useRef([]);
  
  // Detectar ambiente Tizen TV
  const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  const API_BASE_URL = 'https://rota66.bar/player_api.php';
  const API_CREDENTIALS = 'username=zBB82J&password=AMeDHq';

  // Função para scroll do carrossel de episódios
  const scrollEpisodeIntoView = useCallback((index) => {
    if (episodeElementsRef.current[index]) {
      const element = episodeElementsRef.current[index];
      const container = element.parentElement;
      
      // Usar função utilitária para scroll seguro em carrossel
      scrollToElementInCarousel(container, element, 'auto');
    }
  }, []);

  // Função otimizada para carregar episódios - sem requestAnimationFrame
  const loadEpisodes = useCallback(async (seasonNumber) => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_series_info&series_id=${series.series_id}`
      );
      const data = await response.json();
      
      if (data.episodes && data.episodes[seasonNumber]) {
        setEpisodes(data.episodes[seasonNumber]);
        setSelectedEpisode(0);
        setEpisodeFocus(0);
        setEpisodesAreaExpanded(true);
        setFocusArea('episodes');
      } else {
        setEpisodes([]);
        setEpisodesAreaExpanded(true);
        setFocusArea('episodes');
      }
    } catch (error) {
      console.error('Erro ao carregar episódios:', error);
      setEpisodes([]);
      setEpisodesAreaExpanded(true);
      setFocusArea('episodes');
    } finally {
      setLoading(false);
    }
  }, [series?.series_id]);

  const selectSeason = useCallback((seasonNumber) => {
    if (selectedSeason === seasonNumber) return;
    
    setSelectedSeason(seasonNumber);
    const seasonIndex = seasons.findIndex(s => s.season_number === seasonNumber);
    setSeasonFocus(seasonIndex);
    loadEpisodes(seasonNumber);
  }, [selectedSeason, seasons, loadEpisodes]);

  const playEpisode = useCallback((episode) => {
    console.log('🎬 Reproduzindo episódio:', episode);
    console.log('🔧 Ambiente detectado:', { isTizenTV, isDevelopment });
    
    const streamUrl = `https://rota66.bar/series/zBB82J/AMeDHq/${episode.id || episode.stream_id}.mp4`;
    
    // Lógica unificada e síncrona para disparar o evento de reprodução.
    // O setTimeout foi removido por ser a causa provável do congelamento no Tizen.
    const playEvent = new CustomEvent('playContent', {
      detail: {
        streamUrl: streamUrl,
        streamInfo: {
          name: `${series.name} - ${formatEpisode(selectedSeason, episode.episode_num || 1)} - ${episode.title || episode.name || 'Episódio'}`,
          type: 'series',
          category: series.category_name || 'Série',
          description: episode.plot || episode.info?.plot || series.plot || 'Descrição não disponível',
          year: series.releasedate || 'N/A',
          rating: series.rating || episode.rating || 'N/A',
          poster: series.cover || series.stream_icon
        }
      }
    });
    
    console.log('📺 Disparando evento playContent...');
    window.dispatchEvent(playEvent);
    
  }, [series, selectedSeason, isTizenTV, isDevelopment]);

  const loadFirstEpisode = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_series_info&series_id=${series.series_id}`
      );
      const data = await response.json();
      
      if (data.episodes && Object.keys(data.episodes).length > 0) {
        const firstSeason = Object.keys(data.episodes)[0];
        const firstEpisode = data.episodes[firstSeason][0];
        if (firstEpisode) {
          console.log('🎬 Reproduzindo primeiro episódio via loadFirstEpisode');
          playEpisode(firstEpisode);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar primeiro episódio:', error);
    } finally {
      setLoading(false);
    }
  }, [series?.series_id, playEpisode]);

  const toggleFavorite = useCallback(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const seriesKey = `series_${series.series_id}`;
    
    if (isFavorite) {
      delete favorites[seriesKey];
    } else {
      favorites[seriesKey] = {
        series_id: series.series_id,
        name: series.name,
        cover: series.cover,
        stream_icon: series.stream_icon,
        plot: series.plot,
        category_name: series.category_name,
        rating: series.rating,
        releasedate: series.releasedate,
        addedAt: new Date().toISOString()
      };
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    setIsFavorite(!isFavorite);
  }, [series, isFavorite]);

  const loadSeriesInfo = useCallback(async () => {
    if (!series?.series_id) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_series_info&series_id=${series.series_id}`
      );
      const data = await response.json();
      
      if (data.seasons) {
        setSeasons(data.seasons);
        
        if (data.seasons.length > 0) {
          const firstSeason = data.seasons[0].season_number;
          setSelectedSeason(firstSeason);
          
          if (data.episodes && data.episodes[firstSeason]) {
            setEpisodes(data.episodes[firstSeason]);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar informações da série:', error);
    } finally {
      setLoading(false);
    }
  }, [series?.series_id]);

  // Navegação das ações (botões Play/Favoritos)
  const handleActionsNavigation = useCallback((keyCode) => {
    if (keyCode === 37) { // Esquerda
      setFocusedElement(focusedElement === 'play' ? 'favorite' : 'play');
    } else if (keyCode === 39) { // Direita
      setFocusedElement(focusedElement === 'play' ? 'favorite' : 'play');
    } else if (keyCode === 40) { // Baixo - ir para temporadas ou episódios
      if (seasons.length > 0) {
        setFocusArea('seasons');
        setSeasonFocus(0);
        setEpisodesAreaExpanded(true);
      } else {
        setFocusArea('episodes');
        setEpisodeFocus(0);
        setEpisodesAreaExpanded(true);
        setTimeout(() => scrollEpisodeIntoView(0), 100);
      }
    } else if (keyCode === 13) { // Enter - executar ação
      if (focusedElement === 'play') {
        if (episodes.length > 0 && episodes[selectedEpisode]) {
          playEpisode(episodes[selectedEpisode]);
        } else {
          loadFirstEpisode();
        }
      } else if (focusedElement === 'favorite') {
        toggleFavorite();
      }
    }
  }, [focusedElement, seasons.length, episodes, selectedEpisode, playEpisode, loadFirstEpisode, toggleFavorite, scrollEpisodeIntoView]);

  // Navegação das temporadas
  const handleSeasonsNavigation = useCallback((keyCode) => {
    if (keyCode === 38) { // Cima - voltar para ações
      if (seasonFocus > 0) {
        setSeasonFocus(seasonFocus - 1);
      } else {
        setFocusArea('actions');
        setFocusedElement('play');
        setEpisodesAreaExpanded(false);
      }
    } else if (keyCode === 40) { // Baixo - ir para episódios
      setFocusArea('episodes');
      setEpisodeFocus(0);
      setTimeout(() => scrollEpisodeIntoView(0), 100);
    } else if (keyCode === 37) { // Esquerda
      const newFocus = seasonFocus > 0 ? seasonFocus - 1 : seasons.length - 1;
      setSeasonFocus(newFocus);
      const season = seasons[newFocus];
      if (season) {
        selectSeason(season.season_number);
      }
    } else if (keyCode === 39) { // Direita
      const newFocus = seasonFocus < seasons.length - 1 ? seasonFocus + 1 : 0;
      setSeasonFocus(newFocus);
      const season = seasons[newFocus];
      if (season) {
        selectSeason(season.season_number);
      }
    } else if (keyCode === 13) { // Enter - selecionar temporada
      const season = seasons[seasonFocus];
      if (season) {
        selectSeason(season.season_number);
      }
    }
  }, [seasonFocus, seasons, selectSeason, scrollEpisodeIntoView]);

  // Navegação dos episódios
  const handleEpisodesNavigation = useCallback((keyCode) => {
    if (keyCode === 38) { // Cima - voltar para temporadas ou ações
      if (seasons.length > 0) {
        setFocusArea('seasons');
      } else {
        setFocusArea('actions');
        setFocusedElement('play');
        setEpisodesAreaExpanded(false);
      }
    } else if (keyCode === 37) { // Esquerda
      if (episodeFocus > 0) {
        const newFocus = episodeFocus - 1;
        setEpisodeFocus(newFocus);
        scrollEpisodeIntoView(newFocus);
      }
    } else if (keyCode === 39) { // Direita
      if (episodeFocus < episodes.length - 1) {
        const newFocus = episodeFocus + 1;
        setEpisodeFocus(newFocus);
        scrollEpisodeIntoView(newFocus);
      }
    } else if (keyCode === 13) { // Enter - reproduzir episódio
      if (episodes[episodeFocus]) {
        const episode = episodes[episodeFocus];
        setSelectedEpisode(episodeFocus);
        playEpisode(episode);
      }
    }
  }, [episodeFocus, episodes, seasons.length, playEpisode, scrollEpisodeIntoView]);

  // Função otimizada para scroll central - sem requestAnimationFrame
  const scrollToCenter = useCallback((element, container) => {
    if (!element || !container) return;
    
    try {
      // Usar função utilitária para scroll seguro
      scrollToElementInCarousel(container, element, 'auto');
    } catch (error) {
      console.warn('Erro no scroll central:', error);
    }
  }, []);

  // Inicialização simplificada
  useEffect(() => {
    if (!isActive || !series) return;

    // Reset do estado quando a página fica ativa
    setFocusedElement('play');
    setFocusArea('actions');
    setEpisodesAreaExpanded(false);
    setSeasonFocus(0);
    setEpisodeFocus(0);
    
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const seriesKey = `series_${series.series_id}`;
    setIsFavorite(!!favorites[seriesKey]);
    
    loadSeriesInfo();
  }, [isActive, series, loadSeriesInfo]);

  // Sistema de navegação por controle remoto - seguindo padrão das outras páginas
  useEffect(() => {
    if (!isActive) return;

    const handleSeriesDetailsNavigation = (event) => {
      const { keyCode } = event.detail;
      
      // Tratar tecla de voltar
      if (keyCode === 8 || keyCode === 10009) { // Backspace ou Return
        if (episodesAreaExpanded && (focusArea === 'episodes' || focusArea === 'seasons')) {
          setEpisodesAreaExpanded(false);
          setFocusArea('actions');
          setFocusedElement('play');
        } else {
          onBack();
        }
        return;
      }
      
      // Delegar navegação baseada na área de foco
      if (focusArea === 'actions') {
        handleActionsNavigation(keyCode);
      } else if (focusArea === 'seasons') {
        handleSeasonsNavigation(keyCode);
      } else if (focusArea === 'episodes') {
        handleEpisodesNavigation(keyCode);
      }
    };

    window.addEventListener('seriesDetailsNavigation', handleSeriesDetailsNavigation);
    return () => window.removeEventListener('seriesDetailsNavigation', handleSeriesDetailsNavigation);
  }, [
    isActive,
    focusArea,
    episodesAreaExpanded,
    handleActionsNavigation,
    handleSeasonsNavigation,
    handleEpisodesNavigation,
    onBack
  ]);

  if (!isActive || !series) return null;

  return (
    <div className="series-details-page">
      <div className={`series-main-layout ${episodesAreaExpanded ? 'episodes-focused' : ''}`}>
        <div className={`series-info-panel ${episodes.length > 0 ? 'has-episodes' : ''}`}>
          <div className="series-header-info">
            <img 
              src="/images/logo-provider.png" 
              alt="Provider Logo" 
              className="series-provider-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
        
            <h1 className="series-title-main">{series.name}</h1>
            
            <div className="series-meta-info">
              <div className="meta-item season-count">
                <i className="fas fa-list"></i>
                <span>{seasons.length} Temporadas</span>
              </div>  
            </div>
          </div>
          
          <div className="series-synopsis">
            <p className="synopsis-text expanded">
              {series.plot || 'Descrição não disponível para esta série.'}
            </p>
          </div>
          
          <div className="series-genres">
            <div className="genre-tag">Comédia</div>
            <div className="genre-tag">Animação</div>
            <div className="genre-tag">Adulto</div>
          </div>
          
          <div className="series-action-buttons">
            <button 
              className={`primary-action-btn ${focusArea === 'actions' && focusedElement === 'play' ? 'focused' : ''}`}
              onClick={() => {
                if (episodes.length > 0 && episodes[selectedEpisode]) {
                  playEpisode(episodes[selectedEpisode]);
                } else {
                  loadFirstEpisode();
                }
              }}
              ref={(el) => (actionButtonsRef.current[0] = el)}
            >
              <i className="fas fa-play"></i>
              <span>Assistir T1 Ep. 1</span>
            </button>
            
            <button 
              className={`secondary-action-btn ${focusArea === 'actions' && focusedElement === 'favorite' ? 'focused' : ''}`}
              onClick={() => toggleFavorite()}
              ref={(el) => (actionButtonsRef.current[1] = el)}
            >
              <i className={`fas ${isFavorite ? 'fa-heart' : 'fa-plus'}`}></i>
              <span>
              {isFavorite ? 'Na Minha Lista' : 'Minha Lista'}
              </span>
            </button>
          </div>

          {episodes.length > 0 && !episodesAreaExpanded && focusArea === 'actions'}
        </div>
        
        <div className="series-promotional-art">
          <img 
            src={series.backdrop_path?.[0] || series.cover || series.stream_icon} 
            alt={series.name}
            className="promotional-image"
            loading="lazy"
            onError={(e) => {
              e.target.src = series.cover || series.stream_icon || '/images/placeholder-series.jpg';
            }}
          />
          <div className="promotional-overlay"></div>
        </div>
      </div>

      <div className={`series-episodes-area ${episodesAreaExpanded ? 'episodes-focused' : ''}`}>
        <div className="tab-content active">
          <div className="episodes-tab-content">
            {loading && (
              <div className="loading">
                <i className="fas fa-spinner"></i>
                <span>Carregando informações da série...</span>
              </div>
            )}
            
            {!loading && (
              <>
                <div className="episodes-section-header">
                  <h2 className="episodes-section-title">Episódios</h2>
                  <p className="episodes-section-subtitle">
                    {episodes.length > 0 
                      ? `Temporada ${selectedSeason} • ${episodes.length} episódio${episodes.length !== 1 ? 's' : ''}`
                      : 'Carregando episódios...'
                    }
                  </p>
                </div>

                {seasons.length > 0 && (
                  <div className="season-selector-hbo">
                    <span className="season-title-fixed">Temporada</span>
                    <div className="season-numbers-container">
                      {seasons.map((season, index) => (
                        <div
                          key={season.season_number}
                          className={`season-number-item ${
                            selectedSeason === season.season_number ? 'active' : ''
                          } ${
                            focusArea === 'seasons' && seasonFocus === index ? 'focused' : ''
                          }`}
                          onClick={() => selectSeason(season.season_number)}
                          ref={(el) => (seasonElementsRef.current[index] = el)}
                        >
                          {season.season_number}
                        </div>
                      ))}
                      <div className="season-indicator-bar"></div>
                    </div>
                  </div>
                )}
                
                <div className="episodes-grid-container">
                  {episodes.length > 0 ? (
                    <div className="episodes-grid-new">
                      {episodes.map((episode, index) => (
                        <div
                          key={episode.id || index}
                          className={`episode-card-new ${
                            selectedEpisode === index ? 'active' : ''
                          } ${
                            focusArea === 'episodes' && episodeFocus === index ? 'focused' : ''
                          }`}
                          onClick={() => {
                            setSelectedEpisode(index);
                            playEpisode(episode);
                          }}
                          ref={(el) => (episodeElementsRef.current[index] = el)}
                        >
                          <div className="episode-thumbnail">
                            <img 
                              src={episode.info?.movie_image || series.cover || '/images/placeholder-episode.jpg'}
                              alt={episode.title || episode.name || 'Episode'}
                              loading="lazy"
                              onError={(e) => {
                                e.target.src = '/images/placeholder-episode.jpg';
                              }}
                            />
                            <div className="episode-play-overlay">
                              <i className="fas fa-play"></i>
                            </div>
                          </div>
                          
                          <div className="episode-details">
                            <div className="episode-header">
                              <div className="episode-number-badge">
                                E{padNumber(episode.episode_num || index + 1, 2)}
                              </div>
                              <span className="episode-duration">22 min</span>
                            </div>
                            
                            <h4 className="episode-title-new">
                              {episode.title || episode.name || `Episódio ${episode.episode_num || index + 1}`}
                            </h4>
                            
                            <div className="episode-meta">
                              <span>2023</span>
                            </div>
                            
                            {episode.plot && (
                              <p className="episode-description-new">{episode.plot}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-episodes-message">
                      <i className="fas fa-film"></i>
                      <h3>Episódios em carregamento...</h3>
                      <p>Aguarde enquanto carregamos os episódios desta série.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeriesDetailsPage; 