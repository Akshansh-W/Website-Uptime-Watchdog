import React, { useState } from 'react';
import './AuthPage.css';
import { authAPI } from '../api.js';

export default function AuthPage({ mode, onSuccess, onSwitch, onBack, onGuest }) {
  const isLogin = mode === 'login';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(err => ({ ...err, [field]: null }));
    setServerError('');
  };

  const validate = () => {
    const e = {};
    if (!isLogin && !form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'At least 6 characters';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setLoading(true);
    setServerError('');

    try {
      let data;
      if (isLogin) {
        data = await authAPI.login(form.email, form.password);
      } else {
        data = await authAPI.signup(form.name, form.email, form.password);
      }

      // Save token + user to localStorage
      localStorage.setItem('wd_token', data.token);
      localStorage.setItem('wd_user', JSON.stringify(data.user));

      onSuccess(data.user);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div className="auth-page">
      <div className="auth-grid-bg" />
      <div className="auth-glow" />

      <button className="auth-back" onClick={onBack}>← Back to home</button>

      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-dot" />
          WATCHDOG
        </div>

        <h1 className="auth-title">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="auth-subtitle">
          {isLogin
            ? 'Log in to your monitoring dashboard.'
            : 'Start monitoring your sites for free. No credit card needed.'}
        </p>

        {serverError && (
          <div className="server-error">{serverError}</div>
        )}

        <div className="auth-form">
          {!isLogin && (
            <div className={`auth-field ${errors.name ? 'has-error' : ''}`}>
              <label>Full name</label>
              <input
                type="text"
                placeholder="Alex Johnson"
                value={form.name}
                onChange={set('name')}
                onKeyDown={handleKey}
                autoFocus={!isLogin}
              />
              {errors.name && <span className="auth-field-error">{errors.name}</span>}
            </div>
          )}

          <div className={`auth-field ${errors.email ? 'has-error' : ''}`}>
            <label>Email address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              onKeyDown={handleKey}
              autoFocus={isLogin}
            />
            {errors.email && <span className="auth-field-error">{errors.email}</span>}
          </div>

          <div className={`auth-field ${errors.password ? 'has-error' : ''}`}>
            <label>
              Password
              {isLogin && <button className="forgot-link" tabIndex={-1}>Forgot password?</button>}
            </label>
            <input
              type="password"
              placeholder={isLogin ? '••••••••' : 'Min. 6 characters'}
              value={form.password}
              onChange={set('password')}
              onKeyDown={handleKey}
            />
            {errors.password && <span className="auth-field-error">{errors.password}</span>}
          </div>

          <button
            className={`auth-submit ${loading ? 'loading' : ''}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : isLogin ? 'Log in →' : 'Create account →'}
          </button>
        </div>

        <div className="auth-divider"><span>or</span></div>

        <button className="auth-guest" onClick={onGuest}>
          Continue as guest
        </button>

        <div className="auth-switch">
          {isLogin ? (
            <>Don't have an account?{' '}
              <button onClick={onSwitch}>Sign up free</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={onSwitch}>Log in</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
