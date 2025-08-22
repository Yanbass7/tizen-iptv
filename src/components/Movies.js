import React, { useState, useEffect, useRef, useCallback } from 'react';
import MoviePreview from './MoviePreview';
import PasswordModal from './PasswordModal';
import AlertPopup from './AlertPopup';
import { iptvApi } from '../services/iptvApi';
import { API_BASE_URL, API_CREDENTIALS, buildStreamUrl } from '../config/apiConfig';
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
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedMovieForPassword, setSelectedMovieForPassword] = useState(null);
  const [modalFocus, setModalFocus] = useState('input'); // 'input', 'submit', or 'cancel'
  const [password, setPassword] = useState('');
  const [alertMessage, setAlertMessage] = useState(null);
  const [showPasswordError, setShowPasswordError] = useState(false);

  // Estados de paginação (corrigidos para ficar igual ao Series.js/Channels.js)
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 15; // 5 colunas x 3 linhas
  const GRID_COLUMNS = 5;
  const GRID_ROWS = 3;

  // Estado para o modal de preview
  const [previewMovie, setPreviewMovie] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Ref para restaurar estado ao voltar de player/detalhes
  const restoreStateRef = useRef(null);

  // Cache simples em localStorage
  const getCache = useCallback((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }, []);

  const setCache = useCallback((key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // ignore
    }
  }, []);
  // Referencias para navegação
  const categoriesRef = useRef([]);
  const moviesRef = useRef([]);
  const containerRef = useRef(null);

  // Detectar ambiente Tizen TV
  const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Função para detectar modo demo (igual aos outros componentes)
  const isDemoMode = () => {
    const testMode = localStorage.getItem('testMode');
    const authEmail = localStorage.getItem('authEmail');
    return testMode === 'true' && authEmail === 'samsungtest1@samsung.com';
  };

  // Função para carregar categorias VOD
  const loadVODCategories = useCallback(async () => {
    console.log('🎬 Movies - Carregando categorias VOD...');
    setLoading(true);
    try {
      // Tentar usar cache primeiro para render imediato
      const cached = getCache('vodCategoriesCache');
      if (Array.isArray(cached) && cached.length > 0) {
        const normalizedCached = cached.map(c => ({ ...c, category_id: String(c.category_id) }));
        setCategories(normalizedCached);

        const saved = restoreStateRef.current;
        if (saved) {
          const savedCategoryId = String(saved.selectedCategory);
          const catIndexCached = normalizedCached.findIndex(c => String(c.category_id) === savedCategoryId);
          if (catIndexCached >= 0) {
            setSelectedCategory(savedCategoryId);
            setCategoryFocus(catIndexCached);
            // Carregar filmes da categoria salva (também com cache)
            loadVOD(savedCategoryId, { restoreState: saved, preserveFocus: true });
          }
        }
      }

      const data = await iptvApi.getVodCategories();
      console.log('🎬 Movies - Categorias carregadas:', data);
      // Normalizar IDs para string para evitar mismatch
      const normalized = (data || []).map(c => ({ ...c, category_id: String(c.category_id) }));
      setCategories(normalized);
      setCache('vodCategoriesCache', normalized);
      
      // Se houver estado salvo, restaurar categoria/página/foco
      const saved = restoreStateRef.current;
      if (saved && normalized.length > 0) {
        const savedCategoryId = String(saved.selectedCategory);
        const catIndex = normalized.findIndex(c => String(c.category_id) === savedCategoryId);
        if (catIndex >= 0) {
          console.log('🎬 Movies - Restaurando estado salvo:', saved);
          setSelectedCategory(savedCategoryId);
          setCategoryFocus(catIndex);
          // Carregar filmes preservando paginação/foco
          loadVOD(savedCategoryId, { restoreState: saved, preserveFocus: true });
          // Garantir área de foco correta
          setFocusArea('movies');
          return;
        }
      }

      // Caso não haja estado salvo válido, selecionar primeira categoria automaticamente
      if (normalized.length > 0) {
        console.log('🎬 Movies - Selecionando primeira categoria:', normalized[0]);
        setSelectedCategory(normalized[0].category_id);
        setCategoryFocus(0);
        loadVOD(normalized[0].category_id);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias de filmes:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [getCache, setCache]);

  // Função para carregar filmes de uma categoria
  const loadVOD = useCallback(async (categoryId, options = {}) => {
    console.log('🎬 Movies - Carregando filmes para categoria:', categoryId);
    setMoviesLoading(true);

    const isRestoring = !!options.restoreState;
    if (!options.preserveFocus) {
      setMovieFocus(0); // Reset movie focus
      setCurrentPage(0); // Resetar para primeira página
    } else if (isRestoring) {
      // Ajustar página primeiro para permitir cálculo correto do foco
      const restorePage = Math.max(0, options.restoreState.currentPage || 0);
      setCurrentPage(restorePage);
    }
    try {
      // 1) Tentar cache imediato
      const cacheKey = `vodStreamsCache_${String(categoryId)}`;
      const cachedStreams = getCache(cacheKey);
      const isRestoring = !!options.restoreState;
      if (Array.isArray(cachedStreams) && cachedStreams.length > 0) {
        console.log('🎬 Movies - Usando cache para categoria', categoryId, 'qtd:', cachedStreams.length);
        setMovies(cachedStreams);
        if (isRestoring && options.restoreState) {
          const restorePage = Math.max(0, options.restoreState.currentPage || 0);
          const restoreMovieFocus = Math.max(0, options.restoreState.movieFocus || 0);
          const startIndex = restorePage * ITEMS_PER_PAGE;
          const countInPage = cachedStreams.slice(startIndex, startIndex + ITEMS_PER_PAGE).length;
          const clampedFocus = Math.min(restoreMovieFocus, Math.max(0, countInPage - 1));
          setCurrentPage(restorePage);
          setMovieFocus(clampedFocus);
        } else if (focusArea === 'movies') {
          setMovieFocus(0);
        }
      }

      // 2) Buscar servidor e atualizar cache/estado
      const data = await iptvApi.getVodStreams(categoryId);
      console.log('🎬 Movies - Filmes carregados:', data);
      setMovies(data);
      setCache(cacheKey, data);

      // Se estivermos restaurando, ajustar o foco do filme com base no estado salvo
      if (isRestoring && options.restoreState) {
        const restorePage = Math.max(0, options.restoreState.currentPage || 0);
        const restoreMovieFocus = Math.max(0, options.restoreState.movieFocus || 0);
        const startIndex = restorePage * ITEMS_PER_PAGE;
        const countInPage = data.slice(startIndex, startIndex + ITEMS_PER_PAGE).length;
        const clampedFocus = Math.min(restoreMovieFocus, Math.max(0, countInPage - 1));
        setMovieFocus(clampedFocus);
      } else {
        // Se estivermos no grid de filmes, voltar o foco para os filmes
        if (focusArea === 'movies') {
          setMovieFocus(0);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar filmes:', error);
      setMovies([]);
    } finally {
      setMoviesLoading(false);
    }
  }, [focusArea, getCache, setCache]);

  // Calcular filmes da página atual
  const getCurrentPageMovies = useCallback(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return movies.slice(startIndex, endIndex);
  }, [currentPage, movies]);

  const totalPages = Math.ceil(movies.length / ITEMS_PER_PAGE);
  const currentPageMovies = getCurrentPageMovies();

  // Função para selecionar filme
  // Persistência de estado da página de filmes
  const saveMoviesState = useCallback(() => {
    try {
      const stateToSave = {
        selectedCategory,
        categoryFocus,
        currentPage,
        movieFocus,
        focusArea: 'movies'
      };
      localStorage.setItem('moviesState', JSON.stringify(stateToSave));
      console.log('💾 Movies - Estado salvo:', stateToSave);
    } catch (e) {
      console.warn('Não foi possível salvar o estado dos filmes:', e);
    }
  }, [selectedCategory, categoryFocus, currentPage, movieFocus]);

  const loadSavedMoviesState = useCallback(() => {
    try {
      const raw = localStorage.getItem('moviesState');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }, []);

  const handleMovieSelect = useCallback((movie) => {
    console.log('Filme selecionado:', movie);
    console.log('🔧 Ambiente detectado:', { isTizenTV, isDevelopment });

    // Salvar estado atual antes de sair para o player
    saveMoviesState();

    // Construir URL do stream - usar stream_url diretamente no modo demo
    const streamUrl = isDemoMode() ? movie.stream_url : buildStreamUrl('movie', movie.stream_id, 'mp4');

    // Informações do filme para o player
    const streamInfo = {
      name: movie.name,
      stream_id: movie.stream_id, // CRUCIAL: ID do filme para salvar progresso
      id: movie.id || movie.stream_id, // ID alternativo
      category: selectedCategory ? categories.find(cat => cat.category_id === selectedCategory)?.category_name : 'Filme',
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
    // Salvar estado atual antes de abrir o preview (por segurança)
    saveMoviesState();
    const categoryInfo = categories.find(cat => cat.category_id === selectedCategory);
    const movieWithCategory = {
      ...movie,
      category_name: categoryInfo?.category_name || 'Filme'
    };
    setPreviewMovie(movieWithCategory);
    setShowPreview(true);
    setFocusArea('moviePreview'); // Definir área de foco para o preview

    // Informar ao App.js que o preview está ativo
    const previewActiveEvent = new CustomEvent('moviePreviewActive', {
      detail: { active: true }
    });
    window.dispatchEvent(previewActiveEvent);
  }, [categories, selectedCategory]);

  // Função para mostrar detalhes do filme
  const handleMovieDetails = useCallback((movie) => {
    const categoryInfo = categories.find(cat => cat.category_id === selectedCategory);
    const movieWithCategory = {
      ...movie,
      category_name: categoryInfo?.category_name || 'Filme'
    };

    // Salvar estado atual antes de sair para a página de detalhes
    saveMoviesState();
    
    // Disparar evento para navegar para a página de detalhes
    const showDetailsEvent = new CustomEvent('showMovieDetails', {
      detail: { movie: movieWithCategory }
    });
    window.dispatchEvent(showDetailsEvent);
  }, [categories, selectedCategory, saveMoviesState]);

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
      // Carregar estado salvo, se existir, para orientar a restauração
      restoreStateRef.current = loadSavedMoviesState();
      // Evitar recarregar se já temos dados. Recarrega apenas se ainda não carregado.
      if (!categories || categories.length === 0) {
        loadVODCategories();
      } else if (restoreStateRef.current) {
        // Se já existem categorias, apenas ajustar foco/página se necessário
        const saved = restoreStateRef.current;
        if (saved.selectedCategory && String(saved.selectedCategory) === String(selectedCategory)) {
          setCurrentPage(Math.max(0, saved.currentPage || 0));
          setMovieFocus(Math.max(0, saved.movieFocus || 0));
          setFocusArea('movies');
        }
      }
    }
  }, [isActive, loadVODCategories, loadSavedMoviesState, categories, selectedCategory]);

  // Efeito para auto-scroll baseado no foco
  useEffect(() => {
    // Limpar focos anteriores
    categoriesRef.current.forEach(ref => ref?.classList.remove('focused'));
    moviesRef.current.forEach(ref => ref?.classList.remove('focused'));

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
    } else if (keyCode === 13) { // OK - abrir detalhes do filme
      if (currentPageMovies[movieFocus]) {
        const actualMovieIndex = currentPage * ITEMS_PER_PAGE + movieFocus;
        const movie = movies[actualMovieIndex];
        const category = categories.find(cat => cat.category_id === movie.category_id);

        if (movie.category_id === '2' || movie.category_id === '29' || category?.category_name === 'Filmes | Adultos' || category?.category_name === 'XXX - Adultos') {
          setSelectedMovieForPassword(movie);
          setAlertMessage(null); // Limpar mensagens anteriores
          setShowPasswordError(false); // Limpar erro de senha
          setIsPasswordModalOpen(true);
          setFocusArea('modal');
        } else {
          handleMovieDetails(movie);
        }
      }
    } else if (keyCode === 80) { // Tecla 'P' - Reproduzir filme diretamente
      if (currentPageMovies[movieFocus]) {
        const actualMovieIndex = currentPage * ITEMS_PER_PAGE + movieFocus;
        const movie = movies[actualMovieIndex];
        const category = categories.find(cat => cat.category_id === movie.category_id);

        if (movie.category_id === '2' || movie.category_id === '29' || category?.category_name === 'Filmes | Adultos' || category?.category_name === 'XXX - Adultos') {
          setSelectedMovieForPassword(movie);
          setAlertMessage(null); // Limpar mensagens anteriores
          setShowPasswordError(false); // Limpar erro de senha
          setIsPasswordModalOpen(true);
          setFocusArea('modal');
        } else {
          handleMovieSelect(movie);
        }
      }
    } else if (keyCode === 73) { // Tecla 'I' - Preview em tela cheia
      if (currentPageMovies[movieFocus]) {
        const actualMovieIndex = currentPage * ITEMS_PER_PAGE + movieFocus;
        const movie = movies[actualMovieIndex];
        const category = categories.find(cat => cat.category_id === movie.category_id);

        if (movie.category_id === '2' || movie.category_id === '29' || category?.category_name === 'Filmes | Adultos' || category?.category_name === 'XXX - Adultos') {
          setSelectedMovieForPassword(movie);
          setAlertMessage(null); // Limpar mensagens anteriores
          setShowPasswordError(false); // Limpar erro de senha
          setIsPasswordModalOpen(true);
          setFocusArea('modal');
        } else {
          handleMoviePreview(movie);
        }
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
    handleMoviePreview,
    handleMovieDetails
  ]);

  const handlePasswordCancel = () => {
    setIsPasswordModalOpen(false);
    setFocusArea('movies');
    setPassword('');
    setAlertMessage(null); // Limpar mensagem de erro ao cancelar
    setShowPasswordError(false); // Limpar erro de senha
  };

  const playMovie = useCallback((movie) => {
    // Construir URL do stream - usar stream_url diretamente no modo demo
    const streamUrl = isDemoMode() ? movie.stream_url : buildStreamUrl('movie', movie.stream_id, 'mp4');
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
  }, [categories, selectedCategory, isTizenTV, isDevelopment]);

  const handlePasswordSubmit = useCallback((password) => {
    if (password === '0000') { // Senha hardcoded
      setIsPasswordModalOpen(false);
      setShowPasswordError(false);
      if (selectedMovieForPassword) {
        playMovie(selectedMovieForPassword);
      }
    } else {
      setShowPasswordError(true);
    }
  }, [selectedMovieForPassword, playMovie]);

  const showMoviePreview = useCallback((movie) => {
    setIsPasswordModalOpen(false);
    if (movie) {
      handleMoviePreview(movie);
    }
  }, [handleMoviePreview]);

  const handleModalNavigation = useCallback((keyCode) => {
    if (!isPasswordModalOpen) return;

    if (keyCode === 39) { // Direita
      if (modalFocus === 'submit') setModalFocus('cancel');
    } else if (keyCode === 37) { // Esquerda
      if (modalFocus === 'cancel') setModalFocus('submit');
    } else if (keyCode === 40) { // Baixo
      if (modalFocus === 'input') setModalFocus('submit');
    } else if (keyCode === 38) { // Cima
      if (modalFocus !== 'input') setModalFocus('input');
    } else if (keyCode === 13) { // OK
      if (modalFocus === 'submit') {
        handlePasswordSubmit(password);
      } else if (modalFocus === 'cancel') {
        handlePasswordCancel();
      }
    } else if (keyCode === 10009) { // Voltar
      handlePasswordCancel();
    }
  }, [isPasswordModalOpen, modalFocus, password, handlePasswordSubmit, handlePasswordCancel]);

  // Sistema de navegação por controle remoto
  useEffect(() => {
    if (!isActive) return;

    const handleMoviesNavigation = (event) => {
      const { keyCode } = event.detail;

      if (focusArea === 'modal') {
        handleModalNavigation(keyCode);
        return;
      }



      if (focusArea === 'moviePreview') {
        // Delegar navegação para o preview de filme
        const previewEvent = new CustomEvent('moviePreviewNavigation', {
          detail: { keyCode }
        });
        window.dispatchEvent(previewEvent);
        return;
      }

      if (focusArea === 'categories') {
        handleCategoriesNavigation(keyCode);
      } else if (focusArea === 'movies') {
        handleMoviesNavigationInternal(keyCode);
      }
    };

    window.addEventListener('moviesNavigation', handleMoviesNavigation);
    return () => window.removeEventListener('moviesNavigation', handleMoviesNavigation);
  }, [isActive, focusArea, handleCategoriesNavigation, handleMoviesNavigationInternal, handleModalNavigation]);

  const closePreview = useCallback(() => {
    console.log('🎬 Movies - Fechando modal de preview');
    setShowPreview(false);
    setPreviewMovie(null);
    setFocusArea('movies'); // Voltar foco para os filmes
    console.log('🎬 Movies - Modal fechado, focusArea definido como "movies"');

    // Informar ao App.js que o preview foi fechado
    const previewActiveEvent = new CustomEvent('moviePreviewActive', {
      detail: { active: false }
    });
    window.dispatchEvent(previewActiveEvent);
  }, []);

  // Salvar estado ao desmontar o componente por segurança
  useEffect(() => {
    return () => {
      try {
        const stateToSave = {
          selectedCategory,
          categoryFocus,
          currentPage,
          movieFocus,
          focusArea: 'movies'
        };
        localStorage.setItem('moviesState', JSON.stringify(stateToSave));
        console.log('💾 Movies - Estado salvo no unmount:', stateToSave);
      } catch (e) {}
    };
  }, [selectedCategory, categoryFocus, currentPage, movieFocus]);



  // Função para tratar erros de imagem
  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  if (!isActive) return null;

  console.log('🎬 Movies - Renderizando componente:', {
    isActive,
    categories: categories.length,
    movies: movies.length,
    selectedCategory,
    loading,
    moviesLoading,
    currentPageMovies: currentPageMovies.length
  });

  return (
    <div className="movies-page" ref={containerRef}>
      {alertMessage && <AlertPopup message={alertMessage} onClose={() => setAlertMessage(null)} />}
      {isPasswordModalOpen && (
        <PasswordModal
          password={password}
          onPasswordChange={setPassword}
          onPasswordSubmit={handlePasswordSubmit}
          onCancel={handlePasswordCancel}
          focus={modalFocus}
          showError={showPasswordError}
        />
      )}
      <div className="category-sidebar">
        {loading ? (
          <div className="loading"></div>
        ) : (
          <div className="category-list">
            {categories.map((category, index) => (
              <button
                key={category.category_id}
                ref={el => categoriesRef.current[index] = el}
                className={`category-button ${selectedCategory === category.category_id ? 'active' : ''
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
            <div className="loading">Carregando filmes </div>
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
                      const movie = movies[actualMovieIndex];
                      const category = categories.find(cat => cat.category_id === movie.category_id);

                      if (movie.category_id === '2' || movie.category_id === '29' || category?.category_name === 'Filmes | Adultos' || category?.category_name === 'XXX - Adultos') {
                        setSelectedMovieForPassword(movie);
                        setAlertMessage(null); // Limpar mensagens anteriores
                        setShowPasswordError(false); // Limpar erro de senha
                        setIsPasswordModalOpen(true);
                        setFocusArea('modal');
                      } else {
                        handleMovieSelect(movie);
                      }
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
                        <h3 className="movie-title">
                          <span>{movie.name}</span>
                        </h3>
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