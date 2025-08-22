import React, { useState, useEffect, useCallback, useRef } from 'react';
import { buildStreamUrl } from '../config/apiConfig';
import './SearchMovieDetailsPage.css';

const SearchMovieDetailsPage = ({ movie, isActive, onBack }) => {
  const [focusedElement, setFocusedElement] = useState('play');
  const [isFavorite, setIsFavorite] = useState(false);
  const [focusArea, setFocusArea] = useState('actions');

  // Referencias para navegação com foco
  const actionButtonsRef = useRef([]);

  // Detectar ambiente Tizen TV
  const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const playMovie = useCallback(() => {
    if (!movie) return;
    console.log('🎬 Função playMovie chamada!');
    console.log('🎬 Reproduzindo filme da pesquisa:', movie);
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

    if (isTizenTV) {
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
        window.dispatchEvent(playEvent);
      }, 100);
    } else {
      const playEvent = new CustomEvent('playContent', {
        detail: { streamUrl, streamInfo }
      });
      window.dispatchEvent(playEvent);
    }
  }, [movie, isTizenTV, isDevelopment]);

  const toggleFavorite = useCallback(() => {
    if (!movie) return;
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

  const handleActionsNavigation = useCallback((keyCode) => {
    if (keyCode === 37) { // Esquerda
      setFocusedElement(focusedElement === 'play' ? 'favorite' : 'play');
    } else if (keyCode === 39) { // Direita
      setFocusedElement(focusedElement === 'play' ? 'favorite' : 'play');
    } else if (keyCode === 13) { // Enter - executar ação
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

    setFocusedElement('play');
    setFocusArea('actions');

    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const movieKey = `movie_${movie.stream_id}`;
    setIsFavorite(!!favorites[movieKey]);
  }, [isActive, movie]);

  // Sistema de navegação por controle remoto (evento customizado vindo do App.js)
  useEffect(() => {
    if (!isActive) return;

    const handleSearchMovieDetailsNavigation = (event) => {
      const { keyCode } = event.detail;

      // Tratar tecla de voltar
      if (keyCode === 8 || keyCode === 10009 || keyCode === 461 || keyCode === 27) { // Backspace, Return, Back, ESC
        onBack();
        return;
      }

      if (focusArea === 'actions') {
        handleActionsNavigation(keyCode);
      }
    };

    window.addEventListener('searchMovieDetailsNavigation', handleSearchMovieDetailsNavigation);
    return () => window.removeEventListener('searchMovieDetailsNavigation', handleSearchMovieDetailsNavigation);
  }, [isActive, focusArea, handleActionsNavigation, onBack]);

  // Listener global de fallback (igual ao MovieDetailsPage)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event) => {
      const { keyCode } = event;

      if (keyCode === 8 || keyCode === 10009 || keyCode === 461 || keyCode === 27) {
        onBack();
        return;
      }

      if (focusArea === 'actions') {
        handleActionsNavigation(keyCode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, focusArea, handleActionsNavigation, onBack]);

  // Atualizar foco visual
  useEffect(() => {
    if (!isActive) return;

    document.querySelectorAll('.search-movie-details-btn').forEach(btn => {
      btn.classList.remove('focused');
    });

    const focusedBtn = document.querySelector(`.search-movie-details-btn.${focusedElement}-btn`);
    if (focusedBtn) {
      focusedBtn.classList.add('focused');
    }
  }, [focusedElement, isActive]);

  if (!isActive || !movie) return null;

  return (
    <div className="search-movie-details-page">
      <div className="search-movie-main-layout">
        <div className="search-movie-info-panel">
          <div className="search-movie-header-info">
            <img
              src="/images/logo-provider.png"
              alt="Provider Logo"
              className="search-movie-provider-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />

            <div className="search-movie-badge">
              Filme Encontrado na Pesquisa
            </div>

            <h1 className="search-movie-title-main">{movie.name}</h1>

            <div className="search-movie-meta-info">
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

          <div className="search-movie-synopsis">
            <p className="synopsis-text expanded">
              {movie.plot || 'Descrição não disponível para este filme.'}
            </p>
          </div>

          <div className="search-movie-actions">
            <button
              className={`search-movie-details-btn primary-action-btn play-btn ${focusArea === 'actions' && focusedElement === 'play' ? 'focused' : ''}`}
              onClick={playMovie}
              ref={(el) => (actionButtonsRef.current[0] = el)}
            >
              <i className="fas fa-play"></i>
              <span>Assistir Filme</span>
            </button>

            <button
              className={`search-movie-details-btn secondary-action-btn favorite-btn ${focusArea === 'actions' && focusedElement === 'favorite' ? 'focused' : ''}`}
              onClick={toggleFavorite}
              ref={(el) => (actionButtonsRef.current[1] = el)}
            >
              <i className={`fas ${isFavorite ? 'fa-heart' : 'fa-plus'}`}></i>
              <span>
                {isFavorite ? 'Na Minha Lista' : 'Minha Lista'}
              </span>
            </button>
          </div>
        </div>

        <div className="search-movie-promotional-art">
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

export default SearchMovieDetailsPage; 