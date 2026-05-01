import React, { useState, useEffect } from 'react';
import { monitorsAPI } from './api.js';
import './App.css';
import Dashboard from './components/Dashboard.jsx';
import AddMonitor from './components/AddMonitor.jsx';
import Navbar from './components/Navbar.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import { GUEST_MONITORS, GUEST_USER } from './guestData.js';

export default function App() {
  const [screen, setScreen] = useState('landing');
  const [view, setView] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const isGuest = user?.isGuest === true;

  // Restore session on load
  useEffect(() => {
    const token = localStorage.getItem('wd_token');
    const savedUser = localStorage.getItem('wd_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setScreen('app');
      return;
    }

    if (localStorage.getItem('wd_guest') === 'true') {
      setUser(GUEST_USER);
      setMonitors(GUEST_MONITORS);
      setScreen('app');
    }
  }, []);

  const handleAuthSuccess = (userData) => {
    localStorage.removeItem('wd_guest');
    setUser(userData);
    setScreen('app');
  };

  const handleLogout = () => {
    localStorage.removeItem('wd_token');
    localStorage.removeItem('wd_user');
    localStorage.removeItem('wd_guest');
    setUser(null);
    setMonitors([]);
    setScreen('landing');
  };

  const handleGuestLogin = () => {
    localStorage.removeItem('wd_token');
    localStorage.removeItem('wd_user');
    localStorage.setItem('wd_guest', 'true');
    setUser(GUEST_USER);
    setMonitors(GUEST_MONITORS);
    setView('dashboard');
    setScreen('app');
  };

  const addMonitor = (monitor) => {
    setMonitors(prev => [...prev, monitor]);
    setView('dashboard');
  };

  const removeMonitor = async (id) => {
    if (!isGuest) {
      try { await monitorsAPI.delete(id); } catch (e) { console.error(e); }
    }
    setMonitors(prev => prev.filter(m => m.id !== id));
  };

  if (screen === 'landing') {
    return (
      <div className="app">
        <div className="noise-overlay" />
        <LandingPage
          onLogin={() => setScreen('login')}
          onSignup={() => setScreen('signup')}
          onGuest={handleGuestLogin}
        />
      </div>
    );
  }

  if (screen === 'login' || screen === 'signup') {
    return (
      <div className="app">
        <div className="noise-overlay" />
        <AuthPage
          mode={screen}
          onSuccess={handleAuthSuccess}
          onSwitch={() => setScreen(screen === 'login' ? 'signup' : 'login')}
          onBack={() => setScreen('landing')}
          onGuest={handleGuestLogin}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="noise-overlay" />
      <Navbar
        view={view}
        setView={setView}
        monitors={monitors}
        user={user}
        isGuest={isGuest}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {view === 'dashboard' ? (
          <Dashboard monitors={monitors} setMonitors={setMonitors} removeMonitor={removeMonitor} setView={setView} isGuest={isGuest} />
        ) : (
          <AddMonitor onAdd={addMonitor} onCancel={() => setView('dashboard')} isGuest={isGuest} />
        )}
      </main>
    </div>
  );
}
