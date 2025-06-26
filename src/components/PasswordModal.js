import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PasswordModal.css';
import { safeScrollIntoView } from '../utils/scrollUtils';

const PasswordModal = ({ onPasswordChange, onPasswordSubmit, onCancel, focus, password, onNavigation }) => {
    const inputRef = useRef(null);
    const submitRef = useRef(null);
    const cancelRef = useRef(null);
    const keyboardRef = useRef(null);
    const [activeElement, setActiveElement] = useState('keyboard'); // 'keyboard', 'submit', 'cancel'
    const [selectedKey, setSelectedKey] = useState({ row: 0, col: 0 });

    const numericKeyboardLayout = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        [
            { type: 'action', action: 'clear', display: <i className="fas fa-trash-alt"></i> },
            '0',
            { type: 'action', action: 'backspace', display: <i className="fas fa-backspace"></i> }
        ]
    ];

    const handleKeyPress = (key) => {
        if (typeof key === 'object' && key.action) {
            if (key.action === 'clear') {
                onPasswordChange('');
            } else if (key.action === 'backspace') {
                onPasswordChange(password.slice(0, -1));
            }
        } else {
            if (password.length < 4) {
                onPasswordChange(password + key);
            }
        }
    };

    const handleSubmit = () => {
        onPasswordSubmit(password);
    };

    const handlePasswordInputChange = (e) => {
        const value = e.target.value;
        if (/^[0-9]*$/.test(value) && value.length <= 4) {
            onPasswordChange(value);
        }
    };

    const handleKeyboardNavigation = useCallback((keyCode) => {
        const maxRows = numericKeyboardLayout.length;
        let currentRow = selectedKey.row;
        let currentCol = selectedKey.col;

        if (keyCode === 38) { // Up
            if (currentRow > 0) {
                setSelectedKey({ row: currentRow - 1, col: currentCol });
            }
        } else if (keyCode === 40) { // Down
            if (currentRow < maxRows - 1) {
                setSelectedKey({ row: currentRow + 1, col: currentCol });
            } else {
                setActiveElement('submit');
            }
        } else if (keyCode === 37) { // Left
            if (currentCol > 0) {
                setSelectedKey({ row: currentRow, col: currentCol - 1 });
            }
        } else if (keyCode === 39) { // Right
            if (currentCol < numericKeyboardLayout[currentRow].length - 1) {
                setSelectedKey({ row: currentRow, col: currentCol + 1 });
            }
        } else if (keyCode === 13) { // OK
            const selectedKeyValue = numericKeyboardLayout[currentRow][currentCol];
            handleKeyPress(selectedKeyValue);
        }
    }, [selectedKey, handleKeyPress]);

    const handleButtonNavigation = useCallback((keyCode) => {
        if (keyCode === 38) { // Up
            setActiveElement('keyboard');
        } else if (keyCode === 37) { // Left
            if (activeElement === 'cancel') {
                setActiveElement('submit');
            }
        } else if (keyCode === 39) { // Right
            if (activeElement === 'submit') {
                setActiveElement('cancel');
            }
        } else if (keyCode === 13) { // OK
            if (activeElement === 'submit') {
                handleSubmit();
            } else if (activeElement === 'cancel') {
                onCancel();
            }
        }
    }, [activeElement, handleSubmit, onCancel]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.keyCode === 10009) { // Back button on Tizen
                e.preventDefault();
                onCancel();
                return;
            }

            if (activeElement === 'keyboard') {
                handleKeyboardNavigation(e.keyCode);
            } else {
                handleButtonNavigation(e.keyCode);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeElement, handleKeyboardNavigation, handleButtonNavigation, onCancel]);

    const updateFocusVisual = useCallback(() => {
        document.querySelectorAll('.keyboard-key, .password-modal-buttons button').forEach(el => {
            el.classList.remove('focused');
        });

        if (activeElement === 'keyboard') {
            const keyboardRows = keyboardRef.current ? keyboardRef.current.children : [];
            if (keyboardRows[selectedKey.row]) {
                const keysInRow = keyboardRows[selectedKey.row].children;
                if (keysInRow[selectedKey.col]) {
                    keysInRow[selectedKey.col].classList.add('focused');
                    safeScrollIntoView(keysInRow[selectedKey.col], {
                        behavior: 'smooth',
                        block: 'nearest'
                    });
                }
            }
        } else if (activeElement === 'submit') {
            submitRef.current.classList.add('focused');
        } else if (activeElement === 'cancel') {
            cancelRef.current.classList.add('focused');
        }
    }, [activeElement, selectedKey]);

    useEffect(() => {
        updateFocusVisual();
    }, [updateFocusVisual]);

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            // Não faz nada se o clique for no overlay
        }
    };

    return (
        <div className="password-modal-overlay" onClick={handleOverlayClick}>
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
                    readOnly
                />
                <div className="virtual-keyboard" ref={keyboardRef}>
                    {numericKeyboardLayout.map((row, rowIndex) => (
                        <div key={rowIndex} className="keyboard-row">
                            {row.map((key, colIndex) => {
                                const keyContent = (typeof key === 'object' && key.display) ? key.display : key;
                                const valueToPress = (typeof key === 'object') ? key : String(key);

                                return (
                                    <button
                                        key={`${rowIndex}-${colIndex}`}
                                        className={`keyboard-key ${typeof key === 'object' ? 'special-key' : ''}`}
                                        onClick={() => handleKeyPress(valueToPress)}
                                    >
                                        {keyContent}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
                <div className="password-modal-buttons">
                    <button ref={submitRef} onClick={handleSubmit}>Acessar</button>
                    <button ref={cancelRef} onClick={onCancel}>Cancelar</button>
                </div>
            </div>
        </div>
    );
};

export default PasswordModal;
