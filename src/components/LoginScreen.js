import React, { useState } from 'react';
import './LoginScreen.css';
import { loginCliente } from '../services/authService';

const LoginScreen = ({ onLogin, onGoToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Obtém o MAC address do dispositivo se possível (Tizen / WebAPI)
  const getMacAddress = () => {
    // Samsung Tizen (webapis)
    if (window.webapis && window.webapis.network && typeof window.webapis.network.getMac === 'function') {
      try {
        return window.webapis.network.getMac();
      } catch (_) {
        // continua fallback
      }
    }

    // Tizen systeminfo API
    if (window.tizen && window.tizen.systeminfo) {
      try {
        // Esta API é assíncrona, mas tentaremos obter de forma síncrona via variável local
        let macAddress = '';
        window.tizen.systeminfo.getPropertyValue(
          'WIFI_NETWORK',
          function (network) {
            macAddress = network.macAddress || '';
          },
          function () {}
        );
        if (macAddress) return macAddress;
      } catch (_) {
        // continua fallback
      }
    }

    // Fallback vazio caso não seja possível obter
    return '';
  };

  const handleContinue = async () => {
    if (loading) return; // Evita múltiplos envios

    setError('');
    setLoading(true);

    try {
      const mac_disp = getMacAddress();
      const data = await loginCliente({ email, senha: password, mac_disp });

      // Armazenar token e email localmente para uso posterior
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authEmail', data.email);

      onLogin(data); // Informa App que login foi bem-sucedido
    } catch (err) {
      setError(err.message || 'Erro ao logar');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleContinue();
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
        {error && <div className="error-message">{error}</div>}

        <button
          id="continueButton"
          onClick={handleContinue}
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Continuar'}
        </button>

        <button
          className="signup-btn"
          onClick={onGoToSignup}
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
          Criar Nova Conta
        </button>
      </div>
    </div>
  );
};

export default LoginScreen; 