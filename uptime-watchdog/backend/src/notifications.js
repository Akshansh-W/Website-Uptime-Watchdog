/**
 * NOTIFICATIONS
 * Sends alerts via Email (nodemailer/Gmail), SMS (Twilio), Slack webhook.
 * Each channel is independently optional — missing .env vars just skip that channel.
 */

const nodemailer = require('nodemailer');
const { pool }   = require('./db');

// ── Lazy transporter (won't crash if email not configured) ────────────────────
let _transporter = null;
function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return _transporter;
}

// ── Lazy Twilio client ────────────────────────────────────────────────────────
let _twilio = null;
function getTwilio() {
  if (_twilio) return _twilio;
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  _twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return _twilio;
}

// ── Log alert to DB ───────────────────────────────────────────────────────────
async function logAlert(monitorId, type, channel, recipient) {
  try {
    await pool.query(
      'INSERT INTO alert_log (monitor_id, type, channel, recipient) VALUES (?,?,?,?)',
      [monitorId, type, channel, recipient]
    );
  } catch (e) {
    console.error('  Alert log failed:', e.message);
  }
}

// ── Email ─────────────────────────────────────────────────────────────────────
async function sendEmail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.warn('  ⚠️  Email skipped — EMAIL_USER/EMAIL_PASS not set in .env');
    return false;
  }
  try {
    await t.sendMail({ from: `"Watchdog 🐕" <${process.env.EMAIL_USER}>`, to, subject, text, html });
    console.log(`  📬 Email → ${to}`);
    return true;
  } catch (err) {
    console.error(`  ❌ Email failed → ${to}:`, err.message);
    return false;
  }
}

// ── SMS via Twilio ─────────────────────────────────────────────────────────────
async function sendSMS({ to, message }) {
  const client = getTwilio();
  if (!client) {
    console.warn('  ⚠️  SMS skipped — Twilio creds not set in .env');
    return false;
  }
  if (!process.env.TWILIO_FROM_NUMBER) {
    console.warn('  ⚠️  SMS skipped — TWILIO_FROM_NUMBER not set in .env');
    return false;
  }
  try {
    await client.messages.create({ body: message, from: process.env.TWILIO_FROM_NUMBER, to });
    console.log(`  📱 SMS → ${to}`);
    return true;
  } catch (err) {
    console.error(`  ❌ SMS failed → ${to}:`, err.message);
    return false;
  }
}

// ── Slack ─────────────────────────────────────────────────────────────────────
async function sendSlack({ webhookUrl, text }) {
  const axios = require('axios');
  try {
    await axios.post(webhookUrl, { text });
    console.log('  💬 Slack alert sent');
    return true;
  } catch (err) {
    console.error('  ❌ Slack failed:', err.message);
    return false;
  }
}

// ── HTML Alert Email Template ─────────────────────────────────────────────────
function buildAlertHTML({ type, label, url, time, responseTime }) {
  const isDown = type === 'down';
  const color  = isDown ? '#ff3b5c' : '#00ff88';
  const status = isDown ? 'DOWN' : 'RECOVERED';
  const emoji  = isDown ? '🚨' : '✅';
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0f;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;overflow:hidden;">
  <tr><td style="background:${color}18;border-bottom:2px solid ${color};padding:24px 32px;">
    <p style="margin:0;font-size:11px;letter-spacing:0.15em;color:${color};font-family:monospace;text-transform:uppercase;">WATCHDOG ALERT</p>
    <h1 style="margin:8px 0 0;font-size:22px;color:#f0f0f8;">${emoji} ${label} is ${status}</h1>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <table width="100%" style="background:#0a0a0f;border:1px solid #1e1e2e;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:14px 20px;border-bottom:1px solid #1e1e2e;">
        <p style="margin:0;font-size:11px;color:#7070a0;font-family:monospace;text-transform:uppercase;letter-spacing:.1em;">URL</p>
        <p style="margin:4px 0 0;font-size:14px;color:#f0f0f8;font-family:monospace;">${url}</p>
      </td></tr>
      <tr><td style="padding:14px 20px;border-bottom:1px solid #1e1e2e;">
        <p style="margin:0;font-size:11px;color:#7070a0;font-family:monospace;text-transform:uppercase;letter-spacing:.1em;">STATUS</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:${color};font-family:monospace;">${status}</p>
      </td></tr>
      <tr><td style="padding:14px 20px;">
        <p style="margin:0;font-size:11px;color:#7070a0;font-family:monospace;text-transform:uppercase;letter-spacing:.1em;">DETECTED AT</p>
        <p style="margin:4px 0 0;font-size:14px;color:#f0f0f8;font-family:monospace;">${time}</p>
      </td></tr>
      ${responseTime ? `<tr><td style="padding:14px 20px;border-top:1px solid #1e1e2e;">
        <p style="margin:0;font-size:11px;color:#7070a0;font-family:monospace;text-transform:uppercase;letter-spacing:.1em;">RESPONSE TIME</p>
        <p style="margin:4px 0 0;font-size:14px;color:#f0f0f8;font-family:monospace;">${responseTime}ms</p>
      </td></tr>` : ''}
    </table>
    <p style="color:#7070a0;font-size:13px;line-height:1.6;margin:0;">
      ${isDown ? 'Your site is unreachable. Check your server logs and hosting dashboard immediately.' : 'Your site has recovered and is responding normally.'}
    </p>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #1e1e2e;text-align:center;">
    <p style="margin:0;font-size:11px;color:#40405a;font-family:monospace;">Watchdog Uptime Monitor · Automated alert</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

// ── Main dispatcher ───────────────────────────────────────────────────────────
async function sendAlert({ monitor, user, type }) {
  const isDown  = type === 'down';
  const time    = new Date().toUTCString();
  const subject = isDown
    ? `🚨 DOWN: ${monitor.label} is unreachable`
    : `✅ RECOVERED: ${monitor.label} is back online`;

  const plainText = `Watchdog Alert\n\n${monitor.label} is ${isDown ? 'DOWN' : 'RECOVERED'}\nURL: ${monitor.url}\nTime: ${time}\n\n${isDown ? 'Check your server immediately.' : 'Your site is back online.'}`;

  const smsText = isDown
    ? `🚨 Watchdog: ${monitor.label} is DOWN. URL: ${monitor.url}`
    : `✅ Watchdog: ${monitor.label} RECOVERED. URL: ${monitor.url}`;

  const html = buildAlertHTML({ type, label: monitor.label, url: monitor.url, time, responseTime: monitor.response_time });

  const tasks = [];

  // 1. Monitor's alert_email
  if (monitor.alert_email) {
    tasks.push(
      sendEmail({ to: monitor.alert_email, subject, text: plainText, html })
        .then(ok => ok && logAlert(monitor.id, type, 'email', monitor.alert_email))
    );
  }

  // 2. Registered user's email (if different)
  if (user?.email && user.email !== monitor.alert_email) {
    tasks.push(
      sendEmail({ to: user.email, subject, text: plainText, html })
        .then(ok => ok && logAlert(monitor.id, type, 'email', user.email))
    );
  }

  // 3. SMS to user's registered phone (if phone set + sms_alerts enabled)
  if (user?.phone && user?.sms_alerts) {
    tasks.push(
      sendSMS({ to: user.phone, message: smsText })
        .then(ok => ok && logAlert(monitor.id, type, 'sms', user.phone))
    );
  }

  // 4. Slack webhook
  if (monitor.alert_slack) {
    const slackText = isDown
      ? `🚨 *DOWN* — *${monitor.label}*\nURL: ${monitor.url}\nTime: ${time}`
      : `✅ *RECOVERED* — *${monitor.label}*\nURL: ${monitor.url}\nTime: ${time}`;
    tasks.push(
      sendSlack({ webhookUrl: monitor.alert_slack, text: slackText })
        .then(ok => ok && logAlert(monitor.id, type, 'slack', monitor.alert_slack))
    );
  }

  await Promise.allSettled(tasks);
}

// ── Welcome email on signup ───────────────────────────────────────────────────
async function sendWelcomeEmail({ name, email }) {
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0f;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;overflow:hidden;">
  <tr><td style="padding:32px;border-bottom:2px solid #00ff88;">
    <p style="margin:0;font-size:11px;letter-spacing:.15em;color:#00ff88;font-family:monospace;text-transform:uppercase;">WATCHDOG</p>
    <h1 style="margin:8px 0 0;font-size:22px;color:#f0f0f8;">Welcome, ${name}! 👋</h1>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <p style="color:#a0a0c0;font-size:15px;line-height:1.7;margin:0 0 16px;">Your Watchdog account is ready. Add URLs to monitor and we'll notify you instantly if anything goes down.</p>
    <p style="color:#7070a0;font-size:13px;line-height:1.6;margin:0;">Alerts will be sent to this email. You can add a phone number in your profile settings to also receive SMS alerts.</p>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #1e1e2e;text-align:center;">
    <p style="margin:0;font-size:11px;color:#40405a;font-family:monospace;">Watchdog Uptime Monitor</p>
  </td></tr>
</table></td></tr></table></body></html>`;

  await sendEmail({
    to:      email,
    subject: '👋 Welcome to Watchdog — your uptime monitor is ready',
    text:    `Hi ${name},\n\nWelcome to Watchdog! Start adding URLs and we'll alert you instantly when anything goes down.\n\n— Watchdog`,
    html,
  });
}

module.exports = { sendAlert, sendWelcomeEmail, sendEmail, sendSMS };
