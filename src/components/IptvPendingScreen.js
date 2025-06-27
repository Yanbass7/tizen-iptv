import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getClienteStatus } from '../services/authService';
import './LoginScreen.css'; 

const IptvPendingScreen = ({ onApprovalSuccess, onLogout, isActive }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [focusIndex, setFocusIndex] = useState(0);
  const focusableElements = useRef([]);
  const intervalRef = useRef(null);

  const checkStatus = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Sessão não encontrada. Por favor, faça login novamente.');
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cliente = await getClienteStatus(token);
      if (cliente && cliente.conta_iptv_status === 'ATIVO') {
        console.log('Conta aprovada!');
        if (intervalRef.current) clearInterval(intervalRef.current);
        onApprovalSuccess();
      } else {
        console.log('Conta ainda pendente...');
      }
    } catch (err) {
      setError(err.message || 'Erro ao verificar status.');
      if (err.message.includes('Sessão expirada')) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(onLogout, 3000);
      }
    } finally {
      setLoading(false);
    }
  }, [onApprovalSuccess, onLogout]);

  useEffect(() => {
    if (isActive) {
      // Inicia a verificação automática quando a tela se torna ativa
      checkStatus(); // Verifica imediatamente ao entrar na tela
      intervalRef.current = setInterval(checkStatus, 10000); // E depois a cada 10 segundos

      // Limpa o intervalo quando o componente é desmontado ou se torna inativo
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isActive, checkStatus]);

  useEffect(() => {
    if (!isActive) return;

    const handleAuthNav = (e) => {
      const { keyCode } = e.detail;
      if (keyCode === 40) { // Baixo
        setFocusIndex(prev => (prev + 1) % focusableElements.current.length);
      } else if (keyCode === 38) { // Cima
        setFocusIndex(prev => (prev - 1 + focusableElements.current.length) % focusableElements.current.length);
      } else if (keyCode === 13) { // Enter
        focusableElements.current[focusIndex]?.click();
      }
    };

    window.addEventListener('authNavigation', handleAuthNav);
    return () => window.removeEventListener('authNavigation', handleAuthNav);
  }, [isActive, focusIndex]);
  
    useEffect(() => {
    if (!isActive) return;
    focusableElements.current.forEach((el, index) => {
      if(el) {
        if (index === focusIndex) {
          el.focus();
          el.classList.add('focused');
        } else {
          el.classList.remove('focused');
        }
      }
    });
  }, [focusIndex, isActive]);


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
          Aguardando Aprovação
        </h2>
        
        <div style={{fontSize: '14px', color: '#ccc', margin: '20px 0', textAlign: 'center'}}>
          Sua conta foi criada e está pendente de aprovação pelo administrador do seu grupo.
          <br/><br/>
          O sistema verificará o status automaticamente.
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          ref={el => (focusableElements.current[0] = el)}
          onClick={checkStatus}
          disabled={loading}
        >
          {loading ? 'Verificando...' : 'Verificar Agora'}
        </button>

        <button
          ref={el => (focusableElements.current[1] = el)}
          className="skip-btn"
          onClick={onLogout}
          style={{
            marginTop: '15px',
            background: 'transparent',
            border: '1px solid #666',
            color: '#ccc'
          }}
        >
          Sair (Logout)
        </button>
      </div>
    </div>
  );
};

export default IptvPendingScreen; 