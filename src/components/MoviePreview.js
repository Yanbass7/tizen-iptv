import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './MoviePreview.css';

const MoviePreview = ({ movie, isVisible, onClose }) => {
  const [focusedElement, setFocusedElement] = useState('play');
  const [isFavorite, setIsFavorite] = useState(false);

  // Detectar ambiente Tizen TV
  const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Memoizar array de elementos navegáveis para evitar re-criações
  const navigableElements = useMemo(() => ['play', 'favorite', 'close'], []);

  const handleAction = useCallback((action) => {
    switch (action) {
      case 'play':
        console.log('🎬 Reproduzindo filme do preview:', movie);
        console.log('🔧 Ambiente detectado:', { isTizenTV, isDevelopment });
        
        // Para Tizen TV, usar configuração específica que força player interno
        if (isTizenTV) {
          console.log('📺 Configuração Tizen TV ativada para filme (preview)');
          
          // Evento personalizado com configurações específicas para TV
          const playEvent = new CustomEvent('playContent', {
            detail: {
              streamUrl: `https://rota66.bar/zBB82J/AMeDHq/${movie.stream_id}`,
              streamInfo: {
                name: movie.name,
                type: 'movie',
                category: movie.category_name || 'Filme',
                description: movie.plot || 'Descrição não disponível',
                year: movie.releasedate || 'N/A',
                rating: movie.rating || 'N/A',
                poster: movie.stream_icon,
                // Flags específicas para Tizen TV
                forceTizenPlayer: true,
                preventBrowserRedirect: true,
                useInternalPlayer: true
              }
            },
            bubbles: false, // Não permitir propagação que pode causar redirect
            cancelable: false // Não permitir cancelamento por outros handlers
          });
          
          // Prevenir qualquer comportamento padrão que possa causar redirect
          setTimeout(() => {
            console.log('📺 Disparando evento playContent para Tizen TV (filme preview)');
            window.dispatchEvent(playEvent);
          }, 100); // Pequeno delay para garantir que o evento seja tratado corretamente
          
        } else {
          // Para outros ambientes, usar o comportamento padrão
          console.log('💻 Configuração padrão ativada para filme (preview)');
          
          // Disparar evento para reproduzir filme
          const playEvent = new CustomEvent('playContent', {
            detail: {
              streamUrl: `https://rota66.bar/zBB82J/AMeDHq/${movie.stream_id}`,
              streamInfo: {
                name: movie.name,
                type: 'movie',
                category: movie.category_name || 'Filme',
                description: movie.plot || 'Descrição não disponível',
                year: movie.releasedate || 'N/A',
                rating: movie.rating || 'N/A',
                poster: movie.stream_icon
              }
            }
          });
          window.dispatchEvent(playEvent);
        }
        onClose();
        break;
      
      case 'favorite':
        toggleFavorite();
        break;
      
      case 'close':
        onClose();
        break;
      
      default:
        break;
    }
  }, [movie, onClose, isTizenTV, isDevelopment]);

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

  const handleKeyDown = useCallback((event) => {
    if (!isVisible) return;

    const currentIndex = navigableElements.indexOf(focusedElement);

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : navigableElements.length - 1;
        setFocusedElement(navigableElements[prevIndex]);
        break;
      
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = currentIndex < navigableElements.length - 1 ? currentIndex + 1 : 0;
        setFocusedElement(navigableElements[nextIndex]);
        break;
      
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleAction(focusedElement);
        break;
      
      case 'Escape':
      case 'Backspace':
        event.preventDefault();
        onClose();
        break;
      
      default:
        break;
    }
  }, [focusedElement, isVisible, onClose, handleAction, navigableElements, toggleFavorite]);

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      setFocusedElement('play'); // Reset focus ao abrir
      
      // Verificar se é favorito
      const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
      const movieKey = `movie_${movie.stream_id}`;
      setIsFavorite(!!favorites[movieKey]);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, handleKeyDown, movie]);

  if (!isVisible || !movie) return null;

  return (
    <div className="movie-preview-overlay">
      <div className="movie-preview-modal">
        <div className="movie-preview-content">
          <div className="movie-poster-section">
            <img 
              src={movie.stream_icon || '/images/placeholder-movie.jpg'} 
              alt={movie.name}
              className="movie-poster-large"
              onError={(e) => {
                e.target.src = '/images/placeholder-movie.jpg';
              }}
            />
          </div>
          
          <div className="movie-info-section">
            <h1 className="movie-title">{movie.name}</h1>
            
            <div className="movie-metadata">
              <span className="movie-year">{movie.releasedate || 'N/A'}</span>
              <span className="movie-separator">•</span>
              <span className="movie-rating">⭐ {movie.rating || 'N/A'}</span>
              <span className="movie-separator">•</span>
              <span className="movie-genre">{movie.category_name || 'Filme'}</span>
            </div>
            
            <div className="movie-description">
              <p>{movie.plot || 'Descrição não disponível para este filme.'}</p>
            </div>
            
            <div className="movie-actions">
              <button 
                className={`action-btn play-btn ${focusedElement === 'play' ? 'focused' : ''}`}
                onClick={() => handleAction('play')}
              >
                <i className="fas fa-play"></i>
                Reproduzir
              </button>
              
              <button 
                className={`action-btn favorite-btn ${focusedElement === 'favorite' ? 'focused' : ''} ${isFavorite ? 'favorited' : ''}`}
                onClick={() => handleAction('favorite')}
              >
                <i className={`fas ${isFavorite ? 'fa-heart' : 'fa-heart-o'}`}></i>
                {isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
              </button>
              
              <button 
                className={`action-btn close-btn ${focusedElement === 'close' ? 'focused' : ''}`}
                onClick={() => handleAction('close')}
              >
                <i className="fas fa-times"></i>
                Fechar
              </button>
            </div>
          </div>
        </div>
        
        <div className="modal-help">
          <span>← → Navegar</span>
          <span>ENTER Selecionar</span>
          <span>VOLTAR Fechar</span>
        </div>
      </div>
    </div>
  );
};

export default MoviePreview; 