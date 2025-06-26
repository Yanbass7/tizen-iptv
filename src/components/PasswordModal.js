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

    useEffect(() => {
        const handleKeyDown = (e) => {
            // On Tizen, the back button is keycode 10009.
            // We need to prevent the default action (which is to go back)
            // unless the password input is focused.
            if ((e.key === 'Backspace' || e.keyCode === 10009) && e.target !== inputRef.current) {
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleSubmit = () => {
        onPasswordSubmit(password);
    };

    const handlePasswordInputChange = (e) => {
        const value = e.target.value;
        // Permite apenas números e limita o comprimento a 4 dígitos
        if (/^[0-9]*$/.test(value) && value.length <= 4) {
            onPasswordChange(value);
        }
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
                    onChange={handlePasswordInputChange}
                    placeholder="••••"
                    maxLength="4"
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
