/**
 * Função auxiliar para formatação de números com zeros à esquerda
 * Alternativa segura ao padStart para casos específicos
 */
export const padNumber = (num, length = 2, char = '0') => {
  const str = String(num);
  if (str.length >= length) return str;
  
  const pad = Array(length - str.length + 1).join(char);
  return pad + str;
};

/**
 * Função auxiliar para formatação de episódios
 * Uso: formatEpisode(1, 5) -> "S01E05"
 */
export const formatEpisode = (season, episode) => {
  return `S${padNumber(season, 2)}E${padNumber(episode, 2)}`;
}; 