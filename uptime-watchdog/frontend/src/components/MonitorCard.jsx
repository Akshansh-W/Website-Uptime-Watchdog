import React, { useState } from 'react';
import './MonitorCard.css';

export default function MonitorCard({ monitor, onRemove, style }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const isUp = monitor.status === 'up';
  const isDown = monitor.status === 'down';
  const isPending = monitor.status === 'pending';

  const statusLabel = isUp ? 'UP' : isDown ? 'DOWN' : 'PENDING';
  const statusClass = isUp ? 'up' : isDown ? 'down' : 'pending';

  return (
    <div className={`monitor-card ${statusClass}`} style={style}>
      <div className="card-header">
        <div className="card-title-row">
          <div className={`status-badge ${statusClass}`}>
            <span className={`badge-dot ${statusClass}`} />
            {statusLabel}
          </div>
          <button
            className="btn-remove"
            onClick={() => setShowConfirm(true)}
            title="Remove monitor"
          >✕</button>
        </div>
        <div className="card-url-block">
          <h3 className="card-label">{monitor.label}</h3>
          <p className="card-url">{monitor.url}</p>
        </div>
      </div>

      <div className="card-metrics">
        <div className="metric">
          <span className="metric-value">
            {monitor.uptime != null ? `${monitor.uptime}%` : '—'}
          </span>
          <span className="metric-label">Uptime</span>
        </div>
        <div className="metric-divider" />
        <div className="metric">
          <span className="metric-value">
            {monitor.responseTime != null ? `${monitor.responseTime}ms` : '—'}
          </span>
          <span className="metric-label">Response</span>
        </div>
        <div className="metric-divider" />
        <div className="metric">
          <span className="metric-value small">{monitor.lastChecked}</span>
          <span className="metric-label">Last check</span>
        </div>
      </div>

      {monitor.history.length > 0 && (
        <div className="history-bar">
          {monitor.history.map((h, i) => (
            <div
              key={i}
              className={`history-tick ${h}`}
              title={h === 'up' ? 'Online' : 'Offline'}
            />
          ))}
        </div>
      )}

      <div className="card-footer">
        <span className="alert-info">
          <span className="alert-icon">✉</span>
          {monitor.alertEmail}
        </span>
        {monitor.alertSlack && (
          <span className="alert-info slack">
            <span className="alert-icon">#</span>
            Slack
          </span>
        )}
      </div>

      {showConfirm && (
        <div className="confirm-overlay">
          <p>Remove this monitor?</p>
          <div className="confirm-actions">
            <button className="btn-confirm-yes" onClick={onRemove}>Remove</button>
            <button className="btn-confirm-no" onClick={() => setShowConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
