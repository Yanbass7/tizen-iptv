import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Sidebar.css';

const baseMenuItems = [
  { id: 'search', label: 'Pesquisar', icon: 'fa-magnifying-glass' },
  { id: 'home', label: 'Home', icon: 'fa-house' },
  { id: 'channels', label: 'Canais Ao Vivo', icon: 'fa-tv' },
  { id: 'movies', label: 'Filmes', icon: 'fa-video' },
  { id: 'series', label: 'Séries', icon: 'fa-film' },
  { id: 'logout', label: 'Sair', icon: 'fa-right-from-bracket' },
];

const Sidebar = ({ currentSection, onMenu, menuFocus, onSectionChange, onLogout, hasGroupCode }) => {
  // Criar menu dinâmico baseado no estado do código de grupo
  const menuItems = useMemo(() => {
    const items = [...baseMenuItems];
    
    // Inserir item de código de grupo antes do logout
    const logoutIndex = items.findIndex(item => item.id === 'logout');
    const groupCodeItem = hasGroupCode 
      ? { id: 'group-code', label: 'Alterar Grupo', icon: 'fa-users-gear' }
      : { id: 'group-code', label: 'Configurar Grupo', icon: 'fa-users' };
    
    items.splice(logoutIndex, 0, groupCodeItem);
    return items;
  }, [hasGroupCode]);

  const handleItemClick = (item) => {
    if (item.id === 'logout') {
      // Emitir evento para mostrar o modal de logout no App
      const logoutEvent = new CustomEvent('showLogoutModal', {});
      window.dispatchEvent(logoutEvent);
    } else if (item.id === 'group-code') {
      // Emitir evento para mostrar o modal de código de grupo
      const groupCodeEvent = new CustomEvent('showGroupCodeModal', {});
      window.dispatchEvent(groupCodeEvent);
    } else {
      onSectionChange(item.id);
    }
  };

  const handleKeyDown = useCallback((e) => {
    // A navegação por teclado agora é tratada completamente no App.js
    // Aqui apenas emitimos eventos para casos especiais quando Enter é pressionado
    if (onMenu && menuFocus !== null && e.keyCode === 13) {
      const focusedItem = menuItems[menuFocus];
      
      if (focusedItem && focusedItem.id === 'logout') {
        e.preventDefault();
        // Emitir evento para mostrar o modal de logout no App
        const logoutEvent = new CustomEvent('showLogoutModal', {});
        window.dispatchEvent(logoutEvent);
      } else if (focusedItem && focusedItem.id === 'group-code') {
        e.preventDefault();
        // Emitir evento para mostrar o modal de código de grupo
        const groupCodeEvent = new CustomEvent('showGroupCodeModal', {});
        window.dispatchEvent(groupCodeEvent);
      }
    }
  }, [onMenu, menuFocus, menuItems]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <nav className={`sidebar ${onMenu ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-logo">
        <img
          src="/images/BIGTV-transparente.png"
          alt="BIGTV Logo"
          className="sidebar-logo-img"
        />
      </div>

      <div className="sidebar-menu">
        {menuItems.map((item, idx) => (
          <div
            key={item.id}
            className={`sidebar-menu-item ${currentSection === item.id ? 'active' : ''
              } ${onMenu && menuFocus === idx ? 'focused' : ''
              }`}
            onClick={() => handleItemClick(item)}
            data-tooltip={item.label}
          >
            <div className="menu-item-icon">
              <i className={`fa-solid ${item.icon}`}></i>
            </div>
            <span className="menu-item-label">{item.label}</span>
          </div>
        ))}
      </div>
    </nav>
  );
};

export default Sidebar; 