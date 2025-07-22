import React, { useState, useEffect, useCallback } from 'react';
import { buildStreamUrl } from '../config/apiConfig';
import './SearchPreview.css';

const SearchPreview = ({ item, type, isActive, onBack }) => {
  const [focusedElement, setFocusedElement] = useState('play');
  const [isFavorite, setIsFavorite] = useState(false);

  // Detectar ambiente Tizen TV
  const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const handleAction = useCallback((action) => {
    switch (action) {
      case 'play':
        console.log('🎬 Reproduzindo item da pesquisa:', item, 'Tipo:', type);
        console.log('🔧 Ambiente detectado:', { isTizenTV, isDevelopment });
        
        let streamUrl = '';
        let streamInfo = {};

        // Construir URL e informações baseado no tipo
        if (type === 'movie') {
          streamUrl = buildStreamUrl('movie', item.stream_id, 'mp4');
          streamInfo = {
            name: item.name,
            type: 'movie',
            category: 'Filme',
            description: item.plot || `Filme - ${item.name}`,
            year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : null,
            rating: item.rating,
            poster: item.stream_icon || item.cover
          };
        }

        const playEvent = new CustomEvent('playContent', {
          detail: { streamUrl, streamInfo }
        });

        console.log('📺 Disparando evento playContent para item da pesquisa...');
        window.dispatchEvent(playEvent);
        
        // Fechar o modal após reproduzir
        onBack();
        break;
      
      case 'favorite':
        setIsFavorite(!isFavorite);
        break;
      
      case 'back':
        onBack();
        break;
      
      default:
        break;
    }
  }, [item, type, isTizenTV, isDevelopment, isFavorite, onBack]);

  // Sistema de navegação por controle remoto
  useEffect(() => {
    if (!isActive) return;

    const handleSearchPreviewNavigation = (event) => {
      const { keyCode } = event.detail;
      
      if (keyCode === 37) { // Esquerda
        setFocusedElement(prev => prev === 'favorite' ? 'play' : 'play');
      } else if (keyCode === 39) { // Direita
        setFocusedElement(prev => prev === 'play' ? 'favorite' : 'favorite');
      } else if (keyCode === 13) { // OK
        handleAction(focusedElement);
      } else if (keyCode === 10009 || keyCode === 8 || keyCode === 461) { // Voltar (Back, Backspace, ou Return)
        handleAction('back');
      }
    };

    window.addEventListener('searchPreviewNavigation', handleSearchPreviewNavigation);
    return () => window.removeEventListener('searchPreviewNavigation', handleSearchPreviewNavigation);
  }, [isActive, focusedElement, handleAction]);

  // Atualizar foco visual
  useEffect(() => {
    if (!isActive) return;

    // Remover foco de todos os botões
    document.querySelectorAll('.search-preview-btn').forEach(btn => {
      btn.classList.remove('focused');
    });

    // Adicionar foco ao elemento atual
    const focusedBtn = document.querySelector(`.search-preview-btn.${focusedElement}-btn`);
    if (focusedBtn) {
      focusedBtn.classList.add('focused');
    }
  }, [focusedElement, isActive]);

  if (!isActive || !item) return null;

  // Determinar o tipo de conteúdo para exibição
  const contentType = type === 'movie' ? 'Filme' : 'Conteúdo';
  const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : item.year || item.releasedate || 'N/A';
  const rating = item.rating || 'N/A';
  const description = item.plot || item.description || `${contentType} - ${item.name}`;

  return (
    <div className="search-preview-overlay">
      <div className="search-preview-modal">
        <div className="search-preview-content">
          {/* Poster/Imagem */}
          <div className="search-preview-poster">
            {(item.stream_icon || item.cover) && (
              <img
                src={item.stream_icon || item.cover}
                alt={item.name}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
          </div>

          {/* Informações */}
          <div className="search-preview-info">
            <div className="search-preview-header">
              <h1 className="search-preview-title">{item.name}</h1>
              <span className="search-preview-type">{contentType}</span>
            </div>

            <div className="search-preview-meta">
              {year !== 'N/A' && <span className="search-preview-year">{year}</span>}
              {rating !== 'N/A' && <span className="search-preview-rating">★ {rating}</span>}
            </div>

            <div className="search-preview-description">
              <p>{description}</p>
            </div>

            {/* Botões de Ação */}
            <div className="search-preview-actions">
              <button 
                className={`search-preview-btn play-btn ${focusedElement === 'play' ? 'focused' : ''}`}
                onClick={() => handleAction('play')}
              >
                <i className="fas fa-play"></i>
                Reproduzir
              </button>
              
              <button 
                className={`search-preview-btn favorite-btn ${focusedElement === 'favorite' ? 'focused' : ''}`}
                onClick={() => handleAction('favorite')}
              >
                <i className={`fas ${isFavorite ? 'fa-heart' : 'fa-plus'}`}></i>
                {isFavorite ? 'Remover' : 'Favoritar'}
              </button>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPreview;