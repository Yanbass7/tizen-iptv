import React, { useState, useEffect, useRef, useCallback } from 'react';
import { safeScrollIntoView } from '../utils/scrollUtils';
import { API_BASE_URL, API_CREDENTIALS } from '../config/apiConfig';
import './Search.css';

const Search = ({ isActive, onExitSearch }) => {
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

  // Layout do teclado virtual
  // FORMA RECOMENDADA de definir o keyboardLayout
  const keyboardLayout = [
    ['a', 'b', 'c', 'd', 'e', 'f'],
    ['g', 'h', 'i', 'j', 'k', 'l'],
    ['m', 'n', 'o', 'p', 'q', 'r'],
    ['s', 't', 'u', 'v', 'w', 'x'],
    ['y', 'z', '1', '2', '3', '4'],
    ['5', '6', '7', '8', '9', '0'],
    [
      { type: 'action', action: 'backspace', display: <i className="fas fa-backspace"></i> },
      { type: 'char', value: ' ', display: <i className="fas fa-minus"></i> }, // Tecla de espaço
      { type: 'action', action: 'clear', display: <i className="fas fa-trash-alt"></i> }
    ]
  ];

  const handleResultClick = useCallback((item, type) => {
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
  }, []);

  const fetchAllChannels = useCallback(async () => {
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
      return channelsArrays.reduce((acc, val) => acc.concat(val), []);
    } catch (error) {
      console.error('Erro ao buscar canais:', error);
      return [];
    }
  }, []);

  const fetchAllMovies = useCallback(async () => {
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
      return moviesArrays.reduce((acc, val) => acc.concat(val), []);
    } catch (error) {
      console.error('Erro ao buscar filmes:', error);
      return [];
    }
  }, []);

  const fetchAllSeries = useCallback(async () => {
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
      return seriesArrays.reduce((acc, val) => acc.concat(val), []);
    } catch (error) {
      console.error('Erro ao buscar séries:', error);
      return [];
    }
  }, []);

  const performSearch = useCallback(async () => {
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

      const filterAndSortResults = (data) => {
        const startsWith = data.filter(item =>
          item.name && item.name.toLowerCase().startsWith(query)
        );
        const includes = data.filter(item =>
          item.name && item.name.toLowerCase().includes(query) && !item.name.toLowerCase().startsWith(query)
        );
        return [...startsWith, ...includes].slice(0, 20);
      };

      const filteredChannels = filterAndSortResults(channelsData);
      const filteredMovies = filterAndSortResults(moviesData);
      const filteredSeries = filterAndSortResults(seriesData);

      setSearchResults({
        channels: filteredChannels,
        movies: filteredMovies,
        series: filteredSeries
      });

      // O foco permanece no teclado, a menos que o usuário navegue explicitamente para os resultados.
      // Removido: setActiveSection('results') e setResultFocus
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, fetchAllChannels, fetchAllMovies, fetchAllSeries, setActiveSection, setResultFocus, setSearchResults]);

  const handleKeyPress = useCallback((key) => {
    // Se a "key" for um objeto (nossa nova estrutura)
    if (typeof key === 'object' && key !== null && key.type) {
      if (key.action === 'backspace') {
        setSearchQuery(prev => prev.slice(0, -1));
      } else if (key.action === 'clear') {
        setSearchQuery('');
        setSearchResults({ channels: [], movies: [], series: [] });
      } else if (key.type === 'char') {
        setSearchQuery(prev => {
          if (prev.length < 30) { // Add limit check
            return prev + key.value;
          }
          return prev; // Do not add if limit reached
        });
      }
    } else if (typeof key === 'string') {
      setSearchQuery(prev => {
        if (prev.length < 30) { // Add limit check
          return prev + key;
        }
        return prev; // Do not add if limit reached
      });
    }
  }, [setSearchQuery, setSearchResults]); // Removido performSearch e searchQuery pois serão tratados pelo useEffect

  // Efeito para disparar a busca quando searchQuery muda
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim().length >= 2) { // Dispara a busca apenas se houver 2 ou mais caracteres
        performSearch();
      } else {
        setSearchResults({ channels: [], movies: [], series: [] }); // Limpa resultados se a busca for menor que 2 caracteres
      }
    }, 500); // Pequeno delay para evitar buscas excessivas

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, performSearch]);

  const handleKeyboardNavigation = useCallback((keyCode) => {
    const maxRows = keyboardLayout.length;
    let currentRow = selectedKey.row;
    let currentCol = selectedKey.col;

    if (keyCode === 38) { // Cima
      if (currentRow > 0) {
        if (currentRow === 6) { // From special action row to number row
          if (currentCol === 0) { // backspace
            currentCol = 0; // '5'
          } else if (currentCol === 1) { // space
            currentCol = 2; // '7'
          } else { // clear
            currentCol = 4; // '9'
          }
        }
        currentRow--;
        const newMaxCols = keyboardLayout[currentRow].length;
        currentCol = Math.min(currentCol, newMaxCols - 1);
        setSelectedKey({ row: currentRow, col: currentCol });
      } else { // Se estiver na primeira linha do teclado e pressionar Cima
        if (searchResults.channels.length > 0 || searchResults.movies.length > 0 || searchResults.series.length > 0) {
          setActiveSection('results');
          const sections = ['channels', 'movies', 'series']; // Ordem de prioridade para o foco inicial
          for (const section of sections) {
            if (searchResults[section].length > 0) {
              setResultFocus({ section: section, index: 0 }); // Foca no primeiro item da primeira seção com resultados
              return;
            }
          }
        }
      }
    } else if (keyCode === 40) { // Baixo
      if (currentRow < maxRows - 1) {
        if (currentRow === 5) { // From number row to special action row
          if (currentCol <= 1) { // '5', '6'
            currentCol = 0; // backspace
          } else if (currentCol <= 3) { // '7', '8'
            currentCol = 1; // space
          } else { // '9', '0'
            currentCol = 2; // clear
          }
        }
        currentRow++;
        const newMaxCols = keyboardLayout[currentRow].length;
        currentCol = Math.min(currentCol, newMaxCols - 1);
        setSelectedKey({ row: currentRow, col: currentCol });
      } else if (searchResults.channels.length > 0 || searchResults.movies.length > 0 || searchResults.series.length > 0) {
        setActiveSection('results');
        setResultFocus({ section: 'channels', index: 0 });
      }
    } else if (keyCode === 37) { // Esquerda
      if (currentCol > 0) {
        currentCol--;
        setSelectedKey(prev => ({ ...prev, col: currentCol }));
      } else {
        // Se estiver na primeira coluna de uma das linhas especificadas, tentar sair para o sidebar
        const rowsToExit = [0, 1, 2, 3, 4, 5, 6]; // Linhas das teclas 'a', 'g', 'm', 's', 'y', '5', 'backspace'
        if (currentCol === 0 && rowsToExit.includes(currentRow) && onExitSearch) {
          console.log('Navegando para o sidebar a partir do teclado.');
          onExitSearch();
        } else if (currentRow > 0) {
          currentRow--;
          currentCol = keyboardLayout[currentRow].length - 1;
          setSelectedKey({ row: currentRow, col: currentCol });
        }
      }
    } else if (keyCode === 39) { // Direita
      const isLastKeyInRow = currentCol === keyboardLayout[currentRow].length - 1;
      const hasResults = searchResults.channels.length > 0 || searchResults.movies.length > 0 || searchResults.series.length > 0;
      if (currentCol < keyboardLayout[currentRow].length - 1) {
        currentCol++;
        setSelectedKey(prev => ({ ...prev, col: currentCol }));
      } else {
        // Se estiver na última coluna da linha atual E houver resultados, ir para os resultados
        if (isLastKeyInRow && hasResults) {
          setActiveSection('results');
          const sections = ['channels', 'movies', 'series']; // Ordem de prioridade para o foco inicial
          for (const section of sections) {
            if (searchResults[section].length > 0) {
              setResultFocus({ section: section, index: 0 }); // Foca no primeiro item da primeira seção com resultados
              return;
            }
          }
        } else if (currentRow < maxRows - 1) { // Se não for para os resultados, ir para a próxima linha do teclado
          currentRow++;
          currentCol = 0;
          setSelectedKey({ row: currentRow, col: currentCol });
        }
        // Se for a última linha e a última coluna, e não for para os resultados, não faz nada.
      }
    } else if (keyCode === 13) { // OK - pressionar tecla
      const selectedKeyValue = keyboardLayout[currentRow][currentCol];
      handleKeyPress(selectedKeyValue);
    }
  }, [keyboardLayout, searchResults, selectedKey, handleKeyPress, setActiveSection]);

  const handleResultsNavigation = useCallback((keyCode) => {
    const sections = ['channels', 'movies', 'series'];
    const currentSectionIndex = sections.indexOf(resultFocus.section);
    const currentResults = searchResults[resultFocus.section];
    const itemsPerRow = 5; // Aproximação para o grid

    if (!currentResults) return;

    if (keyCode === 38) { // Cima
      if (resultFocus.index >= itemsPerRow) {
        setResultFocus(prev => ({ ...prev, index: prev.index - itemsPerRow }));
      } else {
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
          // Ao voltar para o teclado, restaurar o foco para a última tecla selecionada
          // Não é necessário definir selectedKey aqui, pois o updateFocusVisual já usa o estado existente.
        }
      }
    } else if (keyCode === 40) { // Baixo
      if (resultFocus.index + itemsPerRow < currentResults.length) {
        setResultFocus(prev => ({ ...prev, index: prev.index + itemsPerRow }));
      } else {
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
      } else {
        setActiveSection('keyboard');
      }
    } else if (keyCode === 39) { // Direita
      if (resultFocus.index < currentResults.length - 1) {
        setResultFocus(prev => ({ ...prev, index: prev.index + 1 }));
      } else {
        setActiveSection('keyboard');
      }
    } else if (keyCode === 13) { // OK - selecionar resultado
      const selectedItem = currentResults[resultFocus.index];
      const type = resultFocus.section.endsWith('s')
        ? resultFocus.section.slice(0, -1)
        : resultFocus.section;
      handleResultClick(selectedItem, type);
    }
  }, [resultFocus, searchResults, handleResultClick, setActiveSection]);

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
  }, [isActive, activeSection, handleKeyboardNavigation, handleResultsNavigation]);

  // Atualizar foco visual
  const updateFocusVisual = useCallback(() => {
    // Remover foco de todos os elementos
    document.querySelectorAll('.keyboard-key, .search-result-item').forEach(el => {
      el.classList.remove('focused');
    });

    if (activeSection === 'keyboard') {
      // Encontrar a tecla correta no DOM
      const keyboardRows = keyboardRef.current ? keyboardRef.current.children : [];
      if (keyboardRows[selectedKey.row]) {
        const keysInRow = keyboardRows[selectedKey.row].children;
        if (keysInRow[selectedKey.col]) {
          keysInRow[selectedKey.col].classList.add('focused');
          // Rolar para a tecla focada
          safeScrollIntoView(keysInRow[selectedKey.col], {
            behavior: 'smooth',
            block: 'nearest'
          });
        }
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

  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  // Efeito para auto-scroll baseado no foco
  useEffect(() => {
    if (resultFocus.section !== null && resultFocus.index !== null) {
      const sectionResults = resultsRef.current[resultFocus.section];
      if (sectionResults && sectionResults[resultFocus.index]) {
        sectionResults[resultFocus.index].classList.add('focused');

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
            <div className="search-input-display">
              <span className="search-query">{searchQuery}</span>
              <span className="cursor">|</span>
            </div>
          </div>

          {/* Teclado Virtual */}
          <div className="virtual-keyboard" ref={keyboardRef}>
            {keyboardLayout.map((row, rowIndex) => (
              <div key={rowIndex} className="keyboard-row">
                {row.map((key, colIndex) => {
                  const keyContent = (typeof key === 'object' && key.display) ? key.display : key;
                  const valueToPress = (typeof key === 'object') ? key : String(key);

                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      className={`keyboard-key ${typeof key === 'object' ? 'special-key' : ''}`}
                      onClick={() => handleKeyPress(valueToPress)}
                    >
                      {keyContent}
                    </button>
                  );
                })}
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
                  <h3>Canais ({searchResults.channels.length})</h3>
                  <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filmes */}
              {searchResults.movies.length > 0 && (
                <div className="results-section">
                  <h3>Filmes ({searchResults.movies.length})</h3>
                  <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Séries */}
              {searchResults.series.length > 0 && (
                <div className="results-section">
                  <h3>Séries ({searchResults.series.length})</h3>
                  <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
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
