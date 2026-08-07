import React from 'react';
import './Header.css';

/**
 * Header.jsx - Cabecera superior responsive para la app de Nómina TES.
 */
export default function Header({ activeTab, setActiveTab }) {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="brand">
          <span className="brand-icon">🚑</span>
          <div>
            <h1 className="brand-title">TES Control & Nómina</h1>
            <p className="brand-subtitle">ATH Ambulancias Tenorio</p>
          </div>
        </div>

        <nav className="nav-tabs">
          <button 
            className={`nav-btn ${activeTab === 'fichaje' ? 'active' : ''}`}
            onClick={() => setActiveTab('fichaje')}
          >
            ⏱️ Fichar / Diario
          </button>
          <button 
            className={`nav-btn ${activeTab === 'calendario' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendario')}
          >
            🗓️ Calendario Anual
          </button>
          <button 
            className={`nav-btn ${activeTab === 'resumen' ? 'active' : ''}`}
            onClick={() => setActiveTab('resumen')}
          >
            📊 Resumen Nómina
          </button>
          <button 
            className={`nav-btn ${activeTab === 'periodos' ? 'active' : ''}`}
            onClick={() => setActiveTab('periodos')}
          >
            📅 Tabla ATH
          </button>
          <button 
            className={`nav-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            ⚙️ Ajustes / Tarifas
          </button>
        </nav>
      </div>
    </header>
  );
}
