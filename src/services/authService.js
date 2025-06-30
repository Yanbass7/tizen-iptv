// Serviço de Autenticação para a aplicação BIGTV IPTV
// Responsável por realizar login e validar token conforme a API interna
// Endpoint base disponibilizado: https://bigtv-proxy-teste.duckdns.org

// Usando endpoint direto temporariamente (sem proxy)
const API_BASE_URL = 'https://bigtv-proxy-teste.duckdns.org';

/**
 * Valida se a senha atende aos critérios de segurança
 * @param {string} senha - Senha a ser validada
 * @returns {Object} { isValid: boolean, message: string }
 */
export const validarSenha = (senha) => {
  if (!senha || senha.length < 8) {
    return { isValid: false, message: 'A senha deve ter no mínimo 8 caracteres' };
  }
  
  const temMaiuscula = /[A-Z]/.test(senha);
  const temSimbolo = /[!@#$%^&*(),.?":{}|<>]/.test(senha);
  
  if (!temMaiuscula) {
    return { isValid: false, message: 'A senha deve conter pelo menos 1 letra maiúscula' };
  }
  
  if (!temSimbolo) {
    return { isValid: false, message: 'A senha deve conter pelo menos 1 símbolo' };
  }
  
  return { isValid: true, message: 'Senha válida' };
};

/**
 * Cadastra um novo cliente.
 * @param {Object} params
 * @param {string} params.email - Email do cliente
 * @param {string} params.senha - Senha do cliente (deve atender aos critérios de segurança)
 * @returns {Promise<Object>} Retorna JSON com message e novoCliente
 */
export const cadastrarCliente = async ({ email, senha }) => {
  // Validar senha antes de enviar
  const validacao = validarSenha(senha);
  if (!validacao.isValid) {
    throw new Error(validacao.message);
  }

  const response = await fetch(`${API_BASE_URL}/user-cliente`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, senha })
  });

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error('Dados inválidos');
    }
    if (response.status === 409) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Email já cadastrado');
    }
    throw new Error('Erro interno do servidor');
  }

  return response.json();
};

/**
 * Cria uma nova conta IPTV vinculada a um cliente.
 * @param {Object} params
 * @param {number} params.clienteId - ID do cliente
 * @param {string} params.codigo - Código do grupo/convite
 * @param {string} params.mac_disp - MAC address do dispositivo
 * @param {string} token - Token de autenticação do cliente
 * @returns {Promise<Object>} Retorna JSON com message e ContaIptv
 */
export const criarContaIptv = async ({ clienteId, codigo, mac_disp }, token) => {
  const response = await fetch(`${API_BASE_URL}/cliente-conta-iptv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ clienteId, codigo, mac_disp })
  });

  if (!response.ok) {
    const error = new Error('Falha ao criar conta IPTV.');
    error.status = response.status; // Anexa o status ao objeto de erro
    try {
      const errorData = await response.json();
      error.message = errorData.message || `Erro ${response.status}`;
    } catch (e) {
      // Ignora erro no parsing do corpo do erro
    }
    throw error;
  }

  return response.json();
};

/**
 * Realiza login de cliente.
 * @param {Object} params
 * @param {string} params.email - Email do cliente
 * @param {string} params.senha - Senha do cliente
 * @param {string} params.mac_disp - MAC address do dispositivo
 * @returns {Promise<Object>} Retorna JSON com id, email e token
 */
export const loginCliente = async ({ email, senha, mac_disp }) => {
  const response = await fetch(`${API_BASE_URL}/auth/cliente`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, senha, mac_disp })
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Cliente não encontrado');
    }
    throw new Error('Erro ao logar');
  }

  return response.json();
};

/**
 * Valida o token JWT do cliente.
 * @param {string} token - Token JWT de autenticação
 * @returns {Promise<Object>} Retorna o payload do token se válido
 */
export const validarToken = async (token) => {
  const response = await fetch(`${API_BASE_URL}/auth/validar-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token inválido');
    }
    throw new Error('Erro ao validar token');
  }

  return response.json();
};

// Função para obter a configuração do player (baseUrl, user e senha).
// Esta função também determina o status da conta IPTV.
// - Se a resposta for 200 OK, a conta está APROVADA e a configuração é retornada.
// - Se a resposta for 404 Not Found, a conta está PENDENTE.
export const getPlayerConfig = async (token) => {
  const response = await fetch(`${API_BASE_URL}/cliente-conta-iptv/player-config`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  if (response.ok) {
    return response.json(); // Retorna a configuração (baseUrl, user, senha)
  }

  if (response.status === 404) {
    // Lança um erro específico para conta pendente, que será tratado pela UI.
    const error = new Error('Conta IPTV pendente de aprovação.');
    error.isPending = true; // Adiciona uma flag para facilitar a verificação
    throw error;
  }

  // Trata outros erros de servidor
  const errorData = await response.text();
  console.error('Erro ao obter configuração do player:', response.status, errorData);
  throw new Error('Falha ao obter configuração da conta IPTV.');
}; 