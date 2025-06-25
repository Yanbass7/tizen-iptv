import React, { useEffect } from 'react';
import './AlertPopup.css';

const AlertPopup = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // A mensagem desaparece após 3 segundos

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="alert-popup-container">
      <div className="alert-popup">
        {message}
      </div>
    </div>
  );
};

export default AlertPopup;
