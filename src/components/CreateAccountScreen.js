import React, { useEffect, useRef } from 'react';
import './CreateAccountScreen.css';

const CreateAccountScreen = ({ onBack, isActive }) => {
  const backButtonRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      backButtonRef.current?.focus();
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      if (e.keyCode === 13) { // Enter
        onBack();
      } else if (e.keyCode === 8 || e.keyCode === 27) { // Backspace or Escape
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onBack]);

  return (
    <div className="create-account-screen">
      <img 
        src="/images/image-mesh-gradient.png" 
        className="background-image" 
        alt="Background" 
      />
      <div className="create-account-form">
        <img
          src="/images/logo-bigtv-est.png"
          className="logo-create-account"
          alt="BIGTV Logo"
        />
        <h2 className="create-account-title">Criar Nova Conta</h2>
        <p className="qr-code-text">Escaneie o QR Code para criar sua conta</p>
        <div className="qr-code-placeholder">
          {/* Temporariamente usando o mesmo QR code até você adicionar o novo */}
          <img 
            src="/images/qr-code-bigtv.png" 
            alt="QR Code Criar Conta" 
            className="qr-code-image"
          />
        </div>
        <p className="website-text">
          ou acesse o site <span className="website-link">https://bigtv-bc58d.web.app/signup</span>
        </p>
        <button
          ref={backButtonRef}
          id="backButton"
          className="back-button"
          onClick={onBack}
        >
          Voltar para Login
        </button>
      </div>
    </div>
  );
};

export default CreateAccountScreen;