import React from 'react';
import './Sidebar.css';

const menuItems = [
  { id: 'search', label: 'Pesquisar', icon: 'fa-magnifying-glass' },
  { id: 'home', label: 'Home', icon: 'fa-house' },
  { id: 'channels', label: 'Canais Ao Vivo', icon: 'fa-tv' },
  { id: 'movies', label: 'Filmes', icon: 'fa-film' },
  { id: 'series', label: 'Séries', icon: 'fa-video' },
  { id: 'logout', label: 'Sair', icon: 'fa-right-from-bracket' },
];

const Sidebar = ({ currentSection, onMenu, menuFocus, onSectionChange, onLogout }) => {
  const handleItemClick = (item) => {
    if (item.id === 'logout') {
      onLogout();
    } else {
      onSectionChange(item.id);
    }
  };

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
            className={`sidebar-menu-item ${
              currentSection === item.id ? 'active' : ''
            } ${
              onMenu && menuFocus === idx ? 'focused' : ''
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