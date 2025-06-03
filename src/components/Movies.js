import React, { useState, useEffect, useRef, useCallback } from 'react';
import MoviePreview from './MoviePreview';
import { safeScrollIntoView } from '../utils/scrollUtils';
import './Movies.css';

const Movies = ({ isActive }) => {
  const [categories, setCategories] = useState([]);
  const [movies, setMovies] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [moviesLoading, setMoviesLoading] = useState(false);
  
  // Estados de navegação
  const [focusArea, setFocusArea] = useState('categories'); // 'categories' ou 'movies'
  const [categoryFocus, setCategoryFocus] = useState(0);
  const [movieFocus, setMovieFocus] = useState(0);

  // Estados de paginação (corrigidos para ficar igual ao Series.js/Channels.js)
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 15; // 5 colunas x 3 linhas
  const GRID_COLUMNS = 5;
  const GRID_ROWS = 3;

  // Estado para o modal de preview
  const [previewMovie, setPreviewMovie] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Referencias para navegação
  const categoriesRef = useRef([]);
  const moviesRef = useRef([]);
  const containerRef = useRef(null);

  const API_BASE_URL = 'https://rota66.bar/player_api.php';
  const API_CREDENTIALS = 'username=zBB82J&password=AMeDHq';

  // Detectar ambiente Tizen TV
  const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Função para carregar categorias VOD
  const loadVODCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_vod_categories`
      );
      const data = await response.json();
      setCategories(data);
      
      // Selecionar primeira categoria automaticamente
      if (data.length > 0) {
        setSelectedCategory(data[0].category_id);
        setCategoryFocus(0);
        loadVOD(data[0].category_id);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias de filmes:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para carregar filmes de uma categoria
  const loadVOD = useCallback(async (categoryId) => {
    setMoviesLoading(true);
    setMovieFocus(0); // Reset movie focus
    setCurrentPage(0); // Resetar para primeira página
    try {
      const response = await fetch(
        `${API_BASE_URL}?${API_CREDENTIALS}&action=get_vod_streams&category_id=${categoryId}`
      );
      const data = await response.json();
      setMovies(data);
      
      // Se estivermos no grid de filmes, voltar o foco para os filmes
      if (focusArea === 'movies') {
        setMovieFocus(0);
      }
    } catch (error) {
      console.error('Erro ao carregar filmes:', error);
      setMovies([]);
    } finally {
      setMoviesLoading(false);
    }
  }, [focusArea]);

  // Calcular filmes da página atual
  const getCurrentPageMovies = useCallback(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return movies.slice(startIndex, endIndex);
  }, [currentPage, movies]);

  const totalPages = Math.ceil(movies.length / ITEMS_PER_PAGE);
  const currentPageMovies = getCurrentPageMovies();

  // Função para selecionar filme
  const handleMovieSelect = useCallback((movie) => {
    console.log('Filme selecionado:', movie);
    console.log('🔧 Ambiente detectado:', { isTizenTV, isDevelopment });
    
    // Construir URL do stream com a estrutura correta (mesma dos canais que funcionam)
    const streamUrl = `https://rota66.bar/movie/${API_CREDENTIALS.split('&')[0].split('=')[1]}/${API_CREDENTIALS.split('&')[1].split('=')[1]}/${movie.stream_id}.mp4`;
    
    // Informações do filme para o player
    const streamInfo = {
      name: movie.name,
      category: selectedCategory ? categories.find(cat => cat.category_id === selectedCategory)?.category_name : 'Filme',
      description: movie.plot || `Filme - ${movie.name}`,
      year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null,
      rating: movie.rating,
      type: 'movie'
    };

    // Para Tizen TV, usar configuração específica que força player interno
    if (isTizenTV) {
      console.log('📺 Configuração Tizen TV ativada para filme');
      
      // Evento personalizado com configurações específicas para TV
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
        bubbles: false, // Não permitir propagação que pode causar redirect
        cancelable: false // Não permitir cancelamento por outros handlers
      });
      
      // Prevenir qualquer comportamento padrão que possa causar redirect
      setTimeout(() => {
        console.log('📺 Disparando evento playContent para Tizen TV (filme)');
        window.dispatchEvent(playEvent);
      }, 100); // Pequeno delay para garantir que o evento seja tratado corretamente
      
    } else {
      // Para outros ambientes, usar o comportamento padrão
      console.log('💻 Configuração padrão ativada para filme');
      
      // Disparar evento para reproduzir no VideoPlayer
      const playEvent = new CustomEvent('playContent', {
        detail: { streamUrl, streamInfo }
      });
      window.dispatchEvent(playEvent);
    }
  }, [API_CREDENTIALS, selectedCategory, categories, isTizenTV, isDevelopment]);

  // Função para mostrar preview do filme
  const handleMoviePreview = useCallback((movie) => {
    const categoryInfo = categories.find(cat => cat.category_id === selectedCategory);
    const movieWithCategory = {
      ...movie,
      category_name: categoryInfo?.category_name || 'Filme'
    };
    setPreviewMovie(movieWithCategory);
    setShowPreview(true);
    
    // Informar ao App.js que o preview está ativo
    const previewActiveEvent = new CustomEvent('moviePreviewActive', {
      detail: { active: true }
    });
    window.dispatchEvent(previewActiveEvent);
  }, [categories, selectedCategory]);

  // Função para clicar em categoria
  const handleCategoryClick = useCallback((categoryId) => {
    setSelectedCategory(categoryId);
    const categoryIndex = categories.findIndex(cat => cat.category_id === categoryId);
    setCategoryFocus(categoryIndex);
    loadVOD(categoryId);
    setFocusArea('movies'); // Mover foco para os filmes
  }, [categories, loadVOD]);

  // Carregar categorias de filmes
  useEffect(() => {
    if (isActive) {
      loadVODCategories();
    }
  }, [isActive, loadVODCategories]);

  // Efeito para auto-scroll baseado no foco
  useEffect(() => {
    // Auto-scroll para categoria focada
    if (focusArea === 'categories' && categoriesRef.current[categoryFocus]) {
      categoriesRef.current[categoryFocus].classList.add('focused');
      safeScrollIntoView(categoriesRef.current[categoryFocus], {
        behavior: 'smooth',
        block: 'nearest'
      });
    }
    // Auto-scroll para filme focado
    else if (focusArea === 'movies' && moviesRef.current[movieFocus]) {
      moviesRef.current[movieFocus].classList.add('focused');
      safeScrollIntoView(moviesRef.current[movieFocus], {
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [focusArea, categoryFocus, movieFocus]);

  // Função de navegação das categorias
  const handleCategoriesNavigation = useCallback((keyCode) => {
    if (keyCode === 38) { // Cima
      setCategoryFocus(prev => Math.max(0, prev - 1));
    } else if (keyCode === 40) { // Baixo
      setCategoryFocus(prev => Math.min(categories.length - 1, prev + 1));
    } else if (keyCode === 37) { // Esquerda - voltar para sidebar
      const backEvent = new CustomEvent('backToSidebar');
      window.dispatchEvent(backEvent);
    } else if (keyCode === 39) { // Direita - ir para filmes
      if (movies.length > 0) {
        setFocusArea('movies');
        setMovieFocus(0);
      }
    } else if (keyCode === 13) { // OK - selecionar categoria
      if (categories[categoryFocus]) {
        const selectedCat = categories[categoryFocus];
        setSelectedCategory(selectedCat.category_id);
        loadVOD(selectedCat.category_id);
      }
    }
  }, [categories, categoryFocus, movies.length, loadVOD]);

  // Função de navegação dos filmes (corrigida para ficar igual ao Series.js/Channels.js)
  const handleMoviesNavigationInternal = useCallback((keyCode) => {
    const currentPageMoviesCount = currentPageMovies.length;

    if (keyCode === 38) { // Cima
      const currentRow = Math.floor(movieFocus / GRID_COLUMNS);
      
      if (currentRow > 0) {
        const newFocus = Math.max(0, movieFocus - GRID_COLUMNS);
        setMovieFocus(newFocus);
      } else {
        // Se estiver na primeira linha e houver página anterior
        if (currentPage > 0) {
          setCurrentPage(currentPage - 1);
          const currentCol = movieFocus % GRID_COLUMNS;
          const newFocusAttempt = (GRID_ROWS - 1) * GRID_COLUMNS + currentCol;
          const lastPageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
          const previousPageMoviesCount = movies.slice(lastPageStartIndex, lastPageStartIndex + ITEMS_PER_PAGE).length;
          setMovieFocus(Math.min(newFocusAttempt, previousPageMoviesCount - 1));
        }
      }
    } else if (keyCode === 40) { // Baixo
      const currentRow = Math.floor(movieFocus / GRID_COLUMNS);
      const maxRow = Math.floor((currentPageMoviesCount - 1) / GRID_COLUMNS);
      
      if (currentRow < maxRow) {
        const newFocus = Math.min(currentPageMoviesCount - 1, movieFocus + GRID_COLUMNS);
        setMovieFocus(newFocus);
      } else {
        // Se estiver na última linha e houver próxima página
        if (currentPage < totalPages - 1) {
          setCurrentPage(currentPage + 1);
          setMovieFocus(movieFocus % GRID_COLUMNS); // Manter coluna, ir para primeira linha da próxima página
        }
      }
    } else if (keyCode === 37) { // Esquerda
      const currentCol = movieFocus % GRID_COLUMNS;
      
      if (currentCol > 0) {
        setMovieFocus(movieFocus - 1);
      } else {
        // Se estiver na primeira coluna, voltar para categorias
        setFocusArea('categories');
        const selectedIndex = categories.findIndex(cat => cat.category_id === selectedCategory);
        setCategoryFocus(selectedIndex >= 0 ? selectedIndex : 0);
      }
    } else if (keyCode === 39) { // Direita
      const currentCol = movieFocus % GRID_COLUMNS;
      
      if (currentCol < GRID_COLUMNS - 1 && movieFocus < currentPageMoviesCount - 1) {
        // Mover para próximo item na mesma linha
        setMovieFocus(movieFocus + 1);
      } else if (currentCol === GRID_COLUMNS - 1) {
        // Estamos na última coluna
        const currentRow = Math.floor(movieFocus / GRID_COLUMNS);
        const maxRow = Math.floor((currentPageMoviesCount - 1) / GRID_COLUMNS);
        
        if (currentRow < maxRow) {
          // Há linha abaixo na mesma página → descer para primeira coluna da próxima linha
          setMovieFocus((currentRow + 1) * GRID_COLUMNS);
        } else if (currentPage < totalPages - 1) {
          // Última linha da página → mudar página
          setCurrentPage(currentPage + 1);
          setMovieFocus(0); // Ir para primeiro item da nova página
        }
      }
    } else if (keyCode === 13) { // OK - abrir preview do filme
      if (currentPageMovies[movieFocus]) {
        const actualMovieIndex = currentPage * ITEMS_PER_PAGE + movieFocus;
        handleMoviePreview(movies[actualMovieIndex]);
      }
    } else if (keyCode === 73) { // Tecla 'I' - Info/Preview (alternativa)
      if (currentPageMovies[movieFocus]) {
        const actualMovieIndex = currentPage * ITEMS_PER_PAGE + movieFocus;
        handleMoviePreview(movies[actualMovieIndex]);
      }
    }
  }, [
    currentPageMovies,
    movieFocus,
    currentPage,
    totalPages,
    movies,
    categories,
    selectedCategory,
    handleMoviePreview
  ]);

  // Sistema de navegação por controle remoto
  useEffect(() => {
    if (!isActive) return;

    const handleMoviesNavigation = (event) => {
      const { keyCode } = event.detail;
      
      if (focusArea === 'categories') {
        handleCategoriesNavigation(keyCode);
      } else if (focusArea === 'movies') {
        handleMoviesNavigationInternal(keyCode);
      }
    };

    window.addEventListener('moviesNavigation', handleMoviesNavigation);
    return () => window.removeEventListener('moviesNavigation', handleMoviesNavigation);
  }, [isActive, focusArea, handleCategoriesNavigation, handleMoviesNavigationInternal]);

  const closePreview = () => {
    setShowPreview(false);
    setPreviewMovie(null);
    
    // Informar ao App.js que o preview foi fechado
    const previewActiveEvent = new CustomEvent('moviePreviewActive', {
      detail: { active: false }
    });
    window.dispatchEvent(previewActiveEvent);
  };

  // Função para tratar erros de imagem
  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  if (!isActive) return null;

  return (
    <div className="movies-page" ref={containerRef}>
      <div className="category-sidebar">
        {loading ? (
          <div className="loading">Carregando categorias...</div>
        ) : (
          <div className="category-list">
            {categories.map((category, index) => (
              <button
                key={category.category_id}
                ref={el => categoriesRef.current[index] = el}
                className={`category-button ${
                  selectedCategory === category.category_id ? 'active' : ''
                }`}
                onClick={() => handleCategoryClick(category.category_id)}
              >
                {category.category_name}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="main-content-area">
        <div className="movies-content">
          {moviesLoading ? (
            <div className="loading">Carregando filmes...</div>
          ) : (
            <>
              {totalPages > 1 && (
                <div className="pagination-info">
                  <span>Página {currentPage + 1} de {totalPages}</span>
                  <span className="movies-count">
                    {movies.length} filmes • {currentPageMovies.length} nesta página
                  </span>
                </div>
              )}
              <div className="movies-grid">
                {currentPageMovies.map((movie, index) => (
                  <div
                    key={movie.stream_id}
                    ref={el => moviesRef.current[index] = el}
                    className="movie"
                    onClick={() => {
                      const actualMovieIndex = currentPage * ITEMS_PER_PAGE + index;
                      handleMovieSelect(movies[actualMovieIndex]);
                    }}
                  >
                    <div className="movie-poster">
                      {(movie.stream_icon || movie.cover) && (
                        <img
                          src={movie.stream_icon || movie.cover}
                          alt={movie.name}
                          onError={handleImageError}
                        />
                      )}
                      <div className="movie-overlay">
                        <h3 className="movie-title">{movie.name}</h3>
                        <div className="movie-info">
                          <span className="movie-year">{movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A'}</span>
                          <span className="movie-rating">
                            ⭐ {movie.rating || 'N/A'}
                          </span>
                        </div>
                        <p className="movie-description">
                          {movie.plot ? 
                            (movie.plot.length > 120 ? 
                              movie.plot.substring(0, 120) + '...' : 
                              movie.plot
                            ) : 
                            'Descrição não disponível'
                          }
                        </p>
                        <div className="movie-actions">
                          <span className="action-hint">ENTER Preview</span>
                          <span className="action-hint">I Info</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {showPreview && (
        <MoviePreview
          movie={previewMovie}
          isActive={showPreview}
          onBack={closePreview}
        />
      )}
    </div>
  );
};

export default Movies; 