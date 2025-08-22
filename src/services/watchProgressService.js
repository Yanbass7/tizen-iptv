/**
 * Serviço para gerenciar o progresso de visualização de séries
 * Salva onde o usuário parou de assistir cada episódio
 */

const SERIES_STORAGE_KEY = 'series_watch_progress';
const MOVIES_STORAGE_KEY = 'movies_watch_progress';

class WatchProgressService {
  /**
   * Salva o progresso de um episódio
   * @param {string} seriesId - ID da série
   * @param {number} seasonNumber - Número da temporada
   * @param {string} episodeId - ID do episódio
   * @param {number} currentTime - Tempo atual em segundos
   * @param {number} duration - Duração total em segundos
   * @param {Object} episodeInfo - Informações do episódio
   */
  saveProgress(seriesId, seasonNumber, episodeId, currentTime, duration, episodeInfo = {}) {
    try {
      const progress = this.getAllProgress();
      
      if (!progress[seriesId]) {
        progress[seriesId] = {
          seriesName: episodeInfo.seriesName || 'Série Desconhecida',
          lastWatched: Date.now(),
          seasons: {},
          // Adicionar informações da série para exibição
          seriesId: seriesId,
          poster: episodeInfo.seriesPoster || episodeInfo.poster,
          stream_icon: episodeInfo.seriesPoster || episodeInfo.stream_icon,
          cover: episodeInfo.seriesPoster || episodeInfo.cover,
          genre: episodeInfo.seriesGenre || episodeInfo.genre,
          year: episodeInfo.seriesYear || episodeInfo.year
        };
      }

      if (!progress[seriesId].seasons[seasonNumber]) {
        progress[seriesId].seasons[seasonNumber] = {};
      }

      // Calcular porcentagem assistida
      const percentWatched = duration > 0 ? (currentTime / duration) * 100 : 0;
      
      // Considerar episódio completo se assistiu mais de 90%
      const isCompleted = percentWatched >= 90;

      progress[seriesId].seasons[seasonNumber][episodeId] = {
        currentTime,
        duration,
        percentWatched,
        isCompleted,
        lastWatched: Date.now(),
        episodeTitle: episodeInfo.episodeTitle || 'Episódio',
        episodeNumber: episodeInfo.episodeNumber || 1
      };

      // Atualizar último episódio assistido da série
      progress[seriesId].lastWatched = Date.now();
      progress[seriesId].lastEpisode = {
        seasonNumber,
        episodeId,
        episodeTitle: episodeInfo.episodeTitle,
        episodeNumber: episodeInfo.episodeNumber
      };

      localStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(progress));
      
      console.log('📺 Progresso salvo:', {
        seriesId,
        seasonNumber,
        episodeId,
        currentTime,
        percentWatched: Math.round(percentWatched),
        isCompleted
      });

      return true;
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
      return false;
    }
  }

  /**
   * Obtém o progresso de um episódio específico
   * @param {string} seriesId - ID da série
   * @param {number} seasonNumber - Número da temporada
   * @param {string} episodeId - ID do episódio
   * @returns {Object|null} Dados do progresso ou null
   */
  getEpisodeProgress(seriesId, seasonNumber, episodeId) {
    try {
      const progress = this.getAllProgress();
      
      if (progress[seriesId] && 
          progress[seriesId].seasons[seasonNumber] && 
          progress[seriesId].seasons[seasonNumber][episodeId]) {
        return progress[seriesId].seasons[seasonNumber][episodeId];
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao obter progresso do episódio:', error);
      return null;
    }
  }

  /**
   * Obtém todo o progresso de uma série
   * @param {string} seriesId - ID da série
   * @returns {Object|null} Dados da série ou null
   */
  getSeriesProgress(seriesId) {
    try {
      const progress = this.getAllProgress();
      return progress[seriesId] || null;
    } catch (error) {
      console.error('Erro ao obter progresso da série:', error);
      return null;
    }
  }

  /**
   * Obtém o último episódio assistido de uma série
   * @param {string} seriesId - ID da série
   * @returns {Object|null} Dados do último episódio ou null
   */
  getLastWatchedEpisode(seriesId) {
    try {
      const seriesProgress = this.getSeriesProgress(seriesId);
      
      if (!seriesProgress || !seriesProgress.lastEpisode) {
        return null;
      }

      const { seasonNumber, episodeId } = seriesProgress.lastEpisode;
      const episodeProgress = this.getEpisodeProgress(seriesId, seasonNumber, episodeId);

      return {
        ...seriesProgress.lastEpisode,
        progress: episodeProgress
      };
    } catch (error) {
      console.error('Erro ao obter último episódio assistido:', error);
      return null;
    }
  }

  /**
   * Obtém todas as séries com progresso para "Continuar Assistindo"
   * @returns {Array} Lista de séries ordenadas por última visualização
   */
  getContinueWatchingSeries() {
    try {
      const progress = this.getAllProgress();
      const series = [];

      Object.keys(progress).forEach(seriesId => {
        const seriesData = progress[seriesId];
        const lastEpisode = this.getLastWatchedEpisode(seriesId);

        if (lastEpisode && lastEpisode.progress && !lastEpisode.progress.isCompleted) {
          series.push({
            seriesId,
            seriesName: seriesData.seriesName,
            lastWatched: seriesData.lastWatched,
            lastEpisode,
            progressPercent: Math.round(lastEpisode.progress.percentWatched),
            currentTimeFormatted: this.formatTime(lastEpisode.progress.currentTime),
            durationFormatted: this.formatTime(lastEpisode.progress.duration),
            remainingTimeFormatted: this.formatTime(lastEpisode.progress.duration - lastEpisode.progress.currentTime),
            // Adicionar informações de imagem da série
            poster: seriesData.poster,
            stream_icon: seriesData.stream_icon,
            cover: seriesData.cover,
            genre: seriesData.genre,
            year: seriesData.year
          });
        }
      });

      // Ordenar por última visualização (mais recente primeiro)
      return series.sort((a, b) => b.lastWatched - a.lastWatched);
    } catch (error) {
      console.error('Erro ao obter séries para continuar assistindo:', error);
      return [];
    }
  }

  /**
   * Obtém todo o progresso armazenado de séries
   * @returns {Object} Todos os dados de progresso de séries
   */
  getAllProgress() {
    try {
      const data = localStorage.getItem(SERIES_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Erro ao ler progresso de séries do localStorage:', error);
      return {};
    }
  }

  /**
   * Obtém todo o progresso armazenado de filmes
   * @returns {Object} Todos os dados de progresso de filmes
   */
  getAllMoviesProgress() {
    try {
      const data = localStorage.getItem(MOVIES_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Erro ao ler progresso de filmes do localStorage:', error);
      return {};
    }
  }

  /**
   * Remove o progresso de uma série específica
   * @param {string} seriesId - ID da série
   * @returns {boolean} Sucesso da operação
   */
  removeSeriesProgress(seriesId) {
    try {
      const progress = this.getAllProgress();
      
      if (progress[seriesId]) {
        delete progress[seriesId];
        localStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(progress));
        console.log('🗑️ Progresso da série removido:', seriesId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao remover progresso da série:', error);
      return false;
    }
  }

  /**
   * Limpa todo o progresso armazenado
   * @returns {boolean} Sucesso da operação
   */
  clearAllProgress() {
    try {
      localStorage.removeItem(SERIES_STORAGE_KEY);
      console.log('🧹 Todo o progresso foi limpo');
      return true;
    } catch (error) {
      console.error('Erro ao limpar progresso:', error);
      return false;
    }
  }

  /**
   * Marca um episódio como completo
   * @param {string} seriesId - ID da série
   * @param {number} seasonNumber - Número da temporada
   * @param {string} episodeId - ID do episódio
   * @returns {boolean} Sucesso da operação
   */
  markEpisodeComplete(seriesId, seasonNumber, episodeId) {
    try {
      const episodeProgress = this.getEpisodeProgress(seriesId, seasonNumber, episodeId);
      
      if (episodeProgress) {
        episodeProgress.isCompleted = true;
        episodeProgress.percentWatched = 100;
        episodeProgress.currentTime = episodeProgress.duration;
        episodeProgress.lastWatched = Date.now();

        const progress = this.getAllProgress();
        progress[seriesId].seasons[seasonNumber][episodeId] = episodeProgress;
        localStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(progress));
        
        console.log('✅ Episódio marcado como completo:', { seriesId, seasonNumber, episodeId });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao marcar episódio como completo:', error);
      return false;
    }
  }

  /**
   * Salva o progresso de um filme
   * @param {string} movieId - ID do filme
   * @param {number} currentTime - Tempo atual em segundos
   * @param {number} duration - Duração total em segundos
   * @param {Object} movieInfo - Informações do filme
   */
  saveMovieProgress(movieId, currentTime, duration, movieInfo = {}) {
    try {
      const progress = this.getAllMoviesProgress();
      
      // Calcular porcentagem assistida
      const percentWatched = duration > 0 ? (currentTime / duration) * 100 : 0;
      
      // Considerar filme completo se assistiu mais de 90%
      const isCompleted = percentWatched >= 90;

      progress[movieId] = {
        movieName: movieInfo.movieName || 'Filme Desconhecido',
        currentTime,
        duration,
        percentWatched,
        isCompleted,
        lastWatched: Date.now(),
        genre: movieInfo.genre,
        year: movieInfo.year,
        rating: movieInfo.rating,
        poster: movieInfo.poster
      };

      localStorage.setItem(MOVIES_STORAGE_KEY, JSON.stringify(progress));
      
      console.log('🎬 Progresso do filme salvo:', {
        movieId,
        movieName: movieInfo.movieName,
        currentTime,
        percentWatched: Math.round(percentWatched),
        isCompleted
      });

      return true;
    } catch (error) {
      console.error('Erro ao salvar progresso do filme:', error);
      return false;
    }
  }

  /**
   * Obtém o progresso de um filme específico
   * @param {string} movieId - ID do filme
   * @returns {Object|null} Dados do progresso ou null
   */
  getMovieProgress(movieId) {
    try {
      const progress = this.getAllMoviesProgress();
      return progress[movieId] || null;
    } catch (error) {
      console.error('Erro ao obter progresso do filme:', error);
      return null;
    }
  }

  /**
   * Obtém filmes para "Continuar Assistindo"
   * @returns {Array} Lista de filmes ordenados por última visualização
   */
  getContinueWatchingMovies() {
    try {
      const progress = this.getAllMoviesProgress();
      const movies = [];

      Object.keys(progress).forEach(movieId => {
        const movieData = progress[movieId];

        if (movieData && !movieData.isCompleted && movieData.currentTime > 30) {
          movies.push({
            movieId,
            movieName: movieData.movieName,
            lastWatched: movieData.lastWatched,
            progressPercent: Math.round(movieData.percentWatched),
            currentTimeFormatted: this.formatTime(movieData.currentTime),
            durationFormatted: this.formatTime(movieData.duration),
            remainingTimeFormatted: this.formatTime(movieData.duration - movieData.currentTime),
            genre: movieData.genre,
            year: movieData.year,
            rating: movieData.rating,
            poster: movieData.poster,
            // Dados para compatibilidade com interface existente
            stream_id: movieId,
            name: movieData.movieName,
            stream_icon: movieData.poster,
            cover: movieData.poster
          });
        }
      });

      // Ordenar por última visualização (mais recente primeiro)
      return movies.sort((a, b) => b.lastWatched - a.lastWatched);
    } catch (error) {
      console.error('Erro ao obter filmes para continuar assistindo:', error);
      return [];
    }
  }

  /**
   * Marca um filme como completo
   * @param {string} movieId - ID do filme
   * @returns {boolean} Sucesso da operação
   */
  markMovieComplete(movieId) {
    try {
      const movieProgress = this.getMovieProgress(movieId);
      
      if (movieProgress) {
        movieProgress.isCompleted = true;
        movieProgress.percentWatched = 100;
        movieProgress.currentTime = movieProgress.duration;
        movieProgress.lastWatched = Date.now();

        const progress = this.getAllMoviesProgress();
        progress[movieId] = movieProgress;
        localStorage.setItem(MOVIES_STORAGE_KEY, JSON.stringify(progress));
        
        console.log('✅ Filme marcado como completo:', movieId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao marcar filme como completo:', error);
      return false;
    }
  }

  /**
   * Remove o progresso de um filme específico
   * @param {string} movieId - ID do filme
   * @returns {boolean} Sucesso da operação
   */
  removeMovieProgress(movieId) {
    try {
      const progress = this.getAllMoviesProgress();
      
      if (progress[movieId]) {
        delete progress[movieId];
        localStorage.setItem(MOVIES_STORAGE_KEY, JSON.stringify(progress));
        console.log('🗑️ Progresso do filme removido:', movieId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao remover progresso do filme:', error);
      return false;
    }
  }

  /**
   * Limpa todo o progresso de filmes
   * @returns {boolean} Sucesso da operação
   */
  clearAllMoviesProgress() {
    try {
      localStorage.removeItem(MOVIES_STORAGE_KEY);
      console.log('🧹 Todo o progresso de filmes foi limpo');
      return true;
    } catch (error) {
      console.error('Erro ao limpar progresso de filmes:', error);
      return false;
    }
  }

  /**
   * Tenta inferir dados de série e episódio com base no URL ou nome do stream
   * @param {string} streamUrl - URL do stream
   * @param {Object} streamInfo - Informações do stream
   * @returns {Object|null} Dados inferidos da série/episódio ou null
   */
  inferEpisodeFromStream(streamUrl, streamInfo) {
    try {
      // Se já temos streamInfo completo, usar ele
      if (streamInfo?.type === 'series' && streamInfo?.seriesInfo) {
        return {
          seriesId: streamInfo.seriesInfo.seriesId,
          seasonNumber: streamInfo.seriesInfo.currentSeason || 1,
          episodeId: streamInfo.seriesInfo.currentEpisode?.id || streamInfo.seriesInfo.currentEpisode?.stream_id,
          episodeTitle: streamInfo.seriesInfo.currentEpisode?.title || streamInfo.seriesInfo.currentEpisode?.name
        };
      }

      // Tentar encontrar progresso baseado no nome do conteúdo
      if (streamInfo?.name) {
        const allProgress = this.getAllProgress();
        
        for (const seriesId in allProgress) {
          const seriesData = allProgress[seriesId];
          
          // Verificar se o nome contém o nome da série
          if (streamInfo.name.toLowerCase().includes(seriesData.seriesName.toLowerCase())) {
            console.log('🔍 Série encontrada por nome:', seriesData.seriesName);
            
            // Se tem último episódio assistido, pode ser este
            if (seriesData.lastEpisode) {
              return {
                seriesId,
                seasonNumber: seriesData.lastEpisode.seasonNumber,
                episodeId: seriesData.lastEpisode.episodeId,
                episodeTitle: seriesData.lastEpisode.episodeTitle
              };
            }
          }
        }
      }

      console.log('❌ Não foi possível inferir dados do episódio');
      return null;
    } catch (error) {
      console.error('Erro ao inferir dados do episódio:', error);
      return null;
    }
  }

  /**
   * Tenta inferir dados de filme com base no URL ou nome do stream
   * @param {string} streamUrl - URL do stream
   * @param {Object} streamInfo - Informações do stream
   * @returns {Object|null} Dados inferidos do filme ou null
   */
  inferMovieFromStream(streamUrl, streamInfo) {
    try {
      // Se streamInfo indica que é filme, usar stream_id como movieId
      if (streamInfo?.type === 'movie' || !streamInfo?.type) {
        const movieId = streamInfo?.stream_id || streamInfo?.id;
        
        if (movieId) {
          return {
            movieId,
            movieName: streamInfo?.name || 'Filme Desconhecido'
          };
        }
      }

      // Tentar encontrar progresso baseado no nome do filme
      if (streamInfo?.name) {
        const allProgress = this.getAllMoviesProgress();
        
        for (const movieId in allProgress) {
          const movieData = allProgress[movieId];
          
          // Verificar se o nome contém o nome do filme
          if (streamInfo.name.toLowerCase().includes(movieData.movieName.toLowerCase())) {
            console.log('🔍 Filme encontrado por nome:', movieData.movieName);
            return {
              movieId,
              movieName: movieData.movieName
            };
          }
        }
      }

      console.log('❌ Não foi possível inferir dados do filme');
      return null;
    } catch (error) {
      console.error('Erro ao inferir dados do filme:', error);
      return null;
    }
  }

  /**
   * Formata tempo em segundos para formato legível (mm:ss ou hh:mm:ss)
   * @param {number} timeInSeconds - Tempo em segundos
   * @returns {string} Tempo formatado
   */
  formatTime(timeInSeconds) {
    if (!timeInSeconds || timeInSeconds <= 0) return '0:00';
    
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Calcula estatísticas de progresso para uma série
   * @param {string} seriesId - ID da série
   * @param {Array} allEpisodes - Todos os episódios da série
   * @returns {Object} Estatísticas de progresso
   */
  getSeriesStats(seriesId, allEpisodes = []) {
    try {
      const seriesProgress = this.getSeriesProgress(seriesId);
      
      if (!seriesProgress || allEpisodes.length === 0) {
        return {
          totalEpisodes: allEpisodes.length,
          watchedEpisodes: 0,
          completedEpisodes: 0,
          progressPercent: 0
        };
      }

      let watchedEpisodes = 0;
      let completedEpisodes = 0;

      allEpisodes.forEach(episode => {
        const episodeProgress = this.getEpisodeProgress(
          seriesId, 
          episode.season_number || 1, 
          episode.id || episode.episode_id
        );

        if (episodeProgress) {
          watchedEpisodes++;
          if (episodeProgress.isCompleted) {
            completedEpisodes++;
          }
        }
      });

      const progressPercent = allEpisodes.length > 0 
        ? Math.round((completedEpisodes / allEpisodes.length) * 100) 
        : 0;

      return {
        totalEpisodes: allEpisodes.length,
        watchedEpisodes,
        completedEpisodes,
        progressPercent
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas da série:', error);
      return {
        totalEpisodes: allEpisodes.length,
        watchedEpisodes: 0,
        completedEpisodes: 0,
        progressPercent: 0
      };
    }
  }
}

// Exportar instância única
export const watchProgressService = new WatchProgressService();
export default watchProgressService;
