import React from 'react';
import './Navbar.css';

export default function Navbar({ view, setView, monitors, onLogout, isGuest }) {
  const downCount = monitors.filter(m => m.status === 'down').length;
  const allUp = downCount === 0 && monitors.length > 0;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div className={`brand-dot ${allUp ? 'green' : downCount > 0 ? 'red' : 'grey'}`} />
          <span className="brand-name">WATCHDOG</span>
        </div>

        <div className="navbar-center">
          {monitors.length > 0 && (
            <div className="status-pill">
              {downCount > 0 ? (
                <><span className="pill-dot red" />{downCount} site{downCount > 1 ? 's' : ''} down</>
              ) : (
                <><span className="pill-dot green" />All systems operational</>
              )}
            </div>
          )}
        </div>

        <div className="navbar-actions">
          {isGuest && <span className="guest-pill">Guest</span>}
          <span className="monitor-count">{monitors.length} monitor{monitors.length !== 1 ? 's' : ''}</span>
          <button
            className={`btn-add ${view === 'add' ? 'active' : ''}`}
            onClick={() => setView(view === 'add' ? 'dashboard' : 'add')}
          >
            {view === 'add' ? '← Back' : '+ Add Monitor'}
          </button>
          {onLogout && (
            <button className="btn-logout" onClick={onLogout} title="Log out">⏻</button>
          )}
        </div>
      </div>
    </nav>
  );
}
