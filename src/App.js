import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './App.css';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';
import CreateAccountScreen from './components/CreateAccountScreen';
import PaymentScreen from './components/PaymentScreen';
import Home from './components/Home';
import Sidebar from './components/Sidebar';
import Channels from './components/Channels';
import Movies from './components/Movies';
import Series from './components/Series';
import SeriesDetailsPage from './components/SeriesDetailsPage';
import MovieDetailsPage from './components/MovieDetailsPage';
import SearchMovieDetailsPage from './components/SearchMovieDetailsPage';
import Search from './components/Search';
import VideoPlayer from './components/VideoPlayer';
import IptvPendingScreen from './components/IptvPendingScreen';
import LogoutConfirmModal from './components/LogoutConfirmModal';
import GroupCodeModal from './components/GroupCodeModal';
import TermsPage from './components/TermsPage';
import { criarContaIptv, getPlayerConfig, validarToken } from './services/authService';
import { setPlayerConfig, clearPlayerConfig } from './config/apiConfig';

// Estado das seções (migrado do conceito original)
const SECTIONS = {
    TERMS: 'terms',
  LOGIN: 'login',
  SIGNUP: 'signup',
  CREATE_ACCOUNT: 'create_account',
  PAYMENT: 'payment',
  HOME: 'home',
  CHANNELS: 'channels',
  MOVIES: 'movies',
  MOVIES_DETAILS: 'movies_details',
  SERIES: 'series',
  SERIES_DETAILS: 'series_details',
  SEARCH: 'search',
  SEARCH_MOVIE_DETAILS: 'search_movie_details',
  PLAYER: 'player',
  IPTV_PENDING: 'iptv_pending'
};

// Menu items base (sincronizado com Sidebar.js)
const baseMenuItems = [
  { id: 'search', label: 'Pesquisar', icon: 'fa-magnifying-glass' },
  { id: 'home', label: 'Home', icon: 'fa-house' },
  { id: 'channels', label: 'Canais Ao Vivo', icon: 'fa-tv' },
  { id: 'movies', label: 'Filmes', icon: 'fa-film' },
  { id: 'series', label: 'Séries', icon: 'fa-video' },
  { id: 'logout', label: 'Sair', icon: 'fa-right-from-bracket' },
];

function App() {
  const [currentSection, setCurrentSection] = useState(SECTIONS.LOGIN);
  const [menuFocus, setMenuFocus] = useState(0);
  const [shelfFocus, setShelfFocus] = useState(-1);
  const [itemFocus, setItemFocus] = useState(0);
  const [onMenu, setOnMenu] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [selectedSeriesData, setSelectedSeriesData] = useState(null);
  const [seriesDetailsOrigin, setSeriesDetailsOrigin] = useState(null); // Para rastrear de onde veio a navegação
  const [selectedMovieData, setSelectedMovieData] = useState(null);
  const [movieDetailsOrigin, setMovieDetailsOrigin] = useState(null); // Para rastrear de onde veio a navegação
  const [selectedSearchMovieData, setSelectedSearchMovieData] = useState(null);
  const [searchMovieDetailsOrigin, setSearchMovieDetailsOrigin] = useState(null); // Para rastrear de onde veio a navegação
  const [sectionHistory, setSectionHistory] = useState([]);
  const [moviePreviewActive, setMoviePreviewActive] = useState(false);
  const [clienteData, setClienteData] = useState(null);
  const [macAddress, setMacAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Para tela de loading inicial
  const [authError, setAuthError] = useState(''); // Para erros no login
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showGroupCodeModal, setShowGroupCodeModal] = useState(false);
  const [hasGroupCode, setHasGroupCode] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // Criar menu dinâmico baseado no estado do código de grupo (sincronizado com Sidebar.js)
  const menuItems = useMemo(() => {
    const items = [...baseMenuItems];
    
    // Inserir item de código de grupo antes do logout
    const logoutIndex = items.findIndex(item => item.id === 'logout');
    const groupCodeItem = hasGroupCode 
      ? { id: 'group-code', label: 'Alterar Grupo', icon: 'fa-users-gear' }
      : { id: 'group-code', label: 'Configurar Grupo', icon: 'fa-users' };
    
    items.splice(logoutIndex, 0, groupCodeItem);
    return items;
  }, [hasGroupCode]);

  // Função para navegar para uma seção e rastrear histórico
  const navigateToSection = useCallback((newSection, addToHistory = true) => {
    if (addToHistory && currentSection !== newSection) {
      setSectionHistory(prev => [...prev, currentSection]);
    }
    setCurrentSection(newSection);
  }, [currentSection]);

  // Função para voltar usando histórico
  const navigateBack = useCallback(() => {
    if (sectionHistory.length > 0) {
      const previousSection = sectionHistory[sectionHistory.length - 1];
      setSectionHistory(prev => prev.slice(0, -1));
      setCurrentSection(previousSection);
      return true; // Indica que conseguiu voltar
    }
    return false; // Indica que não há histórico
  }, [sectionHistory]);

  // Efeito para verificar autenticação na inicialização do App
  useEffect(() => {
    const accepted = localStorage.getItem('termsAccepted') === 'true';
    const checkAuth = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const email = localStorage.getItem('authEmail');
      const groupCode = localStorage.getItem('groupCode');
      const isTestMode = localStorage.getItem('testMode') === 'true';

      if (token && email) {
        const userData = { email };
        setClienteData({ token, ...userData });
        
        // Se estiver em modo de teste, pular verificações de API
        if (isTestMode) {
          console.log('🧪 Modo de teste detectado - pulando verificações de API');
          setHasGroupCode(!!groupCode);
          navigateToSection(SECTIONS.HOME, false);
          setIsLoading(false);
          return;
        }
        
        // Verificar se há código de grupo configurado
        if (groupCode) {
          setHasGroupCode(true);
          try {
            // Tentar carregar configuração do player se há código de grupo
            const playerCfg = await getPlayerConfig(token);
            setPlayerConfig(playerCfg);
            console.log('Sessão restaurada com código de grupo. Configuração:', playerCfg);
          } catch (error) {
            if (error.isPending) {
              console.log('Conta IPTV está pendente.');
              navigateToSection(SECTIONS.IPTV_PENDING, false);
              setIsLoading(false);
              return;
            } else {
              console.warn('Erro ao carregar configuração do player, mas mantendo sessão:', error.message);
              setGlobalError('Erro ao carregar configuração. Tente configurar o código de grupo novamente.');
              // Manter sessão mesmo com erro na configuração
            }
          }
        } else {
          setHasGroupCode(false);
          console.log('Sessão restaurada sem código de grupo.');
        }
        
        navigateToSection(SECTIONS.HOME, false);
      } else {
        navigateToSection(SECTIONS.LOGIN, false);
      }
      setIsLoading(false);
    };

    if (!accepted) {
      navigateToSection(SECTIONS.TERMS, false);
      setIsLoading(false);
    } else {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registrar teclas do controle remoto Tizen (mantido do template original)
  useEffect(() => {
    if (window.tizen && window.tizen.tvinputdevice) {
      const keys = [
        'MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop',
        'MediaFastForward', 'MediaRewind',
        'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue',
      ];
      keys.forEach(k => window.tizen.tvinputdevice.registerKey(k));
    }
  }, []);

  // Sistema de navegação Tizen melhorado
  useEffect(() => {
    const handleKeyDown = (e) => {
      const keyCode = e.keyCode;

      // Se estiver na página de Termos, delegar todas as teclas para ela
      if (currentSection === SECTIONS.TERMS) {
        const termsEvent = new CustomEvent('termsNavigation', {
          detail: { keyCode }
        });
        window.dispatchEvent(termsEvent);
        return;
      }

      const authSections = [SECTIONS.LOGIN, SECTIONS.SIGNUP, SECTIONS.CREATE_ACCOUNT, SECTIONS.PAYMENT];
      if (authSections.includes(currentSection)) {
        // Delegar navegação para os componentes de autenticação através de eventos customizados
        const authEvent = new CustomEvent('authNavigation', {
          detail: { keyCode }
        });
        window.dispatchEvent(authEvent);
        return;
      }

      // Se estiver no player, delegar navegação específica
      if (currentSection === SECTIONS.PLAYER) {
        const playerEvent = new CustomEvent('playerNavigation', {
          detail: { keyCode }
        });
        window.dispatchEvent(playerEvent);
        return;
      }

      // Se estiver na página de detalhes da série, delegar navegação específica
      if (currentSection === SECTIONS.SERIES_DETAILS) {
        const seriesDetailsEvent = new CustomEvent('seriesDetailsNavigation', {
          detail: { keyCode }
        });
        window.dispatchEvent(seriesDetailsEvent);
        return;
      }

      // Se o MoviePreview estiver ativo, delegar navegação específica
      if (moviePreviewActive && (currentSection === SECTIONS.MOVIES || currentSection === SECTIONS.HOME)) {
        const moviePreviewEvent = new CustomEvent('moviePreviewNavigation', {
          detail: { keyCode }
        });
        window.dispatchEvent(moviePreviewEvent);
        return;
      }

      // Se o modal de logout estiver ativo, delegar navegação específica
      if (showLogoutModal) {
        const logoutModalEvent = new CustomEvent('logoutModalNavigation', {
          detail: { keyCode }
        });
        window.dispatchEvent(logoutModalEvent);
        return;
      }

      // Se o modal de código de grupo estiver ativo, delegar navegação específica
      if (showGroupCodeModal) {
        const groupCodeModalEvent = new CustomEvent('groupCodeModalNavigation', {
          detail: { keyCode }
        });
        window.dispatchEvent(groupCodeModalEvent);
        return;
      }

      // Navegação no menu lateral
      if (onMenu) {
        if (keyCode === 38) { // Cima
          setMenuFocus((prev) => (prev > 0 ? prev - 1 : menuItems.length - 1));
        } else if (keyCode === 40) { // Baixo
          setMenuFocus((prev) => (prev < menuItems.length - 1 ? prev + 1 : 0));
        } else if (keyCode === 39) { // Direita - sair do menu
          setOnMenu(false);
        } else if (keyCode === 13) { // OK - selecionar item do menu
          const selectedItem = menuItems[menuFocus];
          if (selectedItem.id === 'logout') {
            // Evento já é emitido pela Sidebar, não precisa chamar handleLogout aqui
          } else if (selectedItem.id === 'group-code') {
            // Evento já é emitido pela Sidebar, não precisa chamar aqui
          } else {
            setCurrentSection(selectedItem.id);
            setOnMenu(false);
          }
        }
      } else {
        // Navegação no conteúdo principal
        if (currentSection === SECTIONS.HOME) {
          if (keyCode === 38) { // Cima
            if (shelfFocus > -1) {
              setShelfFocus(shelfFocus - 1);
              setItemFocus(0);
            }
          } else if (keyCode === 40) { // Baixo
            if (shelfFocus < 2) {
              setShelfFocus(shelfFocus + 1);
              setItemFocus(0);
            }
          } else if (keyCode === 37) { // Esquerda
            if (shelfFocus === -1) {
              if (itemFocus > 0) {
                setItemFocus(itemFocus - 1);
              } else {
                setOnMenu(true);
              }
            } else {
              if (itemFocus > 0) {
                setItemFocus(itemFocus - 1);
              } else {
                setOnMenu(true);
              }
            }
          } else if (keyCode === 39) { // Direita
            if (shelfFocus === -1) {
              setItemFocus((prev) => Math.min(prev + 1, 1));
            } else {
              setItemFocus((prev) => Math.min(prev + 1, 9));
            }
          } else if (keyCode === 13) { // OK
            if (shelfFocus === -1) {
              const heroButtonEvent = new CustomEvent('heroButtonClick', {
                detail: { buttonIndex: itemFocus }
              });
              window.dispatchEvent(heroButtonEvent);
            } else {
              // Evento para notificar o Home.js sobre o clique no item da prateleira
              const shelfItemClickEvent = new CustomEvent('shelfItemClick', {
                detail: { shelfIndex: shelfFocus, itemIndex: itemFocus }
              });
              window.dispatchEvent(shelfItemClickEvent);
            }
          }
        } else if (currentSection === SECTIONS.CHANNELS) {
          // Navegação específica para canais - delegar todas as teclas
          if (keyCode === 38 || keyCode === 40 || keyCode === 37 || keyCode === 39 || keyCode === 13) {
            // Delegar navegação para o componente Channels através de eventos customizados
            const channelsEvent = new CustomEvent('channelsNavigation', {
              detail: { keyCode }
            });
            window.dispatchEvent(channelsEvent);
          }
        } else if (currentSection === SECTIONS.MOVIES) {
          // Navegação específica para filmes - delegar todas as teclas
          if (keyCode === 38 || keyCode === 40 || keyCode === 37 || keyCode === 39 || keyCode === 13 || keyCode === 73) {
            // Delegar navegação para o componente Movies através de eventos customizados
            // keyCode 73 = Tecla 'I' para preview
            const moviesEvent = new CustomEvent('moviesNavigation', {
              detail: { keyCode }
            });
            window.dispatchEvent(moviesEvent);
          }
        } else if (currentSection === SECTIONS.SERIES) {
          // Navegação específica para séries - delegar todas as teclas
          if (keyCode === 38 || keyCode === 40 || keyCode === 37 || keyCode === 39 || keyCode === 13 || keyCode === 73 || keyCode === 80) {
            // Delegar navegação para o componente Series através de eventos customizados
            // keyCode 13 = ENTER para abrir tela de detalhes
            // keyCode 73 = Tecla 'I' para preview/detalhes
            // keyCode 80 = Tecla 'P' para reproduzir diretamente
            const seriesEvent = new CustomEvent('seriesNavigation', {
              detail: { keyCode }
            });
            window.dispatchEvent(seriesEvent);
          }
        } else if (currentSection === SECTIONS.MOVIES_DETAILS) {
          // Navegação específica para detalhes do filme - delegar todas as teclas
          if (keyCode === 38 || keyCode === 40 || keyCode === 37 || keyCode === 39 || keyCode === 13) {
            // Delegar navegação para o componente MovieDetailsPage através de eventos customizados
            const movieDetailsEvent = new CustomEvent('movieDetailsNavigation', {
              detail: { keyCode }
            });
            window.dispatchEvent(movieDetailsEvent);
          }
        } else if (currentSection === SECTIONS.SEARCH_MOVIE_DETAILS) {
          // Navegação específica para detalhes de filme vindos da pesquisa - delegar todas as teclas
          if (keyCode === 38 || keyCode === 40 || keyCode === 37 || keyCode === 39 || keyCode === 13) {
            const searchMovieDetailsEvent = new CustomEvent('searchMovieDetailsNavigation', {
              detail: { keyCode }
            });
            window.dispatchEvent(searchMovieDetailsEvent);
          }
        } else if (currentSection === SECTIONS.SEARCH) {
          // Navegação específica para busca - delegar todas as teclas
          if (keyCode === 38 || keyCode === 40 || keyCode === 37 || keyCode === 39 || keyCode === 13) {
            const searchEvent = new CustomEvent('searchNavigation', {
              detail: { keyCode }
            });
            window.dispatchEvent(searchEvent);
          }
        }

        // Tecla de voltar/back
        if (keyCode === 8) { // Backspace
          // Se estiver na seção de busca, delegar para o componente Search
          if (currentSection === SECTIONS.SEARCH) {
            const searchEvent = new CustomEvent('searchNavigation', {
              detail: { keyCode }
            });
            window.dispatchEvent(searchEvent);
          } else if (currentSection === SECTIONS.MOVIES) {
            // Delegar para o componente Movies
            const moviesEvent = new CustomEvent('moviesNavigation', {
              detail: { keyCode }
            });
            window.dispatchEvent(moviesEvent);
          } else if (currentSection === SECTIONS.SERIES) {
            // Delegar para o componente Series
            const seriesEvent = new CustomEvent('seriesNavigation', {
              detail: { keyCode }
            });
            window.dispatchEvent(seriesEvent);
          } else if (currentSection === SECTIONS.MOVIES_DETAILS) {
            // Delegar para o componente MovieDetailsPage
            const movieDetailsEvent = new CustomEvent('movieDetailsNavigation', {
              detail: { keyCode }
            });
            window.dispatchEvent(movieDetailsEvent);
                  } else if (currentSection === SECTIONS.SEARCH_MOVIE_DETAILS) {
          // Delegar para o componente SearchMovieDetailsPage
          const searchMovieDetailsEvent = new CustomEvent('searchMovieDetailsNavigation', {
            detail: { keyCode }
          });
          window.dispatchEvent(searchMovieDetailsEvent);
        } else if (currentSection === SECTIONS.CHANNELS) {
          // Delegar para o componente Channels
          const channelsEvent = new CustomEvent('channelsNavigation', {
            detail: { keyCode }
          });
          window.dispatchEvent(channelsEvent);
        } else {
          // Apenas tenta voltar no histórico, sem fallback para Home
          navigateBack();
        }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentSection, onMenu, menuFocus, shelfFocus, itemFocus, moviePreviewActive, showLogoutModal, showGroupCodeModal, navigateBack]);

  const handleTermsAccept = useCallback(() => {
    localStorage.setItem('termsAccepted', 'true');
    const token = localStorage.getItem('authToken');
    const email = localStorage.getItem('authEmail');
    if (token && email) {
      navigateToSection(SECTIONS.HOME, false);
    } else {
      navigateToSection(SECTIONS.LOGIN, false);
    }
  }, [navigateToSection]);

  // Listener para eventos de reprodução de conteúdo
  useEffect(() => {
    const handlePlayContent = async (event) => {
      const { streamUrl, streamInfo } = event.detail;

      // Proxy temporariamente desabilitado - usando URL original
      const safeStreamUrl = streamUrl; // criarUrlProxyStream(streamUrl);

      // Detectar ambiente Tizen TV
      const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');

      console.log('🎬 Evento playContent recebido:', { originalStreamUrl: streamUrl, streamInfo });
      console.log('🔒 URL sendo usada (proxy desabilitado):', safeStreamUrl);
      console.log('📺 Ambiente Tizen TV:', isTizenTV);

      // Se for Tizen TV e tiver flags específicas, aplicar configurações especiais
      if (isTizenTV && streamInfo?.forceTizenPlayer) {
        console.log('🔧 Aplicando configurações específicas para Tizen TV');

        // Prevenir qualquer redirecionamento para navegador externo
        event.preventDefault && event.preventDefault();
        event.stopPropagation && event.stopPropagation();

        // Aplicar configurações específicas para Tizen no streamInfo
        const tizenStreamInfo = {
          ...streamInfo,
          preferredPlayer: 'mpegts',
          useInternalPlayer: true,
          preventRedirect: true,
          environment: 'tizen'
        };

        console.log('📺 StreamInfo configurado para Tizen:', tizenStreamInfo);

        console.log('📺 App.js - Configurando playerData para Tizen:', {
          streamUrl: safeStreamUrl,
          streamInfo: tizenStreamInfo,
          hasSeriesInfo: !!tizenStreamInfo?.seriesInfo
        });
        setPlayerData({ streamUrl: safeStreamUrl, streamInfo: tizenStreamInfo });
        navigateToSection(SECTIONS.PLAYER);

        // Adicionar pequeno delay para garantir que a transição ocorra
        setTimeout(() => {
          console.log('📺 Player Tizen inicializado');
        }, 200);

      } else {
        // Comportamento padrão para outros ambientes
        console.log('💻 Usando configuração padrão');
        console.log('💻 App.js - Configurando playerData padrão:', {
          streamUrl: safeStreamUrl,
          streamInfo: streamInfo,
          hasSeriesInfo: !!streamInfo?.seriesInfo
        });
        setPlayerData({ streamUrl: safeStreamUrl, streamInfo });
        navigateToSection(SECTIONS.PLAYER);
      }
    };

    window.addEventListener('playContent', handlePlayContent);
    return () => window.removeEventListener('playContent', handlePlayContent);
  }, [navigateToSection]);

  // Listener para navegação para detalhes da série
  useEffect(() => {
    const handleShowSeriesDetails = (event) => {
      const { series } = event.detail;
      setSelectedSeriesData(series);
      
      // Verificar se há origem específica definida (para "Continuar Assistindo")
      if (series.origin) {
        console.log('📺 Abrindo detalhes da série com origem específica:', series.origin);
        setSeriesDetailsOrigin(series.origin);
      } else {
        // Rastrear de onde veio a navegação (comportamento padrão)
        setSeriesDetailsOrigin(currentSection);
      }

      navigateToSection(SECTIONS.SERIES_DETAILS); // Usar função que rastreia histórico
    };

    window.addEventListener('showSeriesDetails', handleShowSeriesDetails);
    return () => window.removeEventListener('showSeriesDetails', handleShowSeriesDetails);
  }, [currentSection, navigateToSection]); // Adicionar navigateToSection como dependência

  // Listener para navegação para detalhes do filme
  useEffect(() => {
    const handleShowMovieDetails = (event) => {
      const { movie } = event.detail;
      setSelectedMovieData(movie);
      setMovieDetailsOrigin(currentSection); // Rastrear de onde veio a navegação

      navigateToSection(SECTIONS.MOVIES_DETAILS); // Usar função que rastreia histórico
    };

    window.addEventListener('showMovieDetails', handleShowMovieDetails);
    return () => window.removeEventListener('showMovieDetails', handleShowMovieDetails);
  }, [currentSection, navigateToSection]); // Adicionar navigateToSection como dependência

  // Listener para navegação para detalhes do filme da pesquisa
  useEffect(() => {
    const handleShowSearchMovieDetails = (event) => {
      const { movie } = event.detail;
      setSelectedSearchMovieData(movie);
      setSearchMovieDetailsOrigin(currentSection); // Rastrear de onde veio a navegação

      navigateToSection(SECTIONS.SEARCH_MOVIE_DETAILS); // Usar função que rastreia histórico
    };

    window.addEventListener('showSearchMovieDetails', handleShowSearchMovieDetails);
    return () => window.removeEventListener('showSearchMovieDetails', handleShowSearchMovieDetails);
  }, [currentSection, navigateToSection]); // Adicionar navigateToSection como dependência

  // Listener para evento de volta à sidebar
  useEffect(() => {
    const handleBackToSidebar = () => {
      setOnMenu(true);
    };

    window.addEventListener('backToSidebar', handleBackToSidebar);
    return () => window.removeEventListener('backToSidebar', handleBackToSidebar);
  }, []);

  // Listener para controlar estado do MoviePreview
  useEffect(() => {
    const handleMoviePreviewActive = (event) => {
      setMoviePreviewActive(event.detail.active);
    };

    window.addEventListener('moviePreviewActive', handleMoviePreviewActive);
    return () => window.removeEventListener('moviePreviewActive', handleMoviePreviewActive);
  }, []);

  // Listener para o modal de logout
  useEffect(() => {
    const handleShowLogoutModal = () => {
      setShowLogoutModal(true);
    };

    window.addEventListener('showLogoutModal', handleShowLogoutModal);
    return () => window.removeEventListener('showLogoutModal', handleShowLogoutModal);
  }, []);

  // Listener para o modal de código de grupo
  useEffect(() => {
    const handleShowGroupCodeModalEvent = () => {
      setShowGroupCodeModal(true);
    };

    window.addEventListener('showGroupCodeModal', handleShowGroupCodeModalEvent);
    return () => window.removeEventListener('showGroupCodeModal', handleShowGroupCodeModalEvent);
  }, []);

  const handleLogin = async (loginData, mac) => {
    console.log('Login bem-sucedido, redirecionando para HOME.');
    setAuthError('');
    setClienteData(loginData);
    setMacAddress(mac || '');

    const token = loginData.token;
    localStorage.setItem('authToken', token);
    localStorage.setItem('authEmail', loginData.email);

    // Verificar se já existe código de grupo
    const groupCode = localStorage.getItem('groupCode');
    setHasGroupCode(!!groupCode);

    // Limpar configuração antiga do player
    clearPlayerConfig();

    // Navegar direto para HOME
    navigateToSection(SECTIONS.HOME, false);
  };

  const handleGoToSignup = () => {
    navigateToSection(SECTIONS.SIGNUP, false);
  };

  const handleGoToCreateAccount = () => {
    navigateToSection(SECTIONS.CREATE_ACCOUNT, false);
  };

  const handleBackToLogin = () => {
    navigateToSection(SECTIONS.LOGIN, false);
  };

  const handleSignup = (signupData) => {
    // Após cadastro, vai para o login
    navigateToSection(SECTIONS.LOGIN, false);
  };

  const handleSkipLogin = () => {
    // Lógica para pular login (desenvolvimento)
    navigateToSection(SECTIONS.HOME, false);
    setOnMenu(false);
  };

  const handlePaymentComplete = () => {
    // Após pagamento, ir direto para HOME
    navigateToSection(SECTIONS.HOME, false);
  };

  const handleApprovalSuccess = async () => {
    console.log('Conta aprovada! Buscando configuração do player antes de ir para a Home.');

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Token não encontrado para buscar configuração do player.');

      const playerCfg = await getPlayerConfig(token);

      console.log('Configuração do player recebida com sucesso:', playerCfg);
      setPlayerConfig(playerCfg);

      navigateToSection(SECTIONS.HOME, false);

    } catch (error) {
      console.error('Falha ao buscar configuração do player após aprovação. Deslogando.', error);
      handleLogout();
    }
  };

  const handleLogout = useCallback(() => {
    localStorage.clear();
    clearPlayerConfig();
    setClienteData(null);
    setMacAddress('');
    setSectionHistory([]);
    setShowLogoutModal(false);
    setHasGroupCode(false);
    navigateToSection(SECTIONS.LOGIN, false);
  }, [navigateToSection]);

  const handleLogoutConfirm = () => {
    handleLogout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const handleShowGroupCodeModal = () => {
    setShowGroupCodeModal(true);
  };

  const handleGroupCodeSuccess = async (data) => {
    console.log('Código de grupo configurado com sucesso:', data);
    setHasGroupCode(true);
    setShowGroupCodeModal(false);
    
    // Tentar carregar configuração do player
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const playerCfg = await getPlayerConfig(token);
        setPlayerConfig(playerCfg);
        console.log('Configuração do player carregada após código de grupo:', playerCfg);
      }
    } catch (error) {
      if (error.isPending) {
        console.log('Conta está pendente após configuração do código.');
        navigateToSection(SECTIONS.IPTV_PENDING, false);
      } else {
        console.warn('Erro ao carregar configuração após código de grupo:', error.message);
        // Manter na HOME mesmo com erro, pois o código foi configurado
        // O usuário pode tentar novamente mais tarde
      }
    }
  };

  const handleGroupCodeCancel = () => {
    setShowGroupCodeModal(false);
  };

  // Função para verificar e atualizar estado do código de grupo
  const checkGroupCodeStatus = useCallback(() => {
    const groupCode = localStorage.getItem('groupCode');
    const hasCode = !!groupCode;
    setHasGroupCode(hasCode);
    return hasCode;
  }, []);

  // Função para limpar código de grupo
  const clearGroupCode = useCallback(() => {
    localStorage.removeItem('groupCode');
    localStorage.removeItem('contaIptvId');
    localStorage.removeItem('contaIptvStatus');
    clearPlayerConfig();
    setHasGroupCode(false);
  }, []);

  const handleSectionChange = (sectionId) => {
    if (sectionId === 'group-code') {
      setShowGroupCodeModal(true);
      setOnMenu(false);
      return;
    }
    
    navigateToSection(sectionId);
    setOnMenu(false);
    setShelfFocus(0);
    setItemFocus(0);
    setSelectedSeriesData(null);
  };

  const handleBackFromPlayer = useCallback(() => {
    const success = navigateBack();
    if (!success) {
      // Se não houver histórico, volta para a Home como fallback seguro
      navigateToSection(SECTIONS.HOME, false);
    }
    setPlayerData(null);
  }, [navigateBack, navigateToSection]);

  const handleBackFromSeriesDetails = () => {
    // Voltar para a origem correta (pesquisa, séries ou home)
    if (seriesDetailsOrigin === SECTIONS.SEARCH) {
      setCurrentSection(SECTIONS.SEARCH);
    } else if (seriesDetailsOrigin === SECTIONS.HOME || seriesDetailsOrigin === 'home') {
      setCurrentSection(SECTIONS.HOME);
    } else {
      setCurrentSection(SECTIONS.SERIES);
    }
    setSelectedSeriesData(null);
    setSeriesDetailsOrigin(null); // Limpar a origem
  };

  const handleBackFromMovieDetails = () => {
    // Voltar para a origem correta (pesquisa, filmes ou home)
    if (movieDetailsOrigin === SECTIONS.SEARCH) {
      setCurrentSection(SECTIONS.SEARCH);
    } else if (movieDetailsOrigin === SECTIONS.HOME) {
      setCurrentSection(SECTIONS.HOME);
    } else {
      setCurrentSection(SECTIONS.MOVIES);
    }
    setSelectedMovieData(null);
    setMovieDetailsOrigin(null); // Limpar a origem
  };

  const handleBackFromSearchMovieDetails = () => {
    // Voltar para a pesquisa (origem sempre será SEARCH)
    setCurrentSection(SECTIONS.SEARCH);
    setSelectedSearchMovieData(null);
    setSearchMovieDetailsOrigin(null); // Limpar a origem
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case SECTIONS.TERMS:
        return (
          <TermsPage
            onAccept={handleTermsAccept}
          />
        );

      case SECTIONS.LOGIN:
        return (
          <LoginScreen
            onLogin={handleLogin}
            onGoToSignup={handleGoToSignup}
            onGoToCreateAccount={handleGoToCreateAccount}
            onSkipLogin={handleSkipLogin}
            isActive={currentSection === SECTIONS.LOGIN}
            authError={authError}
          />
        );

      case SECTIONS.SIGNUP:
        return (
          <SignupScreen
            onSignup={handleSignup}
            onBackToLogin={handleBackToLogin}
            isActive={currentSection === SECTIONS.SIGNUP}
          />
        );

      case SECTIONS.CREATE_ACCOUNT:
        return (
          <CreateAccountScreen
            onBack={handleBackToLogin}
            isActive={currentSection === SECTIONS.CREATE_ACCOUNT}
          />
        );

      case SECTIONS.PAYMENT:
        return (
          <PaymentScreen
            onPaymentComplete={handlePaymentComplete}
            isActive={currentSection === SECTIONS.PAYMENT}
          />
        );

      case SECTIONS.IPTV_PENDING:
        return (
          <IptvPendingScreen
            onApprovalSuccess={handleApprovalSuccess}
            onLogout={handleLogout}
            isActive={currentSection === SECTIONS.IPTV_PENDING}
          />
        );

      case SECTIONS.HOME:
        return (
          <Home
            onMenu={onMenu}
            menuFocus={menuFocus}
            shelfFocus={shelfFocus}
            itemFocus={itemFocus}
            hasGroupCode={hasGroupCode}
          />
        );

      case SECTIONS.CHANNELS:
        return <Channels isActive={currentSection === SECTIONS.CHANNELS} />;

      case SECTIONS.MOVIES:
        return <Movies isActive={currentSection === SECTIONS.MOVIES} />;

      case SECTIONS.SERIES:
        return <Series isActive={currentSection === SECTIONS.SERIES} />;

      case SECTIONS.SERIES_DETAILS:
        return (
          <SeriesDetailsPage
            series={selectedSeriesData}
            isActive={currentSection === SECTIONS.SERIES_DETAILS}
            onBack={handleBackFromSeriesDetails}
          />
        );
      case SECTIONS.MOVIES_DETAILS:
        return (
          <MovieDetailsPage
            movie={selectedMovieData}
            isActive={currentSection === SECTIONS.MOVIES_DETAILS}
            onBack={handleBackFromMovieDetails}
          />
        );

      case SECTIONS.SEARCH_MOVIE_DETAILS:
        return (
          <SearchMovieDetailsPage
            movie={selectedSearchMovieData}
            isActive={currentSection === SECTIONS.SEARCH_MOVIE_DETAILS}
            onBack={handleBackFromSearchMovieDetails}
          />
        );

      case SECTIONS.SEARCH:
        return (
          <Search
            isActive={currentSection === SECTIONS.SEARCH}
            onExitSearch={() => setOnMenu(true)}
          />
        );

      case SECTIONS.PLAYER:
        return (
          <VideoPlayer
            isActive={currentSection === SECTIONS.PLAYER}
            streamUrl={playerData?.streamUrl}
            streamInfo={playerData?.streamInfo}
            onBack={handleBackFromPlayer}
          />
        );

      default:
        return (
          <div className="main-content">
            <div className="section-placeholder">
              <div className="placeholder-content">
                <i className="fa-solid fa-construction"></i>
                <h2>Seção: {currentSection.toUpperCase()}</h2>
                <p>Esta seção será implementada em breve.</p>
                <button
                  className="back-btn"
                  onClick={() => setCurrentSection(SECTIONS.HOME)}
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  Voltar ao Home
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  // Não mostrar sidebar na tela de termos, login, cadastro, pagamento, no player ou na página de detalhes
  const showSidebar = currentSection !== SECTIONS.TERMS &&
    currentSection !== SECTIONS.LOGIN &&
    currentSection !== SECTIONS.SIGNUP &&
    currentSection !== SECTIONS.CREATE_ACCOUNT &&
    currentSection !== SECTIONS.PAYMENT &&
    currentSection !== SECTIONS.PLAYER &&
    currentSection !== SECTIONS.SERIES_DETAILS &&
    currentSection !== SECTIONS.MOVIES_DETAILS &&
    currentSection !== SECTIONS.SEARCH_MOVIE_DETAILS;

  if (isLoading) {
    return (
      <>
        <div className="loading-screen">
          <h1>BIG TV</h1>
          <p>Carregando sua programação...</p>
        </div>
      </>
    );
  }

  return (
    <div className="App">
      {showSidebar && (
        <Sidebar
          currentSection={currentSection}
          onMenu={onMenu}
          menuFocus={menuFocus}
          onSectionChange={handleSectionChange}
          onLogout={handleLogout}
          hasGroupCode={hasGroupCode}
        />
      )}
      <div className={`app-content ${showSidebar ? 'with-sidebar' : ''}`}>
        {renderCurrentSection()}
      </div>
      {/* Modal de logout renderizado no nível do App para aparecer no centro da tela */}
      <LogoutConfirmModal
        isVisible={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
      {/* Modal de código de grupo */}
      <GroupCodeModal
        isVisible={showGroupCodeModal}
        onSuccess={handleGroupCodeSuccess}
        onCancel={handleGroupCodeCancel}
        clienteData={clienteData}
        macAddress={macAddress}
      />
    </div>
  );
}

export default App;
