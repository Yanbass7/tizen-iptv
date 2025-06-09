import React, { useRef, useEffect, useState, useCallback } from 'react';
import mpegts from 'mpegts.js';
import shaka from 'shaka-player';

import './VideoPlayer.css';

// Instalar polyfills do Shaka Player para garantir compatibilidade
shaka.polyfill.installAll();

// A versão do Shaka Player foi fixada em 2.5.4, a mesma usada nos exemplos da Samsung
// para garantir máxima compatibilidade com TVs Tizen mais antigas.

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

  // Função para detectar tipo de player necessário
  const detectPlayerType = (url, info) => {
    const type = info?.type;
    
    // 1. Streams ao vivo continuam usando mpegts.js
    if (type === 'live' || url.includes('.ts')) {
        return 'mpegts-live';
    }

    // 2. Para VOD (filmes/séries), usar Shaka Player
    if (type === 'movie' || type === 'series' || url.includes('.mp4')) {
        // Usaremos Shaka Player para VOD em todas as plataformas para consistência.
        console.log("Detector: VOD. Usando Shaka Player.");
        return 'shaka';
    }
    
    // 3. Fallback para streams ao vivo.
    return 'mpegts-live';
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
        if (type === 'shaka') {
          console.log('✨ Usando Shaka Player para VOD');
          await initShakaPlayer(streamUrl, videoElement);
        } else if (type === 'mpegts-vod') {
          console.log('📽️ Usando mpegts para MP4/VOD (Modo de Segurança)');
          await initMpegtsVodPlayer(streamUrl, videoElement);
        } else if (type === 'mpegts-live') {
          console.log('📡 Usando mpegts para live stream');
          await initMpegtsLivePlayer(streamUrl, videoElement);
        } else {
          // Fallback para mpegts live (ou outro se preferir, mas HLS e iframe removidos)
          console.log('📡 Usando mpegts player para stream (fallback principal agora)');
          await initMpegtsLivePlayer(streamUrl, videoElement);
        }

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

  // Função para inicializar o Shaka Player (v2.5.4)
  const initShakaPlayer = async (url, videoElement) => {
    return new Promise((resolve, reject) => {
      try {
        const player = new shaka.Player(videoElement);
        playerRef.current = player; // Armazena a instância do player

        // Configuração mínima e segura para Tizen, baseada na versão 2.5.4
        // Menos configurações complexas significam menos pontos de falha no Tizen.
        player.configure({
          streaming: {
            // Aumenta o tempo que o player espera por dados antes de dar erro.
            // Ajuda em conexões lentas ou com instabilidade.
            preferNativeHls: true, // Em Tizen, é melhor usar o player nativo para HLS.
            bufferingGoal: 120, // 2 minutos
            rebufferingGoal: 2,
            retryParameters: {
              timeout: 30000, // 30 segundos
              maxAttempts: 5,
            }
          }
        });

        // Listeners para sucesso e erro
        player.addEventListener('error', (event) => {
          console.error('💥 Erro no Shaka Player:', event.detail);
          reject(new Error(`Erro no Shaka Player: ${event.detail.code}`));
        });

        // Event listeners para progresso
        videoElement.addEventListener('loadstart', () => {
          setLoadingProgress(20);
        });

        videoElement.addEventListener('loadeddata', () => {
          setLoadingProgress(60);
        });

        videoElement.addEventListener('canplay', () => {
          setLoadingProgress(85);
        });

        videoElement.addEventListener('playing', () => {
          setLoadingProgress(100);
          // O estado isPlaying será gerenciado por um useEffect central
          setTimeout(() => {
            setIsLoading(false);
            setLoadingProgress(0);
          }, 500);
          initializingRef.current = false;
        });

        // Carregar a mídia
        player.load(url).then(() => {
          console.log('✅ Shaka Player carregou a mídia com sucesso.');
          setLoadingProgress(90);
          resolve();
        }).catch((error) => {
          console.error('💥 Erro ao carregar mídia no Shaka Player:', error);
          reject(error);
        });

      } catch (error) {
        console.error('💥 Falha ao inicializar o Shaka Player:', error);
        reject(error);
      }
    });
  };

  // Função para inicializar mpegts player para VOD (filmes/séries MP4)
  const initMpegtsVodPlayer = async (url, videoElement) => {
    return new Promise((resolve, reject) => {
      try {
        setLoadingMessage('Carregando vídeo...');
        
        const mediaDataSource = {
          type: 'mp4',
          isLive: false,
          url: url
        };

        // Configuração ultra-mínima para máxima estabilidade no Tizen.
        // O objetivo primário é evitar o congelamento da UI. O tempo de carregamento
        // pode ser longo, mas o app deve permanecer responsivo.
        const playerConfig = {
          enableWorker: false, // Essencial para Tizen
        };

        const player = mpegts.createPlayer(mediaDataSource, playerConfig);
        playerRef.current = player;

        player.on(mpegts.Events.ERROR, (errorType, errorDetail, errorInfo) => {
          console.error('❌ Erro mpegts VOD:', errorType, errorDetail, errorInfo);
          reject(new Error(`mpegts VOD error: ${errorType} - ${errorDetail}`));
        });
        
        const handlePlaying = () => {
          console.log('✅ mpegts VOD: Reproduzindo');
          clearTimeouts();
          setLoadingProgress(100);
          // O estado isPlaying será gerenciado por um useEffect central
          setTimeout(() => {
            setIsLoading(false);
            setLoadingProgress(0);
          }, 500);
          setError(null);
          initializingRef.current = false;
          resolve();
        };
        
        videoElement.addEventListener('playing', handlePlaying, { once: true });

        player.attachMediaElement(videoElement);
        player.load();
        
        // Timeout longo para permitir o carregamento de arquivos grandes
        errorTimeoutRef.current = setTimeout(() => {
          if (initializingRef.current) {
            console.error(`❌ Timeout mpegts VOD após 3 minutos para URL: ${url}`);
            reject(new Error(`Timeout mpegts VOD (${streamInfo?.title || 'Filme/Série'})`));
          }
        }, 180000); // 3 minutos

      } catch (err) {
        console.error('💥 Erro ao criar mpegts VOD player:', err);
        reject(err);
      }
    });
  };

  // Função para inicializar mpegts player para Live (canais ao vivo)
  const initMpegtsLivePlayer = async (url, videoElement) => {
    return new Promise((resolve, reject) => {
      try {
        setLoadingMessage('Carregando...');
        
        const player = mpegts.createPlayer({
          type: 'mpegts',
          isLive: true,
          url: url
        });

        playerRef.current = player;

        player.on(mpegts.Events.ERROR, (errorType, errorDetail, errorInfo) => {
          console.error('❌ Erro mpegts Live:', errorType, errorDetail, errorInfo);
          reject(new Error(`mpegts Live error: ${errorType} - ${errorDetail}`));
        });

        player.on(mpegts.Events.LOADING_COMPLETE, () => {
          setLoadingMessage('Iniciando...');
          setLoadingProgress(90);
        });

        const handlePlaying = () => {
          console.log('✅ mpegts Live: Reproduzindo');
          clearTimeouts();
          setLoadingProgress(100);
          // O estado isPlaying será gerenciado por um useEffect central
          setTimeout(() => {
            setIsLoading(false);
            setLoadingProgress(0);
          }, 500);
          setError(null);
          initializingRef.current = false;
          resolve();
        };

        videoElement.addEventListener('playing', handlePlaying);

        player.attachMediaElement(videoElement);
        player.load();

        // Para live, tentar autoplay
        setTimeout(() => {
          if (playerRef.current && videoRef.current && initializingRef.current) {
            playerRef.current.play().catch(playError => {
              console.warn('⚠️ Autoplay falhou, aguardando interação do usuário:', playError);
              // Para live streams, isso é aceitável
            });
          }
        }, 500);

        // Timeout para live
        errorTimeoutRef.current = setTimeout(() => {
          if (initializingRef.current) {
            reject(new Error('Timeout mpegts Live - verifique a conexão'));
          }
        }, 10000);

      } catch (err) {
        console.error('💥 Erro ao criar mpegts Live player:', err);
        reject(err);
      }
    });
  };

  // Função para limpar player
  const cleanupPlayer = useCallback(() => {
    clearTimeouts();
    cleanupBlobUrls();
    
  
    // Limpar elemento video
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

    // Limpar player mpegts
    if (playerRef.current) {
      try {
        const player = playerRef.current;
        
        if (player.isLoaded && player.isLoaded()) {
          if (player.pause) player.pause();
          if (player.unload) player.unload();
        }
        
        if (player.detachMediaElement) player.detachMediaElement();
        if (player.destroy) player.destroy();
        
      } catch (err) {
        console.error('Erro ao limpar player mpegts:', err);
      }
      
      playerRef.current = null;
    }
    
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
        
        {/* Renderização Condicional da UI */}
        {isControlsVisible && streamInfo?.type === 'live' ? (
          <div className="live-info-overlay">
            <div className="live-info-content">
              
              {/* Bloco da Esquerda: Logo e Info do Canal */}
              <div className="live-info-left">
                {streamInfo.logo && (
                  <img src={streamInfo.logo} alt="Logo do Canal" className="channel-logo" />
                )}
                <div className="channel-details">
                  <h2 className="channel-title">{streamInfo.number} {streamInfo.name}</h2>
                  <div className="program-info">
                    <p className="program-title">
                      <span>Atual:</span> {streamInfo.currentProgram?.title || 'Programa não informado'}
                    </p>
                    <p className="program-time">
                      Início: {streamInfo.currentProgram?.startTime || '--:--'}
                    </p>
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