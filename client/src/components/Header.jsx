import React from 'react';

export default function Header({ isOnline, activeTab = 'voice', onTabChange }) {
  return (
    <header className="app-header">
      <div className="header-top">
        <div className="logo-group">
          <div className="logo-icon" aria-hidden="true">
            JS
          </div>
          <div className="logo-text">
            <h1>JustSay</h1>
            <span className="tagline">Voice-First AI Ledger • குரல் வழி லெட்ஜர்</span>
          </div>
        </div>

        <div className="server-status" title={isOnline ? 'Backend connected' : 'Connecting to backend...'}>
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
          <span>{isOnline ? 'Live' : 'Connecting'}</span>
        </div>
      </div>

      <nav className="nav-tabs">
        <button
          type="button"
          className={`nav-tab ${activeTab === 'voice' ? 'active' : ''}`}
          onClick={() => onTabChange && onTabChange('voice')}
        >
          <span>🎙️ Voice</span>
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => onTabChange && onTabChange('customers')}
        >
          <span>👥 Customers</span>
        </button>
      </nav>
    </header>
  );
}

