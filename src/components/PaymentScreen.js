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
    <div className="payment-screen">
      <img 
        src="/images/image-mesh-gradient.png" 
        className="background-image" 
        alt="Background" 
      />
      <div className="payment-content">
        <img
          src="/images/logo-bigtv-est.png"
          className="logo-payment"
          alt="BIGTV Logo"
        />
        <div className="qr-code-placeholder">
          {/* QR Code será inserido aqui */}
          <p>QR Code Area</p>
        </div>
        <button
          ref={payButtonRef}
          className="payment-button"
          onClick={onPaymentComplete}
        >
          Já foi pago
        </button>
      </div>
    </div>
  );
};

export default PaymentScreen;