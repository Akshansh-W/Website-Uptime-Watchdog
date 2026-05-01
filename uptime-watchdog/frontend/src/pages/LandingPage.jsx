import React, { useEffect, useState } from 'react';
import './LandingPage.css';

const FEATURES = [
  {
    icon: '⚡',
    title: '30-Minute Pings',
    desc: 'Your sites are checked automatically every 30 minutes, around the clock, 365 days a year.',
  },
  {
    icon: '📬',
    title: 'Instant Alerts',
    desc: 'The moment downtime is detected, you receive an email or Slack notification — no delays.',
  },
  {
    icon: '📈',
    title: 'Uptime History',
    desc: 'Track 30-day uptime percentages and response time trends for every monitored URL.',
  },
  {
    icon: '🔁',
    title: 'Recovery Alerts',
    desc: 'Know the instant your site comes back online. Full outage lifecycle — down and recovery.',
  },
  {
    icon: '#',
    title: 'Slack Integration',
    desc: 'Post alerts directly to any Slack channel via webhook. Keep your whole team informed.',
  },
  {
    icon: '🌐',
    title: 'Multi-Site Support',
    desc: 'Monitor unlimited URLs from one dashboard — staging, production, APIs, third-party services.',
  },
];

const STATS = [
  { value: '99.9%', label: 'Platform uptime' },
  { value: '<2s', label: 'Alert delivery' },
  { value: '10K+', label: 'Sites monitored' },
  { value: '24/7', label: 'Always watching' },
];

const TESTIMONIALS = [
  {
    quote: "Watchdog caught our payment API going down at 3am. We fixed it before a single customer noticed.",
    name: 'Priya S.',
    role: 'CTO, FinTech startup',
  },
  {
    quote: "Simple, no-nonsense uptime monitoring. Set it up in 2 minutes and forgot about it — in a good way.",
    name: 'Marcus L.',
    role: 'Solo founder',
  },
  {
    quote: "We replaced a $200/month tool with Watchdog and honestly get better alerts now.",
    name: 'Anika R.',
    role: 'DevOps Lead',
  },
];

const FAKE_MONITORS = [
  { label: 'api.myapp.com', status: 'up', time: '98ms' },
  { label: 'dashboard.myapp.com', status: 'up', time: '142ms' },
  { label: 'staging.myapp.com', status: 'down', time: '—' },
  { label: 'payments.myapp.com', status: 'up', time: '61ms' },
];

export default function LandingPage({ onLogin, onSignup, onGuest }) {
  const [visibleSections, setVisibleSections] = useState(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) setVisibleSections(s => new Set([...s, e.target.dataset.section]));
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('[data-section]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing">
      {/* ── NAV ── */}
      <nav className="land-nav">
        <div className="land-nav-inner">
          <div className="land-brand">
            <span className="land-brand-dot" />
            WATCHDOG
          </div>
          <div className="land-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="land-nav-actions">
            <button className="btn-ghost" onClick={onLogin}>Log in</button>
            <button className="btn-ghost" onClick={onGuest}>Guest demo</button>
            <button className="btn-solid" onClick={onSignup}>Sign up free</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-grid-bg" />
        <div className="hero-glow" />
        <div className="hero-inner">
          <div className="hero-badge">
            <span className="badge-pulse" />
            Live monitoring · No credit card required
          </div>
          <h1 className="hero-headline">
            Know when your<br />
            <span className="hero-highlight">site goes down</span><br />
            before users do.
          </h1>
          <p className="hero-sub">
            Watchdog pings your URLs every 30 minutes and sends instant alerts via email or Slack the moment something breaks.
          </p>
          <div className="hero-ctas">
            <button className="cta-primary" onClick={onSignup}>
              Start tracking sites →
            </button>
            <button className="cta-secondary" onClick={onLogin}>
              I already have an account
            </button>
            <button className="cta-secondary" onClick={onGuest}>
              Preview as guest
            </button>
          </div>
          <p className="hero-note">Free forever for up to 3 monitors. No card needed.</p>

          {/* Fake dashboard preview */}
          <div className="hero-preview">
            <div className="preview-bar">
              <span className="preview-dot red" /><span className="preview-dot yellow" /><span className="preview-dot green" />
              <span className="preview-title">watchdog.app/dashboard</span>
            </div>
            <div className="preview-body">
              {FAKE_MONITORS.map((m, i) => (
                <div className="preview-row" key={i} style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
                  <div className={`preview-status-dot ${m.status}`} />
                  <span className="preview-label">{m.label}</span>
                  <span className="preview-spacer" />
                  <span className={`preview-badge ${m.status}`}>{m.status.toUpperCase()}</span>
                  <span className="preview-time">{m.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="stats-band" data-section="stats">
        <div className={`stats-inner reveal ${visibleSections.has('stats') ? 'visible' : ''}`}>
          {STATS.map((s, i) => (
            <div className="stat-block" key={i}>
              <span className="stat-val">{s.value}</span>
              <span className="stat-lbl">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section" id="features" data-section="features">
        <div className={`section-inner reveal ${visibleSections.has('features') ? 'visible' : ''}`}>
          <div className="section-eyebrow">What you get</div>
          <h2 className="section-title">Everything you need.<br />Nothing you don't.</h2>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div className="feature-card" key={i} style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-section" id="how" data-section="how">
        <div className={`section-inner reveal ${visibleSections.has('how') ? 'visible' : ''}`}>
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-title">Up and running in 2 minutes.</h2>
          <div className="steps">
            {[
              { n: '01', title: 'Add your URL', desc: 'Paste any URL — your app, API, or third-party dependency.' },
              { n: '02', title: 'Choose your alert', desc: 'Pick email, Slack, or both. Set your check interval.' },
              { n: '03', title: 'Relax', desc: 'Watchdog runs silently in the background. You only hear from us when something breaks.' },
            ].map((s, i) => (
              <div className="step" key={i}>
                <div className="step-num">{s.n}</div>
                <div className="step-content">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
                {i < 2 && <div className="step-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="testimonials-section" data-section="testimonials">
        <div className={`section-inner reveal ${visibleSections.has('testimonials') ? 'visible' : ''}`}>
          <div className="section-eyebrow">What people say</div>
          <div className="testi-grid">
            {TESTIMONIALS.map((t, i) => (
              <div className="testi-card" key={i}>
                <p className="testi-quote">"{t.quote}"</p>
                <div className="testi-author">
                  <span className="testi-name">{t.name}</span>
                  <span className="testi-role">{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="pricing-section" id="pricing" data-section="pricing">
        <div className={`section-inner reveal ${visibleSections.has('pricing') ? 'visible' : ''}`}>
          <div className="section-eyebrow">Simple pricing</div>
          <h2 className="section-title">Start free. Scale when ready.</h2>
          <div className="pricing-grid">
            <div className="plan-card">
              <div className="plan-name">Starter</div>
              <div className="plan-price">Free <span>forever</span></div>
              <ul className="plan-features">
                <li>✓ Up to 3 monitors</li>
                <li>✓ 30-minute checks</li>
                <li>✓ Email alerts</li>
                <li>✓ 7-day history</li>
              </ul>
              <button className="plan-btn outline" onClick={onSignup}>Get started</button>
            </div>
            <div className="plan-card featured">
              <div className="plan-badge">Most Popular</div>
              <div className="plan-name">Pro</div>
              <div className="plan-price">$9 <span>/ month</span></div>
              <ul className="plan-features">
                <li>✓ Unlimited monitors</li>
                <li>✓ 5-minute checks</li>
                <li>✓ Email + Slack alerts</li>
                <li>✓ 90-day history</li>
                <li>✓ Public status page</li>
              </ul>
              <button className="plan-btn solid" onClick={onSignup}>Start free trial</button>
            </div>
            <div className="plan-card">
              <div className="plan-name">Team</div>
              <div className="plan-price">$29 <span>/ month</span></div>
              <ul className="plan-features">
                <li>✓ Everything in Pro</li>
                <li>✓ 5 team members</li>
                <li>✓ SMS alerts</li>
                <li>✓ API access</li>
                <li>✓ Priority support</li>
              </ul>
              <button className="plan-btn outline" onClick={onSignup}>Start free trial</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="cta-band" data-section="cta">
        <div className={`cta-band-inner reveal ${visibleSections.has('cta') ? 'visible' : ''}`}>
          <h2>Your site is either up or down.<br />Don't be the last to know.</h2>
          <button className="cta-primary large" onClick={onSignup}>Start tracking for free →</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="land-footer">
        <div className="land-footer-inner">
          <div className="land-brand small">
            <span className="land-brand-dot" />
            WATCHDOG
          </div>
          <p className="footer-copy">© 2026 Watchdog. Built for developers who care about uptime.</p>
        </div>
      </footer>
    </div>
  );
}
