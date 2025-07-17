import React, { useEffect, useRef } from 'react';
import './PaymentScreen.css';

const PaymentScreen = ({ onPaymentComplete, isActive }) => {
  const payButtonRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      payButtonRef.current?.focus();
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      if (e.keyCode === 13) { // Enter
        onPaymentComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onPaymentComplete]);

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
        <p className="qr-code-text">Escaneie o QR Code</p>
        <div className="qr-code-placeholder">
          <img
            src="/images/qr-code-bigtv.png"
            alt="QR Code BIGTV"
            className="qr-code-image"
          />
        </div>
        <p className="website-text">
          ou acesse o site <span className="website-link">https://bigtv-bc58d.web.app/</span>
        </p>
        <button
          ref={payButtonRef}
          id="continueButton"
          className="login-button"
          onClick={onPaymentComplete}
        >
          Já foi pago
        </button>
      </div>
    </div>
  );
};

export default PaymentScreen;