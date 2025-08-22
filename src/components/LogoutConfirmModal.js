import React, { useEffect, useRef, useCallback, useState } from 'react';
import './LogoutConfirmModal.css';

const LogoutConfirmModal = ({ onConfirm, onCancel, isVisible }) => {
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);
  const [activeElement, setActiveElement] = useState('confirm');

  const handleKeyDown = useCallback((e) => {
    console.log('LogoutModal - Key pressed:', e.keyCode, 'Current active:', activeElement);

    if (e.keyCode === 10009) { // Back button on Tizen
      console.log('LogoutModal - Back button pressed');
      e.preventDefault();
      e.stopPropagation();
      onCancel();
      return;
    }

    if (e.keyCode === 37) { // Left - vai para confirm
      console.log('LogoutModal - Left arrow, setting active to confirm');
      e.preventDefault();
      e.stopPropagation();
      setActiveElement('confirm');
    } else if (e.keyCode === 39) { // Right - vai para cancel
      console.log('LogoutModal - Right arrow, setting active to cancel');
      e.preventDefault();
      e.stopPropagation();
      setActiveElement('cancel');
    } else if (e.keyCode === 38 || e.keyCode === 40) { // Up or Down - toggle between buttons
      const newActive = activeElement === 'confirm' ? 'cancel' : 'confirm';
      console.log('LogoutModal - Up/Down arrow, toggling from', activeElement, 'to', newActive);
      e.preventDefault();
      e.stopPropagation();
      setActiveElement(newActive);
    } else if (e.keyCode === 13) { // OK
      console.log('LogoutModal - Enter pressed, active element:', activeElement);
      e.preventDefault();
      e.stopPropagation();
      if (activeElement === 'confirm') {
        onConfirm();
      } else if (activeElement === 'cancel') {
        onCancel();
      }
    }
  }, [activeElement, onConfirm, onCancel]);

  useEffect(() => {
    if (isVisible) {
      console.log('LogoutModal - Modal opened, setting initial active element to confirm');
      setActiveElement('confirm');

      // Limpar qualquer foco residual
      document.querySelectorAll('.logout-confirm-btn, .logout-cancel-btn').forEach(btn => {
        btn.classList.remove('focused');
      });

      // Apenas um listener para eventos de teclado
      const handleKeyDownEvent = (e) => {
        // Verificar se o modal está visível antes de processar eventos
        if (!isVisible) return;

        handleKeyDown(e);
      };

      document.addEventListener('keydown', handleKeyDownEvent, true);

      return () => {
        document.removeEventListener('keydown', handleKeyDownEvent, true);
      };
    }
  }, [isVisible, handleKeyDown]);

  const updateFocusVisual = useCallback(() => {
    console.log('LogoutModal - Updating focus visual, active element:', activeElement);

    // Limpar todos os focos primeiro
    document.querySelectorAll('.logout-confirm-btn, .logout-cancel-btn').forEach(btn => {
      btn.classList.remove('focused');
    });

    // Adicionar foco ao elemento ativo
    if (activeElement === 'confirm' && confirmRef.current) {
      confirmRef.current.classList.add('focused');
      confirmRef.current.focus();
      console.log('LogoutModal - Added focused class to confirm button');
    } else if (activeElement === 'cancel' && cancelRef.current) {
      cancelRef.current.classList.add('focused');
      cancelRef.current.focus();
      console.log('LogoutModal - Added focused class to cancel button');
    }
  }, [activeElement]);

  useEffect(() => {
    updateFocusVisual();
  }, [updateFocusVisual]);

  const handleConfirmClick = (e) => {
    console.log('LogoutModal - Confirm button clicked');
    e.preventDefault();
    e.stopPropagation();
    onConfirm();
  };

  const handleCancelClick = (e) => {
    console.log('LogoutModal - Cancel button clicked');
    e.preventDefault();
    e.stopPropagation();
    onCancel();
  };

  const handleButtonFocus = (buttonType) => {
    console.log('LogoutModal - Button focused:', buttonType);
    setActiveElement(buttonType);
  };

  if (!isVisible) return null;

  return (
    <div className="logout-modal-overlay">
      <div className="logout-modal">
        <div className="logout-modal-content">
          <div className="logout-modal-icon">
            <i className="fas fa-sign-out-alt"></i>
          </div>
          <h2>Sair da Conta</h2>
          <p>Tem certeza que deseja sair da sua conta?</p>
        </div>
        <div className="logout-modal-buttons">
          <button
            ref={confirmRef}
            className="logout-confirm-btn"
            onClick={handleConfirmClick}
            onFocus={() => handleButtonFocus('confirm')}
            type="button"
          >
            Sim
          </button>
          <button
            ref={cancelRef}
            className="logout-cancel-btn"
            onClick={handleCancelClick}
            onFocus={() => handleButtonFocus('cancel')}
            type="button"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal; 