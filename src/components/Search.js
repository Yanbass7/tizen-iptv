import React, { useState, useEffect, useRef, useCallback } from 'react';
import { safeScrollIntoView } from '../utils/scrollUtils';
import './Search.css';

const Search = ({ isActive }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    channels: [],
    movies: [],
    series: []
  });
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('keyboard'); // 'keyboard', 'results'
  const [selectedKey, setSelectedKey] = useState({ row: 0, col: 0 });
  const [resultFocus, setResultFocus] = useState({ section: 'channels', index: 0 });

  // Referencias para navegação
  const keyboardRef = useRef(null);
  const resultsRef = useRef({
    channels: [],
    movies: [],
    series: []
  });

  const API_BASE_URL = 'https://rota66.bar/player_api.php';
  const API_CREDENTIALS = 'username=zBB82J&password=AMeDHq';

  // Layout do teclado virtual
  const keyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '⌫'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '🔍'],
    ['ESPAÇO', 'LIMPAR']
  ];

  // Sistema de navegação por controle remoto
  useEffect(() => {
    if (!isActive) return;

    const handleSearchNavigation = (event) => {
      const { keyCode } = event.detail;
      
      if (activeSection === 'keyboard') {
        handleKeyboardNavigation(keyCode);
      } else if (activeSection === 'results') {
        handleResultsNavigation(keyCode);
      }
    };

    window.addEventListener('searchNavigation', handleSearchNavigation);
    return () => window.removeEventListener('searchNavigation', handleSearchNavigation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, activeSection, selectedKey, resultFocus, searchResults]);

  // Atualizar foco visual
  const updateFocusVisual = useCallback(() => {
    // Remover foco de todos os elementos
    document.querySelectorAll('.keyboard-key, .search-result-item').forEach(el => {
      el.classList.remove('focused');
    });

    if (activeSection === 'keyboard') {
      const keyboardKeys = document.querySelectorAll('.keyboard-key');
      const keyIndex = selectedKey.row * 10 + selectedKey.col; // Aproximação
      if (keyboardKeys[keyIndex]) {
        keyboardKeys[keyIndex].classList.add('focused');
      }
    } else if (activeSection === 'results') {
      const sectionResults = resultsRef.current[resultFocus.section];
      if (sectionResults && sectionResults[resultFocus.index]) {
        sectionResults[resultFocus.index].classList.add('focused');
        sectionResults[resultFocus.index].scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }
    }
  }, [activeSection, selectedKey, resultFocus]);

  useEffect(() => {
    updateFocusVisual();
  }, [updateFocusVisual]);

  const handleKeyboardNavigation = (keyCode) => {
    const maxRows = keyboardLayout.length;
    const currentRow = selectedKey.row;
    const currentCol = selectedKey.col;
    const maxCols = keyboardLayout[currentRow].length;

    if (keyCode === 38) { // Cima
      if (currentRow > 0) {
        const newRow = currentRow - 1;
        const newMaxCols = keyboardLayout[newRow].length;
        setSelectedKey({
          row: newRow,
          col: Math.min(currentCol, newMaxCols - 1)
        });
      }
    } else if (keyCode === 40) { // Baixo
      if (currentRow < maxRows - 1) {
        const newRow = currentRow + 1;
        const newMaxCols = keyboardLayout[newRow].length;
        setSelectedKey({
          row: newRow,
          col: Math.min(currentCol, newMaxCols - 1)
        });
      } else if (searchResults.channels.length > 0 || searchResults.movies.length > 0 || searchResults.series.length > 0) {
        // Ir para resultados se existirem
        setActiveSection('results');
        setResultFocus({ section: 'channels', index: 0 });
      }
    } else if (keyCode === 37) { // Esquerda
      if (currentCol > 0) {
        setSelectedKey(prev => ({ ...prev, col: prev.col - 1 }));
      }
    } else if (keyCode === 39) { // Direita
      if (currentCol < maxCols - 1) {
        setSelectedKey(prev => ({ ...prev, col: prev.col + 1 }));
      }
    } else if (keyCode === 13) { // OK - pressionar tecla
      const selectedKeyValue = keyboardLayout[currentRow][currentCol];
      handleKeyPress(selectedKeyValue);
    }
  };

  const handleResultsNavigation = (keyCode) => {
    const sections = ['channels', 'movies', 'series'];
    const currentSectionIndex = sections.indexOf(resultFocus.section);
    const currentResults = searchResults[resultFocus.section];
    const itemsPerRow = 5; // Aproximação para o grid

    if (keyCode === 38) { // Cima
      if (resultFocus.index >= itemsPerRow) {
        setResultFocus(prev => ({ ...prev, index: prev.index - itemsPerRow }));
      } else {
        // Ir para seção anterior ou voltar ao teclado
        if (currentSectionIndex > 0) {
          const prevSection = sections[currentSectionIndex - 1];
          const prevSectionLength = searchResults[prevSection].length;
          if (prevSectionLength > 0) {
            setResultFocus({ 
              section: prevSection, 
              index: Math.max(0, prevSectionLength - 1) 
            });
          }
        } else {
          setActiveSection('keyboard');
        }
      }
    } else if (keyCode === 40) { // Baixo
      if (resultFocus.index + itemsPerRow < currentResults.length) {
        setResultFocus(prev => ({ ...prev, index: prev.index + itemsPerRow }));
      } else {
        // Ir para próxima seção
        if (currentSectionIndex < sections.length - 1) {
          const nextSection = sections[currentSectionIndex + 1];
          if (searchResults[nextSection].length > 0) {
            setResultFocus({ section: nextSection, index: 0 });
          }
        }
      }
    } else if (keyCode === 37) { // Esquerda
      if (resultFocus.index > 0) {
        setResultFocus(prev => ({ ...prev, index: prev.index - 1 }));
      }
    } else if (keyCode === 39) { // Direita
      if (resultFocus.index < currentResults.length - 1) {
        setResultFocus(prev => ({ ...prev, index: prev.index + 1 }));
      }
    } else if (keyCode === 13) { // OK - selecionar resultado
      const selectedItem = currentResults[resultFocus.index];
      handleResultClick(selectedItem, resultFocus.section);
    }
  };

  const handleKeyPress = (key) => {
    if (key === '⌫') {
      // Backspace
      setSearchQuery(prev => prev.slice(0, -1));
    } else if (key === '🔍') {
      // Buscar
      if (searchQuery.trim()) {
        performSearch();
      }
    } else if (key === 'LIMPAR') {
      // Limpar tudo
      setSearchQuery('');
      setSearchResults({ channels: [], movies: [], series: [] });
    } else if (key === 'ESPAÇO') {
      // Espaço
      setSearchQuery(prev => prev + ' ');
    } else {
      // Caractere normal
      setSearchQuery(prev => prev + key);
    }

    // Buscar automaticamente quando digitar (debounce)
    if (key !== '🔍' && key !== 'LIMPAR') {
      setTimeout(() => {
        if (searchQuery.trim().length >= 2) {
          performSearch();
        }
      }, 500);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // Buscar em paralelo em todas as categorias
      const [channelsData, moviesData, seriesData] = await Promise.all([
        fetchAllChannels(),
        fetchAllMovies(),
        fetchAllSeries()
      ]);

      // Filtrar resultados pelo termo de busca
      const query = searchQuery.toLowerCase();
      
      const filteredChannels = channelsData.filter(channel => 
        channel.name && channel.name.toLowerCase().includes(query)
      ).slice(0, 20); // Limitar a 20 resultados

      const filteredMovies = moviesData.filter(movie => 
        movie.name && movie.name.toLowerCase().includes(query)
      ).slice(0, 20);

      const filteredSeries = seriesData.filter(serie => 
        serie.name && serie.name.toLowerCase().includes(query)
      ).slice(0, 20);

      setSearchResults({
        channels: filteredChannels,
        movies: filteredMovies,
        series: filteredSeries
      });

      // Se há resultados, mover foco para a primeira seção com resultados
      if (filteredChannels.length > 0) {
        setActiveSection('results');
        setResultFocus({ section: 'channels', index: 0 });
      } else if (filteredMovies.length > 0) {
        setActiveSection('results');
        setResultFocus({ section: 'movies', index: 0 });
      } else if (filteredSeries.length > 0) {
        setActiveSection('results');
        setResultFocus({ section: 'series', index: 0 });
      }

    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllChannels = async () => {
    try {
      // Buscar todas as categorias de canais
      const categoriesResponse = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_live_categories`
      );
      const categories = await categoriesResponse.json();
      
      // Buscar canais de todas as categorias
      const channelsPromises = categories.slice(0, 5).map(category => // Limitar a 5 categorias para performance
        fetch(`${API_BASE_URL}?${API_CREDENTIALS}&action=get_live_streams&category_id=${category.category_id}`)
          .then(res => res.json())
          .catch(() => [])
      );
      
      const channelsArrays = await Promise.all(channelsPromises);
      return channelsArrays.flat();
    } catch (error) {
      console.error('Erro ao buscar canais:', error);
      return [];
    }
  };

  const fetchAllMovies = async () => {
    try {
      // Buscar algumas categorias principais de filmes
      const categoriesResponse = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_vod_categories`
      );
      const categories = await categoriesResponse.json();
      
      const moviesPromises = categories.slice(0, 3).map(category => // Limitar a 3 categorias para performance
        fetch(`${API_BASE_URL}?${API_CREDENTIALS}&action=get_vod_streams&category_id=${category.category_id}`)
          .then(res => res.json())
          .catch(() => [])
      );
      
      const moviesArrays = await Promise.all(moviesPromises);
      return moviesArrays.flat();
    } catch (error) {
      console.error('Erro ao buscar filmes:', error);
      return [];
    }
  };

  const fetchAllSeries = async () => {
    try {
      // Buscar algumas categorias principais de séries
      const categoriesResponse = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_series_categories`
      );
      const categories = await categoriesResponse.json();
      
      const seriesPromises = categories.slice(0, 3).map(category => // Limitar a 3 categorias para performance
        fetch(`${API_BASE_URL}?${API_CREDENTIALS}&action=get_series&category_id=${category.category_id}`)
          .then(res => res.json())
          .catch(() => [])
      );
      
      const seriesArrays = await Promise.all(seriesPromises);
      return seriesArrays.flat();
    } catch (error) {
      console.error('Erro ao buscar séries:', error);
      return [];
    }
  };

  const handleResultClick = (item, type) => {
    console.log('Item selecionado:', { item, type });
    
    let streamUrl = '';
    let streamInfo = {};

    // Construir URL e informações baseado no tipo (estrutura correta da API)
    switch (type) {
      case 'channel':
        streamUrl = `https://rota66.bar/${API_CREDENTIALS.split('&')[0].split('=')[1]}/${API_CREDENTIALS.split('&')[1].split('=')[1]}/${item.stream_id}`;
        streamInfo = {
          name: item.name,
          category: 'Canal',
          description: `Canal ao vivo - ${item.name}`,
          type: 'live'
        };
        break;
        
      case 'movie':
        streamUrl = `https://rota66.bar/${API_CREDENTIALS.split('&')[0].split('=')[1]}/${API_CREDENTIALS.split('&')[1].split('=')[1]}/${item.stream_id}`;
        streamInfo = {
          name: item.name,
          category: 'Filme',
          description: item.plot || `Filme - ${item.name}`,
          year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : null,
          rating: item.rating,
          type: 'movie'
        };
        break;
        
      case 'serie':
        // Para séries da busca, usar URL genérica (estrutura correta)
        streamUrl = `https://rota66.bar/${API_CREDENTIALS.split('&')[0].split('=')[1]}/${API_CREDENTIALS.split('&')[1].split('=')[1]}/${item.series_id}`;
        streamInfo = {
          name: item.name,
          category: 'Série',
          description: item.plot || `Série - ${item.name}`,
          year: item.year,
          rating: item.rating,
          type: 'series'
        };
        break;
        
      default:
        console.error('Tipo de conteúdo não reconhecido:', type);
        return;
    }

    // Disparar evento para reproduzir no VideoPlayer
    const playEvent = new CustomEvent('playContent', {
      detail: { streamUrl, streamInfo }
    });
    window.dispatchEvent(playEvent);
  };

  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  // Efeito para auto-scroll baseado no foco
  useEffect(() => {
    if (resultFocus.section !== null && resultFocus.index !== null) {
      const sectionResults = resultsRef.current[resultFocus.section];
      if (sectionResults && sectionResults[resultFocus.index]) {
        sectionResults[resultFocus.index].classList.add('focused');
        safeScrollIntoView(sectionResults[resultFocus.index], {
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [resultFocus]);

  if (!isActive) return null;

  return (
    <div className="search-container">
      <div className="search-layout">
        {/* Área de busca e teclado */}
        <div className="search-input-area">
          <div className="search-header">
            <h2>🔍 Pesquisar</h2>
            <div className="search-input-display">
              <span className="search-query">{searchQuery}</span>
              <span className="cursor">|</span>
            </div>
          </div>

          {/* Teclado Virtual */}
          <div className="virtual-keyboard" ref={keyboardRef}>
            {keyboardLayout.map((row, rowIndex) => (
              <div key={rowIndex} className="keyboard-row">
                {row.map((key, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    className={`keyboard-key ${key.length > 1 ? 'special-key' : ''}`}
                    onClick={() => handleKeyPress(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Resultados da busca */}
        <div className="search-results">
          {loading && (
            <div className="loading">Buscando...</div>
          )}

          {!loading && searchQuery && (
            <>
              {/* Canais */}
              {searchResults.channels.length > 0 && (
                <div className="results-section">
                  <h3>📺 Canais ({searchResults.channels.length})</h3>
                  <div className="results-grid">
                    {searchResults.channels.map((channel, index) => (
                      <div
                        key={`channel-${channel.stream_id || index}`}
                        ref={el => resultsRef.current.channels[index] = el}
                        className="search-result-item channel-result"
                        onClick={() => handleResultClick(channel, 'channel')}
                      >
                        <img
                          src={channel.stream_icon}
                          alt={channel.name}
                          onError={handleImageError}
                        />
                        <div className="result-info">
                          <h4>{channel.name}</h4>
                          <span className="result-type">Canal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filmes */}
              {searchResults.movies.length > 0 && (
                <div className="results-section">
                  <h3>🎬 Filmes ({searchResults.movies.length})</h3>
                  <div className="results-grid">
                    {searchResults.movies.map((movie, index) => (
                      <div
                        key={`movie-${movie.stream_id || index}`}
                        ref={el => resultsRef.current.movies[index] = el}
                        className="search-result-item movie-result"
                        onClick={() => handleResultClick(movie, 'movie')}
                      >
                        <img
                          src={movie.stream_icon}
                          alt={movie.name}
                          onError={handleImageError}
                        />
                        <div className="result-info">
                          <h4>{movie.name}</h4>
                          <span className="result-type">Filme</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Séries */}
              {searchResults.series.length > 0 && (
                <div className="results-section">
                  <h3>📺 Séries ({searchResults.series.length})</h3>
                  <div className="results-grid">
                    {searchResults.series.map((serie, index) => (
                      <div
                        key={`serie-${serie.series_id || index}`}
                        ref={el => resultsRef.current.series[index] = el}
                        className="search-result-item serie-result"
                        onClick={() => handleResultClick(serie, 'serie')}
                      >
                        <img
                          src={serie.cover}
                          alt={serie.name}
                          onError={handleImageError}
                        />
                        <div className="result-info">
                          <h4>{serie.name}</h4>
                          <span className="result-type">Série</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nenhum resultado */}
              {searchResults.channels.length === 0 && 
               searchResults.movies.length === 0 && 
               searchResults.series.length === 0 && (
                <div className="no-results">
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <h3>Nenhum resultado encontrado</h3>
                  <p>Tente buscar com outras palavras-chave</p>
                </div>
              )}
            </>
          )}

          {!searchQuery && (
            <div className="search-placeholder">
              <i className="fa-solid fa-magnifying-glass"></i>
              <h3>Digite algo para pesquisar</h3>
              <p>Busque por canais, filmes ou séries</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search; 