import React, { useState, useEffect, useCallback, useRef } from 'react';
import { buildStreamUrl } from '../config/apiConfig';
import './MovieDetailsPage.css';

const MovieDetailsPage = ({ movie, isActive, onBack }) => {
  const [focusedElement, setFocusedElement] = useState('play');
  const [isFavorite, setIsFavorite] = useState(false);
  const [focusArea, setFocusArea] = useState('actions');
  const [loading, setLoading] = useState(false);

  // Referencias para navegação com foco
  const actionButtonsRef = useRef([]);

  // Detectar ambiente Tizen TV
  const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const playMovie = useCallback(() => {
    console.log('🎬 Função playMovie chamada!');
    console.log('🎬 Reproduzindo filme:', movie);
    console.log('🔧 Ambiente detectado:', { isTizenTV, isDevelopment });

    const isTestMode = localStorage.getItem('testMode') === 'true';
    const streamUrl = isTestMode && movie.stream_url
      ? movie.stream_url
      : buildStreamUrl('movie', movie.stream_id, 'mp4');

    const streamInfo = {
      name: movie.name,
      stream_id: movie.stream_id, // CRUCIAL: ID do filme para salvar progresso
      id: movie.id || movie.stream_id, // ID alternativo
      category: movie.category_name || 'Filme',
      description: movie.plot || `Filme - ${movie.name}`,
      year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null,
      releasedate: movie.releaseDate,
      rating: movie.rating,
      genre: movie.genre,
      type: 'movie',
      poster: movie.stream_icon || movie.cover,
      stream_icon: movie.stream_icon,
      cover: movie.cover
    };

    // Para Tizen TV, usar configuração específica que força player interno
    if (isTizenTV) {
      console.log('📺 Configuração Tizen TV ativada para filme');

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
        console.log('📺 Disparando evento playContent para Tizen TV (filme)');
        window.dispatchEvent(playEvent);
      }, 100);

    } else {
      console.log('💻 Configuração padrão ativada para filme');

      const playEvent = new CustomEvent('playContent', {
        detail: { streamUrl, streamInfo }
      });
      window.dispatchEvent(playEvent);
    }
  }, [movie, isTizenTV, isDevelopment]);

  const toggleFavorite = useCallback(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const movieKey = `movie_${movie.stream_id}`;

    if (isFavorite) {
      delete favorites[movieKey];
    } else {
      favorites[movieKey] = {
        stream_id: movie.stream_id,
        name: movie.name,
        cover: movie.cover,
        stream_icon: movie.stream_icon,
        plot: movie.plot,
        category_name: movie.category_name,
        rating: movie.rating,
        releaseDate: movie.releaseDate,
        addedAt: new Date().toISOString()
      };
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));
    setIsFavorite(!isFavorite);
  }, [movie, isFavorite]);

  // Navegação das ações (botões Play/Favoritos)
  const handleActionsNavigation = useCallback((keyCode) => {
    console.log('🎮 Navegação de ações - keyCode:', keyCode, 'focusedElement:', focusedElement);

    if (keyCode === 37) { // Esquerda
      setFocusedElement(focusedElement === 'play' ? 'favorite' : 'play');
    } else if (keyCode === 39) { // Direita
      setFocusedElement(focusedElement === 'play' ? 'favorite' : 'play');
    } else if (keyCode === 13) { // Enter - executar ação
      console.log('🎮 Enter pressionado - executando ação para:', focusedElement);
      if (focusedElement === 'play') {
        playMovie();
      } else if (focusedElement === 'favorite') {
        toggleFavorite();
      }
    }
  }, [focusedElement, playMovie, toggleFavorite]);

  // Inicialização
  useEffect(() => {
    if (!isActive || !movie) return;

    // Reset do estado quando a página fica ativa
    setFocusedElement('play');
    setFocusArea('actions');

    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const movieKey = `movie_${movie.stream_id}`;
    setIsFavorite(!!favorites[movieKey]);
  }, [isActive, movie]);

  // Sistema de navegação por controle remoto
  useEffect(() => {
    if (!isActive) return;

    const handleMovieDetailsNavigation = (event) => {
      const { keyCode } = event.detail;
      console.log('🎮 Evento movieDetailsNavigation recebido - keyCode:', keyCode);

      // Tratar tecla de voltar
      if (keyCode === 8 || keyCode === 10009 || keyCode === 461 || keyCode === 27) { // Backspace, Return, Back, ESC
        console.log('🎮 Tecla de voltar detectada');
        onBack();
        return;
      }

      // Delegar navegação baseada na área de foco
      if (focusArea === 'actions') {
        console.log('🎮 Delegando para handleActionsNavigation');
        handleActionsNavigation(keyCode);
      }
    };

    window.addEventListener('movieDetailsNavigation', handleMovieDetailsNavigation);
    return () => window.removeEventListener('movieDetailsNavigation', handleMovieDetailsNavigation);
  }, [
    isActive,
    focusArea,
    handleActionsNavigation,
    onBack
  ]);

  // Sistema de navegação global para detectar teclas
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event) => {
      const { keyCode } = event;
      console.log('🎮 Evento keydown global - keyCode:', keyCode);

      // Tratar tecla de voltar
      if (keyCode === 8 || keyCode === 10009 || keyCode === 461 || keyCode === 27) { // Backspace, Return, Back, ESC
        console.log('🎮 Tecla de voltar detectada (global)');
        onBack();
        return;
      }

      // Delegar navegação baseada na área de foco
      if (focusArea === 'actions') {
        console.log('🎮 Delegando para handleActionsNavigation (global)');
        handleActionsNavigation(keyCode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isActive,
    focusArea,
    handleActionsNavigation,
    onBack
  ]);

  if (!isActive || !movie) return null;

  return (
    <div className="movie-details-page">
      <div className="movie-main-layout">
        <div className="movie-info-panel">
          <div className="movie-header-info">
            <img
              src="/images/logo-provider.png"
              alt="Provider Logo"
              className="movie-provider-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />

            <h1 className="movie-title-main">{movie.name}</h1>

            <div className="movie-meta-info">
              {movie.releaseDate && (
                <div className="meta-item release-year">
                  <i className="fas fa-calendar"></i>
                  <span>{new Date(movie.releaseDate).getFullYear()}</span>
                </div>
              )}
              {movie.rating && (
                <div className="meta-item rating">
                  <i className="fas fa-star"></i>
                  <span>{movie.rating}</span>
                </div>
              )}
              {movie.category_name && (
                <div className="meta-item category">
                  <i className="fas fa-film"></i>
                  <span>{movie.category_name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="movie-synopsis">
            <p className="synopsis-text expanded">
              {movie.plot || 'Descrição não disponível para este filme.'}
            </p>
          </div>

          <div className="movie-action-buttons">
            <button
              className={`primary-action-btn ${focusArea === 'actions' && focusedElement === 'play' ? 'focused' : ''}`}
              onClick={() => {
                console.log('🎬 Botão Assistir Filme clicado!');
                playMovie();
              }}
              ref={(el) => (actionButtonsRef.current[0] = el)}
            >
              <i className="fas fa-play"></i>
              <span>Assistir Filme</span>
            </button>

            <button
              className={`secondary-action-btn ${focusArea === 'actions' && focusedElement === 'favorite' ? 'focused' : ''}`}
              onClick={() => {
                console.log('❤️ Botão Favoritos clicado!');
                toggleFavorite();
              }}
              ref={(el) => (actionButtonsRef.current[1] = el)}
            >
              <i className={`fas ${isFavorite ? 'fa-heart' : 'fa-plus'}`}></i>
              <span>
                {isFavorite ? 'Na Minha Lista' : 'Minha Lista'}
              </span>
            </button>
          </div>
        </div>

        <div className="movie-promotional-art">
          <img
            src={movie.backdrop_path?.[0] || movie.cover || movie.stream_icon}
            alt={movie.name}
            className="promotional-image"
            loading="lazy"
            onError={(e) => {
              e.target.src = movie.cover || movie.stream_icon || '/images/placeholder-movie.jpg';
            }}
          />
          <div className="promotional-overlay"></div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetailsPage; 