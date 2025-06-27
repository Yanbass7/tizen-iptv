import React, { useState, useEffect, useRef } from 'react';
import './LoginScreen.css'; // Reutilizar os mesmos estilos da tela de login
import { criarContaIptv } from '../services/authService';

const IptvSetupScreen = ({ clienteData, onSetupComplete, onSkip, isActive, macAddress }) => {
  const [codigo, setCodigo] = useState('');
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

  // Verificar se clienteData está disponível
  if (!clienteData) {
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
            Carregando...
          </h2>
          <div style={{fontSize: '14px', color: '#ccc', margin: '20px 0', textAlign: 'center'}}>
            Aguarde enquanto carregamos suas informações...
          </div>
        </div>
      </div>
    );
  }

  // Obtém o MAC address do dispositivo se possível (Tizen / WebAPI)
  const getMacAddress = () => {
    // Samsung Tizen (webapis)
    if (window.webapis && window.webapis.network && typeof window.webapis.network.getMac === 'function') {
      try {
        const mac = window.webapis.network.getMac();
        console.log('MAC obtido via webapis:', mac);
        return mac;
      } catch (e) {
        console.error('Erro ao obter MAC via webapis:', e);
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
        console.error('Erro ao obter MAC via systeminfo:', e);
        // continua fallback
      }
    }

    // Retorna string vazia se não for possível obter o MAC real
    console.error('Não foi possível obter MAC address real do dispositivo.');
    return '';
  };

  const handleConfigurar = async () => {
    if (loading) return; // Evita múltiplos envios

    setError('');
    setSuccess('');

    // Validações locais
    if (!codigo) {
      setError('Código do grupo é obrigatório');
      return;
    }

    if (codigo.length < 3) {
      setError('Código deve ter pelo menos 3 caracteres');
      return;
    }

    setLoading(true);

    try {
      // Prioriza o MAC recebido via props (da URL), senão tenta obter de novo
      const mac_disp = macAddress || getMacAddress();
      console.log(`MAC a ser usado na configuração: ${mac_disp}`);

      if (!mac_disp) {
        throw new Error('Não foi possível obter o MAC do dispositivo. Configuração não pode ser concluída.');
      }
      
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const data = await criarContaIptv({
        clienteId: clienteData.id,
        codigo,
        mac_disp
      }, token);

      setSuccess('Conta IPTV criada com sucesso! Aguardando vinculação pelo administrador.');
      
      // Armazenar informações da conta IPTV
      localStorage.setItem('contaIptvId', data.ContaIptv.id);
      localStorage.setItem('contaIptvStatus', data.ContaIptv.status);
      
      // Limpar campo após sucesso
      setCodigo('');
      
      // Opcional: chamar callback se definido
      if (onSetupComplete) {
        onSetupComplete(data);
      }
      
      // Avançar para Home após 3 segundos
      setTimeout(() => {
        onSetupComplete(data);
      }, 3000);

    } catch (err) {
      // Se o erro for 409, significa que a conta já existe mas não está ativa (pendente).
      if (err.status === 409) {
        console.warn('Erro 409: A conta IPTV já existe e provavelmente está pendente. Redirecionando para a tela de espera.');
        // Força a navegação para a tela de "pendente"
        onSetupComplete({ ContaIptv: { status: 'pendente' } });
      } else {
        setError(err.message || 'Erro ao configurar conta IPTV');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePular = () => {
    if (onSkip) {
      onSkip();
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
          Configurar Conta IPTV
        </h2>
        
        <div style={{fontSize: '14px', color: '#ccc', margin: '20px 0', textAlign: 'center'}}>
          Olá, <strong>{clienteData.email}</strong>!<br/>
          Para acessar o catálogo de filmes e séries, você precisa vincular sua conta a um grupo IPTV.
        </div>
        
        <input
          ref={el => (focusableElements.current[0] = el)}
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Código do Grupo (ex: 2b03512)"
          style={{marginBottom: '10px'}}
        />

        <div style={{fontSize: '12px', color: '#ccc', margin: '10px 0', textAlign: 'center'}}>
          Digite o código fornecido pelo seu administrador para vincular sua conta ao grupo IPTV correspondente.
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message" style={{color: '#4CAF50', textAlign: 'center', margin: '10px 0'}}>{success}</div>}

        <button
          ref={el => (focusableElements.current[1] = el)}
          id="continueButton"
          onClick={handleConfigurar}
          disabled={loading}
        >
          {loading ? 'Configurando...' : 'Configurar Conta IPTV'}
        </button>

        <button
          ref={el => (focusableElements.current[2] = el)}
          className="skip-btn"
          onClick={handlePular}
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
          Pular (Configurar Depois)
        </button>

        <div style={{fontSize: '11px', color: '#999', margin: '15px 0', textAlign: 'center'}}>
          Você pode configurar sua conta IPTV mais tarde nas configurações do aplicativo.
        </div>
      </div>
    </div>
  );
};

export default IptvSetupScreen; 