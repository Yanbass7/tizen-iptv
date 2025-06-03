import React, { useState, useEffect } from 'react';
import { iptvApi } from '../services/iptvApi';
import './Home.css';

const Home = ({ onMenu, menuFocus, shelfFocus, itemFocus }) => {
  const [lancamentos, setLancamentos] = useState([]);
  const [telenovelas, setTelenovelas] = useState([]);
  const [classicos, setClassicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        
        const [lancamentosData, telenovelaData, classicosData] = await Promise.race([
          Promise.all([
            iptvApi.getLancamentos(),
            iptvApi.getTelenovelas(),
            iptvApi.getClassicos()
          ]),
          timeout
        ]);

        // Limitar a 10 itens por prateleira para performance
        setLancamentos(Array.isArray(lancamentosData) ? lancamentosData.slice(0, 10) : []);
        setTelenovelas(Array.isArray(telenovelaData) ? telenovelaData.slice(0, 10) : []);
        setClassicos(Array.isArray(classicosData) ? classicosData.slice(0, 10) : []);
        
      } catch (error) {
        console.error('Erro ao carregar dados do home:', error);
        setError('Erro ao carregar conteúdo. Tente novamente.');
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
      title: 'Filmes Lançamentos', 
      items: lancamentos, 
      type: 'movie',
      emptyMessage: 'Nenhum lançamento disponível'
    },
    { 
      title: 'Telenovelas', 
      items: telenovelas, 
      type: 'series',
      emptyMessage: 'Nenhuma telenovela disponível'
    },
    { 
      title: 'Clássicos do Cinema', 
      items: classicos, 
      type: 'movie',
      emptyMessage: 'Nenhum clássico disponível'
    }
  ];

  const handleItemClick = (item, type) => {
    console.log('Item selecionado:', item, 'Tipo:', type);
    
    // Disparar evento customizado para o App.js processar
    const playEvent = new CustomEvent('playContent', {
      detail: {
        streamUrl: type === 'series' 
          ? `https://rota66.bar/series/${item.series_id}/${item.season || 1}/${item.episode || 1}.m3u8`
          : `https://rota66.bar/movie/${item.stream_id}.m3u8`,
        streamInfo: {
          name: item.name,
          type: type,
          poster: item.stream_icon || item.cover,
          ...item
        }
      }
    });
    window.dispatchEvent(playEvent);
  };

  const handleItemPreview = (item, type) => {
    console.log('Preview do item:', item, 'Tipo:', type);
    
    if (type === 'series') {
      // Para séries, mostrar página de detalhes
      const seriesDetailsEvent = new CustomEvent('showSeriesDetails', {
        detail: {
          seriesData: item
        }
      });
      window.dispatchEvent(seriesDetailsEvent);
    } else {
      // Para filmes, pode implementar modal de preview no futuro
      console.log('Preview de filme não implementado ainda');
    }
  };

  // Estado de loading otimizado para TV
  if (loading) {
    return (
      <div className="home-loading">
        <div className="loading-spinner">
          <i className="fa-solid fa-spinner fa-spin"></i>
        </div>
        <p className="loading-text">Carregando conteúdo...</p>
      </div>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <div className="home-error">
        <div className="error-icon">
          <i className="fa-solid fa-exclamation-triangle"></i>
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
    );
  }

  return (
    <div className="home-container">
      {/* Banner principal otimizado */}
      <section className="home-hero">
        <div className="hero-background">
          <img 
            src="/images/banner (1).jpg" 
            alt="Banner Principal" 
            className="hero-bg-image"
            loading="lazy"
          />
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-content">
          <img 
            src="/images/BIGTV-transparente.png" 
            alt="BIGTV Logo" 
            className="hero-logo"
            loading="lazy"
          />
          <h1 className="hero-title">Seu entretenimento completo</h1>
          <p className="hero-description">
            Acesse milhares de filmes, séries, canais ao vivo e muito mais.
            Entretenimento de qualidade na palma da sua mão.
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">{lancamentos.length + classicos.length}</span>
              <span className="stat-label">Filmes</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{telenovelas.length}</span>
              <span className="stat-label">Séries</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">100+</span>
              <span className="stat-label">Canais</span>
            </div>
          </div>
        </div>
      </section>

      {/* Prateleiras de conteúdo otimizadas */}
      <section className="home-shelves">
        {shelves.map((shelf, shelfIndex) => (
          <div key={shelf.title} className="shelf">
            <h2 className="shelf-title">{shelf.title}</h2>
            <div className="shelf-items">
              {shelf.items.length > 0 ? (
                shelf.items.map((item, itemIndex) => (
                  <div
                    key={item.stream_id || item.series_id || itemIndex}
                    className={`shelf-item ${
                      !onMenu && shelfFocus === shelfIndex && itemFocus === itemIndex 
                        ? 'focused' 
                        : ''
                    }`}
                    onClick={() => handleItemClick(item, shelf.type)}
                  >
                    <div className="item-poster">
                      <img
                        src={item.stream_icon || item.cover || '/images/BIGTV-transparente.png'}
                        alt={item.name}
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = '/images/BIGTV-transparente.png';
                        }}
                      />
                      <div className="item-overlay">
                        <div className="overlay-content">
                          <i className="fa-solid fa-play play-icon"></i>
                          <span className="play-text">Reproduzir</span>
                        </div>
                      </div>
                    </div>
                    <div className="item-info">
                      <h3 className="item-title">{item.name}</h3>
                      {item.rating && (
                        <div className="item-rating">
                          <i className="fa-solid fa-star"></i>
                          <span>{item.rating}</span>
                        </div>
                      )}
                      {shelf.type === 'series' && item.episode_run_time && (
                        <div className="item-duration">
                          <i className="fa-solid fa-clock"></i>
                          <span>{item.episode_run_time} min</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Indicadores de ação para controle remoto */}
                    {!onMenu && shelfFocus === shelfIndex && itemFocus === itemIndex && (
                      <div className="item-actions">
                        <div className="action-hint">
                          <span className="key-hint">OK</span>
                          <span>Reproduzir</span>
                        </div>
                        {shelf.type === 'series' && (
                          <div className="action-hint">
                            <span className="key-hint">INFO</span>
                            <span>Detalhes</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="shelf-empty">
                  <div className="empty-icon">
                    <i className="fa-solid fa-film"></i>
                  </div>
                  <p className="empty-message">{shelf.emptyMessage}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Instruções de navegação para TV */}
      <section className="home-instructions">
        <div className="instructions-content">
          <h3 className="instructions-title">Como navegar</h3>
          <div className="instructions-grid">
            <div className="instruction-item">
              <i className="fa-solid fa-arrows-alt"></i>
              <span>Use as setas para navegar</span>
            </div>
            <div className="instruction-item">
              <i className="fa-solid fa-check-circle"></i>
              <span>OK para reproduzir</span>
            </div>
            <div className="instruction-item">
              <i className="fa-solid fa-arrow-left"></i>
              <span>Voltar para acessar menu</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 