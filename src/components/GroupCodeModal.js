import React, { useState, useEffect, useRef, useCallback } from 'react';
import './GroupCodeModal.css';
import { criarContaIptv, getPlayerConfig } from '../services/authService';
import { setPlayerConfig } from '../config/apiConfig';

const GroupCodeModal = ({ isVisible, onSuccess, onCancel, clienteData, macAddress }) => {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeElement, setActiveElement] = useState('input');

  const inputRef = useRef(null);
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);

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
      }
    }

    // Tizen systeminfo API
    if (window.tizen && window.tizen.systeminfo) {
      try {
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
      }
    }

    console.error('Não foi possível obter MAC address real do dispositivo.');
    return '';
  };

  const handleConfigurar = async () => {
    if (loading) return;

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
      const isTestMode = localStorage.getItem('testMode') === 'true';
      const isSamsungDemoEmail = isTestMode && clienteData && clienteData.email === 'samsungtest1@samsung.com';
      
      // Modo de teste restrito ao e-mail demo da Samsung - simular configuração bem-sucedida
      if (isSamsungDemoEmail) {
        console.log('🧪 Modo de teste - simulando configuração de código de grupo');
        // No modo demo, somente o código 'd62005' é aceito
        if ((codigo || '').toLowerCase() !== 'd62005') {
          setError('Grupo não encontrado');
          setLoading(false);
          return;
        }
        
        // Simular dados de resposta
        const testData = {
          ContaIptv: {
            id: 'test-iptv-id-' + Date.now(),
            status: 'aprovado'
          }
        };

        setSuccess('Código de grupo configurado com sucesso');
        
        // Armazenar informações de teste
        localStorage.setItem('contaIptvId', testData.ContaIptv.id);
        localStorage.setItem('contaIptvStatus', testData.ContaIptv.status);
        localStorage.setItem('groupCode', codigo);
        
        // Limpar campo após sucesso
        setCodigo('');
        
        // Chamar callback de sucesso após delay
        setTimeout(() => {
          onSuccess(testData);
        }, 1500);
        
        setLoading(false);
        return;
      }

      // Fluxo normal de produção
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

      setSuccess('Conta criada com sucesso');
      
      // Armazenar informações da conta IPTV
      localStorage.setItem('contaIptvId', data.ContaIptv.id);
      localStorage.setItem('contaIptvStatus', data.ContaIptv.status);
      localStorage.setItem('groupCode', codigo);
      
      // Limpar campo após sucesso
      setCodigo('');
      
      // Chamar callback de sucesso após delay
      setTimeout(() => {
        onSuccess(data);
      }, 2000);

    } catch (err) {
      // Se o erro for 409, a conta já existe. Verificar o status dela.
      if (err.status === 409) {
        console.warn('Erro 409: A conta já existe. Verificando status com getPlayerConfig.');
        try {
          const token = localStorage.getItem('authToken');
          if (!token) throw new Error('Token não encontrado para verificar conta existente.');
          
          const playerCfg = await getPlayerConfig(token);
          
          // Se a chamada acima for bem-sucedida, a conta está APROVADA.
          console.log('Conta existente está APROVADA. Configuração recebida:', playerCfg);
          setPlayerConfig(playerCfg);
          localStorage.setItem('groupCode', codigo);
          
          setSuccess('Configuração carregada com sucesso');
          setTimeout(() => {
            onSuccess({ ContaIptv: { status: 'aprovado' } });
          }, 1500);

        } catch (playerError) {
          if (playerError.isPending) {
            console.log('Conta existente está PENDENTE.');
            setError('Sua conta está pendente de aprovação. Aguarde a liberação pelo administrador.');
          } else {
            setError(playerError.message || 'Erro ao verificar status da conta existente.');
          }
        }
      } else {
        // Corrigir mensagem de erro da API
        let errorMessage = err.message || 'Erro ao configurar conta';
        if (errorMessage === 'Grupo nao encontrado') {
          errorMessage = 'Grupo não encontrado';
        }
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKey = useCallback((keyCode) => {
    console.log('GroupCodeModal - Key received:', keyCode, 'Current active:', activeElement);

    // Voltar (Back/Return)
    if (keyCode === 8 || keyCode === 10009 || keyCode === 461 || keyCode === 27) {
      // Backspace dentro do input apaga caractere; outras teclas de back saem
      if (keyCode === 8 && activeElement === 'input' && codigo.length > 0) {
        setCodigo((prev) => prev.slice(0, -1));
      } else {
        onCancel();
      }
      return;
    }

    // Entrada de caracteres (números/letras) via controle
    const isDigitTop = keyCode >= 48 && keyCode <= 57;
    const isDigitPad = keyCode >= 96 && keyCode <= 105;
    const isLetter = keyCode >= 65 && keyCode <= 90;
    if (isDigitTop || isDigitPad || isLetter) {
      let char = '';
      if (isDigitTop) char = String.fromCharCode(keyCode);
      else if (isDigitPad) char = String(keyCode - 96);
      else if (isLetter) char = String.fromCharCode(keyCode);

      if (char) {
        if (activeElement !== 'input') setActiveElement('input');
        setCodigo((prev) => (prev.length < 20 ? prev + char : prev));
      }
      return;
    }

    // Cima
    if (keyCode === 38) {
      if (activeElement === 'confirm' || activeElement === 'cancel') {
        setActiveElement('input');
      }
      return;
    }

    // Baixo: sempre ir para o botão Confirmar (evitar bounce)
    if (keyCode === 40) {
      if (activeElement !== 'confirm') {
        setActiveElement('confirm');
      }
      return;
    }

    // Esquerda: voltar para Confirmar (também quando estiver no input) — evitar alternância redundante
    if (keyCode === 37) {
      if (activeElement !== 'confirm') setActiveElement('confirm');
      return;
    }

    // Direita: ao estar nos botões, ir de Confirmar -> Cancelar (sem bounce)
    if (keyCode === 39) {
      if (activeElement === 'confirm') setActiveElement('cancel');
      return;
    }

    // OK/Enter
    if (keyCode === 13) {
      if (activeElement === 'confirm') {
        handleConfigurar();
      } else if (activeElement === 'cancel') {
        onCancel();
      } else if (activeElement === 'input') {
        setActiveElement('confirm');
      }
    }
  }, [activeElement, onCancel, codigo]);

  // Efeito de inicialização ao abrir o modal (roda apenas quando ficar visível)
  useEffect(() => {
    if (!isVisible) return;

    console.log('GroupCodeModal - Modal opened, setting initial active element to input');
    setActiveElement('input');
    setCodigo('');
    setError('');
    setSuccess('');
    setLoading(false);

    // Limpar qualquer foco residual
    document.querySelectorAll('.group-code-input, .group-code-confirm-btn, .group-code-cancel-btn').forEach(el => {
      el.classList.remove('focused');
    });

    // Focar o input imediatamente ao abrir
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current.classList.add('focused');
        inputRef.current.focus();
      }, 0);
    }
  }, [isVisible]);

  // Efeito para registrar o listener de teclado enquanto o modal estiver visível
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDownEvent = (e) => {
      const keyCode = e.keyCode;

      // Se usuário começou a digitar caractere imprimível, inserir diretamente no input
      const isPrintable = e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
      if (isPrintable) {
        const valid = /^[a-z0-9]$/i.test(e.key);
        if (valid) {
          if (activeElement !== 'input') setActiveElement('input');
          setCodigo((prev) => (prev.length < 20 ? prev + e.key : prev));
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Impedir que outras telas capturem as teclas enquanto o modal está aberto
      const navKeys = [13, 37, 38, 39, 40, 8, 10009, 461, 27];
      if (navKeys.includes(keyCode)) {
        e.preventDefault();
        e.stopPropagation();
      }

      handleKey(keyCode);
    };

    document.addEventListener('keydown', handleKeyDownEvent, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDownEvent, { capture: true });
  }, [isVisible, handleKey, activeElement]);

  const updateFocusVisual = useCallback(() => {
    console.log('🎯 UPDATING FOCUS - Active element:', activeElement);

    // Limpar todos os focos primeiro usando querySelector
    document.querySelectorAll('.group-code-input, .group-code-confirm-btn, .group-code-cancel-btn').forEach(el => {
      el.classList.remove('focused');
    });

    // Usar setTimeout para garantir que o DOM seja atualizado
    setTimeout(() => {
      // Adicionar foco ao elemento ativo (padrão do LogoutConfirmModal)
      if (activeElement === 'confirm' && confirmRef.current) {
        confirmRef.current.classList.add('focused');
        confirmRef.current.focus();
        console.log('🎯 FOCUS APPLIED: Confirm Button');
      } else if (activeElement === 'cancel' && cancelRef.current) {
        cancelRef.current.classList.add('focused');
        cancelRef.current.focus();
        console.log('🎯 FOCUS APPLIED: Cancel Button');
      } else if (activeElement === 'input' && inputRef.current) {
        inputRef.current.classList.add('focused');
        inputRef.current.focus();
        console.log('🎯 FOCUS APPLIED: Input');
      }
    }, 10);
  }, [activeElement]);

  useEffect(() => {
    updateFocusVisual();
  }, [updateFocusVisual]);

  const handleInputChange = (e) => {
    setCodigo(e.target.value);
    setError('');
  };

  const handleConfirmClick = (e) => {
    console.log('GroupCodeModal - Confirm button clicked');
    e.preventDefault();
    e.stopPropagation();
    handleConfigurar();
  };

  const handleCancelClick = (e) => {
    console.log('GroupCodeModal - Cancel button clicked');
    e.preventDefault();
    e.stopPropagation();
    onCancel();
  };

  if (!isVisible) return null;

  return (
    <div className="group-code-modal-overlay">
      <div className="group-code-modal">
        <div className="group-code-modal-content">
          <div className="group-code-modal-icon">
            <i className="fas fa-users"></i>
          </div>
          <h2>Configurar Código de Grupo</h2>
          <p>Digite o código fornecido pelo seu administrador para acessar o conteúdo</p>
          
          <div className="group-code-input-container">
            <input
              ref={inputRef}
              type="text"
              value={codigo}
              onChange={handleInputChange}
              placeholder="Código do Grupo"
              className="group-code-input"
              maxLength={20}
              disabled={loading}
              tabIndex={activeElement === 'input' ? 0 : -1}
              onKeyDown={(e) => {
                console.log('🎯 INPUT KEYDOWN - Key:', e.keyCode);
                if (e.keyCode === 40) { // Down arrow
                  console.log('🎯 DOWN ARROW IN INPUT - Moving to confirm');
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveElement('confirm');
                } else if (e.keyCode === 13) { // Enter no input foca Confirmar
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveElement('confirm');
                } else if (e.keyCode === 37) { // Esquerda volta para Confirmar
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveElement('confirm');
                }
              }}
            />
          </div>

          {error && <div className="group-code-error">{error}</div>}
          {success && <div className="group-code-success">{success}</div>}
        </div>
        
        <div className="group-code-modal-buttons">
          <button
            ref={confirmRef}
            className="group-code-confirm-btn"
            onClick={handleConfirmClick}
            disabled={loading}
            type="button"
            tabIndex={activeElement === 'confirm' ? 0 : -1}
          >
            {loading ? 'Configurando...' : 'Confirmar'}
          </button>
          <button
            ref={cancelRef}
            className="group-code-cancel-btn"
            onClick={handleCancelClick}
            disabled={loading}
            type="button"
            tabIndex={activeElement === 'cancel' ? 0 : -1}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupCodeModal;