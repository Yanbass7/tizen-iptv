import React, { useState, useEffect, useRef } from 'react';
import './LoginScreen.css'; // Reutilizar os mesmos estilos da tela de login
import { cadastrarCliente, validarSenha } from '../services/authService';

const SignupScreen = ({ onSignup, onBackToLogin, isActive }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [focusIndex, setFocusIndex] = useState(0);
  const focusableElements = useRef([]);

  useEffect(() => {
    // Foca o primeiro elemento quando a tela se torna ativa
    if (isActive) {
      focusableElements.current[0]?.focus();
      setFocusIndex(0);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const handleAuthNav = (e) => {
      const { keyCode } = e.detail;
      const elementsCount = focusableElements.current.filter(el => el).length;

      if (keyCode === 40) { // Down
        setFocusIndex(prev => (prev + 1) % elementsCount);
      } else if (keyCode === 38) { // Up
        setFocusIndex(prev => (prev - 1 + elementsCount) % elementsCount);
      } else if (keyCode === 13) { // Enter
        const currentElement = focusableElements.current[focusIndex];
        currentElement?.click();
      }
    };

    window.addEventListener('authNavigation', handleAuthNav);
    return () => window.removeEventListener('authNavigation', handleAuthNav);
  }, [isActive, focusIndex]);

  useEffect(() => {
    if (!isActive) return;

    focusableElements.current.forEach((el, index) => {
      if (el) {
        if (index === focusIndex) {
          el.focus();
          el.classList.add('focused');
        } else {
          el.classList.remove('focused');
        }
      }
    });
  }, [focusIndex, isActive]);

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
          ref={el => (focusableElements.current[0] = el)}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          ref={el => (focusableElements.current[1] = el)}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
        />
        <input
          ref={el => (focusableElements.current[2] = el)}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirmar Senha"
        />

        <div style={{fontSize: '12px', color: '#ccc', margin: '10px 0', textAlign: 'center'}}>
          A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula e 1 símbolo
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message" style={{color: '#4CAF50', textAlign: 'center', margin: '10px 0'}}>{success}</div>}

        <button
          ref={el => (focusableElements.current[3] = el)}
          id="continueButton"
          onClick={handleCadastro}
          disabled={loading}
        >
          {loading ? 'Cadastrando...' : 'Criar Conta'}
        </button>

        <button
          ref={el => (focusableElements.current[4] = el)}
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