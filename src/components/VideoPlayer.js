import React, { useRef, useEffect, useState, useCallback } from 'react';
import mpegts from 'mpegts.js';
import Hls from 'hls.js';
import './VideoPlayer.css';

const VideoPlayer = ({ isActive, streamUrl, streamInfo, onBack }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const hlsRef = useRef(null);
  const iframeRef = useRef(null);
  const initializingRef = useRef(false);
  const errorTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const previousStreamUrlRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const blobUrlRef = useRef(null);
  const overlayTimeoutRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Carregando...');
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerType, setPlayerType] = useState(null);
  const [useIframe, setUseIframe] = useState(false);
  const [urlAnalysis, setUrlAnalysis] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs para os botões de controle VOD
  const rewindButtonRef = useRef(null);
  const playPauseButtonRef = useRef(null);
  const forwardButtonRef = useRef(null);

  // Estado para rastrear o botão VOD focado (0: rewind, 1: play/pause, 2: forward)
  const [focusedVodButtonIndex, setFocusedVodButtonIndex] = useState(null);

  // Detectar ambiente (desenvolvimento vs produção)
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');

  // Sistema de auto-hide para overlays
  const startOverlayTimer = useCallback(() => {
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    
    // Mostrar overlay inicialmente
    setShowOverlay(true);
    
    overlayTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !error && !isLoading) {
        setShowOverlay(false);
      }
    }, 10000); // Esconder após 5 segundos
  }, [isPlaying, error, isLoading]);

  const showOverlayTemporarily = useCallback(() => {
    setShowOverlay(true);
    startOverlayTimer();
  }, [startOverlayTimer]);

  // Limpar timer do overlay
  const clearOverlayTimer = useCallback(() => {
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = null;
    }
  }, []);

  // Função para analisar e corrigir URLs problemáticas
  const analyzeAndFixUrl = (url) => {
    console.log('🔍 Analisando URL:', url);
    
    const analysis = {
      original: url,
      protocol: null,
      domain: null,
      hasToken: false,
      needsHttps: false,
      suggestions: [],
      isProblematicRoute: false
    };

    try {
      const urlObj = new URL(url);
      analysis.protocol = urlObj.protocol;
      analysis.domain = urlObj.hostname;
      analysis.hasToken = urlObj.searchParams.has('token') || url.includes('token=');
      
      // Detectar rotas problemáticas conhecidas
      const problematicDomains = [
        'rota66.bar',
        '74.63.227.218',
        'rotas.tv',
        'server.iptv'
      ];
      
      analysis.isProblematicRoute = problematicDomains.some(domain => 
        urlObj.hostname.includes(domain)
      );
      
      if (analysis.isProblematicRoute) {
        analysis.suggestions.push('Rota problemática detectada');
        console.log('⚠️ Rota problemática detectada:', urlObj.hostname);
      }
      
      // Verificar se precisa forçar HTTPS
      if (urlObj.protocol === 'http:' && !isDevelopment) {
        analysis.needsHttps = true;
        analysis.suggestions.push('Tentar HTTPS');
      }
      
      // Verificar se é IP direto vs domínio
      const isIpAddress = /^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname);
      if (isIpAddress) {
        analysis.suggestions.push('URL usa IP direto - possível redirect');
      }
      
      // Gerar URLs alternativas com estratégias específicas para rotas problemáticas
      const alternatives = [];
      
      // 1. URL original (sempre tentar primeiro)
      alternatives.push({ type: 'original', url: url });
      
      // 2. Para rotas problemáticas, tentar variações específicas
      if (analysis.isProblematicRoute) {
        
        // Estratégia baseada nos dados reais: tentar URLs diretas do servidor final
        const pathParts = urlObj.pathname.split('/');
        const movieId = pathParts[pathParts.length - 1]; // Ex: 338541
        const userPath = pathParts.slice(1, -1).join('/'); // Ex: zBB82J/AMeDHq
        
        // URLs diretas do servidor real (baseado nos redirects observados)
        alternatives.push({
          type: 'direct-server-mp4',
          url: `http://74.63.227.218/${userPath}/${movieId}.mp4`
        });
        alternatives.push({
          type: 'direct-server-mkv', 
          url: `http://74.63.227.218/${userPath}/${movieId}.mkv`
        });
        alternatives.push({
          type: 'direct-server-avi',
          url: `http://74.63.227.218/${userPath}/${movieId}.avi`
        });
        
        // Tentar com HTTPS no servidor direto
        alternatives.push({
          type: 'https-direct-server',
          url: `https://74.63.227.218/${userPath}/${movieId}.mp4`
        });
        
        // 4. Fallback: tentar o domínio original mas com caminhos diferentes
        alternatives.push({
          type: 'original-movie-path',
          url: `${urlObj.protocol}//${urlObj.hostname}/movie/${userPath}/${movieId}.mp4`
        });
        alternatives.push({
          type: 'original-vod-path', 
          url: `${urlObj.protocol}//${urlObj.hostname}/vod/${movieId}.mp4`
        });
        
      } else {
        // Para URLs normais, usar estratégias padrão
        
        // Forçar HTTPS se for HTTP
        if (urlObj.protocol === 'http:') {
          alternatives.push({ 
            type: 'https', 
            url: url.replace('http://', 'https://') 
          });
        }
        
        // Tentar sem token (caso esteja expirado)
        if (analysis.hasToken) {
          const urlWithoutToken = url.split('?')[0];
          alternatives.push({ 
            type: 'no-token', 
            url: urlWithoutToken 
          });
        }
        
        // Tentar diferentes protocolos de streaming
        const baseUrl = url.split('?')[0];
        alternatives.push({ 
          type: 'direct-mp4', 
          url: baseUrl 
        });
      }
      
      // Limitar número de alternativas para evitar sobrecarga
      analysis.alternatives = alternatives.slice(0, 12);
      
    } catch (err) {
      console.error('Erro ao analisar URL:', err);
      analysis.alternatives = [{ type: 'original', url: url }];
    }
    
    console.log('📊 Análise da URL:', analysis);
    console.log('🔄 Alternativas geradas:', analysis.alternatives.length);
    setUrlAnalysis(analysis);
    return analysis;
  };

  // Função para tentar fetch com follow redirects
  const fetchWithRedirects = async (url, options = {}) => {
    console.log('🔄 Tentando fetch com redirects para:', url);
    
    try {
      const response = await fetch(url, {
        ...options,
        redirect: 'follow', // Seguir redirects automaticamente
        mode: 'no-cors'
      });
      
      console.log('✅ Fetch com redirects OK para:', url);
      return { success: true, url: response.url || url };
    } catch (error) {
      console.error('❌ Fetch com redirects falhou:', error);
      return { success: false, error };
    }
  };

  // Headers personalizados para contornar erro 403
  const getCustomHeaders = () => ({
    'Accept': '*/*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  });

  // Headers seguros para HLS (sem os bloqueados pelo navegador)
  const getSafeHeaders = () => ({
    'Accept': '*/*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache'
  });

  // Função para tentar múltiplas URLs sequencialmente
  const tryMultipleUrls = async (alternatives, testFunction) => {
    for (const alt of alternatives) {
      console.log(`🎯 Tentando URL ${alt.type}:`, alt.url);
      setLoadingMessage('Carregando...');
      
      try {
        const result = await testFunction(alt.url);
        if (result) {
          console.log(`✅ Sucesso com URL ${alt.type}:`, alt.url);
          return { success: true, url: alt.url, type: alt.type };
        }
      } catch (error) {
        console.warn(`❌ Falhou URL ${alt.type}:`, error.message);
      }
      
      // Pequeno delay entre tentativas
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return { success: false };
  };

  // Função para detectar tipo de player necessário
  const detectPlayerType = (url, info) => {
    console.log('🔍 Detectando tipo de player:', { url, info, isTizenTV });
    
    // Se for Tizen TV com flags específicas, forçar mpegts
    if (isTizenTV && info?.forceTizenPlayer) {
      console.log('📺 Forçando mpegts para Tizen TV com flags específicas');
      // Para séries/filmes no Tizen, usar mpegts configurado para VOD
      if (info?.type === 'series' || info?.type === 'movie') {
        return 'mpegts-vod';
      }
      return 'mpegts-live';
    }
    
    // TV ao vivo sempre usa mpegts
    if (info?.type === 'live') {
      return 'mpegts-live';
    }
    
    // Para Tizen TV, priorizar mpegts para filmes e séries
    if (isTizenTV && (info?.type === 'movie' || info?.type === 'series')) {
      console.log('📺 Usando mpegts-vod para Tizen TV');
      return 'mpegts-vod';
    }
    
    // Filmes e séries MP4 usam mpegts configurado para MP4
    if (info?.type === 'movie' || info?.type === 'series') {
      return 'mpegts-vod';
    }
    
    // Detectar HLS
    if (url.includes('.m3u8') || url.includes('hls')) {
      return 'hls-safe';
    }
    
    // Fallback baseado na URL - priorizar mpegts para MP4 na TV
    if (url.includes('.mp4') || url.includes('series/') || url.includes('movie/')) {
      return isTizenTV ? 'mpegts-vod' : 'html5-multi-url';
    }
    
    // Padrão: mpegts para streams
    return 'mpegts-live';
  };

  // Limpar timeouts ativos
  const clearTimeouts = () => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
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
      console.log('Mesma URL e sem erros, não reinicializar');
      return;
    }

    if (initializingRef.current) {
      console.log('Já está inicializando, aguardando...');
      return;
    }

    console.log('🎬 Iniciando reprodução:', streamUrl);
    console.log('🌍 Ambiente:', { isDevelopment, isTizenTV });
    
    // Analisar URL primeiro
    const analysis = analyzeAndFixUrl(streamUrl);
    
    // Limpar player anterior se existir e a URL mudou
    if (previousStreamUrlRef.current !== streamUrl) {
      console.log('URL mudou, limpando player anterior');
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
        console.log('Não é possível inicializar: elemento video ou URL ausente');
        initializingRef.current = false;
        return;
      }

      console.log(`🚀 Inicializando player ${type} com URL:`, streamUrl);
      setIsLoading(true);
      setLoadingMessage('Carregando...');
      setError(null);
      setIsPlaying(false);
      setUseIframe(false);
      clearOverlayTimer();
      
      clearTimeouts();

      const videoElement = videoRef.current;

      try {
        if (type === 'mpegts-vod') {
          console.log('📽️ Usando mpegts para MP4/VOD');
          await initMpegtsVodPlayer(streamUrl, videoElement);
          
        } else if (type === 'mpegts-live') {
          console.log('📡 Usando mpegts para live stream');
          await initMpegtsLivePlayer(streamUrl, videoElement);
          
        } else if (type === 'html5-multi-url') {
          console.log('🔄 Usando HTML5 com múltiplas URLs');
          await initHtml5PlayerMultiUrl(analysis.alternatives, videoElement);
          
        } else if (type === 'html5-direct') {
          console.log('⚡ Usando HTML5 direto');
          await initHtml5PlayerDirect(streamUrl, videoElement);
          
        } else if (type === 'hls-safe') {
          console.log('📺 Usando HLS.js com headers seguros');
          await initHlsPlayerSafe(streamUrl, videoElement);
          
        } else if (type === 'iframe-fallback') {
          console.log('🖼️ Usando iframe como fallback');
          await initIframePlayer(streamUrl);
          
        } else {
          // Fallback para mpegts live
          console.log('📡 Usando mpegts player para stream (fallback)');
          await initMpegtsLivePlayer(streamUrl, videoElement);
        }

      } catch (err) {
        console.error('💥 Erro ao criar player:', err);
        clearTimeouts();
        
        // Tentar iframe como último recurso para conteúdo on-demand
        if (streamInfo?.type === 'movie' || streamInfo?.type === 'series') {
          console.log('🆘 Tentando iframe como último recurso...');
          try {
            await initIframePlayer(streamUrl);
          } catch (iframeError) {
            // Se tudo falhou, mostrar mensagem explicativa específica para IPTV
            setError(`❌ Reprodução não disponível neste navegador

🔍 Problema identificado: Este servidor IPTV (${urlAnalysis?.domain || 'rota66.bar'}) bloqueia navegadores web por questões de segurança.

📱 Soluções recomendadas:
• Use o aplicativo nativo na Smart TV Samsung/LG
• Use aplicativo IPTV dedicado (como IPTV Smarters)
• Acesse via STB ou Android TV Box

⚠️ Limitação técnica: Servidores IPTV frequentemente bloqueiam navegadores para evitar uso não autorizado.

🔧 Detalhes técnicos: ${err.message}`);
            setIsLoading(false);
            initializingRef.current = false;
          }
        } else {
          setError(`Erro ao inicializar player: ${err.message}`);
          setIsLoading(false);
          initializingRef.current = false;
        }
      }
    };

    // Chamar função de inicialização
    initPlayer(detectedPlayerType);
  }, [isActive, streamUrl, streamInfo, isDevelopment, isTizenTV]);

  // Função para inicializar HTML5 player com múltiplas URLs
  const initHtml5PlayerMultiUrl = async (alternatives, videoElement) => {
    console.log('🎯 Tentando HTML5 com múltiplas URLs:', alternatives.length);
    
    const testUrl = async (url) => {
      return new Promise((resolve, reject) => {
        console.log('🧪 Testando URL:', url);
        
        const tempVideo = document.createElement('video');
        let resolved = false;
        let loadStarted = false;
        
        const cleanup = () => {
          if (!resolved) {
            resolved = true;
            tempVideo.removeEventListener('loadstart', onLoadStart);
            tempVideo.removeEventListener('error', onError);
            tempVideo.removeEventListener('canplay', onCanPlay);
            tempVideo.removeEventListener('loadeddata', onLoadedData);
            tempVideo.src = '';
          }
        };
        
        const onLoadStart = () => {
          console.log('✅ URL carregou (loadstart):', url);
          loadStarted = true;
          // Não resolver ainda, aguardar mais dados
        };
        
        const onLoadedData = () => {
          console.log('✅ URL com dados carregados:', url);
          cleanup();
          resolve(true);
        };
        
        const onCanPlay = () => {
          console.log('✅ URL pode reproduzir:', url);
          cleanup();
          resolve(true);
        };
        
        const onError = (e) => {
          console.warn('❌ URL falhou:', url, e);
          console.warn('❌ Erro detalhado:', tempVideo.error);
          
          // Analisar tipo de erro específico
          if (tempVideo.error) {
            const errorType = {
              1: 'ABORTED',
              2: 'NETWORK', 
              3: 'DECODE',
              4: 'SRC_NOT_SUPPORTED'
            }[tempVideo.error.code] || 'UNKNOWN';
            
            console.warn(`❌ Tipo de erro: ${errorType}`);
          }
          
          cleanup();
          reject(new Error(`URL falhou: ${tempVideo.error?.code || 'unknown'}`));
        };
        
        tempVideo.addEventListener('loadstart', onLoadStart);
        tempVideo.addEventListener('loadeddata', onLoadedData);
        tempVideo.addEventListener('canplay', onCanPlay);
        tempVideo.addEventListener('error', onError);
        
        // Timeout mais agressivo para rotas problemáticas
        const isProblematicUrl = urlAnalysis?.isProblematicRoute;
        const timeoutDuration = isProblematicUrl ? 2000 : 3000; // 2s para rotas problemáticas
        
        setTimeout(() => {
          if (!resolved) {
            if (loadStarted) {
              console.warn('⏰ Timeout mas loadstart detectado para:', url);
              // Se começou a carregar, dar mais tempo
              setTimeout(() => {
                if (!resolved) {
                  console.warn('⏰ Timeout final para:', url);
                  cleanup();
                  reject(new Error('Timeout final'));
                }
              }, 2000);
            } else {
              console.warn('⏰ Timeout sem loadstart para:', url);
              cleanup();
              reject(new Error('Timeout'));
            }
          }
        }, timeoutDuration);
        
        // Configurar crossOrigin baseado no tipo de URL
        if (isDevelopment) {
          // Em desenvolvimento, ser mais permissivo
          tempVideo.crossOrigin = null;
        } else if (isTizenTV) {
          // Tizen TV geralmente não precisa de crossOrigin
          tempVideo.crossOrigin = null;
        } else if (isProblematicUrl) {
          // Para rotas problemáticas, tentar sem crossOrigin primeiro
          tempVideo.crossOrigin = null;
        } else {
          tempVideo.crossOrigin = 'anonymous';
        }
        
        // Configurar e testar
        tempVideo.preload = 'metadata'; // Carregar apenas metadados
        tempVideo.src = url;
        tempVideo.load();
      });
    };
    
    // Estratégia especial para rotas problemáticas
    if (urlAnalysis?.isProblematicRoute) {
      console.log('⚠️ Aplicando estratégia especial para rota problemática');
      
      // Para rotas problemáticas, tentar com delay entre tentativas
      const delayBetweenTries = 750; // Delay maior entre tentativas
      
      for (const alt of alternatives) {
        console.log(`🎯 Tentando URL ${alt.type}:`, alt.url);
        setLoadingMessage('Carregando...');
        
        try {
          const result = await testUrl(alt.url);
          if (result) {
            console.log(`✅ Sucesso com URL ${alt.type}:`, alt.url);
            return initHtml5PlayerDirect(alt.url, videoElement);
          }
        } catch (error) {
          console.warn(`❌ Falhou URL ${alt.type}:`, error.message);
          
          // Para rotas problemáticas, logar mais detalhes
          if (error.message.includes('SRC_NOT_SUPPORTED')) {
            console.warn('🚫 Formato não suportado - tentando próxima alternativa');
          } else if (error.message.includes('NETWORK')) {
            console.warn('🌐 Erro de rede - servidor pode estar bloqueando');
          }
        }
        
        // Delay entre tentativas para rotas problemáticas
        await new Promise(resolve => setTimeout(resolve, delayBetweenTries));
      }
      
    } else {
      // Para URLs normais, usar estratégia padrão mais rápida
      const result = await tryMultipleUrls(alternatives, testUrl);
      
      if (result.success) {
        console.log('🎉 URL funcionando encontrada:', result.url);
        return initHtml5PlayerDirect(result.url, videoElement);
      }
    }
    
    throw new Error('Nenhuma URL alternativa funcionou - todas falharam nos testes');
  };

  // Função para inicializar HTML5 player direto (sem fetch)
  const initHtml5PlayerDirect = async (url, videoElement) => {
    return new Promise((resolve, reject) => {
      console.log('⚡ Configurando HTML5 player direto com URL:', url);
      
      const handleLoadStart = () => {
        console.log('HTML5 Direto: Começou a carregar');
        setLoadingMessage('Carregando...');
      };

      const handleLoadedData = () => {
        console.log('HTML5 Direto: Dados carregados');
        setLoadingMessage('Preparando...');
      };

      const handleCanPlay = () => {
        console.log('HTML5 Direto: Pode reproduzir');
        setLoadingMessage('Iniciando...');
      };

      const handlePlaying = () => {
        console.log('HTML5 Direto: Reproduzindo');
        clearTimeouts();
        setIsPlaying(true);
        setIsLoading(false);
        setError(null);
        initializingRef.current = false;
        startOverlayTimer(); // Iniciar timer para esconder overlay
        resolve();
      };

      const handleError = (err) => {
        console.error('Erro HTML5 Direto:', err, videoElement.error);
        clearTimeouts();
        
        // Tentar diagnóstico do erro
        if (videoElement.error) {
          const errorDetails = {
            1: 'MEDIA_ERR_ABORTED - Download abortado',
            2: 'MEDIA_ERR_NETWORK - Erro de rede',
            3: 'MEDIA_ERR_DECODE - Erro de decodificação',
            4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Formato não suportado'
          };
          console.error('Detalhes do erro:', errorDetails[videoElement.error.code] || 'Erro desconhecido');
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
          console.log('Timeout HTML5 Direto');
          reject(new Error('Timeout na reprodução direta'));
        }
      }, 15000);

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

  // Função para inicializar HLS.js com headers seguros
  const initHlsPlayerSafe = async (url, videoElement) => {
    return new Promise((resolve, reject) => {
      try {
        if (!Hls.isSupported()) {
          throw new Error('HLS não suportado neste navegador');
        }

        const hls = new Hls({
          xhrSetup: (xhr, url) => {
            // Apenas headers seguros que o navegador permite
            const safeHeaders = getSafeHeaders();
            Object.keys(safeHeaders).forEach(key => {
              try {
                xhr.setRequestHeader(key, safeHeaders[key]);
              } catch (e) {
                console.log(`Header ${key} não permitido:`, e.message);
              }
            });
          },
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('HLS Seguro: Mídia anexada');
          setLoadingMessage('Carregando...');
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS Seguro: Manifest carregado');
          setLoadingMessage('Iniciando...');
          
          videoElement.play().then(() => {
            console.log('HLS Seguro: Reprodução iniciada');
            setIsPlaying(true);
            setIsLoading(false);
            setError(null);
            initializingRef.current = false;
            startOverlayTimer(); // Iniciar timer para esconder overlay
            resolve();
          }).catch(reject);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('Erro HLS Seguro:', data);
          
          if (data.fatal) {
            reject(new Error(`HLS: ${data.details}`));
          }
        });

        hls.attachMedia(videoElement);
        hls.loadSource(url);

        // Timeout para HLS
        errorTimeoutRef.current = setTimeout(() => {
          if (initializingRef.current) {
            console.log('Timeout HLS Seguro');
            reject(new Error('Timeout HLS'));
          }
        }, 15000);

      } catch (err) {
        reject(err);
      }
    });
  };

  // Função para inicializar iframe player
  const initIframePlayer = async (url) => {
    return new Promise((resolve, reject) => {
      console.log('🖼️ Configurando iframe player com URL:', url);
      setLoadingMessage('Carregando...');
      setUseIframe(true);
      
      // Simular carregamento bem-sucedido após delay
      setTimeout(() => {
        setIsPlaying(true);
        setIsLoading(false);
        setError(null);
        initializingRef.current = false;
        startOverlayTimer(); // Iniciar timer para esconder overlay
        resolve();
      }, 2000);
      
      // Timeout de segurança
      errorTimeoutRef.current = setTimeout(() => {
        if (initializingRef.current) {
          console.log('Timeout iframe');
          reject(new Error('Timeout iframe'));
        }
      }, 10000);
    });
  };

  // Função para inicializar mpegts player para VOD (filmes/séries MP4)
  const initMpegtsVodPlayer = async (url, videoElement) => {
    return new Promise((resolve, reject) => {
      try {
        setLoadingMessage('Carregando...');
        console.log('📽️ Configurando mpegts para MP4:', { url, type: 'mp4', isLive: false });
        
        const player = mpegts.createPlayer({
          type: 'mp4',           // Tipo específico para MP4
          isLive: false,         // VOD não é ao vivo
          cors: true,            // Habilitar CORS
          withCredentials: false, // Evitar problemas de autenticação
          hasAudio: true,        // MP4 tem áudio
          hasVideo: true,        // MP4 tem vídeo
          url: url
        });

        playerRef.current = player;

        player.on(mpegts.Events.ERROR, (errorType, errorDetail, errorInfo) => {
          console.error('❌ Erro mpegts VOD:', errorType, errorDetail, errorInfo);
          reject(new Error(`mpegts VOD error: ${errorType} - ${errorDetail}`));
        });

        player.on(mpegts.Events.LOADING_COMPLETE, () => {
          console.log('✅ mpegts VOD: Carregamento completo');
          setLoadingMessage('Iniciando...');
        });

        const handlePlaying = () => {
          console.log('✅ mpegts VOD: Reproduzindo');
          clearTimeouts();
          setIsPlaying(true);
          setIsLoading(false);
          setError(null);
          initializingRef.current = false;
          startOverlayTimer(); // Iniciar timer para esconder overlay
          resolve();
        };

        const handleCanPlay = () => {
          console.log('✅ mpegts VOD: Pode reproduzir');
          // Para VOD, não fazer autoplay automático
          setIsLoading(false);
          setError(null);
          initializingRef.current = false;
          startOverlayTimer(); // Iniciar timer para esconder overlay
          resolve();
        };

        videoElement.addEventListener('playing', handlePlaying);
        videoElement.addEventListener('canplay', handleCanPlay);

        player.attachMediaElement(videoElement);
        player.load();

        // Para VOD, aguardar um pouco antes de tentar reproduzir
        setTimeout(() => {
          if (playerRef.current && videoRef.current && initializingRef.current) {
            // Não fazer autoplay para VOD, deixar usuário iniciar
            console.log('🎬 Player VOD pronto para reprodução manual');
          }
        }, 1000);

        // Timeout para VOD (mais longo que live)
        errorTimeoutRef.current = setTimeout(() => {
          if (initializingRef.current) {
            reject(new Error('Timeout mpegts VOD - verifique a URL do filme'));
          }
        }, 15000);

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
        console.log('📡 Configurando mpegts para live:', { url, type: 'mpegts', isLive: true });
        
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
          console.log('✅ mpegts Live: Carregamento completo');
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

  // Função para inicializar mpegts player (compatibilidade - mantida para não quebrar código existente)
  const initMpegtsPlayer = async (url, videoElement) => {
    // Determinar se é live ou VOD baseado no streamInfo
    if (streamInfo?.type === 'live') {
      return initMpegtsLivePlayer(url, videoElement);
    } else {
      return initMpegtsVodPlayer(url, videoElement);
    }
  };

  // Função para limpar player
  const cleanupPlayer = useCallback(() => {
    clearTimeouts();
    cleanupBlobUrls();
    clearOverlayTimer(); // Limpar timer do overlay
    
    // Limpar HLS
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
        console.log('HLS player limpo');
      } catch (err) {
        console.error('Erro ao limpar HLS:', err);
      }
      hlsRef.current = null;
    }
    
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
        
        console.log('Player mpegts limpo');
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
    setUseIframe(false);
    setUrlAnalysis(null);
    setShowOverlay(false); // Reset do overlay
    initializingRef.current = false;
    previousStreamUrlRef.current = null;
    retryAttemptRef.current = 0;
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
    
    console.log('🛡️ Ativando proteção contra redirecionamento Tizen TV');
    
    const preventRedirect = (event) => {
      // Prevenir navegação automática para URLs de vídeo
      if (event.target.tagName === 'A' || event.target.tagName === 'VIDEO') {
        const href = event.target.href || event.target.src;
        if (href && (href.includes('.mp4') || href.includes('.mkv') || href.includes('.avi'))) {
          console.log('🚫 Prevenindo redirecionamento automático:', href);
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      }
    };
    
    const preventWindowOpen = () => {
      console.log('🚫 Prevenindo window.open no Tizen TV');
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
      console.log('🛡️ Proteção contra redirecionamento removida');
    };
  }, [isActive, isTizenTV, streamInfo?.preventBrowserRedirect]);

  // Sistema de navegação por controle remoto
  useEffect(() => {
    if (!isActive) return;

    const handlePlayerNavigation = (event) => {
      const { keyCode } = event.detail;

      // Condições para ativar a navegação nos controles VOD
      const vodControlsActive = isVOD && isPlaying && showOverlay && !useIframe;

      if (vodControlsActive) {
        let newIndex = focusedVodButtonIndex;
        if (keyCode === 37) { // Esquerda
          if (focusedVodButtonIndex === null) newIndex = 1; // Foca no play/pause se nada estiver focado
          else newIndex = (focusedVodButtonIndex - 1 + 3) % 3; // (0-1+3)%3 = 2; (1-1+3)%3 = 0; (2-1+3)%3 = 1
          setFocusedVodButtonIndex(newIndex);
          showOverlayTemporarily(); // Manter overlay visível
          event.preventDefault?.(); // Prevenir comportamento padrão do navegador/TV
          event.stopPropagation?.();
          return; // Navegação VOD tratada
        } else if (keyCode === 39) { // Direita
          if (focusedVodButtonIndex === null) newIndex = 1; // Foca no play/pause se nada estiver focado
          else newIndex = (focusedVodButtonIndex + 1) % 3; // (0+1)%3 = 1; (1+1)%3 = 2; (2+1)%3 = 0
          setFocusedVodButtonIndex(newIndex);
          showOverlayTemporarily(); // Manter overlay visível
          event.preventDefault?.();
          event.stopPropagation?.();
          return; // Navegação VOD tratada
        } else if (keyCode === 13) { // OK/Enter
          if (focusedVodButtonIndex === 0) rewindButtonRef.current?.click();
          else if (focusedVodButtonIndex === 1) playPauseButtonRef.current?.click();
          else if (focusedVodButtonIndex === 2) forwardButtonRef.current?.click();
          showOverlayTemporarily(); // Manter overlay visível após ação
          event.preventDefault?.();
          event.stopPropagation?.();
          return; // Ação VOD tratada
        }
      }

      // Lógica de navegação existente (não relacionada aos botões VOD)
      if (keyCode === 8 || keyCode === 10009) { // BACK or RETURN key
        handleBack();
      } else if (keyCode === 415) { // PLAY
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
          }
        }
        showOverlayTemporarily();
      } else if (keyCode === 19) { // PAUSE
        if (videoRef.current) {
          if (!videoRef.current.paused) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }
        showOverlayTemporarily();
      } else if (keyCode === 413) { // STOP (used as back for VOD or general stop)
        handleBack(); // Or specific stop logic if needed
        showOverlayTemporarily();
      } else if (keyCode === 412) { // REWIND
        if (videoRef.current && (streamInfo?.type === 'movie' || streamInfo?.type === 'series') && !vodControlsActive) { // Só aciona se os controles VOD não estiverem ativos
          videoRef.current.currentTime -= 10;
        }
        showOverlayTemporarily();
      } else if (keyCode === 417) { // FAST_FORWARD
        if (videoRef.current && (streamInfo?.type === 'movie' || streamInfo?.type === 'series') && !vodControlsActive) { // Só aciona se os controles VOD não estiverem ativos
          videoRef.current.currentTime += 10;
        }
        showOverlayTemporarily();
      } else if (isPlaying) {
        showOverlayTemporarily();
      }
    };

    // Mostrar overlay ao mover mouse (para web)
    const handleMouseMove = () => {
      if (isPlaying && !isDevelopment) {
        showOverlayTemporarily();
      }
    };

    // Mostrar overlay ao tocar na tela (para mobile/TV)
    const handleTouch = () => {
      if (isPlaying) {
        showOverlayTemporarily();
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
  }, [isActive, handleBack, isPlaying, showOverlayTemporarily, isDevelopment, isVOD, showOverlay, useIframe, focusedVodButtonIndex]);

  const retryPlayback = () => {
    console.log('🔄 Tentando reproduzir novamente...');
    retryAttemptRef.current += 1;
    
    setError(null);
    setIsLoading(true);
    setLoadingMessage('Tentando novamente...');
    setIsPlaying(false);
    
    initializingRef.current = false;
    cleanupPlayer();
    
    retryTimeoutRef.current = setTimeout(() => {
      if (isActive && streamUrl) {
        // Tentar estratégias diferentes baseado no número de tentativas
        let detectedPlayerType;
        
        if (retryAttemptRef.current === 1) {
          detectedPlayerType = 'html5-multi-url';
        } else if (retryAttemptRef.current === 2) {
          detectedPlayerType = 'html5-direct';
        } else if (retryAttemptRef.current === 3) {
          detectedPlayerType = 'hls-safe';
        } else {
          detectedPlayerType = 'iframe-fallback';
        }
        
        console.log(`🎯 Tentativa ${retryAttemptRef.current}: usando ${detectedPlayerType}`);
        setPlayerType(detectedPlayerType);
        setLoadingMessage('Carregando...');
        initializeIfNeeded();
      }
    }, 1000);
  };

  // Event listeners para tempo e duração (MOVIDO PARA ANTES DO RETURN CONDICIONAL)
  useEffect(() => {
    const videoElement = videoRef.current;
    const isVOD = streamInfo?.type === 'movie' || streamInfo?.type === 'series';
    
    // O efeito só deve anexar listeners se o componente estiver ativo, for VOD, e o elemento de vídeo existir
    if (isActive && isVOD && videoElement) {
      const updateCurrentTime = () => {
        if (videoElement.currentTime && Number.isFinite(videoElement.currentTime)) {
          setCurrentTime(videoElement.currentTime);
        } else if (videoElement) { // se videoElement existe mas currentTime não é válido
          setCurrentTime(0);
        }
      };
      const updateDuration = () => {
        if (videoElement.duration && Number.isFinite(videoElement.duration)) {
          setDuration(videoElement.duration);
        } else if (videoElement) { // se videoElement existe mas duration não é válido
          setDuration(0);
        }
      };

      videoElement.addEventListener('timeupdate', updateCurrentTime);
      videoElement.addEventListener('loadedmetadata', updateDuration);
      videoElement.addEventListener('durationchange', updateDuration);

      // Sincronização inicial quando o efeito roda (ex: fonte do vídeo muda ou isActive/isVOD se torna true)
      if (videoElement.readyState >= 1) { // HAVE_METADATA ou mais
        updateDuration();
        updateCurrentTime();
      } else {
        // Se não estiver pronto, garantir que os tempos sejam resetados
        setCurrentTime(0);
        setDuration(0);
      }

      return () => {
        videoElement.removeEventListener('timeupdate', updateCurrentTime);
        videoElement.removeEventListener('loadedmetadata', updateDuration);
        videoElement.removeEventListener('durationchange', updateDuration);
      };
    } else {
      // Se não estiver ativo ou não for VOD, garantir que currentTime e duration sejam resetados.
      setCurrentTime(0);
      setDuration(0);
    }
  }, [isActive, streamInfo]); // Dependências atualizadas

  // Funções helper movidas para antes do return condicional
  const isVOD = streamInfo?.type === 'movie' || streamInfo?.type === 'series';

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (event) => {
    if (videoRef.current) {
      const seekBar = event.target;
      const rect = seekBar.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const newTime = (offsetX / seekBar.offsetWidth) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  // Efeito para gerenciar o foco inicial nos botões VOD e resetar
  useEffect(() => {
    const conditionsMet = isVOD && isPlaying && showOverlay && !useIframe;
    if (conditionsMet) {
      if (focusedVodButtonIndex === null) { // Se nenhum botão VOD estava focado antes
        setFocusedVodButtonIndex(1); // Foca no Play/Pause por padrão
      }
      // Focar no botão correto baseado no índice (após a atualização do estado)
      // Isso será melhor tratado no useEffect que depende de focusedVodButtonIndex
    } else {
      if (focusedVodButtonIndex !== null) {
        setFocusedVodButtonIndex(null); // Reseta o foco quando o overlay VOD não está visível
      }
    }
  }, [showOverlay, isVOD, isPlaying, useIframe, focusedVodButtonIndex]);

  // Efeito para aplicar o foco quando focusedVodButtonIndex muda
  useEffect(() => {
    if (focusedVodButtonIndex === 0) {
      rewindButtonRef.current?.focus();
    } else if (focusedVodButtonIndex === 1) {
      playPauseButtonRef.current?.focus();
    } else if (focusedVodButtonIndex === 2) {
      forwardButtonRef.current?.focus();
    }
  }, [focusedVodButtonIndex]);

  if (!isActive) return null;

  return (
    <div className="video-player-container">
      <div className="video-wrapper">
        {!useIframe ? (
          <video
            ref={videoRef}
            className="video-element"
            autoPlay
            playsInline
            controls={isDevelopment && !isVOD} // Mostrar controles nativos apenas em dev e se NÃO for VOD
            style={{ width: '100%', height: '100%' }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={() => { // MODIFICADO para segurança
              if (videoRef.current && videoRef.current.duration && Number.isFinite(videoRef.current.duration)) {
                setDuration(videoRef.current.duration);
              } else if (videoRef.current) { // Se videoRef.current existe, mas a duração não é válida
                setDuration(0);
              }
            }}
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={streamUrl}
            className="video-element"
            style={{ 
              width: '100%', 
              height: '100%', 
              border: 'none',
              background: '#000'
            }}
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        )}

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
            {retryAttemptRef.current > 0 && (
              <p className="retry-info">Tentativa: {retryAttemptRef.current}</p>
            )}
          </div>
        )}

        {/* Error Overlay */}
        {error && !isPlaying && (
          <div className="error-overlay">
            <div className="error-content">
              <h3>Erro na Reprodução</h3>
              <p>{error}</p>
              {retryAttemptRef.current < 4 && (
                <p className="retry-suggestion">
                  Tentaremos uma estratégia diferente...
                </p>
              )}
              <div className="error-actions">
                <button onClick={retryPlayback} className="retry-button">
                  {retryAttemptRef.current < 4 ? 'Tentar Novamente' : 'Tentar Outra Vez'}
                </button>
                <button onClick={handleBack} className="back-button">
                  Voltar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stream Info Overlay */}
        {streamInfo && isPlaying && (
          <div className={`stream-info-overlay ${showOverlay ? 'visible' : 'hidden'}`}>
            <div className="stream-info">
              <h2>{streamInfo.name}</h2>
              {streamInfo.category && (
                <p className="category">{streamInfo.category}</p>
              )}
              <p className="instructions">Pressione BACK para voltar</p>
            </div>
          </div>
        )}

        {/* VOD Controls Overlay - Novo */}
        {isVOD && isPlaying && showOverlay && !useIframe && (
          <div className="vod-controls-overlay">
            <div className="progress-bar-container" onClick={handleSeek}>
              <div 
                className="progress-bar-filled" 
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <div className="controls-buttons">
              <button 
                ref={rewindButtonRef} 
                onClick={() => { if(videoRef.current) videoRef.current.currentTime -= 10; showOverlayTemporarily(); }}
                className={`control-button rewind-button ${focusedVodButtonIndex === 0 ? 'focused' : ''}`}
                tabIndex={0} // Adicionado para foco
              >
                ⏪︎
              </button>
              <button 
                ref={playPauseButtonRef} 
                onClick={() => { handlePlayPause(); showOverlayTemporarily();}} 
                className={`control-button play-pause-button ${focusedVodButtonIndex === 1 ? 'focused' : ''}`}
                tabIndex={0} // Adicionado para foco
              >
                {videoRef.current?.paused ? '▶︎' : '❚❚'}
              </button>
              <button 
                ref={forwardButtonRef} 
                onClick={() => { if(videoRef.current) videoRef.current.currentTime += 10; showOverlayTemporarily(); }} 
                className={`control-button forward-button ${focusedVodButtonIndex === 2 ? 'focused' : ''}`}
                tabIndex={0} // Adicionado para foco
              >
                ⏩︎
              </button>
            </div>
            <div className="time-display">
              <span>{formatTime(currentTime)}</span> / <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer; 