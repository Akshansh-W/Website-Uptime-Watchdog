import React, { useState } from 'react';
import './AddMonitor.css';
import { monitorsAPI } from '../api.js';
import { createGuestMonitor } from '../guestData.js';

export default function AddMonitor({ onAdd, onCancel, isGuest = false }) {
  const [form, setForm] = useState({
    url: '', label: '', alertEmail: '', alertSlack: '', interval: '30',
  });
  const [errors, setErrors]       = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading]     = useState(false);
  const [alertMethod, setAlertMethod] = useState('email');

  const validate = () => {
    const e = {};
    if (!form.url) e.url = 'URL is required';
    else if (!/^https?:\/\/.+/.test(form.url)) e.url = 'Must start with http:// or https://';
    if (!form.label) e.label = 'Label is required';
    if (alertMethod === 'email' && !form.alertEmail) e.alertEmail = 'Email is required';
    if (alertMethod === 'email' && form.alertEmail && !/\S+@\S+\.\S+/.test(form.alertEmail))
      e.alertEmail = 'Invalid email';
    if (alertMethod === 'slack' && !form.alertSlack) e.alertSlack = 'Slack webhook URL is required';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setLoading(true);
    setServerError('');

    try {
      if (isGuest) {
        onAdd(createGuestMonitor({
          url: form.url,
          label: form.label,
          alertEmail: alertMethod === 'email' ? form.alertEmail : null,
          alertSlack: alertMethod === 'slack' ? form.alertSlack : null,
        }));
        return;
      }

      const monitor = await monitorsAPI.create({
        url:        form.url,
        label:      form.label,
        alertEmail: alertMethod === 'email' ? form.alertEmail : null,
        alertSlack: alertMethod === 'slack' ? form.alertSlack : null,
        interval:   parseInt(form.interval),
      });
      onAdd(monitor);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(err => ({ ...err, [field]: null }));
    setServerError('');
  };

  return (
    <div className="add-monitor">
      <div className="form-header">
        <h1 className="form-title">Add Monitor</h1>
        <p className="form-subtitle">
          We'll ping your URL on your chosen schedule and alert you the moment it goes down.
        </p>
      </div>

      <div className="form-card">
        {serverError && (
          <div className="form-server-error">{serverError}</div>
        )}

        <section className="form-section">
          <h2 className="section-label">01 — Target URL</h2>
          <div className={`field ${errors.url ? 'has-error' : ''}`}>
            <label>URL to monitor</label>
            <input type="text" placeholder="https://yoursite.com" value={form.url} onChange={set('url')} />
            {errors.url && <span className="field-error">{errors.url}</span>}
          </div>
          <div className={`field ${errors.label ? 'has-error' : ''}`}>
            <label>Display name</label>
            <input type="text" placeholder="My Production App" value={form.label} onChange={set('label')} />
            {errors.label && <span className="field-error">{errors.label}</span>}
          </div>
        </section>

        <div className="section-divider" />

        <section className="form-section">
          <h2 className="section-label">02 — Check Interval</h2>
          <div className="interval-picker">
            {['15', '30', '60'].map(val => (
              <button
                key={val}
                className={`interval-btn ${form.interval === val ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, interval: val }))}
              >
                Every {val} min
              </button>
            ))}
          </div>
        </section>

        <div className="section-divider" />

        <section className="form-section">
          <h2 className="section-label">03 — Alert Method</h2>
          <div className="alert-method-tabs">
            <button className={`method-tab ${alertMethod === 'email' ? 'active' : ''}`} onClick={() => setAlertMethod('email')}>✉ Email</button>
            <button className={`method-tab ${alertMethod === 'slack' ? 'active' : ''}`} onClick={() => setAlertMethod('slack')}># Slack</button>
          </div>
          {alertMethod === 'email' && (
            <div className={`field ${errors.alertEmail ? 'has-error' : ''}`}>
              <label>Email address</label>
              <input type="email" placeholder="alerts@yourcompany.com" value={form.alertEmail} onChange={set('alertEmail')} />
              {errors.alertEmail && <span className="field-error">{errors.alertEmail}</span>}
            </div>
          )}
          {alertMethod === 'slack' && (
            <div className={`field ${errors.alertSlack ? 'has-error' : ''}`}>
              <label>Slack Webhook URL</label>
              <input type="text" placeholder="https://hooks.slack.com/services/..." value={form.alertSlack} onChange={set('alertSlack')} />
              {errors.alertSlack && <span className="field-error">{errors.alertSlack}</span>}
            </div>
          )}
        </section>

        <div className="form-actions">
          <button className="btn-cancel" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="btn-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="form-spinner" /> : 'Start Monitoring →'}
          </button>
        </div>
      </div>
    </div>
  );
}
