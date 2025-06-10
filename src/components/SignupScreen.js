import React, { useState } from 'react';
import './LoginScreen.css'; // Reutilizar os mesmos estilos da tela de login
import { cadastrarCliente, validarSenha } from '../services/authService';

const SignupScreen = ({ onSignup, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCadastro = async () => {
    if (loading) return; // Evita múltiplos envios

    setError('');
    setSuccess('');

    // Validações locais
    if (!email) {
      setError('Email é obrigatório');
      return;
    }

    if (!email.includes('@')) {
      setError('Email deve ser válido');
      return;
    }

    if (!password) {
      setError('Senha é obrigatória');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    // Validar critérios de senha
    const validacao = validarSenha(password);
    if (!validacao.isValid) {
      setError(validacao.message);
      return;
    }

    setLoading(true);

    try {
      const data = await cadastrarCliente({ email, senha: password });
      
      setSuccess('Cliente criado com sucesso! Agora você pode fazer login.');
      
      // Limpar campos após sucesso
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      
      // Opcional: chamar callback se definido
      if (onSignup) {
        onSignup(data);
      }
      
      // Voltar para login após 2 segundos
      setTimeout(() => {
        onBackToLogin();
      }, 2000);

    } catch (err) {
      setError(err.message || 'Erro ao cadastrar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCadastro();
    }
  };

  return (
    <div className="login-screen">
      <img 
        src="/images/image-mesh-gradient.png" 
        className="background-image" 
        alt="Background" 
      />
      <div className="login-form">
        <img 
          src="/images/BIGTV-transparente.png" 
          className="logo-login" 
          alt="BIGTV Logo" 
        />
        
        <h2 style={{color: 'white', marginBottom: '20px', textAlign: 'center'}}>
          Criar Conta
        </h2>
        
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          onKeyPress={handleKeyPress}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          onKeyPress={handleKeyPress}
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirmar Senha"
          onKeyPress={handleKeyPress}
        />

        <div style={{fontSize: '12px', color: '#ccc', margin: '10px 0', textAlign: 'center'}}>
          A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula e 1 símbolo
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message" style={{color: '#4CAF50', textAlign: 'center', margin: '10px 0'}}>{success}</div>}

        <button
          id="continueButton"
          onClick={handleCadastro}
          disabled={loading}
        >
          {loading ? 'Cadastrando...' : 'Criar Conta'}
        </button>

        <button
          className="back-to-login-btn"
          onClick={onBackToLogin}
          style={{
            marginTop: '15px',
            background: 'transparent',
            border: '1px solid #666',
            color: '#ccc',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Voltar ao Login
        </button>
      </div>
    </div>
  );
};

export default SignupScreen; 