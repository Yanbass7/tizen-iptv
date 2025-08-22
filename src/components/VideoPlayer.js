import React, { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import criarUrlProxyStream from '../utils/streamProxy';
import { buildStreamUrl } from '../config/apiConfig';
import { watchProgressService } from '../services/watchProgressService';
// import ConsoleLogModal from './ConsoleLogModal';

import './VideoPlayer.css';

const VideoPlayer = ({ isActive, streamUrl, streamInfo, onBack }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const hlsRef = useRef(null);
  const mpegtsRef = useRef(null);

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
  const [isStalled, setIsStalled] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferingStartTime, setBufferingStartTime] = useState(null);
  const [playerType, setPlayerType] = useState(null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dateTime, setDateTime] = useState(new Date());
  const [seekIndicator, setSeekIndicator] = useState({ show: false, direction: null });
  const [programProgress, setProgramProgress] = useState({ progress: 0 });
  const [currentSeriesInfo, setCurrentSeriesInfo] = useState(null);
  const [episodeManager, setEpisodeManager] = useState({
    isSeriesActive: false,
    currentEpisode: null,
    nextEpisode: null,
    allEpisodes: [],
    currentSeason: null,
    seriesData: null
  });

  // Estados para navegação por controle remoto
  const [focusedElement, setFocusedElement] = useState(null); // 'restart' | 'next-episode' | null
  const [isNavigatingControls, setIsNavigatingControls] = useState(false);

  // Detectar ambiente (desenvolvimento vs produção)
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isTizenTV = typeof tizen !== 'undefined' || window.navigator.userAgent.includes('Tizen');

  // Função para calcular próximo episódio dinamicamente
  const calculateNextEpisode = useCallback((currentEpisode, allEpisodes) => {
    console.log('🔍 calculateNextEpisode chamada:', {
      currentEpisode: currentEpisode?.title || currentEpisode?.name,
      currentEpisodeId: currentEpisode?.id || currentEpisode?.stream_id,
      allEpisodesCount: allEpisodes?.length || 0
    });

    if (!currentEpisode || !allEpisodes || allEpisodes.length === 0) {
      console.log('❌ calculateNextEpisode: dados insuficientes');
      return null;
    }

    const currentIndex = allEpisodes.findIndex(ep => 
      (ep.id || ep.stream_id) === (currentEpisode.id || currentEpisode.stream_id)
    );

    console.log('🔍 calculateNextEpisode resultado:', {
      currentIndex,
      nextIndex: currentIndex + 1,
      hasNext: currentIndex >= 0 && currentIndex < allEpisodes.length - 1,
      nextEpisode: (currentIndex >= 0 && currentIndex < allEpisodes.length - 1) 
        ? allEpisodes[currentIndex + 1]?.title || allEpisodes[currentIndex + 1]?.name
        : 'Nenhum'
    });

    if (currentIndex >= 0 && currentIndex < allEpisodes.length - 1) {
      return allEpisodes[currentIndex + 1];
    }

    return null;
  }, []);

  // Função para inicializar gerenciador de episódios
  const initializeEpisodeManager = useCallback((seriesInfo) => {
    console.log('🎬 Inicializando gerenciador de episódios:', seriesInfo);
    console.log('📋 AllEpisodes recebidos:', seriesInfo.allEpisodes?.length || 0);
    console.log('📍 Episódio atual:', seriesInfo.currentEpisode?.title || seriesInfo.currentEpisode?.name);
    
    // Calcular próximo episódio dinamicamente
    const nextEpisode = calculateNextEpisode(seriesInfo.currentEpisode, seriesInfo.allEpisodes);
    
    // Usar nextEpisode pré-calculado se não conseguir calcular dinamicamente
    const finalNextEpisode = nextEpisode || seriesInfo.nextEpisode;
    
    const newEpisodeManager = {
      isSeriesActive: true,
      currentEpisode: seriesInfo.currentEpisode,
      nextEpisode: finalNextEpisode,
      allEpisodes: seriesInfo.allEpisodes || [],
      currentSeason: seriesInfo.currentSeason,
      seriesData: {
        seriesId: seriesInfo.seriesId,
        seriesName: seriesInfo.seriesName,
        poster: streamInfo?.poster
      }
    };
    
    setEpisodeManager(newEpisodeManager);
    console.log('✅ Gerenciador de episódios configurado:', {
      ...newEpisodeManager,
      nextEpisodeCalculated: !!nextEpisode,
      nextEpisodeFallback: !!seriesInfo.nextEpisode,
      finalNextEpisodeTitle: finalNextEpisode?.title || finalNextEpisode?.name || 'N/A',
      allEpisodesCount: newEpisodeManager.allEpisodes.length
    });
  }, [streamInfo, calculateNextEpisode]);

  // Configurar informações da série quando for reprodução de série
  useEffect(() => {
    console.log('🔍 VideoPlayer useEffect - Verificando streamInfo:', {
      type: streamInfo?.type,
      hasSeriesInfo: !!streamInfo?.seriesInfo,
      streamInfo: streamInfo
    });

    if (streamInfo?.type === 'series' && streamInfo?.seriesInfo) {
      setCurrentSeriesInfo(streamInfo.seriesInfo);
      initializeEpisodeManager(streamInfo.seriesInfo);
      console.log('📺 Série detectada e gerenciador inicializado:', streamInfo.seriesInfo);
    } else {
      console.log('⚠️ Não é série ou seriesInfo ausente - resetando episodeManager');
      setCurrentSeriesInfo(null);
      setEpisodeManager({
        isSeriesActive: false,
        currentEpisode: null,
        nextEpisode: null,
        allEpisodes: [],
        currentSeason: null,
        seriesData: null
      });
    }
  }, [streamInfo, initializeEpisodeManager]);

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

  // Seleciona player conforme tipo e URL
  const detectPlayerType = (url, info) => {
    if (info?.type === 'live') {
      if (typeof url === 'string' && url.endsWith('.m3u8')) {
        if (Hls.isSupported()) return 'hls';
        return 'html5-hls';
      }
      if (typeof url === 'string' && url.endsWith('.ts')) {
        if (mpegts.isSupported()) return 'mpegts';
        return 'html5-custom';
      }
    }
    return 'html5-custom';
  };

  // Reproduzir com tratamento de promessas para evitar warns de interrupção
  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch((err) => {
          console.warn('play() não pôde completar (não fatal):', err?.message || err);
        });
      }
    } catch (err) {
      console.warn('Erro ao tentar play():', err?.message || err);
    }
  }, []);

  // Limpar timeouts ativos
  const clearTimeouts = () => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (stalledTimeoutRef.current) {
      clearTimeout(stalledTimeoutRef.current);
      stalledTimeoutRef.current = null;
    }
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = null;
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
        if (type === 'hls') {
          await initHlsPlayer(streamUrl, videoElement);
        } else if (type === 'html5-hls') {
          await initCustomHtml5Player(streamUrl, videoElement);
        } else if (type === 'mpegts') {
          await initMpegtsPlayer(streamUrl, videoElement);
        } else {
          await initCustomHtml5Player(streamUrl, videoElement);
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
          
          // Tentar restaurar progresso
          setTimeout(() => {
            tryRestoreProgress();
          }, 200);
          
          // Iniciar reprodução de forma segura quando estiver pronto
          setTimeout(() => {
            safePlay();
          }, 100); // Pequeno delay para garantir que o elemento está totalmente pronto
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
          setIsStalled(true);
        };

        const handleStalled = () => {
          console.log('⏳ Player customizado: Vídeo travado');
          setLoadingMessage('Vídeo travado - carregando...');
          setIsStalled(true);
        };

        const handleCanPlayThrough = () => {
          console.log('✅ Player customizado: Pode reproduzir sem interrupção');
          setIsStalled(false);
        };

        // Função para tentar restaurar progresso (compartilhada entre canplay e loadedmetadata)
        const tryRestoreProgress = () => {
          console.log('🔍 Tentando restaurar progresso:', {
            isSeriesActive: episodeManager.isSeriesActive,
            hasCurrentEpisode: !!episodeManager.currentEpisode,
            hasSeriesData: !!episodeManager.seriesData,
            streamInfoType: streamInfo?.type,
            hasSeriesInfo: !!streamInfo?.seriesInfo
          });

          let restored = false;

          // Verificar se há um tempo específico para continuar (de "Continuar Assistindo")
          if (streamInfo?.continueFromTime && streamInfo.continueFromTime > 0) {
            console.log('🔄 Continuando reprodução do tempo especificado:', Math.round(streamInfo.continueFromTime), 'segundos');
            if (videoElement) {
              videoElement.currentTime = streamInfo.continueFromTime;
              setCurrentTime(streamInfo.continueFromTime);
              console.log('✅ Tempo de continuação definido para:', Math.round(streamInfo.continueFromTime), 'segundos');
              restored = true;
            }
          }

          // Se não foi especificado tempo de continuação, tentar restaurar progresso usando episodeManager primeiro
          if (!restored && episodeManager.isSeriesActive && 
              episodeManager.currentEpisode && 
              episodeManager.seriesData) {
            
            const seriesId = episodeManager.seriesData.seriesId;
            const seasonNumber = episodeManager.currentSeason || 1;
            const episodeId = episodeManager.currentEpisode.id || episodeManager.currentEpisode.stream_id;
            
            console.log('📺 Dados do episodeManager:', {
              seriesId,
              seasonNumber,
              episodeId,
              episodeTitle: episodeManager.currentEpisode.title || episodeManager.currentEpisode.name
            });
            
            const savedProgress = watchProgressService.getEpisodeProgress(seriesId, seasonNumber, episodeId);
            
            if (savedProgress && savedProgress.currentTime > 30 && !savedProgress.isCompleted) {
              console.log('📺 Progresso encontrado via episodeManager:', {
                tempo: Math.round(savedProgress.currentTime),
                porcentagem: Math.round(savedProgress.percentWatched)
              });
              
              if (videoElement && savedProgress.currentTime > 0) {
                videoElement.currentTime = savedProgress.currentTime;
                setCurrentTime(savedProgress.currentTime);
                console.log('✅ Progresso restaurado para:', Math.round(savedProgress.currentTime), 'segundos');
                restored = true;
              }
            } else {
              console.log('⚠️ Nenhum progresso válido encontrado via episodeManager');
            }
          } 
          // Fallback: tentar restaurar usando streamInfo se episodeManager não estiver pronto
          else if (!restored && streamInfo?.type === 'series' && streamInfo?.seriesInfo) {
            console.log('🔄 Tentando restaurar via streamInfo como fallback');
            
            const seriesInfo = streamInfo.seriesInfo;
            const seriesId = seriesInfo.seriesId;
            const seasonNumber = seriesInfo.currentSeason || 1;
            const episodeId = seriesInfo.currentEpisode?.id || seriesInfo.currentEpisode?.stream_id;
            
            if (seriesId && episodeId) {
              console.log('📺 Dados do streamInfo:', {
                seriesId,
                seasonNumber,
                episodeId,
                episodeTitle: seriesInfo.currentEpisode?.title || seriesInfo.currentEpisode?.name
              });
              
              const savedProgress = watchProgressService.getEpisodeProgress(seriesId, seasonNumber, episodeId);
              
              if (savedProgress && savedProgress.currentTime > 30 && !savedProgress.isCompleted) {
                console.log('📺 Progresso encontrado via streamInfo:', {
                  tempo: Math.round(savedProgress.currentTime),
                  porcentagem: Math.round(savedProgress.percentWatched)
                });
                
                if (videoElement && savedProgress.currentTime > 0) {
                  videoElement.currentTime = savedProgress.currentTime;
                  setCurrentTime(savedProgress.currentTime);
                  console.log('✅ Progresso restaurado via fallback para:', Math.round(savedProgress.currentTime), 'segundos');
                  restored = true;
                }
              } else {
                console.log('⚠️ Nenhum progresso válido encontrado via streamInfo');
              }
            } else {
              console.log('❌ Dados insuficientes no streamInfo para restaurar progresso');
            }
          } 
          // Tentativa de restaurar progresso de filme se não é série e não foi restaurado ainda
          else if (!restored && (streamInfo?.type === 'movie' || 
                   (!streamInfo?.type && !episodeManager.isSeriesActive))) {
            console.log('🔄 Tentando restaurar progresso de filme');
            
            const movieId = streamInfo?.stream_id || streamInfo?.id;
            
            if (movieId) {
              console.log('🎬 Dados do filme:', {
                movieId,
                movieName: streamInfo?.name
              });
              
              const savedProgress = watchProgressService.getMovieProgress(movieId);
              
              if (savedProgress && savedProgress.currentTime > 30 && !savedProgress.isCompleted) {
                console.log('🎬 Progresso do filme encontrado:', {
                  tempo: Math.round(savedProgress.currentTime),
                  porcentagem: Math.round(savedProgress.percentWatched)
                });
                
                if (videoElement && savedProgress.currentTime > 0) {
                  videoElement.currentTime = savedProgress.currentTime;
                  setCurrentTime(savedProgress.currentTime);
                  console.log('✅ Progresso do filme restaurado para:', Math.round(savedProgress.currentTime), 'segundos');
                  restored = true;
                }
              } else {
                console.log('⚠️ Nenhum progresso válido encontrado para o filme');
              }
            } else {
              console.log('❌ ID do filme não encontrado');
            }
          }
          // Último fallback: tentar inferir dados da série ou filme se ainda não foi restaurado
          // Não aplicar para canais ao vivo
          else if (!restored && streamInfo?.type !== 'live') {
            console.log('🔄 Tentando inferir dados como último fallback');
            
            // Tentar série primeiro
            const inferredSeriesData = watchProgressService.inferEpisodeFromStream(streamUrl, streamInfo);
            
            if (inferredSeriesData && inferredSeriesData.seriesId && inferredSeriesData.episodeId) {
              console.log('📺 Dados de série inferidos:', inferredSeriesData);
              
              const savedProgress = watchProgressService.getEpisodeProgress(
                inferredSeriesData.seriesId, 
                inferredSeriesData.seasonNumber, 
                inferredSeriesData.episodeId
              );
              
              if (savedProgress && savedProgress.currentTime > 30 && !savedProgress.isCompleted) {
                console.log('📺 Progresso de série encontrado via inferência:', {
                  tempo: Math.round(savedProgress.currentTime),
                  porcentagem: Math.round(savedProgress.percentWatched)
                });
                
                if (videoElement && savedProgress.currentTime > 0) {
                  videoElement.currentTime = savedProgress.currentTime;
                  setCurrentTime(savedProgress.currentTime);
                  console.log('✅ Progresso de série restaurado via inferência para:', Math.round(savedProgress.currentTime), 'segundos');
                  restored = true;
                }
              }
            } 
            // Se não conseguiu inferir série, tentar filme
            else {
              const inferredMovieData = watchProgressService.inferMovieFromStream(streamUrl, streamInfo);
              
              if (inferredMovieData && inferredMovieData.movieId) {
                console.log('🎬 Dados de filme inferidos:', inferredMovieData);
                
                const savedProgress = watchProgressService.getMovieProgress(inferredMovieData.movieId);
                
                if (savedProgress && savedProgress.currentTime > 30 && !savedProgress.isCompleted) {
                  console.log('🎬 Progresso de filme encontrado via inferência:', {
                    tempo: Math.round(savedProgress.currentTime),
                    porcentagem: Math.round(savedProgress.percentWatched)
                  });
                  
                  if (videoElement && savedProgress.currentTime > 0) {
                    videoElement.currentTime = savedProgress.currentTime;
                    setCurrentTime(savedProgress.currentTime);
                    console.log('✅ Progresso de filme restaurado via inferência para:', Math.round(savedProgress.currentTime), 'segundos');
                    restored = true;
                  }
                }
              }
            }
            
            if (!restored) {
              console.log('❌ Não foi possível inferir dados de série ou filme');
            }
          }

          return restored;
        };

        const handleLoadedMetadata = () => {
          console.log('📡 Player customizado: Metadados carregados - tentando restaurar progresso');
          setLoadingProgress(40);
          
          // Tentar restaurar progresso nos metadados como backup
          setTimeout(() => {
            tryRestoreProgress();
          }, 100);
        };

        // Adicionar listeners
        videoElement.addEventListener('loadstart', handleLoadStart, { once: true });
        videoElement.addEventListener('loadeddata', handleLoadedData, { once: true });
        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        videoElement.addEventListener('canplay', handleCanPlay, { once: true });
        videoElement.addEventListener('canplaythrough', handleCanPlayThrough);
        videoElement.addEventListener('playing', handlePlaying, { once: true });
        videoElement.addEventListener('error', handleError, { once: true });
        videoElement.addEventListener('waiting', handleWaiting);
        videoElement.addEventListener('stalled', handleStalled);

        // Configurar elemento de vídeo
        videoElement.crossOrigin = 'anonymous';
        videoElement.preload = 'auto';
        // Habilitar autoplay para reprodução automática do próximo episódio
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

  // Player HLS (.m3u8) com hls.js, com fallback nativo
  const initHlsPlayer = async (url, videoElement) => {
    return new Promise((resolve, reject) => {
      try {
        // Limpar Hls antigo
        if (hlsRef.current) {
          try { hlsRef.current.destroy(); } catch (_) {}
          hlsRef.current = null;
        }

        if (Hls.isSupported()) {
          const hls = new Hls({
            lowLatencyMode: true,
            fragLoadingTimeOut: 15000,
            manifestLoadingTimeOut: 15000,
            liveSyncDuration: 2,
            maxLiveSyncPlaybackRate: 1.5
          });
          hlsRef.current = hls;
          hls.attachMedia(videoElement);
          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            setLoadingProgress(30);
            hls.loadSource(url);
          });
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoadingProgress(70);
            setTimeout(() => safePlay(), 50);
          });
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('❌ hls.js error:', data);
            if (data?.fatal) {
              try { hls.destroy(); } catch (_) {}
              hlsRef.current = null;
              reject(new Error(`HLS fatal: ${data?.type || 'unknown'}`));
            }
          });
          resolve();
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
          // Playback HLS nativo
          videoElement.src = url;
          videoElement.load();
          setTimeout(() => safePlay(), 100);
          resolve();
        } else {
          reject(new Error('Ambiente sem suporte a HLS'));
        }
      } catch (err) {
        reject(err);
      }
    });
  };

  // Player MPEG-TS (.ts) com mpegts.js (transmux para MSE)
  const initMpegtsPlayer = async (url, videoElement) => {
    return new Promise((resolve, reject) => {
      try {
        if (!mpegts.isSupported()) {
          reject(new Error('Ambiente sem suporte a MPEG-TS (MSE)'));
          return;
        }
        // Limpar instância anterior
        if (mpegtsRef.current) {
          try { mpegtsRef.current.destroy(); } catch (_) {}
          mpegtsRef.current = null;
        }

        const player = mpegts.createPlayer({
          type: 'mpegts',
          isLive: true,
          url
        }, {
          enableStashBuffer: true,
          stashInitialSize: 128
        });
        mpegtsRef.current = player;
        playerRef.current = player;
        player.attachMediaElement(videoElement);
        player.load();
        setTimeout(() => safePlay(), 100);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  };

  // Função para limpar player HTML5 customizado
  const cleanupPlayer = useCallback(() => {
    clearTimeouts();
    cleanupBlobUrls();

    // Destruir players de terceiros
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch (_) {}
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      try { mpegtsRef.current.destroy(); } catch (_) {}
      mpegtsRef.current = null;
    }

    // Limpar elemento video HTML5
    if (videoRef.current) {
      const videoElement = videoRef.current;

      try {
        const events = ['loadstart', 'loadeddata', 'canplay', 'canplaythrough', 'playing', 'waiting', 'error', 'stalled'];
        events.forEach(event => {
          videoElement.removeEventListener(event, () => { });
        });

        if (videoElement.pause && !videoElement.paused) videoElement.pause();
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
    setIsStalled(false);
    setIsBuffering(false);
    setBufferingStartTime(null);
    setPlayerType(null);
    setCurrentTime(0);
    setDuration(0);
    setIsControlsVisible(true);

    initializingRef.current = false;
    previousStreamUrlRef.current = null;
    lastTimeUpdateRef.current = null;
  });

  // Ref para controlar salvamento do progresso
  const progressSaveTimeoutRef = useRef(null);
  const stalledTimeoutRef = useRef(null);
  const bufferingTimeoutRef = useRef(null);
  const lastTimeUpdateRef = useRef(null);

  // Função para detectar travamento do vídeo
  const detectStalling = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    const currentTime = video.currentTime;
    const lastTime = lastTimeUpdateRef.current;

    // Se o tempo não mudou por mais de 2 segundos e o vídeo deveria estar tocando
    if (lastTime !== null && currentTime === lastTime && !video.paused) {
      const timeSinceLastUpdate = Date.now() - (lastTimeUpdateRef.current || 0);
      
      if (timeSinceLastUpdate > 2000) { // 2 segundos
        console.log('⚠️ Vídeo detectado como travado - tempo não mudou por 2 segundos');
        setIsStalled(true);
        setIsBuffering(true);
        setBufferingStartTime(Date.now());
        setLoadingMessage('Vídeo travado - carregando...');
        
        // Limpar timeout anterior se existir
        if (stalledTimeoutRef.current) {
          clearTimeout(stalledTimeoutRef.current);
        }
        
        // Definir timeout para resetar o estado de travamento após 30 segundos
        stalledTimeoutRef.current = setTimeout(() => {
          console.log('⚠️ Timeout de travamento atingido - resetando estado');
          setIsStalled(false);
          setIsBuffering(false);
          setBufferingStartTime(null);
          setLoadingMessage('Carregando...');
        }, 30000);
      }
    }

    lastTimeUpdateRef.current = currentTime;
  }, [isPlaying]);

  // Função para verificar se o vídeo está realmente travado
  const checkVideoHealth = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Verificar se o vídeo está realmente travado
    if (isStalled || isBuffering) {
      const currentTime = video.currentTime;
      const lastTime = lastTimeUpdateRef.current;
      
      // Se o tempo mudou, o vídeo não está mais travado
      if (currentTime !== lastTime) {
        console.log('✅ Vídeo não está mais travado - tempo mudou');
        setIsStalled(false);
        setIsBuffering(false);
        setBufferingStartTime(null);
        setLoadingMessage('Carregando...');
        
        // Limpar timeout de travamento
        if (stalledTimeoutRef.current) {
          clearTimeout(stalledTimeoutRef.current);
          stalledTimeoutRef.current = null;
        }
      }
    }
  }, [isStalled, isBuffering]);

  // Função para tentar reconectar automaticamente
  const attemptReconnection = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isStalled) return;

    console.log('🔄 Tentando reconectar automaticamente...');
    
    // Tentar recarregar o vídeo
    try {
      const currentTime = video.currentTime;
      video.load();
      
      // Restaurar o tempo após o carregamento
      setTimeout(() => {
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA
          video.currentTime = currentTime;
          safePlay();
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro ao tentar reconectar:', error);
    }
  }, [isStalled, safePlay]);

  // Função para calcular estatísticas de carregamento
  const getBufferingStats = useCallback(() => {
    if (!bufferingStartTime) return null;
    
    const timeStalled = Math.floor((Date.now() - bufferingStartTime) / 1000);
    const minutes = Math.floor(timeStalled / 60);
    const seconds = timeStalled % 60;
    
    return {
      timeStalled,
      formattedTime: minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
    };
  }, [bufferingStartTime]);

  // Função para obter informações de qualidade da conexão
  const getConnectionQuality = useCallback(() => {
    const video = videoRef.current;
    if (!video) return null;

    const stats = {
      readyState: video.readyState,
      networkState: video.networkState,
      buffered: video.buffered.length > 0 ? video.buffered.end(0) - video.buffered.start(0) : 0,
      currentTime: video.currentTime,
      duration: video.duration
    };

    // Determinar qualidade baseada no estado da rede
    if (stats.networkState === 0) return { status: 'Inicializando', color: '#ffa500' };
    if (stats.networkState === 1) return { status: 'Carregando', color: '#00ff00' };
    if (stats.networkState === 2) return { status: 'Conectado', color: '#00ff00' };
    if (stats.networkState === 3) return { status: 'Problema de rede', color: '#ff0000' };

    return { status: 'Desconhecido', color: '#ffa500' };
  }, []);

  // Função para salvar progresso da série ou filme (definida antes de handleBack)
  const saveWatchProgress = useCallback(() => {
    if (duration > 0 && currentTime > 0) {
      // Salvar progresso de série
      if (episodeManager.isSeriesActive && 
          episodeManager.currentEpisode && 
          episodeManager.seriesData) {
        
        const seriesId = episodeManager.seriesData.seriesId;
        const seasonNumber = episodeManager.currentSeason || 1;
        const episodeId = episodeManager.currentEpisode.id || episodeManager.currentEpisode.stream_id;
        
        const episodeInfo = {
          seriesName: episodeManager.seriesData.seriesName,
          episodeTitle: episodeManager.currentEpisode.title || episodeManager.currentEpisode.name,
          episodeNumber: episodeManager.currentEpisode.episode_num || 1,
          // Adicionar informações da série para exibição
          seriesPoster: episodeManager.seriesData.poster || episodeManager.seriesData.stream_icon || episodeManager.seriesData.cover,
          seriesGenre: episodeManager.seriesData.genre,
          seriesYear: episodeManager.seriesData.year || episodeManager.seriesData.releasedate
        };

        watchProgressService.saveProgress(
          seriesId,
          seasonNumber,
          episodeId,
          currentTime,
          duration,
          episodeInfo
        );
      }
      // Salvar progresso de filme
      else if (streamInfo?.type === 'movie' || 
               (!streamInfo?.type && !episodeManager.isSeriesActive)) {
        
        // Tentar obter ID do filme
        const movieId = streamInfo?.stream_id || streamInfo?.id;
        
        if (movieId) {
          const movieInfo = {
            movieName: streamInfo?.name || 'Filme Desconhecido',
            genre: streamInfo?.genre,
            year: streamInfo?.year || streamInfo?.releasedate,
            rating: streamInfo?.rating,
            poster: streamInfo?.stream_icon || streamInfo?.cover
          };

          console.log('🎬 Salvando progresso do filme:', {
            movieId,
            movieName: movieInfo.movieName,
            currentTime: Math.round(currentTime),
            duration: Math.round(duration)
          });

          watchProgressService.saveMovieProgress(
            movieId,
            currentTime,
            duration,
            movieInfo
          );
        } else {
          console.log('⚠️ ID do filme não encontrado para salvar progresso');
        }
      }
    }
  }, [episodeManager, currentTime, duration, streamInfo]);

  // Função para voltar/sair
  const handleBack = useCallback(() => {
    // Salvar progresso antes de sair se estiver assistindo série ou filme
    if (currentTime > 0 && duration > 0) {
      console.log('💾 Salvando progresso antes de sair...');
      saveWatchProgress();
    }
    
    cleanupPlayer();
    
    // Verificar se é uma série e se tem informações para voltar aos detalhes
    if (streamInfo?.type === 'series' && streamInfo?.returnToSeriesDetails) {
      console.log('📺 Voltando para detalhes da série:', streamInfo.returnToSeriesDetails.seriesName);
      
      // Disparar evento para mostrar detalhes da série com origem específica
      const showSeriesDetailsEvent = new CustomEvent('showSeriesDetails', {
        detail: {
          series: {
            series_id: streamInfo.returnToSeriesDetails.seriesId,
            name: streamInfo.returnToSeriesDetails.seriesName,
            category_name: 'Série',
            poster: streamInfo.returnToSeriesDetails.poster,
            stream_icon: streamInfo.returnToSeriesDetails.stream_icon,
            cover: streamInfo.returnToSeriesDetails.cover,
            genre: streamInfo.returnToSeriesDetails.genre,
            year: streamInfo.returnToSeriesDetails.year,
            // Passar a origem para navegação correta
            origin: streamInfo.returnToSeriesDetails.origin || 'home'
          }
        }
      });
      window.dispatchEvent(showSeriesDetailsEvent);
    } else if (onBack) {
      // Comportamento padrão para filmes e outros conteúdos
      onBack();
    }
  }, [cleanupPlayer, onBack, episodeManager, currentTime, duration, saveWatchProgress, streamInfo]);

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

  // Calcular progresso do programa atual (para canais ao vivo)
  const calculateProgramProgress = useCallback(() => {
    if (!streamInfo?.currentProgram?.startTime || streamInfo?.type !== 'live') {
      setProgramProgress({ progress: 0 });
      return;
    }

    try {
      // Parsear horários do programa atual (formato: "HH:MM - HH:MM")
      const timeMatch = streamInfo.currentProgram.startTime.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
      if (!timeMatch) {
        setProgramProgress({ progress: 0 });
        return;
      }

      const [_, startHour, startMin, endHour, endMin] = timeMatch;
      const now = new Date();
      const today = now.getDate();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Criar objetos Date para início e fim do programa
      const startTime = new Date(currentYear, currentMonth, today, parseInt(startHour), parseInt(startMin));
      const endTime = new Date(currentYear, currentMonth, today, parseInt(endHour), parseInt(endMin));

      // Se o programa termina antes de começar, é do dia seguinte
      if (endTime <= startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }

      const totalDuration = endTime - startTime;
      const elapsed = now - startTime;
      const remaining = endTime - now;

      if (elapsed < 0) {
        // Programa ainda não começou
        setProgramProgress({ progress: 0 });
      } else if (remaining <= 0) {
        // Programa já terminou
        setProgramProgress({ progress: 100 });
      } else {
        // Programa em andamento
        const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        setProgramProgress({ progress });
      }
    } catch (error) {
      console.warn('Erro ao calcular progresso do programa:', error);
      setProgramProgress({ progress: 0 });
    }
  }, [streamInfo?.currentProgram?.startTime, streamInfo?.type]);

  // Efeito para atualizar progresso do programa atual
  useEffect(() => {
    if (isActive && streamInfo?.type === 'live' && streamInfo?.currentProgram?.startTime) {
      // Calcular progresso inicial
      calculateProgramProgress();
      
      // Atualizar a cada minuto
      const timer = setInterval(() => {
        calculateProgramProgress();
      }, 60000);
      
      return () => clearInterval(timer);
    }
  }, [isActive, streamInfo?.type, streamInfo?.currentProgram?.startTime, calculateProgramProgress]);

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
          safePlay();
        }
        // Se estiver tocando, não faz nada.
      } else {
        // Comportamento padrão para VOD (filmes/séries)
        if (videoRef.current.paused) {
          safePlay();
        } else {
          videoRef.current.pause();
        }
      }
      showControls();
    }
  }, [showControls, streamInfo?.type, safePlay]);

  const handleSeek = useCallback((forward) => {
    if (videoRef.current && duration > 0) {
      const seekTime = 10; // Pular 10 segundos
      const newTime = forward
        ? Math.min(videoRef.current.currentTime + seekTime, duration)
        : Math.max(videoRef.current.currentTime - seekTime, 0);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime); // Atualiza o estado imediatamente
      
      // Mostrar indicador de seek
      setSeekIndicator({ show: true, direction: forward ? 'forward' : 'backward' });
      showControls(); // Mostrar controles junto com o indicador
      
      // Esconder o indicador após 1 segundo
      setTimeout(() => {
        setSeekIndicator({ show: false, direction: null });
      }, 1000);
    }
  }, [duration, showControls]);

  // Função para reiniciar o episódio
  const restartEpisode = useCallback(() => {
    if (videoRef.current) {
      console.log('🔄 Reiniciando episódio...');
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      
      // Se o vídeo estava pausado, reproduzir automaticamente após reiniciar
      if (!isPlaying) {
        safePlay();
      }
    }
  }, [isPlaying, safePlay]);

  // Função principal para reproduzir próximo episódio
  const playNextEpisode = useCallback(() => {
    console.log('🎬 Função playNextEpisode chamada');
    console.log('📊 Estado atual do episodeManager:', episodeManager);
    console.log('⏰ Timestamp do clique:', new Date().toISOString());
    
    // Verificar se é uma série ativa e tem episódios
    if (!episodeManager.isSeriesActive || !episodeManager.currentEpisode || !episodeManager.allEpisodes.length) {
      console.log('❌ Não é possível reproduzir próximo episódio - série não ativa ou sem episódios');
      return;
    }

    // Calcular próximo episódio dinamicamente
    let nextEp = calculateNextEpisode(episodeManager.currentEpisode, episodeManager.allEpisodes);
    
    // Fallback: se não conseguir calcular, usar nextEpisode pré-calculado
    if (!nextEp && episodeManager.nextEpisode) {
      console.log('🔄 Usando nextEpisode pré-calculado na função playNextEpisode');
      nextEp = episodeManager.nextEpisode;
    }
    
    if (!nextEp) {
      console.log('❌ Não há próximo episódio disponível (último episódio da temporada)');
      return;
    }

    console.log('🎯 Próximo episódio calculado dinamicamente:', nextEp);

    // Usar o episódio calculado diretamente
    const episodeToPlay = nextEp;
    console.log('✅ Episódio a ser reproduzido:', episodeToPlay);

    // Método alternativo: Reproduzir próximo episódio diretamente via evento playContent
    console.log('🚀 Reproduzindo próximo episódio diretamente...');
    
    // Construir streamUrl para o próximo episódio usando a mesma lógica da SeriesDetailsPage
    let streamUrl;
    const isDemoMode = () => localStorage.getItem('testMode') === 'true';
    
    if (isDemoMode() && episodeToPlay.stream_url) {
      // Para episódios demo, usar URL direta
      streamUrl = episodeToPlay.stream_url;
      console.log('🧪 Usando URL demo para próximo episódio:', streamUrl);
    } else {
      // Lógica original para episódios normais - usar buildStreamUrl
      streamUrl = buildStreamUrl('series', episodeToPlay.id || episodeToPlay.stream_id, 'mp4');
      console.log('🔗 URL construída para próximo episódio:', streamUrl);
    }

    // Encontrar próximo episódio do próximo episódio
    const nextEpisodeIndex = episodeManager.allEpisodes.findIndex(ep => 
      (ep.id || ep.stream_id) === (episodeToPlay.id || episodeToPlay.stream_id)
    );
    const nextNextEpisode = nextEpisodeIndex >= 0 && nextEpisodeIndex < episodeManager.allEpisodes.length - 1 
      ? episodeManager.allEpisodes[nextEpisodeIndex + 1] 
      : null;

    // Criar streamInfo completo para o próximo episódio
    const streamInfo = {
      name: `${episodeManager.seriesData.seriesName} - ${episodeToPlay.title || episodeToPlay.name || 'Episódio'}`,
      type: 'series',
      category: 'Série',
      description: episodeToPlay.plot || episodeToPlay.info?.plot || 'Descrição não disponível',
      poster: episodeManager.seriesData.poster,
      seriesInfo: {
        seriesId: episodeManager.seriesData.seriesId,
        seriesName: episodeManager.seriesData.seriesName,
        currentSeason: episodeManager.currentSeason,
        currentEpisode: episodeToPlay,
        nextEpisode: nextNextEpisode,
        allEpisodes: episodeManager.allEpisodes
      }
    };

    // Verificar se a URL foi construída corretamente
    if (!streamUrl) {
      console.error('❌ Erro: Não foi possível construir URL para próximo episódio');
      console.error('📊 Dados do episódio:', episodeToPlay);
      console.log('🔄 Tentando método alternativo via SeriesDetailsPage...');
      
      // Fallback: usar método original via SeriesDetailsPage
      if (onBack) {
        onBack();
      }
      
      setTimeout(() => {
        const nextEpisodeEvent = new CustomEvent('playNextSeriesEpisode', {
          detail: {
            nextEpisode: episodeToPlay,
            seriesInfo: {
              ...episodeManager.seriesData,
              currentSeason: episodeManager.currentSeason,
              allEpisodes: episodeManager.allEpisodes
            }
          }
        });
        window.dispatchEvent(nextEpisodeEvent);
      }, 300);
      
      return;
    }

    console.log('🎯 Disparando playContent direto para próximo episódio:', {
      episodeToPlay: episodeToPlay.title || episodeToPlay.name,
      episodeId: episodeToPlay.id || episodeToPlay.stream_id,
      streamUrl,
      hasNextNext: !!nextNextEpisode
    });

    // Fechar player atual primeiro
    cleanupPlayer();

    // Disparar evento playContent diretamente
    setTimeout(() => {
      const playEvent = new CustomEvent('playContent', {
        detail: { streamUrl, streamInfo }
      });
      window.dispatchEvent(playEvent);
    }, 100);

  }, [episodeManager, cleanupPlayer, onBack, calculateNextEpisode]);

  // Efeito para gerenciar estado do vídeo (tempo, duração, play/pause)
  useEffect(() => {
    const video = videoRef.current;
    if (!isActive || !video) return;

    const handleTimeUpdate = () => {
      const newCurrentTime = video.currentTime;
      setCurrentTime(newCurrentTime);
      
      // Atualizar referência do último tempo para detecção de travamento
      lastTimeUpdateRef.current = newCurrentTime;
      
      // Verificar se o vídeo não está mais travado
      checkVideoHealth();
      
      // Salvar progresso a cada 10 segundos para séries
      if (episodeManager.isSeriesActive && duration > 30) { // Só salva se o vídeo tem mais de 30s
        // Limpar timeout anterior
        if (progressSaveTimeoutRef.current) {
          clearTimeout(progressSaveTimeoutRef.current);
        }
        
        // Agendar salvamento com debounce
        progressSaveTimeoutRef.current = setTimeout(() => {
          saveWatchProgress();
        }, 2000); // Salva 2 segundos após última mudança de tempo
      }
    };

    const handleDurationChange = () => {
      if (!isNaN(video.duration) && isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsStalled(false);
      setIsBuffering(false);
      setBufferingStartTime(null);
      showControls();
    };

    const handlePause = () => {
      setIsPlaying(false);
      setIsStalled(false);
      setIsBuffering(false);
      setBufferingStartTime(null);
      showControls(); // Mantém os controles visíveis quando pausado
      
      // Salvar progresso imediatamente quando pausar
      if (episodeManager.isSeriesActive) {
        saveWatchProgress();
      }
    };

    const handleEnded = () => {
      console.log('🏁 Vídeo terminou');
      setIsPlaying(false);
      setIsStalled(false);
      setIsBuffering(false);
      setBufferingStartTime(null);
      
      // Marcar episódio como completo quando terminar
      if (episodeManager.isSeriesActive && 
          episodeManager.currentEpisode && 
          episodeManager.seriesData) {
        
        const seriesId = episodeManager.seriesData.seriesId;
        const seasonNumber = episodeManager.currentSeason || 1;
        const episodeId = episodeManager.currentEpisode.id || episodeManager.currentEpisode.stream_id;
        
        console.log('✅ Marcando episódio como completo');
        watchProgressService.markEpisodeComplete(seriesId, seasonNumber, episodeId);
      }
      // Marcar filme como completo quando terminar
      else if (streamInfo?.type === 'movie' || 
               (!streamInfo?.type && !episodeManager.isSeriesActive)) {
        
        const movieId = streamInfo?.stream_id || streamInfo?.id;
        
        if (movieId) {
          console.log('✅ Marcando filme como completo');
          watchProgressService.markMovieComplete(movieId);
        }
      }
    };

    const handleWaiting = () => {
      console.log('⏳ Vídeo aguardando dados...');
      setIsStalled(true);
      setIsBuffering(true);
      setBufferingStartTime(Date.now());
      setLoadingMessage('Carregando dados...');
      
      // Limpar timeout anterior se existir
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
      }
      
      // Definir timeout para resetar o estado de travamento após 30 segundos
      stalledTimeoutRef.current = setTimeout(() => {
        console.log('⚠️ Timeout de travamento atingido - resetando estado');
        setIsStalled(false);
        setIsBuffering(false);
        setBufferingStartTime(null);
        setLoadingMessage('Carregando...');
      }, 30000);
    };

    const handleStalled = () => {
      console.log('⏳ Vídeo travado');
      setIsStalled(true);
      setIsBuffering(true);
      setBufferingStartTime(Date.now());
      setLoadingMessage('Vídeo travado - carregando...');
      
      // Limpar timeout anterior se existir
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
      }
      
      // Definir timeout para resetar o estado de travamento após 30 segundos
      stalledTimeoutRef.current = setTimeout(() => {
        console.log('⚠️ Timeout de travamento atingido - resetando estado');
        setIsStalled(false);
        setIsBuffering(false);
        setBufferingStartTime(null);
        setLoadingMessage('Carregando...');
      }, 30000);
    };

    const handleCanPlayThrough = () => {
      console.log('✅ Vídeo pode reproduzir sem interrupção');
      setIsStalled(false);
      setIsBuffering(false);
      setBufferingStartTime(null);
      setLoadingMessage('Carregando...');
      
      // Limpar timeout de travamento
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
        stalledTimeoutRef.current = null;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('canplaythrough', handleCanPlayThrough);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      
      // Limpar timeout de salvamento
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
      }
      
      // Limpar timeout de travamento
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
      }
    };
  }, [isActive, showControls, episodeManager, duration, saveWatchProgress, checkVideoHealth]);

  // Efeito para monitorar continuamente o estado do vídeo e detectar travamentos
  useEffect(() => {
    if (!isActive || !isPlaying) return;

    // Intervalo para verificar se o vídeo está travado
    const stallingCheckInterval = setInterval(() => {
      detectStalling();
    }, 1000); // Verificar a cada segundo

    return () => {
      clearInterval(stallingCheckInterval);
    };
  }, [isActive, isPlaying, detectStalling]);

  // Efeito para tentar reconectar automaticamente após 15 segundos de travamento
  useEffect(() => {
    if (!isStalled || !bufferingStartTime) return;

    const timeStalled = Date.now() - bufferingStartTime;
    
    if (timeStalled > 15000) { // 15 segundos
      console.log('🔄 Tentando reconexão automática após 15 segundos de travamento');
      attemptReconnection();
    }
  }, [isStalled, bufferingStartTime, attemptReconnection]);

  // Efeito para atualizar estatísticas de carregamento em tempo real
  useEffect(() => {
    if (!isStalled || !bufferingStartTime) return;

    const statsInterval = setInterval(() => {
      // Forçar re-render para atualizar as estatísticas
      setCurrentTime(prev => prev);
    }, 1000);

    return () => {
      clearInterval(statsInterval);
    };
  }, [isStalled, bufferingStartTime]);

  // Sistema de navegação por controle remoto e interações
  useEffect(() => {
    if (!isActive) return;

    const handlePlayerNavigation = (event) => {
      const { keyCode } = event.detail;

      switch (keyCode) {
        case 13: // OK/Enter
          if (isNavigatingControls && focusedElement === 'next-episode') {
            // Reproduzir próximo episódio apenas se estiver focado
            if (episodeManager.isSeriesActive && episodeManager.currentEpisode && episodeManager.allEpisodes.length > 0) {
              const dynamicNextEpisode = calculateNextEpisode(episodeManager.currentEpisode, episodeManager.allEpisodes);
              if (dynamicNextEpisode) {
                console.log('🎮 OK pressionado - reproduzindo próximo episódio');
                playNextEpisode();
                setFocusedElement(null);
                setIsNavigatingControls(false);
              }
            }
          } else if (isNavigatingControls && focusedElement === 'restart') {
            // Reiniciar episódio se estiver focado
            console.log('🎮 OK pressionado - reiniciando episódio');
            restartEpisode();
            setFocusedElement(null);
            setIsNavigatingControls(false);
          } else if (!isNavigatingControls) {
            // Play/pause normal quando não está navegando controles
            togglePlayPause();
          }
          break;
        case 415: // Play
        case 19: // Pause
          if (!isNavigatingControls) {
            togglePlayPause();
          }
          break;
        case 38: // Seta Para Cima - Mostrar controles
          console.log('🎮 Seta ↑ pressionada - mostrando controles');
          showControls();
          setIsNavigatingControls(false);
          setFocusedElement(null);
          break;
        case 40: // Seta Para Baixo - Selecionar controles
          if (episodeManager.isSeriesActive && episodeManager.currentEpisode && episodeManager.allEpisodes.length > 0) {
            const dynamicNextEpisode = calculateNextEpisode(episodeManager.currentEpisode, episodeManager.allEpisodes);
            if (dynamicNextEpisode) {
              console.log('�� Seta ↓ pressionada - selecionando próximo episódio');
              showControls();
              setIsNavigatingControls(true);
              setFocusedElement('next-episode');
            }
          } else if (streamInfo) {
            // Para filmes ou outros conteúdos, focar no botão reiniciar
            console.log('🎮 Seta ↓ pressionada - selecionando botão reiniciar');
            showControls();
            setIsNavigatingControls(true);
            setFocusedElement('restart');
          }
          break;
        case 39: // Seta Direita
          if (isNavigatingControls) {
            // Navegar entre controles
            if (focusedElement === 'restart') {
              // Se for série e tem próximo episódio, vai para o botão próximo episódio
              if (episodeManager.isSeriesActive && episodeManager.currentEpisode && episodeManager.allEpisodes.length > 0) {
                const dynamicNextEpisode = calculateNextEpisode(episodeManager.currentEpisode, episodeManager.allEpisodes);
                if (dynamicNextEpisode) {
                  setFocusedElement('next-episode');
                }
              }
              // Se for filme, mantém no botão reiniciar (não há navegação para direita)
            } else if (!focusedElement && streamInfo) {
              setFocusedElement('restart');
            }
          } else {
            handleSeek(true);
          }
          break;
        case 37: // Seta Esquerda
          if (isNavigatingControls) {
            // Navegar entre controles
            if (focusedElement === 'next-episode') {
              setFocusedElement('restart');
            } else if (!focusedElement) {
              // Se for série, começar no próximo episódio
              if (episodeManager.isSeriesActive && episodeManager.currentEpisode && episodeManager.allEpisodes.length > 0) {
                const dynamicNextEpisode = calculateNextEpisode(episodeManager.currentEpisode, episodeManager.allEpisodes);
                if (dynamicNextEpisode) {
                  setFocusedElement('next-episode');
                } else {
                  setFocusedElement('restart');
                }
              } else if (streamInfo) {
                // Se for filme, começar no reiniciar
                setFocusedElement('restart');
              }
            }
          } else {
            handleSeek(false);
          }
          break;
        case 8:
        case 10009: // Voltar (Tizen)
          if (isNavigatingControls) {
            // Sair do modo de navegação de controles
            setIsNavigatingControls(false);
            setFocusedElement(null);
          } else {
            handleBack();
          }
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
  }, [isActive, handleBack, togglePlayPause, handleSeek, showControls, episodeManager, playNextEpisode, calculateNextEpisode, restartEpisode, isNavigatingControls, focusedElement, streamInfo]);

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
          playsInline
          controls={isDevelopment || !isTizenTV}
          style={{ width: '100%', height: '100%' }}
        />

        {/* <ConsoleLogModal /> */}

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
                        {streamInfo.currentProgram?.title || ''}
                      </p>
                      <p className="program-time">
                        {streamInfo.currentProgram?.startTime || ''}
                      </p>
                       {/* Barra de progresso do programa atual */}
                       {streamInfo.currentProgram?.startTime && (
                         <div className="program-progress-container">
                           <div className="program-progress-bar">
                             <div 
                               className="program-progress-fill"
                               style={{ width: `${programProgress.progress}%` }}
                             />
                           </div>
                         </div>
                       )}
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
                    {streamInfo.nextProgram?.title || ''}
                  </p>
                  <p className="program-time">
                    {streamInfo.nextProgram?.startTime || ''}
                  </p>
                </div>
              </div>

            </div>
          </div>
        ) : isControlsVisible && (
          <div className="player-controls-overlay">
            {/* Título do conteúdo no canto superior esquerdo */}
            <div className="content-title-overlay">
              {streamInfo?.seriesInfo ? (
                <h2 className="content-title">
                  {streamInfo.seriesInfo.seriesName || streamInfo.name} - Episódio {streamInfo.seriesInfo.currentEpisode?.episode_num || '1'}
                </h2>
              ) : (
                <h2 className="content-title">{streamInfo?.name || 'Sem título'}</h2>
              )}
            </div>

            {/* Ícone de Play/Pause centralizado */}
            {!isPlaying && (
              <div className="play-pause-indicator">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                </svg>
              </div>
            )}

            {/* Indicador de Seek (Avançar/Voltar) */}
            {seekIndicator.show && (
              <div className="seek-indicator">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  {seekIndicator.direction === 'forward' ? (
                    // Ícone de avançar
                    <path d="M8,5.14V19.14L19,12.14L8,5.14Z M12,5.14V19.14L23,12.14L12,5.14Z" />
                  ) : (
                    // Ícone de voltar
                    <path d="M16,19.14V5.14L5,12.14L16,19.14Z M12,19.14V5.14L1,12.14L12,19.14Z" />
                  )}
                </svg>
                <span className="seek-time">10s</span>
              </div>
            )}

            <div className="controls-bottom-bar">
              <div className="progress-and-time-container">
                <span className="time-current">{formatTime(currentTime)}</span>
                <div className="progress-bar-container">
                  <div className="progress-bar-background" />
                  <div
                    className="progress-bar-current"
                    style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                  />
                </div>
                <span className="time-total">{formatTime(duration)}</span>
              </div>
              <div className="episode-controls-container">
                
                {/* Botão Reiniciar Episódio - sempre visível quando há conteúdo */}
                {streamInfo && (
                  <div className="restart-episode-container">
                                        <button 
                        className={`restart-episode-button ${focusedElement === 'restart' ? 'focused' : ''}`}
                        onClick={(e) => {
                          console.log('🔄 Botão reiniciar episódio clicado!', e);
                          restartEpisode();
                        }}
                      >
                      <div className="restart-episode-content">
                        <div className="restart-episode-main">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,4C14.1,4 16.1,4.8 17.6,6.3C20.7,9.4 20.7,14.5 17.6,17.6C15.8,19.5 13.3,20.2 10.9,19.9L11.4,17.9C13.1,18.1 14.9,17.5 16.2,16.2C18.5,13.9 18.5,10.1 16.2,7.7C15.1,6.6 13.5,6 12,6V10.5L7,5.5L12,0.5V4M6.3,17.6C3.7,15 3.3,11 5.1,7.9L6.6,9.4C5.5,11.6 5.9,14.4 7.8,16.2C8.3,16.7 8.9,17.1 9.6,17.4L9,19.4C8,19 7.1,18.4 6.3,17.6Z" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Botão Próximo Episódio - apenas para séries */}
                {(() => {
                  // Calcular próximo episódio dinamicamente sempre
                  const hasNextEpisode = episodeManager.isSeriesActive && 
                    episodeManager.currentEpisode && 
                    episodeManager.allEpisodes && 
                    episodeManager.allEpisodes.length > 0;

                  let dynamicNextEpisode = null;
                  if (hasNextEpisode) {
                    dynamicNextEpisode = calculateNextEpisode(episodeManager.currentEpisode, episodeManager.allEpisodes);
                  }

                  // Fallback: se não conseguir calcular próximo episódio, tentar usar nextEpisode pré-calculado
                  if (!dynamicNextEpisode && episodeManager.nextEpisode) {
                    console.log('🔄 Usando nextEpisode pré-calculado como fallback');
                    dynamicNextEpisode = episodeManager.nextEpisode;
                  }

                  console.log('🔍 Renderização do botão próximo episódio:', {
                    isSeriesActive: episodeManager.isSeriesActive,
                    hasCurrentEpisode: !!episodeManager.currentEpisode,
                    currentEpisodeName: episodeManager.currentEpisode?.title || episodeManager.currentEpisode?.name,
                    allEpisodesCount: episodeManager.allEpisodes?.length || 0,
                    hasNextEpisode,
                    dynamicNextEpisode: dynamicNextEpisode?.title || dynamicNextEpisode?.name,
                    usedFallback: !calculateNextEpisode(episodeManager.currentEpisode, episodeManager.allEpisodes) && !!episodeManager.nextEpisode,
                    willShowButton: hasNextEpisode && !!dynamicNextEpisode
                  });

                  return hasNextEpisode && dynamicNextEpisode && (
                    <div className="next-episode-container">
                      <button 
                        className={`next-episode-button ${focusedElement === 'next-episode' ? 'focused' : ''}`}
                        onClick={(e) => {
                          console.log('🖱️ Botão próximo episódio clicado!', e);
                          playNextEpisode();
                        }}
                      >
                        <div className="next-episode-content">
                          <div className="next-episode-main">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M4,18L12.5,12L4,6V18M13,6V18H16V6H13Z" />
                            </svg>
                            <span>Próximo Episódio</span>
                          </div>

                        </div>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay - Estilo Netflix */}
        {(isLoading || isStalled || isBuffering) && !isPlaying && (
          <div className="netflix-loading-overlay">
            <div className="netflix-loading-container">
              <div className="netflix-loading-ring">
                <div className="netflix-loading-circle"></div>
                <div
                  className="netflix-loading-progress"
                  style={{
                    background: `conic-gradient(#e50914 ${isStalled || isBuffering ? 100 : loadingProgress * 3.6}deg, transparent 0deg)`
                  }}
                ></div>
              </div>
              <div className={`netflix-loading-percentage ${isStalled || isBuffering ? 'stalled' : ''}`}>
                {isStalled || isBuffering ? '∞' : loadingProgress}%
              </div>
              <div className={`netflix-loading-message ${isStalled || isBuffering ? 'stalled' : ''}`}>
                {isStalled || isBuffering ? 
                  (() => {
                    const stats = getBufferingStats();
                    return stats ? 
                      `Vídeo travado - carregando... (${stats.formattedTime})` : 
                      'Vídeo travado - carregando...';
                  })() : 
                  loadingMessage
                }
              </div>
              {(isStalled || isBuffering) && (
                <div className="netflix-loading-tip">
                  <p>Dica: Verifique sua conexão com a internet</p>
                  {(() => {
                    const quality = getConnectionQuality();
                    return quality && (
                      <div className="netflix-loading-connection-info">
                        <span style={{ color: quality.color }}>●</span>
                        <span>{quality.status}</span>
                      </div>
                    );
                  })()}
                  <button 
                    className="netflix-loading-retry-button"
                    onClick={attemptReconnection}
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}
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
