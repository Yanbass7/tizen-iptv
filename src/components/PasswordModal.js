import React, { useState, useEffect, useRef } from 'react';
import './PasswordModal.css';

const PasswordModal = ({ onPasswordChange, onPasswordSubmit, onCancel, focus, password, onNavigation }) => {
    const inputRef = useRef(null);
    const submitRef = useRef(null);
    const cancelRef = useRef(null);

    

    useEffect(() => {
        if (focus === 'input') {
            inputRef.current.focus();
        } else if (focus === 'submit') {
            submitRef.current.focus();
        } else if (focus === 'cancel') {
            cancelRef.current.focus();
        }
    }, [focus]);

    const handleSubmit = () => {
        onPasswordSubmit(password);
    };

    return (
        <div className="password-modal-overlay">
            <div className="password-modal">
                <h2>Canal Adulto</h2>
                <p>Por favor, insira a senha para continuar:</p>
                <input
                    ref={inputRef}
                    type="password"
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                />
                <div className="password-modal-buttons">
                    <button ref={submitRef} onClick={handleSubmit}>Acessar</button>
                    <button ref={cancelRef} onClick={onCancel}>Cancelar</button>
                </div>
            </div>
        </div>
    );
};

export default PasswordModal;
