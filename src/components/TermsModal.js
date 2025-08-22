import React, { useCallback, useEffect, useRef, useState } from 'react';
import './TermsModal.css';
import AlertPopup from './AlertPopup';
import GlobalToast from './GlobalToast';

const TermsModal = ({ isVisible, onAccept, onReject }) => {
  const acceptRef = useRef(null);
  const rejectRef = useRef(null);
  const [activeButton, setActiveButton] = useState('accept');
  const [showRejectNotice, setShowRejectNotice] = useState(false);

  const triggerRejectNotice = useCallback(() => {
    setShowRejectNotice(true);
  }, []);

  const handleKeyDown = useCallback((e) => {
    const code = (e && e.detail && typeof e.detail.keyCode === 'number') ? e.detail.keyCode : e.keyCode;
    // Bloquear todas as teclas exceto Esquerda, Direita e Enter
    if (code === 37) { // Left
      e.preventDefault();
      e.stopPropagation();
      setActiveButton('reject');
      return;
    }
    if (code === 39) { // Right
      e.preventDefault();
      e.stopPropagation();
      setActiveButton('accept');
      return;
    }
    if (code === 13) { // Enter
      e.preventDefault();
      e.stopPropagation();
      if (activeButton === 'accept') {
        onAccept();
      } else {
        console.log('Botão Rejeitar acionado (Modal de Termos)');
        triggerRejectNotice();
        onReject();
      }
      return;
    }
    // Ignorar Back (10009), cima/baixo e demais enquanto o modal estiver aberto
  }, [activeButton, onAccept, onReject, triggerRejectNotice]);

  useEffect(() => {
    if (!isVisible) return;
    const listener = (ev) => handleKeyDown(ev);
    window.addEventListener('termsModalNavigation', listener);
    // Também ouvir keydown global para garantir suporte em todas as TVs/navegadores
    document.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('termsModalNavigation', listener);
      document.removeEventListener('keydown', listener);
    };
  }, [isVisible, handleKeyDown]);

  useEffect(() => {
    if (!isVisible) return;
    // Default focus: Reject
    setActiveButton('reject');
    // Garantir foco visual do botão
    setTimeout(() => {
      if (rejectRef.current) {
        try { rejectRef.current.focus(); } catch {}
      }
    }, 0);
  }, [isVisible]);

  // Sincronizar foco real do DOM com o estado ativo (melhor para Tizen/TV)
  useEffect(() => {
    if (!isVisible) return;
    const target = activeButton === 'accept' ? acceptRef.current : rejectRef.current;
    if (target && typeof target.focus === 'function') {
      try { target.focus(); } catch {}
    }
  }, [activeButton, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="terms-modal-overlay" role="dialog" aria-modal="true">
      <div className="terms-modal">
        <div className="terms-header">
          <h2>Terms & Conditions</h2>
        </div>
        <div className="terms-content" role="document" aria-label="Terms and Conditions">
          <ol>
            <li>
              BIGTV provides a media player to play the user’s own content. Any demo content is for testing
              purposes only and comes from open-source/public sources.
            </li>
            <li>
              BIGTV does not include or provide any streaming media, channels or movies. The user bears full
              responsibility for the content they upload or play.
            </li>
            <li>
              BIGTV respects the intellectual property rights of others and expects its users to do the same.
            </li>
            <li>
              We may modify, suspend or discontinue parts of the application, temporarily or permanently, with or
              without notice and without liability to you.
            </li>
            <li>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. Continued
              use of the app constitutes acceptance of the changes.
            </li>
            <li>
              BIGTV may offer additional features (e.g., scores, radio, etc.) for free, but we cannot guarantee
              continuous uptime of any service.
            </li>
            <li>
              Trials or subscriptions may be offered by third parties. Refund policies, if any, are defined by those
              services. Paying in advance grants access only for the paid period.
            </li>
            <li>
              BIGTV may collect minimal device data to identify the device and provide licensing in a manner
              consistent with our privacy policy. We do not use third-party trackers to identify you.
            </li>
            <li>
              By pressing the “Accept” button below, you agree to and accept these terms and conditions.
            </li>
          </ol>
        </div>
        <div className="terms-actions">
          <button
            ref={rejectRef}
            className={`terms-btn terms-reject ${activeButton === 'reject' ? 'focused' : ''}`}
            type="button"
            onClick={() => { console.log('Botão Rejeitar clicado (Modal de Termos)'); triggerRejectNotice(); onReject(); }}
            onKeyDown={(e) => {
              if (e.keyCode === 39) { // Right
                e.preventDefault();
                setActiveButton('accept');
              } else if (e.keyCode === 13) {
                console.log('Botão Rejeitar acionado via Enter (Modal de Termos)');
                triggerRejectNotice();
                onReject();
              }
            }}
          >
            Reject
          </button>
          <button
            ref={acceptRef}
            className={`terms-btn terms-accept ${activeButton === 'accept' ? 'focused' : ''}`}
            type="button"
            onClick={onAccept}
            onKeyDown={(e) => {
              if (e.keyCode === 37) { // Left
                e.preventDefault();
                setActiveButton('reject');
              } else if (e.keyCode === 13) {
                onAccept();
              }
            }}
          >
            Accept
          </button>
        </div>
        {showRejectNotice && (
          <GlobalToast
            message={"You must accept the Terms & Conditions to continue."}
            onClose={() => setShowRejectNotice(false)}
          />
        )}
      </div>
    </div>
  );
};

export default TermsModal;



