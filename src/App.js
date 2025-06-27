import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';
import IptvSetupScreen from './components/IptvSetupScreen';
import Home from './components/Home';
import Sidebar from './components/Sidebar';
import Channels from './components/Channels';
import Movies from './components/Movies';
import Series from './components/Series';
import SeriesDetailsPage from './components/SeriesDetailsPage';
import Search from './components/Search';
import VideoPlayer from './components/VideoPlayer';
import criarUrlProxyStream from './utils/streamProxy';
import IptvPendingScreen from './components/IptvPendingScreen';
import { criarContaIptv, getClienteStatus, probeIptvStatus, getPlayerConfig } from './services/authService';
import { setPlayerConfig } from './config/apiConfig';

// Estado das seções (migrado do conceito original)
const SECTIONS = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  IPTV_SETUP: 'iptv_setup',
  HOME: 'home',
  CHANNELS: 'channels', 
  MOVIES: 'movies',
  SERIES: 'series',
  SERIES_DETAILS: 'series_details',
  SEARCH: 'search',
  PLAYER: 'player',
  IPTV_PENDING: 'iptv_pending'
};

// Menu items (do app antigo)
const menuItems = [
  { id: 'search', label: 'Pesquisar', icon: 'fa-magnifying-glass' },
  { id: 'home', label: 'Home', icon: 'fa-house' },
  { id: 'channels', label: 'Canais Ao Vivo', icon: 'fa-tv' },
  { id: 'movies', label: 'Filmes', icon: 'fa-film' },
  { id: 'series', label: 'Séries', icon: 'fa-video' },
];

function App() {
  const [currentSection, setCurrentSection] = useState(SECTIONS.LOGIN);
  const [menuFocus, setMenuFocus] = useState(0);
  const [shelfFocus, setShelfFocus] = useState(-1);
  const [itemFocus, setItemFocus] = useState(0);
  const [onMenu, setOnMenu] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [selectedSeriesData, setSelectedSeriesData] = useState(null);
  const [sectionHistory, setSectionHistory] = useState([]);
  const [moviePreviewActive, setMoviePreviewActive] = useState(false);
  const [clienteData, setClienteData] = useState(null);
  const [macAddress, setMacAddress] = useState('');

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
      
      const authSections = [SECTIONS.LOGIN, SECTIONS.SIGNUP, SECTIONS.IPTV_SETUP];
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
      if (moviePreviewActive && currentSection === SECTIONS.MOVIES) {
        const movieDetailsEvent = new CustomEvent('movieDetailsNavigation', {
          detail: { keyCode }
        });
        window.dispatchEvent(movieDetailsEvent);
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
          const selectedSection = menuItems[menuFocus].id;
          setCurrentSection(selectedSection);
          setOnMenu(false);
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
              console.log('Item selecionado:', { shelfFocus, itemFocus });
              // TODO: Implementar seleção de item das prateleiras
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
          const success = navigateBack();
          if (!success) {
            // Se não há histórico, volta para Home
            setCurrentSection(SECTIONS.HOME);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentSection, onMenu, menuFocus, shelfFocus, itemFocus, moviePreviewActive, navigateBack]);

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
        
        setPlayerData({ streamUrl: safeStreamUrl, streamInfo: tizenStreamInfo });
        setCurrentSection(SECTIONS.PLAYER);
        
        // Adicionar pequeno delay para garantir que a transição ocorra
        setTimeout(() => {
          console.log('📺 Player Tizen inicializado');
        }, 200);
        
      } else {
        // Comportamento padrão para outros ambientes
        console.log('💻 Usando configuração padrão');
        setPlayerData({ streamUrl: safeStreamUrl, streamInfo });
        setCurrentSection(SECTIONS.PLAYER);
      }
    };

    window.addEventListener('playContent', handlePlayContent);
    return () => window.removeEventListener('playContent', handlePlayContent);
  }, []);

  // Listener para navegação para detalhes da série
  useEffect(() => {
    const handleShowSeriesDetails = (event) => {
      const { series } = event.detail;
      setSelectedSeriesData(series);
      navigateToSection(SECTIONS.SERIES_DETAILS); // Usar função que rastreia histórico
    };

    window.addEventListener('showSeriesDetails', handleShowSeriesDetails);
    return () => window.removeEventListener('showSeriesDetails', handleShowSeriesDetails);
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

  const handleLogin = async (loginData, mac) => {
    console.log('Login bem-sucedido, dados recebidos no App.js:', loginData);
    setClienteData(loginData);
    setMacAddress(mac || '');

    const token = loginData.token;
    localStorage.setItem('authToken', token);
    localStorage.setItem('authEmail', loginData.email);

    // Etapa 2: Obter configuração dinâmica do player e aplicá-la
    try {
      const playerCfg = await getPlayerConfig(token);
      console.log('Configuração do player recebida:', playerCfg);
      setPlayerConfig(playerCfg);
    } catch (e) {
      console.error('Não foi possível obter configuração do player:', e);
      // Caso falhe, continua mas exibirá erro ao acessar conteúdo depois
    }

    // Etapa 3: Sondar o status da conta IPTV
    console.log('Sondando status da conta IPTV...');
    const isApproved = await probeIptvStatus(token);

    if (isApproved) {
      console.log('Sondagem OK: Conta está ativa. Navegando para a Home.');
      navigateToSection(SECTIONS.HOME, false);
    } else {
      console.log('Sondagem FAILED: Conta não está ativa (pendente ou inexistente). Navegando para a configuração.');
      // A lógica para diferenciar pendente/inexistente será no IptvSetupScreen
      navigateToSection(SECTIONS.IPTV_SETUP, false);
    }
  };

  const handleGoToSignup = () => {
    navigateToSection(SECTIONS.SIGNUP, false);
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

  const handleIptvSetupComplete = (iptvData) => {
    console.log('Configuração IPTV submetida:', iptvData);
    // Após a configuração, verificar o status
    if (iptvData && iptvData.ContaIptv && iptvData.ContaIptv.status === 'pendente') {
      navigateToSection(SECTIONS.IPTV_PENDING, false);
    } else {
      // Se por algum motivo já vier aprovado, vai pra home
      navigateToSection(SECTIONS.HOME, false);
    }
  };

  const handleSkipIptvSetup = () => {
    // Opcional: permitir pular a configuração e ir para a home
    // Se não há histórico, volta para Home (ou login se não autenticado)
    if (!navigateBack()) {
      setCurrentSection(clienteData ? SECTIONS.HOME : SECTIONS.LOGIN);
    }
  };
  
  const handleApprovalSuccess = () => {
    console.log('Conta aprovada! Navegando para a Home.');
    navigateToSection(SECTIONS.HOME, false);
  };

  const handleLogout = () => {
    localStorage.clear();
    setClienteData(null);
    setMacAddress('');
    setSectionHistory([]);
    navigateToSection(SECTIONS.LOGIN, false);
  };

  const handleSectionChange = (sectionId) => {
    navigateToSection(sectionId); // Usar função que rastreia histórico
    setOnMenu(false);
    setShelfFocus(0);
    setItemFocus(0);
  };

  const handleBackFromPlayer = () => {
    // Voltar para a última seção que não seja o player
    setCurrentSection(SECTIONS.HOME);
    setPlayerData(null);
  };

  const handleBackFromSeriesDetails = () => {
    setCurrentSection(SECTIONS.SERIES);
    setSelectedSeriesData(null);
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case SECTIONS.LOGIN:
        return (
          <LoginScreen 
            onLogin={handleLogin} 
            onGoToSignup={handleGoToSignup}
            onSkipLogin={handleSkipLogin}
            isActive={currentSection === SECTIONS.LOGIN}
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

      case SECTIONS.IPTV_SETUP:
        return (
          <IptvSetupScreen 
            clienteData={clienteData}
            onSetupComplete={handleIptvSetupComplete}
            onSkip={handleSkipIptvSetup}
            isActive={currentSection === SECTIONS.IPTV_SETUP}
            macAddress={macAddress}
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

  // Não mostrar sidebar na tela de login, cadastro, configuração IPTV, no player ou na página de detalhes
  const showSidebar = currentSection !== SECTIONS.LOGIN && 
                     currentSection !== SECTIONS.SIGNUP &&
                     currentSection !== SECTIONS.IPTV_SETUP &&
                     currentSection !== SECTIONS.PLAYER && 
                     currentSection !== SECTIONS.SERIES_DETAILS;

  return (
    <div className="App">
      {showSidebar && (
        <Sidebar 
          currentSection={currentSection}
          onMenu={onMenu}
          menuFocus={menuFocus}
          onSectionChange={handleSectionChange}
        />
      )}
      <div className={`app-content ${showSidebar ? 'with-sidebar' : ''}`}>
        {renderCurrentSection()}
      </div>
    </div>
  );
}

export default App;
