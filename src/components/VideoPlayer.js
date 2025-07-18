import React, { useRef, useEffect, useState, useCallback } from 'react';
import criarUrlProxyStream from '../utils/streamProxy';
import ConsoleLogModal from './ConsoleLogModal';

import './VideoPlayer.css';

const VideoPlayer = ({ isActive, streamUrl, streamInfo, onBack }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  const initializingRef = useRef(false);
  const errorTimeoutRef = useRef(null); 
  const previousStreamUrlRef = useRef(null);
  const blobUrlRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Carregando...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerType, setPlayerType] = useState(null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dateTime, setDateTime] = useState(new Date());


  // Detectar ambiente (desenvolvimento vs produção)
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');

  // Função para analisar e corrigir URLs problemáticas
  const analyzeAndFixUrl = (url) => {
    const analysis = {
      original: url,
      protocol: null,
      domain: null,
      hasToken: false,
      needsHttps: false,
      suggestions: [],
      alternatives: []
    };

    try {
      const urlObj = new URL(url);
      analysis.protocol = urlObj.protocol;
      analysis.domain = urlObj.hostname;
      analysis.hasToken = urlObj.searchParams.has('token') || url.includes('token=');
      
      if (urlObj.protocol === 'http:' && !isDevelopment) {
        analysis.needsHttps = true;
        analysis.suggestions.push('Tentar HTTPS');
      }
      
      const alternatives = [];
      alternatives.push({ type: 'original', url: url });
      
      if (analysis.needsHttps) {
        alternatives.push({ 
          type: 'https', 
          url: url.replace('http://', 'https://') 
        });
      }
      
      if (analysis.hasToken) {
        const urlWithoutToken = url.split('?')[0];
        alternatives.push({ 
          type: 'no-token', 
          url: urlWithoutToken 
        });
        
        if (analysis.needsHttps) {
             alternatives.push({ 
                type: 'https-no-token', 
                url: urlWithoutToken.replace('http://', 'https://') 
            });
        }
      }
      
      analysis.alternatives = alternatives.slice(0, 4);
      
    } catch (err) {
      analysis.alternatives = [{ type: 'original', url: url }];
    }
    
    return analysis;
  };

  // Headers seguros para HLS (sem os bloqueados pelo navegador)
  const getSafeHeaders = () => ({
    'Accept': '*/*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache'
  });

  // Função para testar conectividade da URL
  const testStreamUrl = async (url) => {
    console.log('🔍 Testando conectividade da URL...');
    
    try {
      // Tentar fazer uma requisição HEAD para verificar se o servidor responde
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
      
      const response = await fetch(url, {
        method: 'HEAD',
        headers: getSafeHeaders(),
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      console.log('✅ Teste de conectividade bem-sucedido, status:', response.status);
      return true;
      
    } catch (error) {
      console.warn('⚠️ Teste de conectividade falhou:', error.message);
      
      // Se o teste HEAD falhou, tentar GET com range limitado
      try {
        console.log('🔄 Tentando teste alternativo com GET...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            ...getSafeHeaders(),
            'Range': 'bytes=0-1023' // Apenas os primeiros 1KB
          },
          signal: controller.signal,
          mode: 'cors',
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        console.log('✅ Teste alternativo bem-sucedido, status:', response.status);
        return true;
        
      } catch (altError) {
        console.error('❌ Todos os testes de conectividade falharam');
        throw new Error(`Não foi possível acessar o stream: ${altError.message}`);
      }
    }
  };

  // Player customizado - usando apenas HTML5 nativo
  const detectPlayerType = (url, info) => {
    console.log("🎯 Usando player HTML5 customizado");
    return 'html5-custom';
  };

  // Limpar timeouts ativos
  const clearTimeouts = () => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  };

  // Limpar Blob URLs
  const cleanupBlobUrls = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  // Função memoizada para inicialização
  const initializeIfNeeded = useCallback(() => {
    if (!isActive || !streamUrl || initializingRef.current) return;

    // Verificar se a URL mudou
    if (previousStreamUrlRef.current === streamUrl && !error) {
      return;
    }

    if (initializingRef.current) {
      return;
    }

    console.log('🎬 Iniciando reprodução para:', streamUrl);
    
    // Analisar URL primeiro
    const analysis = analyzeAndFixUrl(streamUrl);
    
    // Limpar player anterior se existir e a URL mudou
    if (previousStreamUrlRef.current !== streamUrl) {
      cleanupPlayer();
    }
    
    previousStreamUrlRef.current = streamUrl;
    
    const detectedPlayerType = detectPlayerType(streamUrl, streamInfo);
    console.log('🎯 Tipo de player detectado:', detectedPlayerType);
    setPlayerType(detectedPlayerType);
    initializingRef.current = true;

    // Função de inicialização integrada
    const initPlayer = async (type) => {
      if (!videoRef.current || !streamUrl) {
        initializingRef.current = false;
        return;
      }

      console.log(`🚀 Inicializando player ${type} com URL:`, streamUrl);
      setIsLoading(true);
      setLoadingMessage('Carregando...');
      setLoadingProgress(5);
      setError(null);
      setIsPlaying(false);
      
      clearTimeouts();

      const videoElement = videoRef.current;

      try {
        console.log('🎯 Usando player HTML5 customizado');
        await initCustomHtml5Player(streamUrl, videoElement);

      } catch (err) {
        console.error('💥 Erro ao criar player:', err);
        clearTimeouts();
        
        setError(`Erro ao inicializar player: ${err.message}`);
        setIsLoading(false);
        initializingRef.current = false;
      }
    };

    // Chamar função de inicialização
    initPlayer(detectedPlayerType);
  }, [isActive, streamUrl, streamInfo, isDevelopment, isTizenTV]);



  // Player HTML5 customizado - criado por vocês
  const initCustomHtml5Player = async (url, videoElement) => {
    return new Promise((resolve, reject) => {
      try {
        console.log('🎯 Inicializando player HTML5 customizado');
        setLoadingMessage('Carregando...');
        
        // Limpar qualquer player anterior
        playerRef.current = null;
        
        const handleLoadStart = () => {
          console.log('📡 Player customizado: Iniciando carregamento');
          setLoadingProgress(20);
        };
        
        const handleLoadedData = () => {
          console.log('📡 Player customizado: Dados carregados');
          setLoadingProgress(60);
        };
        
        const handleCanPlay = () => {
          console.log('✅ Player customizado: Pronto para reproduzir');
          setLoadingProgress(85);
        };
        
        const handlePlaying = () => {
          console.log('✅ Player customizado: Reproduzindo');
          clearTimeouts();
          setLoadingProgress(100);
          setTimeout(() => {
            setIsLoading(false);
            setLoadingProgress(0);
          }, 500);
          setError(null);
          initializingRef.current = false;
          resolve();
        };
        
        const handleError = (event) => {
          console.error('❌ Erro no player customizado:', event);
          const errorMsg = videoElement.error ? 
            `Erro ${videoElement.error.code}: ${videoElement.error.message}` : 
            'Erro desconhecido no player';
          reject(new Error(errorMsg));
        };
        
        const handleWaiting = () => {
          console.log('⏳ Player customizado: Aguardando dados...');
          setLoadingMessage('Carregando dados...');
        };
        
        // Adicionar listeners
        videoElement.addEventListener('loadstart', handleLoadStart, { once: true });
        videoElement.addEventListener('loadeddata', handleLoadedData, { once: true });
        videoElement.addEventListener('canplay', handleCanPlay, { once: true });
        videoElement.addEventListener('playing', handlePlaying, { once: true });
        videoElement.addEventListener('error', handleError, { once: true });
        videoElement.addEventListener('waiting', handleWaiting);
        
        // Configurar elemento de vídeo
        videoElement.crossOrigin = 'anonymous';
        videoElement.preload = 'auto';
        videoElement.autoplay = true;
        videoElement.controls = isDevelopment || !isTizenTV;
        
        // Definir URL e iniciar carregamento
        videoElement.src = url;
        videoElement.load();
        
        // Timeout para carregamento
        const timeoutDuration = streamInfo?.type === 'live' ? 15000 : 60000; // 15s para live, 60s para VOD
        errorTimeoutRef.current = setTimeout(() => {
          if (initializingRef.current) {
            const contentType = streamInfo?.type === 'live' ? 'Canal' : 'Conteúdo';
            reject(new Error(`Timeout ao carregar ${contentType} - verifique a conexão`));
          }
        }, timeoutDuration);
        
      } catch (err) {
        console.error('💥 Erro ao criar player customizado:', err);
        reject(err);
      }
    });
  };

  // Função para limpar player HTML5 customizado
  const cleanupPlayer = useCallback(() => {
    clearTimeouts();
    cleanupBlobUrls();
    
    // Limpar elemento video HTML5
    if (videoRef.current) {
      const videoElement = videoRef.current;
      
      try {
        const events = ['loadstart', 'loadeddata', 'canplay', 'canplaythrough', 'playing', 'waiting', 'error', 'stalled'];
        events.forEach(event => {
          videoElement.removeEventListener(event, () => {});
        });
        
        if (videoElement.pause) videoElement.pause();
        if (videoElement.src !== undefined) videoElement.src = '';
        if (videoElement.load) videoElement.load();
      } catch (err) {
        console.log('Erro ao limpar video element:', err);
      }
    }

    // Limpar referência do player customizado
    playerRef.current = null;
    
    setIsLoading(false);
    setLoadingMessage('Carregando...');
    setLoadingProgress(0);
    setError(null);
    setIsPlaying(false);
    setPlayerType(null);
    setCurrentTime(0);
    setDuration(0);
    setIsControlsVisible(true);
    
    initializingRef.current = false;
    previousStreamUrlRef.current = null;
  }, []);

  // Função para voltar/sair
  const handleBack = useCallback(() => {
    cleanupPlayer();
    if (onBack) {
      onBack();
    }
  }, [cleanupPlayer, onBack]);

  useEffect(() => {
    if (isActive && streamUrl && !initializingRef.current) {
      initializeIfNeeded();
    }

    return () => {
      if (!isActive) {
        cleanupPlayer();
      }
    };
  }, [isActive, streamUrl, initializeIfNeeded, cleanupPlayer]);

  // Prevenir redirecionamentos em Tizen TV
  useEffect(() => {
    if (!isActive || !isTizenTV || !streamInfo?.preventBrowserRedirect) return;
    
    const preventRedirect = (event) => {
      // Prevenir navegação automática para URLs de vídeo
      if (event.target.tagName === 'A' || event.target.tagName === 'VIDEO') {
        const href = event.target.href || event.target.src;
        if (href && (href.includes('.mp4') || href.includes('.mkv') || href.includes('.avi'))) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      }
    };
    
    const preventWindowOpen = () => {
      return null;
    };
    
    // Substituir window.open temporariamente
    const originalWindowOpen = window.open;
    window.open = preventWindowOpen;
    
    // Adicionar listeners para prevenir cliques automáticos
    document.addEventListener('click', preventRedirect, true);
    document.addEventListener('mousedown', preventRedirect, true);
    
    return () => {
      // Restaurar comportamento original
      window.open = originalWindowOpen;
      document.removeEventListener('click', preventRedirect, true);
      document.removeEventListener('mousedown', preventRedirect, true);
    };
  }, [isActive, isTizenTV, streamInfo?.preventBrowserRedirect]);

  // Efeito para o relógio da UI de canal ao vivo
  useEffect(() => {
    if (isActive && streamInfo?.type === 'live') {
      const timer = setInterval(() => {
        setDateTime(new Date());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isActive, streamInfo?.type]);

  // Formatar tempo para HH:MM:SS ou MM:SS
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) {
      return '00:00';
    }
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    const pad = (num) => num.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const showControls = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      // Apenas esconde se estiver tocando
      if (videoRef.current && !videoRef.current.paused) {
        setIsControlsVisible(false);
      }
    }, 4000); // Esconder após 4 segundos
  }, []);

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      // Para canais ao vivo, a pausa não é permitida. Apenas tentamos play.
      if (streamInfo?.type === 'live') {
        if (videoRef.current.paused) {
          videoRef.current.play();
        }
        // Se estiver tocando, não faz nada.
      } else {
        // Comportamento padrão para VOD (filmes/séries)
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
      showControls();
    }
  }, [showControls, streamInfo?.type]);

  const handleSeek = useCallback((forward) => {
    if (videoRef.current && duration > 0) {
      const seekTime = 10; // Pular 10 segundos
      const newTime = forward
        ? Math.min(videoRef.current.currentTime + seekTime, duration)
        : Math.max(videoRef.current.currentTime - seekTime, 0);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime); // Atualiza o estado imediatamente
    }
  }, [duration]);

  // Efeito para gerenciar estado do vídeo (tempo, duração, play/pause)
  useEffect(() => {
    const video = videoRef.current;
    if (!isActive || !video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => {
      if (!isNaN(video.duration) && isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };
    const handlePlay = () => {
      setIsPlaying(true);
      showControls();
    };
    const handlePause = () => {
      setIsPlaying(false);
      showControls(); // Mantém os controles visíveis quando pausado
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [isActive, showControls]);

  // Sistema de navegação por controle remoto e interações
  useEffect(() => {
    if (!isActive) return;

    const handlePlayerNavigation = (event) => {
      showControls(); // Exibir controles em qualquer interação
      const { keyCode } = event.detail;

      switch (keyCode) {
        case 13: // OK/Enter
        case 415: // Play
        case 19: // Pause
          togglePlayPause();
          break;
        case 39: // Seta Direita
          handleSeek(true);
          break;
        case 37: // Seta Esquerda
          handleSeek(false);
          break;
        case 8:
        case 10009: // Voltar (Tizen)
          handleBack();
          break;
        default:
          break;
      }
    };

    const handleInteraction = () => {
      showControls();
    };

    window.addEventListener('playerNavigation', handlePlayerNavigation);
    document.addEventListener('mousemove', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('click', handleInteraction);
    
    return () => {
      window.removeEventListener('playerNavigation', handlePlayerNavigation);
      document.removeEventListener('mousemove', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
    };
  }, [isActive, handleBack, togglePlayPause, handleSeek, showControls]);

  const retryPlaybackSimple = () => { 
    console.log('🔄 Tentando reproduzir novamente...');
    
    // Adicionar limpeza explícita aqui
    cleanupPlayer();

    setError(null);
    setIsLoading(true);
    setLoadingMessage('Tentando novamente...');
    setLoadingProgress(0);
    setIsPlaying(false);
    
    initializingRef.current = false;
    if (isActive && streamUrl) {
        console.log(`🎯 Tentando novamente com a estratégia original`);
        
        setLoadingMessage('Carregando...');
        initializeIfNeeded(); 
    }
  };

  if (!isActive) return null;

  return (
    <div className="video-player-container">
      <div className="video-wrapper">
        {/* {!useIframe ? ( // Removida lógica de iframe */}
          <video
            ref={videoRef}
            className="video-element"
            autoPlay
            playsInline
            controls={isDevelopment || !isTizenTV} 
            style={{ width: '100%', height: '100%' }}
          />
        
        <ConsoleLogModal />

        {/* Renderização Condicional da UI */}
        {isControlsVisible && streamInfo?.type === 'live' ? (
          <div className="live-info-overlay">
            <div className="live-info-content">
              
              {/* Bloco da Esquerda: Logo e Info do Canal */}
              <div className="live-info-left">
                {streamInfo.logo && (
                  <img src={streamInfo.logo} alt="Logo do Canal" className="channel-logo" />
                )}
                 <div className="channel-text-content">
                  <div className="channel-header">
                    <h2 className="player-channel-title">{streamInfo.number} {streamInfo.name}</h2>
                  </div>
                  <div className="channel-details">
                    <div className="program-info">
                      <p className="program-title">
                         {streamInfo.currentProgram?.title || 'Programa não informado'}
                      </p>
                      <p className="program-time">
                        Início: {streamInfo.currentProgram?.startTime || '--:--'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloco da Direita: Informações Adicionais */}
              <div className="live-info-right">
                 <div className="datetime-display">
                    <p>{dateTime.toLocaleDateString('pt-BR')}</p>
                    <p>{dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                 </div>
                 <div className="program-info next-program">
                   <p className="program-title">
                     <span>Próximo:</span> {streamInfo.nextProgram?.title || 'Programa não informado'}
                   </p>
                   <p className="program-time">
                     Início: {streamInfo.nextProgram?.startTime || '--:--'}
                   </p>
                 </div>
              </div>

            </div>
          </div>
        ) : isControlsVisible && (
          <div className="player-controls-overlay">
            {/* Ícone de Play/Pause centralizado */}
            {!isPlaying && (
              <div className="play-pause-indicator">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                </svg>
              </div>
            )}
            
            <div className="controls-bottom-bar">
              <div className="progress-bar-container">
                <div className="progress-bar-background" />
                <div 
                  className="progress-bar-current" 
                  style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }} 
                />
              </div>
              <div className="time-indicators">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        )}
       
        {/* Loading Overlay - Estilo Netflix */}
        {isLoading && !isPlaying && (
          <div className="netflix-loading-overlay">
            <div className="netflix-loading-container">
              <div className="netflix-loading-ring">
                <div className="netflix-loading-circle"></div>
                <div 
                  className="netflix-loading-progress" 
                  style={{ 
                    background: `conic-gradient(#e50914 ${loadingProgress * 3.6}deg, transparent 0deg)` 
                  }}
                ></div>
              </div>
              <div className="netflix-loading-percentage">{loadingProgress}%</div>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && !isPlaying && (
          <div className="error-overlay">
            <div className="error-content">
              <h3>Erro na Reprodução</h3>
              <p>{error}</p>
              <div className="error-actions">
                <button onClick={retryPlaybackSimple} className="retry-button">
                  Tentar Novamente
                </button>
                <button onClick={handleBack} className="back-button">
                  Voltar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
