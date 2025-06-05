import React, { useRef, useEffect, useState, useCallback } from 'react';
import mpegts from 'mpegts.js';

import './VideoPlayer.css';

const VideoPlayer = ({ isActive, streamUrl, streamInfo, onBack }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  const initializingRef = useRef(false);
  const errorTimeoutRef = useRef(null); 
  const previousStreamUrlRef = useRef(null);
  const blobUrlRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Carregando...');
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerType, setPlayerType] = useState(null);


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

    // 2. Para VOD (filmes/séries)
    if (type === 'movie' || type === 'series' || url.includes('.mp4')) {
        // No Tizen, voltamos a usar mpegts.js conforme solicitado, mas com uma configuração segura.
        if (isTizenTV) {
            console.log("Detector: VOD no Tizen. Usando mpegts-vod (modo de segurança).");
            return 'mpegts-vod';
        }
        // Em outros ambientes, o player nativo é o ideal.
        return 'html5-direct';
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
      setError(null);
      setIsPlaying(false);
      
      clearTimeouts();

      const videoElement = videoRef.current;

      try {
        if (type === 'mpegts-vod') {
          console.log('📽️ Usando mpegts para MP4/VOD (Modo de Segurança)');
          await initMpegtsVodPlayer(streamUrl, videoElement);
        } else if (type === 'mpegts-live') {
          console.log('📡 Usando mpegts para live stream');
          await initMpegtsLivePlayer(streamUrl, videoElement);
        } else if (type === 'html5-direct') {
          console.log('⚡ Usando HTML5 direto');
          const urlToTry = analysis.alternatives && analysis.alternatives.length > 0 ? analysis.alternatives[0].url : streamUrl;
          await initHtml5PlayerDirect(urlToTry, videoElement);
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

  // Função para inicializar HTML5 player direto (sem fetch)
  const initHtml5PlayerDirect = async (url, videoElement) => {
    return new Promise((resolve, reject) => {
      const handleLoadStart = () => {
        setLoadingMessage('Carregando...');
      };

      const handleLoadedData = () => {
        setLoadingMessage('Preparando...');
      };

      const handleCanPlay = () => {
        setLoadingMessage('Iniciando...');
      };

      const handlePlaying = () => {
        clearTimeouts();
        setIsPlaying(true);
        setIsLoading(false);
        setError(null);
        initializingRef.current = false;
        resolve();
      };

      const handleError = (err) => {
        clearTimeouts();
        
        // Tentar diagnóstico do erro
        if (videoElement.error) {
          const errorDetails = {
            1: 'MEDIA_ERR_ABORTED - Download abortado',
            2: 'MEDIA_ERR_NETWORK - Erro de rede',
            3: 'MEDIA_ERR_DECODE - Erro de decodificação',
            4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Formato não suportado'
          };
          console.error('Detalhes do erro HTML5:', errorDetails[videoElement.error.code] || 'Erro desconhecido no elemento video');
        }
        
        reject(new Error('Erro na reprodução HTML5 direta'));
      };

      // Limpar listeners anteriores
      const events = ['loadstart', 'loadeddata', 'canplay', 'playing', 'error'];
      events.forEach(event => {
        videoElement.removeEventListener(event, () => {});
      });

      // Adicionar event listeners
      videoElement.addEventListener('loadstart', handleLoadStart);
      videoElement.addEventListener('loadeddata', handleLoadedData);
      videoElement.addEventListener('canplay', handleCanPlay);
      videoElement.addEventListener('playing', handlePlaying);
      videoElement.addEventListener('error', handleError);

      // Configurar crossOrigin para tentar contornar CORS
      if (isDevelopment) {
        videoElement.crossOrigin = 'anonymous';
      } else if (isTizenTV) {
        videoElement.crossOrigin = null; // Tizen pode não precisar
      } else {
        videoElement.crossOrigin = 'use-credentials';
      }

      // Timeout para HTML5
      errorTimeoutRef.current = setTimeout(() => {
        if (initializingRef.current) {
          reject(new Error('Timeout na reprodução direta'));
        }
      }, 30000);

      // Configurar e carregar vídeo
      videoElement.src = url;
      videoElement.load();
      
      // Auto-play após pequeno delay
      setTimeout(() => {
        if (videoRef.current && initializingRef.current) {
          videoRef.current.play().catch(playError => {
            console.error('Erro no auto-play:', playError);
            // Não rejeitar imediatamente, aguardar timeout
          });
        }
      }, 500);
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
          setIsPlaying(true);
          setIsLoading(false);
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
        });

        const handlePlaying = () => {
          console.log('✅ mpegts Live: Reproduzindo');
          clearTimeouts();
          setIsPlaying(true);
          setIsLoading(false);
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
    setError(null);
    setIsPlaying(false);
    setPlayerType(null);
    
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

  // Sistema de navegação por controle remoto
  useEffect(() => {
    if (!isActive) return;

    const handlePlayerNavigation = (event) => {
      const { keyCode } = event.detail;
      
      if (keyCode === 8 || keyCode === 10009) {
        handleBack();
      } else if (isPlaying) {
        
      }
    };

    // Mostrar overlay ao mover mouse (para web)
    const handleMouseMove = () => {
      if (isPlaying && !isDevelopment) {
        // showOverlayTemporarily(); // Removido
      }
    };

    // Mostrar overlay ao tocar na tela (para mobile/TV)
    const handleTouch = () => {
      if (isPlaying) {
        // showOverlayTemporarily(); // Removido
      }
    };

    window.addEventListener('playerNavigation', handlePlayerNavigation);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchstart', handleTouch);
    document.addEventListener('click', handleTouch);
    
    return () => {
      window.removeEventListener('playerNavigation', handlePlayerNavigation);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchstart', handleTouch);
      document.removeEventListener('click', handleTouch);
    };
  }, [isActive, handleBack, isPlaying, isDevelopment]); // Removido showOverlayTemporarily das dependências

  const retryPlaybackSimple = () => { 
    console.log('🔄 Tentando reproduzir novamente...');
    
    // Adicionar limpeza explícita aqui
    cleanupPlayer();

    setError(null);
    setIsLoading(true);
    setLoadingMessage('Tentando novamente...');
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
       
        {/* Loading Overlay */}
        {isLoading && !isPlaying && (
          <div className="loading-overlay">
            <div className="loading-spinner">⏳</div>
            <p className="loading-message">{loadingMessage}</p>
            {streamInfo && (
              <p className="loading-content-info">
                {streamInfo.type === 'series' ? 'Série' : 
                 streamInfo.type === 'movie' ? 'Filme' : 
                 streamInfo.type === 'live' ? 'TV ao Vivo' : 'Conteúdo'}
              </p>
            )}
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