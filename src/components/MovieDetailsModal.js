import React, { useState, useEffect, useCallback } from 'react';
import { buildStreamUrl } from '../config/apiConfig';
import './MovieDetailsModal.css';

const MovieDetailsModal = ({ movie, isActive, onBack }) => {
  const [focusedElement, setFocusedElement] = useState('play');
  const [isFavorite, setIsFavorite] = useState(false);
  const [focusArea, setFocusArea] = useState('actions');

  // Detectar ambiente Tizen TV
  const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const handleAction = useCallback((action) => {
    switch (action) {
      case 'play':
        console.log('🎬 Reproduzindo filme:', movie);
        console.log('🔧 Ambiente detectado:', { isTizenTV, isDevelopment });

        // Construir a URL de stream correta para filmes (usar stream_url no modo teste)
        const isTestMode = localStorage.getItem('testMode') === 'true';
        const streamUrl = isTestMode && movie.stream_url
          ? movie.stream_url
          : buildStreamUrl('movie', movie.stream_id, 'mp4');

        // Para Tizen TV, usar configuração específica
        if (isTizenTV) {
          console.log('📺 Configuração Tizen TV ativada para filme');

          const playEvent = new CustomEvent('playContent', {
            detail: {
              streamUrl,
              streamInfo: {
                name: movie.name,
                stream_id: movie.stream_id, // CRUCIAL: ID do filme
                id: movie.id || movie.stream_id,
                type: 'movie',
                category: movie.category_name || 'Filme',
                description: movie.plot || 'Descrição não disponível',
                year: movie.releasedate || 'N/A',
                releasedate: movie.releasedate,
                rating: movie.rating || 'N/A',
                genre: movie.genre,
                poster: movie.stream_icon,
                stream_icon: movie.stream_icon,
                cover: movie.cover,
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
            detail: {
              streamUrl,
              streamInfo: {
                name: movie.name,
                stream_id: movie.stream_id, // CRUCIAL: ID do filme
                id: movie.id || movie.stream_id,
                type: 'movie',
                category: movie.category_name || 'Filme',
                description: movie.plot || 'Descrição não disponível',
                year: movie.releasedate || 'N/A',
                releasedate: movie.releasedate,
                rating: movie.rating || 'N/A',
                genre: movie.genre,
                poster: movie.stream_icon,
                stream_icon: movie.stream_icon,
                cover: movie.cover
              }
            }
          });

          window.dispatchEvent(playEvent);
        }
        break;

      case 'favorite':
        toggleFavorite();
        break;

      default:
        break;
    }
  }, [movie, isTizenTV, isDevelopment]);

  const toggleFavorite = useCallback(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const movieKey = `movie_${movie.stream_id}`;

    if (favorites[movieKey]) {
      delete favorites[movieKey];
      setIsFavorite(false);
    } else {
      favorites[movieKey] = {
        ...movie,
        type: 'movie',
        addedAt: new Date().toISOString()
      };
      setIsFavorite(true);
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [movie]);

  // Navegação das ações (botões Play/Favoritos)
  const handleActionsNavigation = useCallback((keyCode) => {
    if (keyCode === 37) { // Esquerda
      setFocusedElement(focusedElement === 'play' ? 'favorite' : 'play');
    } else if (keyCode === 39) { // Direita
      setFocusedElement(focusedElement === 'play' ? 'favorite' : 'play');
    } else if (keyCode === 13) { // Enter - executar ação
      handleAction(focusedElement);
    }
  }, [focusedElement, handleAction]);

  // Inicialização
  useEffect(() => {
    if (!isActive || !movie) return;

    // Reset do estado quando o modal fica ativo
    setFocusedElement('play');
    setFocusArea('actions');

    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const movieKey = `movie_${movie.stream_id}`;
    setIsFavorite(!!favorites[movieKey]);
  }, [isActive, movie]);

  // Sistema de navegação por controle remoto - seguindo padrão do SeriesDetailsPage
  useEffect(() => {
    if (!isActive) return;

    const handleMovieDetailsNavigation = (event) => {
      const { keyCode } = event.detail;

      // Tratar tecla de voltar seguindo o padrão do SeriesDetailsPage
      if (keyCode === 8 || keyCode === 10009 || keyCode === 461 || keyCode === 27) { // Backspace, Return, Back, ESC
        console.log('🎬 MovieDetailsModal - Tecla de voltar detectada:', keyCode);
        onBack();
        return;
      }

      // Delegar navegação baseada na área de foco
      if (focusArea === 'actions') {
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

  if (!isActive || !movie) return null;

  return (
    <div className="movie-details-modal-overlay">
      <div className="movie-details-modal">
        <div className="movie-modal-content">
          <div className="movie-modal-info">
            <div className="movie-modal-header">
              <img
                src="/images/logo-provider.png"
                alt="Provider Logo"
                className="movie-modal-provider-logo"
                onError={(e) => { e.target.style.display = 'none'; }}
              />

              <div className="movie-modal-badge">
                Filme em Destaque
              </div>

              <h1 className="movie-modal-title">{movie.name}</h1>
            </div>

            <div className="movie-modal-synopsis">
              <p className="synopsis-text">
                {movie.plot || 'Descrição não disponível para este filme.'}
              </p>
            </div>

            <div className="movie-modal-genres">
              <div className="genre-tag">{movie.category_name || 'Filme'}</div>
              <div className="genre-tag">HD</div>
              <div className="genre-tag">Legendado</div>
            </div>

            <div className="movie-modal-actions">
              <button
                className={`primary-action-btn ${focusArea === 'actions' && focusedElement === 'play' ? 'focused' : ''}`}
                onClick={() => handleAction('play')}
              >
                <i className="fas fa-play"></i>
                <span>Assistir Filme</span>
              </button>

              <button
                className={`secondary-action-btn ${focusArea === 'actions' && focusedElement === 'favorite' ? 'focused' : ''}`}
                onClick={() => handleAction('favorite')}
              >
                <i className={`fas ${isFavorite ? 'fa-heart' : 'fa-plus'}`}></i>
                <span>{isFavorite ? 'Na Minha Lista' : 'Minha Lista'}</span>
              </button>
            </div>
          </div>

          <div className="movie-modal-poster">
            <img
              src={movie.stream_icon || '/images/placeholder-movie.jpg'}
              alt={movie.name}
              className="poster-image"
              loading="lazy"
              onError={(e) => {
                e.target.src = '/images/placeholder-movie.jpg';
              }}
            />
            <div className="poster-overlay"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetailsModal; 