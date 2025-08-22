import React, { useState, useEffect, useRef } from 'react';
import './PaymentScreen.css';

const PaymentScreen = ({ onPaymentComplete, isActive }) => {
  const payButtonRef = useRef(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const focusableElements = useRef([]);

  useEffect(() => {
    if (isActive) {
      focusableElements.current[0]?.focus();
      setFocusIndex(0);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const handleAuthNav = (e) => {
      const { keyCode } = e.detail;

      if (keyCode === 13) { // Enter
        e.preventDefault?.();
        const currentElement = focusableElements.current[focusIndex];
        if (currentElement) {
          currentElement.click();
        }
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
          ou acesse o site <span className="website-link">bigtv-bc58d.web.app/pricing</span>
        </p>
        <button
          ref={el => (focusableElements.current[0] = el)}
          id="continueButton"
          type="button"
          onClick={onPaymentComplete}
        >
          Já foi pago
        </button>
      </div>
    </div>
  );
};

export default PaymentScreen;