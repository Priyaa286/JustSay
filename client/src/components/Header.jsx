import React from 'react';

export default function Header({ isOnline }) {
  return (
    <header className="app-header">
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
    </header>
  );
}
