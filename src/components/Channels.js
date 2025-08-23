import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import PasswordModal from './PasswordModal';
import AlertPopup from './AlertPopup';
import { iptvApi } from '../services/iptvApi';
import { safeScrollIntoView } from '../utils/scrollUtils';
import { API_BASE_URL, API_CREDENTIALS, buildStreamUrl, buildEpgUrl } from '../config/apiConfig';
import { demoMovies, demoLiveCategories } from '../data/demoContent';
import './Channels.css';

const Channels = ({ isActive }) => {
  const [categories, setCategories] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // Estados de navegação
  const [focusArea, setFocusArea] = useState('categories'); // 'categories' ou 'channels'
  const [categoryFocus, setCategoryFocus] = useState(0);
  const [channelFocus, setChannelFocus] = useState(0);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedChannelForPassword, setSelectedChannelForPassword] = useState(null);
  const [modalFocus, setModalFocus] = useState('input'); // 'input', 'submit', or 'cancel'
  const [currentPlayingChannel, setCurrentPlayingChannel] = useState(null);
  const [password, setPassword] = useState('');
  const [alertMessage, setAlertMessage] = useState(null);
  const [showPasswordError, setShowPasswordError] = useState(false);

  // EPG (XMLTV)
  const [epgIndex, setEpgIndex] = useState(null); // { [channelId: string]: Array<{ start: Date, end: Date, title: string }> }
  const [epgLoading, setEpgLoading] = useState(false);
  const [epgLoadedAt, setEpgLoadedAt] = useState(null);
  
  // Estados para detalhes do EPG
  const [showEpgDetails, setShowEpgDetails] = useState(false);
  const [selectedChannelForEpg, setSelectedChannelForEpg] = useState(null);
  const [epgDetails, setEpgDetails] = useState([]);
  const [epgFocus, setEpgFocus] = useState(0); // Foco no programa do EPG
  const [epgModalArea, setEpgModalArea] = useState('programs'); // 'programs' ou 'close'

  // Estados de paginação (dinâmicos conforme layout)
  const [currentPage, setCurrentPage] = useState(0);

  // Layout dinâmico: lista para canais ao vivo, grid para filmes demo
  const isMoviesDemoCategory = isDemoMode() && selectedCategory === '25';
  const GRID_COLUMNS = isMoviesDemoCategory ? 5 : 1;
  const GRID_ROWS = isMoviesDemoCategory ? 3 : 15; // 15 linhas por página na lista
  const ITEMS_PER_PAGE = GRID_COLUMNS * GRID_ROWS;

  // Ref para restaurar estado ao voltar de player
  const restoreStateRef = useRef(null);

  // Referencias para navegação
  const categoriesRef = useRef([]);
  const channelsRef = useRef([]);
  const epgProgramsRef = useRef([]);
  const epgCloseButtonRef = useRef(null);
  const containerRef = useRef(null);
  const previewVideoRef = useRef(null);
  const previewHlsRef = useRef(null);

  // Verificar se está em modo demo (email Samsung)
  function isDemoMode() {
    const testMode = localStorage.getItem('testMode');
    const authEmail = localStorage.getItem('authEmail');
    return testMode === 'true' && authEmail === 'samsungtest1@samsung.com';
  }

  // Converter filmes demo em formato de canais
  const getMoviesAsChannels = () => {
    return demoMovies.map(movie => ({
      stream_id: `channel_movie_${movie.stream_id}`,
      name: `🎬 ${movie.name}`,
      stream_icon: movie.stream_icon,
      category_name: '🧪 Filmes Demo',
      category_id: '25',
      stream_url: movie.stream_url,
      epg_channel_id: `movie_${movie.stream_id}`,
      tv_archive: 0,
      tv_archive_duration: 0,
      // Informações extras do filme
      plot: movie.plot,
      rating: movie.rating,
      releasedate: movie.releasedate,
      genre: movie.genre,
      director: movie.director,
      cast: movie.cast
    }));
  };

  // Persistência de estado dos canais
  const saveChannelsState = useCallback(() => {
    try {
      const stateToSave = {
        selectedCategory,
        categoryFocus,
        currentPage,
        channelFocus,
        focusArea: 'channels'
      };
      localStorage.setItem('channelsState', JSON.stringify(stateToSave));
      console.log('💾 Channels - Estado salvo:', stateToSave);
    } catch (e) {
      console.warn('Não foi possível salvar o estado dos canais:', e);
    }
  }, [selectedCategory, categoryFocus, currentPage, channelFocus]);

  const loadSavedChannelsState = useCallback(() => {
    try {
      const raw = localStorage.getItem('channelsState');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }, []);

  // ===== Utilitários EPG (XMLTV) =====
  const parseXmltvDate = (value) => {
    if (!value) return null;
    try {
      const match = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
      if (!match) return null;
      const [_, y, m, d, hh, mm, ss, offset] = match;
      const iso = `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
      const date = new Date(iso);
      if (offset) {
        const sign = offset.startsWith('-') ? -1 : 1;
        const offHours = parseInt(offset.slice(1, 3), 10);
        const offMins = parseInt(offset.slice(3, 5), 10);
        const totalMinutes = sign * (offHours * 60 + offMins);
        date.setMinutes(date.getMinutes() - totalMinutes);
      }
      return date;
    } catch (e) {
      return null;
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getCurrentAndNextFromIndex = useCallback((index, channelId) => {
    if (!index || !channelId) return {};
    const list = index[channelId];
    if (!list || list.length === 0) return {};
    const now = new Date();
    let current = null;
    let next = null;
    for (let i = 0; i < list.length; i++) {
      const prog = list[i];
      if (prog.start <= now && prog.end > now) {
        current = prog;
        next = list[i + 1] || null;
        break;
      }
      if (prog.start > now) {
        next = prog;
        break;
      }
    }
    const currentProgram = current
      ? { title: current.title, startTime: `${formatTime(current.start)} - ${formatTime(current.end)}` }
      : undefined;
    const nextProgram = next
      ? { title: next.title, startTime: `${formatTime(next.start)} - ${formatTime(next.end)}` }
      : undefined;
    return { currentProgram, nextProgram };
  }, []);

  // Função para obter detalhes completos do EPG de um canal
  const getEpgDetailsForChannel = useCallback((channelId) => {
    if (!epgIndex || !channelId) return [];
    const list = epgIndex[channelId];
    if (!list || list.length === 0) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Filtrar programas de hoje e amanhã
    const todayPrograms = list.filter(prog => {
      const progDate = new Date(prog.start);
      return progDate >= today && progDate < tomorrow;
    });
    
    // Ordenar por horário
    return todayPrograms.sort((a, b) => a.start - b.start);
  }, [epgIndex]);

  const loadEpg = useCallback(async () => {
    try {
      const url = buildEpgUrl();
      if (!url) {
        setEpgIndex(null);
        return;
      }
      setEpgLoading(true);
      const response = await fetch(url);
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'text/xml');
      const programmes = Array.from(xml.getElementsByTagName('programme'));
      const index = {};
      for (const node of programmes) {
        const channelId = node.getAttribute('channel');
        const start = parseXmltvDate(node.getAttribute('start'));
        const end = parseXmltvDate(node.getAttribute('stop'));
        const titleNode = node.getElementsByTagName('title')[0];
        const title = titleNode ? (titleNode.textContent || '').trim() : '';
        if (!channelId || !start || !end) continue;
        if (!index[channelId]) index[channelId] = [];
        index[channelId].push({ start, end, title });
      }
      Object.keys(index).forEach((cid) => {
        index[cid].sort((a, b) => a.start - b.start);
      });
      setEpgIndex(index);
      setEpgLoadedAt(new Date());
    } catch (err) {
      console.warn('Falha ao carregar/parsear EPG (XMLTV):', err);
      setEpgIndex(null);
    } finally {
      setEpgLoading(false);
    }
  }, []);

  // Função para carregar categorias de canais ao vivo
  const loadLiveCategories = useCallback(async () => {
    setLoading(true);
    try {
      let categories = [];
      
      if (isDemoMode()) {
        // Em modo demo, usar categorias demo + categoria de filmes
        categories = [
          ...demoLiveCategories,
          { category_id: '25', category_name: 'Filmes Demo', parent_id: 0 }
        ];
        console.log('🧪 Carregando categorias demo para canais ao vivo:', categories);
      } else {
        // Modo normal, carregar categorias da API
        const response = await fetch(
          `${API_BASE_URL}?${API_CREDENTIALS}&action=get_live_categories`
        );
        categories = await response.json();
      }
      
      setCategories(categories);

      const saved = restoreStateRef.current;
      if (saved && categories.length > 0) {
        const savedCategoryId = String(saved.selectedCategory);
        const catIndex = categories.findIndex(c => String(c.category_id) === savedCategoryId);
        if (catIndex >= 0) {
          console.log('📺 Channels - Restaurando estado salvo:', saved);
          setSelectedCategory(savedCategoryId);
          setCategoryFocus(catIndex);
          await loadLiveChannels(savedCategoryId, { restoreState: saved, preserveFocus: true });
          setFocusArea('channels');
          return;
        }
      }

      // Selecionar primeira categoria automaticamente
      if (categories.length > 0) {
        setSelectedCategory(categories[0].category_id);
        setCategoryFocus(0);
        loadLiveChannels(categories[0].category_id);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para carregar canais de uma categoria
  const loadLiveChannels = useCallback(async (categoryId, options = {}) => {
    setChannelsLoading(true);
    const isRestoring = !!options.restoreState;
    if (!options.preserveFocus) {
      setChannelFocus(0);
      setCurrentPage(0);
    } else if (isRestoring) {
      const restorePage = Math.max(0, options.restoreState.currentPage || 0);
      setCurrentPage(restorePage);
    }
    try {
      let channels = [];
      
      if (isDemoMode()) {
        if (categoryId === '25') {
          // Categoria de filmes demo
          channels = getMoviesAsChannels();
          console.log('🎬 Carregando filmes demo como canais:', channels);
        } else {
          // Outras categorias demo - usar canais demo existentes
          const { demoChannels } = await import('../data/demoContent');
          channels = demoChannels.filter(channel => channel.category_id === categoryId);
          console.log('🧪 Carregando canais demo para categoria:', categoryId, channels);
        }
      } else {
        // Modo normal, carregar da API
        const response = await fetch(
          `${API_BASE_URL}?${API_CREDENTIALS}&action=get_live_streams&category_id=${categoryId}`
        );
        channels = await response.json();
      }
      
      setChannels(channels);

      if (isRestoring && options.restoreState) {
        const restorePage = Math.max(0, options.restoreState.currentPage || 0);
        const restoreChannelFocus = Math.max(0, options.restoreState.channelFocus || 0);
        const startIndex = restorePage * ITEMS_PER_PAGE;
        const countInPage = channels.slice(startIndex, startIndex + ITEMS_PER_PAGE).length;
        const clampedFocus = Math.min(restoreChannelFocus, Math.max(0, countInPage - 1));
        setChannelFocus(clampedFocus);
      } else if (focusArea === 'channels') {
        setChannelFocus(0);
      }
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
      setChannels([]);
    } finally {
      setChannelsLoading(false);
    }
  }, [focusArea]);

  // Calcular canais da página atual
  const getCurrentPageChannels = useCallback(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return channels.slice(startIndex, endIndex);
  }, [currentPage, channels]);

  const totalPages = Math.ceil(channels.length / ITEMS_PER_PAGE);
  const currentPageChannels = getCurrentPageChannels();

  // Função para selecionar canal
  const handleChannelSelect = useCallback((channel) => {
    console.log('Canal selecionado:', channel);
    setCurrentPlayingChannel(channel);

    // Salvar estado atual antes de sair para o player
    saveChannelsState();

    let streamUrl;
    let streamInfo;

    // Se for um filme demo (canal de filme), usar o stream_url diretamente
    if (isDemoMode() && channel.stream_id?.startsWith('channel_movie_')) {
      streamUrl = channel.stream_url;
      streamInfo = {
        name: channel.name,
        category: 'Filmes Demo',
        description: channel.plot || `Filme demo - ${channel.name}`,
        type: 'movie',
        logo: channel.stream_icon,
        // Informações extras do filme
        rating: channel.rating,
        releasedate: channel.releasedate,
        genre: channel.genre,
        director: channel.director,
        cast: channel.cast
      };
      console.log('🎬 Reproduzindo filme demo como canal:', streamInfo);
    } else {
      // Canal normal
      streamUrl = isDemoMode() ? channel.stream_url : buildStreamUrl('live', channel.stream_id, 'ts');
      const epgId = channel.epg_channel_id || channel.epg_channel || channel.tvg_id;
      const { currentProgram, nextProgram } = getCurrentAndNextFromIndex(epgIndex, epgId);
      streamInfo = {
        name: channel.name,
        category: selectedCategory ? categories.find(cat => cat.category_id === selectedCategory)?.category_name : 'Canal',
        description: `Canal ao vivo - ${channel.name}`,
        type: 'live',
        logo: channel.stream_icon,
        number: channel.num || undefined,
        currentProgram,
        nextProgram
      };
    }

    // Disparar evento para reproduzir no VideoPlayer
    const playEvent = new CustomEvent('playContent', {
      detail: { streamUrl, streamInfo }
    });
    window.dispatchEvent(playEvent);
  }, [selectedCategory, categories, saveChannelsState, epgIndex, getCurrentAndNextFromIndex]);

  // Função para clicar em categoria
  const handleCategoryClick = useCallback((categoryId) => {
    setSelectedCategory(categoryId);
    const categoryIndex = categories.findIndex(cat => cat.category_id === categoryId);
    setCategoryFocus(categoryIndex);
    loadLiveChannels(categoryId);
    setFocusArea('channels'); // Mover foco para os canais
  }, [categories, loadLiveChannels]);

  // Carregar categorias de canais ao vivo
  useEffect(() => {
    if (isActive) {
      restoreStateRef.current = loadSavedChannelsState();
      loadLiveCategories();
      loadEpg();
    }
  }, [isActive, loadLiveCategories, loadSavedChannelsState, loadEpg]);

  // Seleciona a URL de preview (primeiro canal) quando abre canais
  useEffect(() => {
    if (!isActive) return;
    if (currentPageChannels.length > 0) {
      const first = currentPageChannels[0];
      const url = isDemoMode() ? (first.stream_url || first.url || '') : buildStreamUrl('live', first.stream_id, 'm3u8');
      if (url && url !== previewUrl) {
        setPreviewUrl(url);
      }
    }
  }, [isActive, currentPageChannels, previewUrl]);

  // Inicializa o vídeo de preview fixo em background
  useEffect(() => {
    if (!isActive) return;
    const video = previewVideoRef.current;
    if (!video || !previewUrl) return;

    // Limpar instância antiga
    if (previewHlsRef.current) {
      try { previewHlsRef.current.destroy(); } catch (_) {}
      previewHlsRef.current = null;
    }

    try {
      const isM3u8 = typeof previewUrl === 'string' && previewUrl.includes('.m3u8');
      if (isM3u8 && Hls.isSupported()) {
        const hls = new Hls({ lowLatencyMode: true });
        previewHlsRef.current = hls;
        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(previewUrl);
        });
      } else {
        video.src = previewUrl;
        video.load();
      }

      // Iniciar silencioso para autoplay
      video.muted = true;
      video.playsInline = true;
      const p = video.play();
      if (p && typeof p.then === 'function') p.catch(() => {});
    } catch (e) {
      console.warn('Falha ao iniciar preview de canais:', e);
    }

    return () => {
      if (previewHlsRef.current) {
        try { previewHlsRef.current.destroy(); } catch (_) {}
        previewHlsRef.current = null;
      }
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (_) {}
      }
    };
  }, [isActive, previewUrl]);

  // Efeito para auto-scroll baseado no foco
  useEffect(() => {
    // Limpar focos anteriores
    categoriesRef.current.forEach(ref => ref?.classList.remove('focused'));
    channelsRef.current.forEach(ref => ref?.classList.remove('focused'));

    // Auto-scroll para categoria focada
    if (focusArea === 'categories' && categoriesRef.current[categoryFocus]) {
      categoriesRef.current[categoryFocus].classList.add('focused');
      safeScrollIntoView(categoriesRef.current[categoryFocus], {
        behavior: 'smooth',
        block: 'nearest'
      });
    }
    // Auto-scroll para canal focado
    else if (focusArea === 'channels' && channelsRef.current[channelFocus]) {
      channelsRef.current[channelFocus].classList.add('focused');
      safeScrollIntoView(channelsRef.current[channelFocus], {
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [focusArea, categoryFocus, channelFocus]);

  // Função de navegação das categorias
  const handleCategoriesNavigation = useCallback((keyCode) => {
    if (keyCode === 38) { // Cima
      setCategoryFocus(prev => Math.max(0, prev - 1));
    } else if (keyCode === 40) { // Baixo
      setCategoryFocus(prev => Math.min(categories.length - 1, prev + 1));
    } else if (keyCode === 37) { // Esquerda - voltar para sidebar
      const backEvent = new CustomEvent('backToSidebar');
      window.dispatchEvent(backEvent);
    } else if (keyCode === 39) { // Direita - ir para canais
      if (channels.length > 0) {
        setFocusArea('channels');
        setChannelFocus(0);
      }
    } else if (keyCode === 13) { // OK - selecionar categoria
      if (categories[categoryFocus]) {
        const selectedCat = categories[categoryFocus];
        setSelectedCategory(selectedCat.category_id);
        loadLiveChannels(selectedCat.category_id);
      }
    }
  }, [categories, categoryFocus, channels.length, loadLiveChannels]);

  // Função para mostrar detalhes do EPG
  const showEpgDetailsForChannel = useCallback((channel) => {
    const epgId = channel.epg_channel_id || channel.epg_channel_id || channel.tvg_id;
    if (!epgId) {
      setAlertMessage('Este canal não possui informações de programação disponíveis.');
      return;
    }
    
    const details = getEpgDetailsForChannel(epgId);
    if (details.length === 0) {
      setAlertMessage('Nenhuma programação encontrada para este canal.');
      return;
    }
    
    setSelectedChannelForEpg(channel);
    setEpgDetails(details);
    setEpgFocus(0);
    setEpgModalArea('programs');
    setShowEpgDetails(true);
    setFocusArea('epgDetails');
  }, [getEpgDetailsForChannel]);

  // Função para fechar detalhes do EPG
  const closeEpgDetails = () => {
    setShowEpgDetails(false);
    setSelectedChannelForEpg(null);
    setEpgDetails([]);
    setEpgFocus(0);
    setEpgModalArea('programs');
    setFocusArea('channels');
  };

  // Função de navegação do modal EPG
  const handleEpgNavigation = useCallback((keyCode) => {
    if (keyCode === 37 || keyCode === 8) { // Esquerda ou Back
      closeEpgDetails();
      return;
    }

    if (epgDetails.length === 0) return;

    if (keyCode === 38) { // Cima
      if (epgModalArea === 'close') {
        setEpgModalArea('programs');
        setEpgFocus(Math.min(epgFocus, epgDetails.length - 1));
      } else if (epgModalArea === 'programs' && epgFocus > 0) {
        setEpgFocus(epgFocus - 1);
      }
    } else if (keyCode === 40) { // Baixo
      if (epgModalArea === 'programs') {
        if (epgFocus < epgDetails.length - 1) {
          setEpgFocus(epgFocus + 1);
        } else {
          setEpgModalArea('close');
        }
      }
    } else if (keyCode === 13) { // OK/Enter
      if (epgModalArea === 'close') {
        closeEpgDetails();
      }
      // Para programas, poderia implementar ação específica no futuro
    }
  }, [epgDetails.length, epgModalArea, epgFocus, closeEpgDetails]);

  // useEffect para scroll automático no modal EPG
  useEffect(() => {
    if (!showEpgDetails) return;

    if (epgModalArea === 'programs' && epgProgramsRef.current[epgFocus]) {
      epgProgramsRef.current[epgFocus].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    } else if (epgModalArea === 'close' && epgCloseButtonRef.current) {
      epgCloseButtonRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [showEpgDetails, epgModalArea, epgFocus]);

  // Função de navegação dos canais (lista para ao vivo; grid para demo filmes)
  const handleChannelsNavigationInternal = useCallback((keyCode) => {
    const currentPageChannelsCount = currentPageChannels.length;

    if (keyCode === 38) { // Cima
      if (GRID_COLUMNS === 1) {
        // Lista
        if (channelFocus > 0) {
          setChannelFocus(channelFocus - 1);
        } else if (currentPage > 0) {
          setCurrentPage(currentPage - 1);
          const lastPageCount = channels.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).length;
          setChannelFocus(Math.max(0, lastPageCount - 1));
        }
      } else {
        // Grid (demo filmes)
        const currentRow = Math.floor(channelFocus / GRID_COLUMNS);
        if (currentRow > 0) {
          const newFocus = Math.max(0, channelFocus - GRID_COLUMNS);
          setChannelFocus(newFocus);
        } else if (currentPage > 0) {
          setCurrentPage(currentPage - 1);
          const currentCol = channelFocus % GRID_COLUMNS;
          const newFocusAttempt = (GRID_ROWS - 1) * GRID_COLUMNS + currentCol;
          const lastPageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
          const previousPageChannelsCount = channels.slice(lastPageStartIndex, lastPageStartIndex + ITEMS_PER_PAGE).length;
          setChannelFocus(Math.min(newFocusAttempt, previousPageChannelsCount - 1));
        }
      }
    } else if (keyCode === 40) { // Baixo
      if (GRID_COLUMNS === 1) {
        // Lista
        if (channelFocus < currentPageChannelsCount - 1) {
          setChannelFocus(channelFocus + 1);
        } else if (currentPage < totalPages - 1) {
          setCurrentPage(currentPage + 1);
          setChannelFocus(0);
        }
      } else {
        // Grid (demo filmes)
        const currentRow = Math.floor(channelFocus / GRID_COLUMNS);
        const maxRow = Math.floor((currentPageChannelsCount - 1) / GRID_COLUMNS);
        if (currentRow < maxRow) {
          const newFocus = Math.min(currentPageChannelsCount - 1, channelFocus + GRID_COLUMNS);
          setChannelFocus(newFocus);
        } else if (currentPage < totalPages - 1) {
          setCurrentPage(currentPage + 1);
          setChannelFocus(channelFocus % GRID_COLUMNS);
        }
      }
    } else if (keyCode === 37) { // Esquerda
      // Voltar direto para categorias independente do canal atual
      setFocusArea('categories');
      const selectedIndex = categories.findIndex(cat => cat.category_id === selectedCategory);
      setCategoryFocus(selectedIndex >= 0 ? selectedIndex : 0);
    } else if (keyCode === 39) { // Direita
      // Mostrar detalhes do EPG do canal atual
      if (currentPageChannels[channelFocus]) {
        const actualChannelIndex = currentPage * ITEMS_PER_PAGE + channelFocus;
        const channel = channels[actualChannelIndex];
        showEpgDetailsForChannel(channel);
      }
    } else if (keyCode === 13) { // OK - selecionar canal
      if (currentPageChannels[channelFocus]) {
        const actualChannelIndex = currentPage * ITEMS_PER_PAGE + channelFocus;
        const channel = channels[actualChannelIndex];
        const category = categories.find(cat => cat.category_id === channel.category_id);

        if (channel.category_id === '2' || category?.category_name === 'Canais | Adultos') {
          setSelectedChannelForPassword(channel);
          setShowPasswordError(false); // Limpar erro de senha
          setIsPasswordModalOpen(true);
          setFocusArea('modal');
        } else {
          handleChannelSelect(channel);
        }
      }
    }
  }, [
    currentPageChannels,
    channelFocus,
    currentPage,
    totalPages,
    channels,
    categories,
    selectedCategory,
    handleChannelSelect
  ]);

  const handlePasswordCancel = () => {
    setIsPasswordModalOpen(false);
    setFocusArea('channels');
    setPassword('');
    setShowPasswordError(false); // Limpar erro de senha
  };

  const playChannel = useCallback((channel) => {
    let streamUrl;
    let streamInfo;

    // Se for um filme demo (canal de filme), usar o stream_url diretamente
    if (isDemoMode() && channel.stream_id?.startsWith('channel_movie_')) {
      streamUrl = channel.stream_url;
      streamInfo = {
        name: channel.name,
        category: 'Filmes Demo',
        description: channel.plot || `Filme demo - ${channel.name}`,
        type: 'movie',
        logo: channel.stream_icon,
        rating: channel.rating,
        releasedate: channel.releasedate,
        genre: channel.genre,
        director: channel.director,
        cast: channel.cast
      };
    } else {
      // Canal normal
      streamUrl = isDemoMode() ? channel.stream_url : buildStreamUrl('live', channel.stream_id, 'ts');
      const epgId = channel.epg_channel_id || channel.epg_channel || channel.tvg_id;
      const { currentProgram, nextProgram } = getCurrentAndNextFromIndex(epgIndex, epgId);
      streamInfo = {
        name: channel.name,
        category: selectedCategory ? categories.find(cat => cat.category_id === selectedCategory)?.category_name : 'Canal',
        description: `Canal ao vivo - ${channel.name}`,
        type: 'live',
        logo: channel.stream_icon,
        number: channel.num || undefined,
        currentProgram,
        nextProgram
      };
    }

    const playEvent = new CustomEvent('playContent', {
      detail: { streamUrl, streamInfo }
    });
    window.dispatchEvent(playEvent);
  }, [categories, selectedCategory, epgIndex, getCurrentAndNextFromIndex]);

  const handlePasswordSubmit = useCallback((password) => {
    if (password === '0000') { // Senha hardcoded
      setIsPasswordModalOpen(false);
      setShowPasswordError(false);
      if (selectedChannelForPassword) {
        playChannel(selectedChannelForPassword);
      }
    } else {
      setShowPasswordError(true);
    }
  }, [selectedChannelForPassword, playChannel]);

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

  useEffect(() => {
    if (!isActive) return;

    const handleChannelsNavigation = (event) => {
      const { keyCode } = event.detail;

      if (focusArea === 'modal') {
        handleModalNavigation(keyCode);
        return;
      }

      // If a channel is currently playing, handle left/right for channel switching
      if (currentPlayingChannel) {
        const currentIndex = channels.findIndex(c => c.stream_id === currentPlayingChannel.stream_id);
        if (keyCode === 37) { // Left arrow
          if (currentIndex > 0) {
            handleChannelSelect(channels[currentIndex - 1]);
          } else if (channels.length > 0) {
            // Loop to the last channel if at the beginning
            handleChannelSelect(channels[channels.length - 1]);
          }
          return; // Consume the event
        } else if (keyCode === 39) { // Right arrow
          if (currentIndex < channels.length - 1) {
            handleChannelSelect(channels[currentIndex + 1]);
          } else if (channels.length > 0) {
            // Loop to the first channel if at the end
            handleChannelSelect(channels[0]);
          }
          return; // Consume the event
        }
      }

      if (focusArea === 'categories') {
        handleCategoriesNavigation(keyCode);
      } else if (focusArea === 'channels') {
        handleChannelsNavigationInternal(keyCode);
      } else if (focusArea === 'epgDetails') {
        // Navegação para detalhes do EPG
        handleEpgNavigation(keyCode);
      }
    };

    window.addEventListener('channelsNavigation', handleChannelsNavigation);
    return () => window.removeEventListener('channelsNavigation', handleChannelsNavigation);
  }, [isActive, focusArea, handleCategoriesNavigation, handleChannelsNavigationInternal, handleModalNavigation, currentPlayingChannel, channels, handleChannelSelect, closeEpgDetails, handleEpgNavigation]);

  // Função para tratar erros de imagem
  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  if (!isActive) return null;

  return (
    <div className="channels-page" ref={containerRef}>
      {/* Vídeo de preview em background para efeito de transparência */}
      <video
        ref={previewVideoRef}
        className="channels-preview-video"
        muted
        playsInline
        autoPlay
        loop
      />
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
      
      {/* Modal de detalhes do EPG */}
      {showEpgDetails && selectedChannelForEpg && (
        <div className="epg-details-modal">
          <div className="epg-details-content">
            <div className="epg-details-header">
              <h2>📺 {selectedChannelForEpg.name}</h2>
              <button 
                ref={epgCloseButtonRef}
                className={`epg-close-button ${epgModalArea === 'close' ? 'focused' : ''}`}
                onClick={closeEpgDetails}
              >
                ✕
              </button>
            </div>
            <div className="epg-details-body">
              <h3>📅 Programação do Dia</h3>
              {epgDetails.length > 0 ? (
                <div className="epg-program-list">
                  {epgDetails.map((program, index) => (
                    <div 
                      key={index} 
                      ref={el => epgProgramsRef.current[index] = el}
                      className={`epg-program-item ${
                        epgModalArea === 'programs' && epgFocus === index ? 'focused' : ''
                      }`}
                    >
                      <div className="epg-program-time">
                        {formatTime(program.start)} - {formatTime(program.end)}
                      </div>
                      <div className="epg-program-title">
                        {program.title}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="epg-no-programs">
                  Nenhuma programação encontrada para este canal.
                </p>
              )}
            </div>
            <div className="epg-details-footer">
              <p className="epg-navigation-hint">
                Use ↑↓ (setas) para navegar • ← (esquerda) ou Back para fechar • OK para confirmar
              </p>
            </div>
          </div>
        </div>
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
        <div className="channels-content">
          {channelsLoading ? (
            <div className="loading">Carregando canais </div>
          ) : (
            <>
              {totalPages > 1 && (
                <div className="pagination-info">
                  <span>Página {currentPage + 1} de {totalPages}</span>
                  <span className="channels-count">
                    {channels.length} canais • {currentPageChannels.length} nesta página
                  </span>
                </div>
              )}
              {isMoviesDemoCategory ? (
                <div className="channels-grid">
                  {currentPageChannels.map((channel, index) => (
                    <div
                      key={channel.stream_id}
                      ref={el => channelsRef.current[index] = el}
                      className="channel"
                    >
                      <div className="channel-poster">
                        {channel.stream_icon && (
                          <img
                            src={channel.stream_icon}
                            alt={channel.name}
                            onError={handleImageError}
                          />
                        )}
                        <div className="channel-overlay">
                          <h3 className="channel-card-title">{channel.name}</h3>
                          {(() => {
                            const epgId = channel.epg_channel_id || channel.epg_channel || channel.tvg_id;
                            const info = getCurrentAndNextFromIndex(epgIndex, epgId);
                            return info.currentProgram ? (
                              <p className="channel-epg-now">{info.currentProgram.title} • {info.currentProgram.startTime}</p>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="channels-list">
                  {currentPageChannels.map((channel, index) => {
                    const channelNumber = channel.num != null
                      ? String(channel.num).padStart(3, '0')
                      : '';
                    const epgId = channel.epg_channel_id || channel.epg_channel || channel.tvg_id;
                    const info = getCurrentAndNextFromIndex(epgIndex, epgId);
                    return (
                      <div
                        key={channel.stream_id}
                        ref={el => channelsRef.current[index] = el}
                        className="channel-row"
                        onClick={() => handleChannelSelect(channel)}
                      >
                        <span className="channel-number">{channelNumber}</span>
                        {channel.stream_icon && (
                          <img
                            className="channel-logo"
                            src={channel.stream_icon}
                            alt={channel.name}
                            onError={handleImageError}
                          />
                        )}
                        <span className="channel-name">{channel.name}</span>
                        {info.currentProgram && (
                          <span className="channel-epg">{info.currentProgram.title} • {info.currentProgram.startTime}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Channels;
