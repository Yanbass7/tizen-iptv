import React, { useState, useEffect, useRef, useCallback } from 'react';
import { safeScrollIntoView } from '../utils/scrollUtils';
import { API_BASE_URL, API_CREDENTIALS } from '../config/apiConfig';
import './Search.css';

const Search = ({ isActive, onExitSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allResults, setAllResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('keyboard'); // 'keyboard', 'results', 'categories'
  const [selectedKey, setSelectedKey] = useState({ row: 0, col: 0 });
  const [resultFocus, setResultFocus] = useState(0);
  const [searchCategory, setSearchCategory] = useState('movie'); // 'movie', 'serie', 'channel'
  const [categoryFocus, setCategoryFocus] = useState(0); // 0: Filmes, 1: Séries, 2: Canais

  // Paginação
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 15;
  const GRID_COLUMNS = 5;

  // Referencias para navegação
  const keyboardRef = useRef(null);
  const resultsRef = useRef([]);

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

  const searchCategories = [
    { id: 'movie', name: 'Filmes' },
    { id: 'serie', name: 'Séries' },
    { id: 'channel', name: 'Canais ao Vivo' },
  ];

  const handleResultClick = useCallback((result) => {
    const { type, rawItem: item } = result;
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
      const categoriesResponse = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_live_categories`
      );
      const categories = await categoriesResponse.json();
      if (!Array.isArray(categories)) return [];

      let allChannels = [];
      for (const category of categories) {
        try {
          const response = await fetch(`${API_BASE_URL}?${API_CREDENTIALS}&action=get_live_streams&category_id=${category.category_id}`);
          if (response.status === 429) {
            console.warn('Rate limit atingido. Aguardando para tentar novamente...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Espera 2 segundos
            continue; // Pula para a próxima iteração
          }
          const data = await response.json();
          if (Array.isArray(data)) {
            allChannels = allChannels.concat(data);
          }
          await new Promise(resolve => setTimeout(resolve, 150)); // Delay de 150ms entre requisições
        } catch (e) {
          console.error(`Erro ao buscar canais da categoria ${category.category_id}:`, e);
        }
      }
      return allChannels;
    } catch (error) {
      console.error('Erro ao buscar categorias de canais:', error);
      return [];
    }
  }, []);

  const fetchAllMovies = useCallback(async () => {
    try {
      const categoriesResponse = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_vod_categories`
      );
      const categories = await categoriesResponse.json();
      if (!Array.isArray(categories)) return [];

      let allMovies = [];
      for (const category of categories) {
        try {
          const response = await fetch(`${API_BASE_URL}?${API_CREDENTIALS}&action=get_vod_streams&category_id=${category.category_id}`);
           if (response.status === 429) {
            console.warn('Rate limit atingido. Aguardando para tentar novamente...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          const data = await response.json();
          if (Array.isArray(data)) {
            allMovies = allMovies.concat(data);
          }
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (e) {
          console.error(`Erro ao buscar filmes da categoria ${category.category_id}:`, e);
        }
      }
      return allMovies;
    } catch (error) {
      console.error('Erro ao buscar categorias de filmes:', error);
      return [];
    }
  }, []);

  const fetchAllSeries = useCallback(async () => {
    try {
      const categoriesResponse = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_series_categories`
      );
      const categories = await categoriesResponse.json();
      if (!Array.isArray(categories)) return [];
      
      let allSeries = [];
      for (const category of categories) {
        try {
          const response = await fetch(`${API_BASE_URL}?${API_CREDENTIALS}&action=get_series&category_id=${category.category_id}`);
           if (response.status === 429) {
            console.warn('Rate limit atingido. Aguardando para tentar novamente...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          const data = await response.json();
          if (Array.isArray(data)) {
            allSeries = allSeries.concat(data);
          }
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (e) {
          console.error(`Erro ao buscar séries da categoria ${category.category_id}:`, e);
        }
      }
      return allSeries;
    } catch (error) {
      console.error('Erro ao buscar categorias de séries:', error);
      return [];
    }
  }, []);

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setAllResults([]);
      return;
    }

    setLoading(true);
    setCurrentPage(0);
    setResultFocus(0);

    try {
      let fetchedData = [];
      let dataType = '';

      switch (searchCategory) {
        case 'movie':
          fetchedData = await fetchAllMovies();
          dataType = 'movie';
          break;
        case 'serie':
          fetchedData = await fetchAllSeries();
          dataType = 'serie';
          break;
        case 'channel':
          fetchedData = await fetchAllChannels();
          dataType = 'channel';
          break;
        default:
          break;
      }

      const normalizeText = (text) => {
        if (!text) return '';
        return text
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s]/g, '');
      };

      const normalizedQuery = normalizeText(searchQuery);
      
      const mappedData = fetchedData.map(item => ({
        ...item,
        type: dataType,
        icon: dataType === 'serie' ? item.cover : item.stream_icon
      }));

      const filteredResults = mappedData
        .filter(item => {
          if (!item || !item.name) return false;
          const normalizedName = normalizeText(item.name);
          return normalizedName.includes(normalizedQuery);
        })
        .sort((a, b) => {
          const normalizedNameA = normalizeText(a.name);
          const normalizedNameB = normalizeText(b.name);
          const startsWithA = normalizedNameA.startsWith(normalizedQuery);
          const startsWithB = normalizedNameB.startsWith(normalizedQuery);
          if (startsWithA && !startsWithB) return -1;
          if (!startsWithA && startsWithB) return 1;
          return 0;
        });

      const finalResults = filteredResults.map(item => ({
        id: item.stream_id || item.series_id,
        name: item.name,
        icon: item.icon,
        type: item.type,
        rawItem: item,
      }));

      setAllResults(finalResults);

    } catch (error) {
      console.error('Erro na busca:', error);
      setAllResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchCategory, fetchAllChannels, fetchAllMovies, fetchAllSeries]);

  const handleKeyPress = useCallback((key) => {
    // Se a "key" for um objeto (nossa nova estrutura)
    if (typeof key === 'object' && key !== null && key.type) {
      if (key.action === 'backspace') {
        setSearchQuery(prev => prev.slice(0, -1));
      } else if (key.action === 'clear') {
        setSearchQuery('');
        setAllResults([]);
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
  }, [setSearchQuery]); // Removido performSearch e searchQuery pois serão tratados pelo useEffect

  // Efeito para disparar a busca quando searchQuery muda
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch();
      } else {
        setAllResults([]);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, performSearch]);

  // Efeito para re-buscar ao mudar de categoria
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      performSearch();
    }
  }, [searchCategory, performSearch]);

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
      } else {
        setActiveSection('categories');
        setCategoryFocus(0);
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
      } else if (allResults.length > 0) {
        setActiveSection('results');
        setResultFocus(0);
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
          const hasResults = allResults.length > 0;
      if (currentCol < keyboardLayout[currentRow].length - 1) {
        currentCol++;
        setSelectedKey(prev => ({ ...prev, col: currentCol }));
      } else if (isLastKeyInRow && hasResults) {
        setActiveSection('results');
        setResultFocus(0);
      } else if (currentRow < keyboardLayout.length - 1) {
        currentRow++;
        currentCol = 0;
        setSelectedKey({ row: currentRow, col: currentCol });
      }
    } else if (keyCode === 13) { // OK - pressionar tecla
      const selectedKeyValue = keyboardLayout[currentRow][currentCol];
      handleKeyPress(selectedKeyValue);
    }
  }, [keyboardLayout, allResults.length, selectedKey, handleKeyPress, setActiveSection]);

  // Lógica de navegação para a grade de resultados unificada
  const handleResultsNavigation = useCallback((keyCode) => {
    const totalResults = allResults.length;
    const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);
    const currentPageResultsCount = getCurrentPageResults().length;

    if (keyCode === 38) { // Cima
      const newFocus = resultFocus - GRID_COLUMNS;
      if (newFocus >= 0) {
        setResultFocus(newFocus);
      } else if (currentPage > 0) {
        setCurrentPage(prev => prev - 1);
        const newFocusOnNewPage = (ITEMS_PER_PAGE - (ITEMS_PER_PAGE % GRID_COLUMNS)) + (resultFocus % GRID_COLUMNS) - GRID_COLUMNS;
        setResultFocus(Math.min(newFocusOnNewPage, ITEMS_PER_PAGE - 1));
      } else {
        setActiveSection('categories');
      }
    } else if (keyCode === 40) { // Baixo
      const newFocus = resultFocus + GRID_COLUMNS;
      if (newFocus < currentPageResultsCount) {
        setResultFocus(newFocus);
      } else if (currentPage < totalPages - 1) {
        setCurrentPage(prev => prev + 1);
        // Tenta manter a coluna, indo para a primeira linha da próxima página
        setResultFocus(resultFocus % GRID_COLUMNS);
      }
    } else if (keyCode === 37) { // Esquerda
      if (resultFocus % GRID_COLUMNS > 0) {
        setResultFocus(prev => prev - 1);
      } else {
        setActiveSection('categories');
      }
    } else if (keyCode === 39) { // Direita
      if ((resultFocus + 1) % GRID_COLUMNS !== 0 && resultFocus + 1 < currentPageResultsCount) {
        setResultFocus(prev => prev + 1);
      }
    } else if (keyCode === 13) { // OK - selecionar resultado
      const selectedItem = getCurrentPageResults()[resultFocus];
      if (selectedItem) {
        handleResultClick(selectedItem);
      }
    }
  }, [resultFocus, allResults, currentPage, ITEMS_PER_PAGE, handleResultClick, setActiveSection]);

  const handleCategoryNavigation = useCallback((keyCode) => {
    if (keyCode === 37) { // Esquerda
      if (categoryFocus > 0) {
        setCategoryFocus(prev => prev - 1);
      } else {
        onExitSearch(); // Sair para o sidebar
      }
    } else if (keyCode === 39) { // Direita
      if (categoryFocus < searchCategories.length - 1) {
        setCategoryFocus(prev => prev + 1);
      } else if (allResults.length > 0) {
        setActiveSection('results');
        setResultFocus(0);
      }
    } else if (keyCode === 40) { // Baixo
      setActiveSection('keyboard');
    } else if (keyCode === 38) { // Cima
      if (allResults.length > 0) {
        setActiveSection('results');
        setResultFocus(0);
      }
    } else if (keyCode === 13) { // OK
      setSearchCategory(searchCategories[categoryFocus].id);
    }
  }, [categoryFocus, allResults.length, onExitSearch, searchCategories]);

  // Sistema de navegação por controle remoto
  useEffect(() => {
    if (!isActive) return;

    const handleSearchNavigation = (event) => {
      const { keyCode } = event.detail;

      if (activeSection === 'keyboard') {
        handleKeyboardNavigation(keyCode);
      } else if (activeSection === 'results') {
        handleResultsNavigation(keyCode);
      } else if (activeSection === 'categories') {
        handleCategoryNavigation(keyCode);
      }
    };

    window.addEventListener('searchNavigation', handleSearchNavigation);
    return () => window.removeEventListener('searchNavigation', handleSearchNavigation);
  }, [isActive, activeSection, handleKeyboardNavigation, handleResultsNavigation, handleCategoryNavigation]);

  // Atualizar foco visual
  const updateFocusVisual = useCallback(() => {
    // Remover foco de todos os elementos
    document.querySelectorAll('.keyboard-key, .search-result-item, .category-button').forEach(el => {
      el.classList.remove('focused');
    });

    if (activeSection === 'categories') {
      const categoryButtons = document.querySelectorAll('.category-button');
      if (categoryButtons[categoryFocus]) {
        categoryButtons[categoryFocus].classList.add('focused');
        safeScrollIntoView(categoryButtons[categoryFocus], { behavior: 'smooth', block: 'nearest' });
      }
    } else if (activeSection === 'keyboard') {
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
      // Foco na grade de resultados unificada
      if (resultsRef.current[resultFocus]) {
        resultsRef.current[resultFocus].classList.add('focused');
        safeScrollIntoView(resultsRef.current[resultFocus], {
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [activeSection, selectedKey, resultFocus, categoryFocus]);

  useEffect(() => {
    updateFocusVisual();
  }, [updateFocusVisual]);

  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  // Efeito para auto-scroll baseado no foco
  useEffect(() => {
    if (activeSection === 'results' && resultsRef.current[resultFocus]) {
      resultsRef.current.forEach(el => el?.classList.remove('focused'));
      resultsRef.current[resultFocus].classList.add('focused');
    }
  }, [resultFocus, activeSection, currentPage]); // Adicionado currentPage para reavaliar o foco ao mudar de página

  // Calcular resultados da página atual
  const getCurrentPageResults = useCallback(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return allResults.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [allResults, currentPage, ITEMS_PER_PAGE]);

  const currentPageResults = getCurrentPageResults();
  const totalPages = Math.ceil(allResults.length / ITEMS_PER_PAGE);


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
             <div className="category-selector">
              {searchCategories.map((category, index) => (
                <button
                  key={category.id}
                  className={`category-button ${searchCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSearchCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
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
          {loading && <div className="loading">Buscando...</div>}

          {!loading && searchQuery && (
            <>
              {allResults.length > 0 ? (
                <>
                  <div className="pagination-info">
                    <span>Página {currentPage + 1} de {totalPages}</span>
                    <span className="results-count">
                      {allResults.length} resultados encontrados
                    </span>
                  </div>
                  <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
                    {currentPageResults.map((result, index) => {
                      const translatedType = {
                        'channel': 'Canal',
                        'movie': 'Filme',
                        'serie': 'Série'
                      }[result.type] || result.type; // Fallback to original if no translation

                      return (
                        <div
                          key={`${result.type}-${result.id}-${index}`}
                          ref={el => resultsRef.current[index] = el}
                          className={`search-result-item ${result.type}-result`}
                          onClick={() => handleResultClick(result)}
                        >
                          <img
                            src={result.icon}
                            alt={result.name}
                            onError={handleImageError}
                          />
                          <span className="result-type-badge">{translatedType}</span>
                          <div className="result-info">
                            <h4>{result.name}</h4>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
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
