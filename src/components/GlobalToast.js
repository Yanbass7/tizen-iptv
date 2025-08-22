import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import './GlobalToast.css';

const GlobalToast = ({ message, duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof onClose === 'function') onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return ReactDOM.createPortal(
    (
      <div className="global-toast-container" role="alert" aria-live="assertive">
        <div className="global-toast">{message}</div>
      </div>
    ),
    document.body
  );
};

export default GlobalToast;


