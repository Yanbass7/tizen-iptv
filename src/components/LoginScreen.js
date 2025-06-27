import React, { useState, useEffect, useRef } from 'react';
import './LoginScreen.css';
import { loginCliente } from '../services/authService';

const LoginScreen = ({ onLogin, onGoToSignup, onSkipLogin, isActive }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [macAddress, setMacAddress] = useState('');

  const [focusIndex, setFocusIndex] = useState(0);
  const focusableElements = useRef([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mac = params.get('mac');
    if (mac && mac !== 'unknown' && mac !== 'unsupported') {
      setMacAddress(mac);
      console.log(`MAC Address obtido da URL: ${mac}`);
    } else if (mac) {
        const errorMessage = `Dispositivo não suportado ou erro na leitura do MAC (${mac}).`;
        console.error(errorMessage);
        setError(errorMessage);
    }
  }, []); // Executa apenas uma vez na montagem do componente

  useEffect(() => {
    // Foca o primeiro elemento quando a tela se torna ativa
    if (isActive) {
      focusableElements.current[0]?.focus();
      setFocusIndex(0); // Garante que o foco visual seja aplicado
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

  // Obtém o MAC address do dispositivo se possível (Tizen / WebAPI)
  const getMacAddress = () => {
    // Samsung Tizen (webapis)
    if (window.webapis && window.webapis.network && typeof window.webapis.network.getMac === 'function') {
      try {
        const mac = window.webapis.network.getMac();
        console.log('MAC obtido via webapis:', mac);
        return mac;
      } catch (e) {
        console.log('Erro ao obter MAC via webapis:', e);
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
        if (macAddress) {
          console.log('MAC obtido via systeminfo:', macAddress);
          return macAddress;
        }
      } catch (e) {
        console.log('Erro ao obter MAC via systeminfo:', e);
        // continua fallback
      }
    }

    // Retorna string vazia se não for possível obter o MAC real
    console.error('Não foi possível obter MAC address real do dispositivo.');
    return '';
  };

  const handleContinue = async () => {
    if (loading) return; // Evita múltiplos envios

    setError('');
    setLoading(true);

    try {
      const mac_disp = macAddress || getMacAddress();
      console.log('MAC que será enviado na requisição:', mac_disp); // Debug
      
      if (!mac_disp) {
        throw new Error('Não foi possível obter o MAC do dispositivo. Login não pode ser concluído.');
      }
      
      const data = await loginCliente({ email, senha: password, mac_disp });

      // Armazenar token e email localmente para uso posterior
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authEmail', data.email);

      console.log('Dados de login para enviar ao App:', data); // Debug
      onLogin(data, mac_disp); // Informa App que login foi bem-sucedido e passa o MAC
    } catch (err) {
      setError(err.message || 'Erro ao logar');
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
          src="/images/logo-bigtv-est.png"
          className="logo-login"
          alt="BIGTV Logo"
        />
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
        {error && <div className="error-message">{error}</div>}

        <button
          ref={el => (focusableElements.current[2] = el)}
          id="continueButton"
          onClick={handleContinue}
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Continuar'}
        </button>

        <button
          ref={el => (focusableElements.current[3] = el)}
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

        <button
          ref={el => (focusableElements.current[4] = el)}
          className="skip-login-btn-dev"
          onClick={onSkipLogin}
          style={{
            marginTop: '10px',
            background: '#6a0dad',
            border: '1px solid #8a2be2',
            color: '#fff',
            padding: '8px 15px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          Pular Login (Dev)
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
