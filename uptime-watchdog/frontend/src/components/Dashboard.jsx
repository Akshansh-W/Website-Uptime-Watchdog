import React, { useEffect, useState, useRef } from 'react';
import MonitorCard from './MonitorCard.jsx';
import './Dashboard.css';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export default function Dashboard({ monitors, setMonitors, removeMonitor, setView, isGuest = false }) {
  const [loading, setLoading] = useState(!isGuest);
  const [error, setError] = useState('');
  const [lastPing, setLastPing] = useState(null);
  const sseRef = useRef(null);

  const upCount = monitors.filter(m => m.status === 'up').length;
  const downCount = monitors.filter(m => m.status === 'down').length;

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      setError('');
      return;
    }

    const token = localStorage.getItem('wd_token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${BASE_URL}/api/monitors`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMonitors(data);
        } else {
          setError(data.error || 'Failed to load monitors');
        }
      })
      .catch(() => setError('Could not connect to backend'))
      .finally(() => setLoading(false));
  }, [setMonitors, isGuest]);

  useEffect(() => {
    if (isGuest) return undefined;

    const token = localStorage.getItem('wd_token');
    if (!token) return undefined;

    const es = new EventSource(`${BASE_URL}/api/monitors/stream?token=${token}`);
    sseRef.current = es;

    es.addEventListener('connected', () => {
      console.log('[SSE] Connected - live updates active');
    });

    es.addEventListener('monitor_update', (e) => {
      const update = JSON.parse(e.data);
      setLastPing(new Date());

      setMonitors(prev => prev.map(m =>
        m.id === update.id ? { ...m, ...update } : m
      ));
    });

    es.onerror = () => {
      // Browser will auto-reconnect.
    };

    return () => {
      es.close();
    };
  }, [setMonitors, isGuest]);

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
        <p>Loading monitors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-error">
        <p>{error}</p>
        <p className="dash-error-hint">Make sure your backend is running at <code>{BASE_URL}</code></p>
      </div>
    );
  }

  if (monitors.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">O</div>
        <h2>No monitors yet</h2>
        <p>Add your first URL and we'll start watching it immediately.</p>
        <button className="btn-primary" onClick={() => setView('add')}>+ Add your first monitor</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div className="dash-title-block">
          <h1 className="dash-title">Monitor Dashboard</h1>
          {isGuest && <span className="guest-banner">Guest preview data</span>}
          <p className="dash-subtitle">
            {isGuest ? (
              'Explore the dashboard with sample monitors. Nothing is saved to your account.'
            ) : (
              <>
                Live updates via SSE -{' '}
                {lastPing
                  ? `Last ping received ${lastPing.toLocaleTimeString()}`
                  : 'Waiting for first ping...'}
              </>
            )}
          </p>
        </div>
        <div className="dash-stats">
          <div className="stat-item">
            <span className="stat-num green">{upCount}</span>
            <span className="stat-label">Up</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-num red">{downCount}</span>
            <span className="stat-label">Down</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-num">{monitors.length}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
      </div>

      <div className="monitor-grid">
        {monitors.map((monitor, i) => (
          <MonitorCard
            key={monitor.id}
            monitor={monitor}
            onRemove={() => removeMonitor(monitor.id)}
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
