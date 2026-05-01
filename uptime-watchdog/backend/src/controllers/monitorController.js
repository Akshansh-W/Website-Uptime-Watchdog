const axios   = require('axios');
const { pool }              = require('../db');
const { scheduleMonitor, unscheduleMonitor } = require('../scheduler');
const { broadcastToUser }   = require('../sse');
const { sendAlert }         = require('../notifications');
const { runApiChecks }      = require('../apiRunner');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getHistory(monitorId) {
  const [rows] = await pool.query(
    'SELECT status FROM ping_history WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT 30',
    [monitorId]
  );
  return rows.map(r => r.status).reverse();
}

async function getUserForMonitor(userId) {
  const [rows] = await pool.query(
    'SELECT id, email, phone, sms_alerts FROM users WHERE id = ?',
    [userId]
  );
  return rows[0] || null;
}

// ── REST API ──────────────────────────────────────────────────────────────────

// GET /api/monitors
async function getMonitors(req, res) {
  try {
    const [monitors] = await pool.query(
      'SELECT * FROM monitors WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    for (const m of monitors) m.history = await getHistory(m.id);
    res.json(monitors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch monitors.' });
  }
}

// POST /api/monitors
async function createMonitor(req, res) {
  const { url, label, alertEmail, alertSlack, interval } = req.body;
  if (!url || !label)
    return res.status(400).json({ error: 'URL and label are required.' });

  try { new URL(url); } catch {
    return res.status(400).json({ error: 'Invalid URL. Must include http:// or https://' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO monitors (user_id, url, label, alert_email, alert_slack, check_interval)
       VALUES (?,?,?,?,?,?)`,
      [req.user.id, url, label, alertEmail || null, alertSlack || null, interval || 30]
    );
    const [rows] = await pool.query('SELECT * FROM monitors WHERE id = ?', [result.insertId]);
    const monitor = { ...rows[0], history: [] };

    scheduleMonitor(monitor);
    pingMonitor(monitor).catch(console.error);

    res.status(201).json(monitor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create monitor.' });
  }
}

// DELETE /api/monitors/:id
async function deleteMonitor(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM monitors WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Monitor not found.' });

    unscheduleMonitor(parseInt(req.params.id));
    await pool.query('DELETE FROM monitors WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete monitor.' });
  }
}

// POST /api/monitors/:id/ping  — manual trigger
async function manualPing(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM monitors WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Monitor not found.' });

    await pingMonitor(rows[0]);

    const [updated] = await pool.query('SELECT * FROM monitors WHERE id = ?', [req.params.id]);
    updated[0].history = await getHistory(req.params.id);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ping failed.' });
  }
}

// ── Core Ping Logic ───────────────────────────────────────────────────────────

async function pingMonitor(monitor) {
  const start = Date.now();
  let newStatus, responseTime;

  try {
    const response = await axios.get(monitor.url, {
      timeout:        10000,
      maxRedirects:   5,
      validateStatus: (s) => s < 500,   // treat 2xx/3xx/4xx as "reachable"
    });
    responseTime = Date.now() - start;
    newStatus    = 'up';
    console.log(`  ✓ ${monitor.url} → ${response.status} in ${responseTime}ms`);
  } catch (err) {
    responseTime = null;
    newStatus    = 'down';
    console.log(`  ✗ ${monitor.url} → DOWN (${err.code || err.message})`);
  }

  const prevStatus = monitor.status;

  // Update monitor row
  await pool.query(
    'UPDATE monitors SET status=?, response_time=?, last_checked=NOW() WHERE id=?',
    [newStatus, responseTime, monitor.id]
  );

  // Record ping history
  await pool.query(
    'INSERT INTO ping_history (monitor_id, status, response_time) VALUES (?,?,?)',
    [monitor.id, newStatus, responseTime]
  );

  // Recalculate uptime from last 100 pings
  const [hist] = await pool.query(
    'SELECT status FROM ping_history WHERE monitor_id=? ORDER BY checked_at DESC LIMIT 100',
    [monitor.id]
  );
  const uptime = hist.length
    ? parseFloat(((hist.filter(h => h.status === 'up').length / hist.length) * 100).toFixed(2))
    : null;
  await pool.query('UPDATE monitors SET uptime=? WHERE id=?', [uptime, monitor.id]);

  const history = await getHistory(monitor.id);

  // ── Broadcast live update via SSE ─────────────────────────────────────────
  broadcastToUser(monitor.user_id, 'monitor_update', {
    id: monitor.id, status: newStatus, response_time: responseTime,
    last_checked: new Date().toISOString(), uptime, history,
  });

  // ── Run API checks attached to this monitor ───────────────────────────────
  try {
    const apiResults = await runApiChecks(monitor.id);
    if (apiResults.length > 0) {
      broadcastToUser(monitor.user_id, 'api_update', { monitorId: monitor.id, apiResults });
    }
  } catch (err) {
    console.error(`  [API] Checks failed for monitor ${monitor.id}:`, err.message);
  }

  // ── Send email/SMS/Slack alerts on state change ───────────────────────────
  const wentDown      = newStatus === 'down' && prevStatus === 'up';
  const wentRecovered = newStatus === 'up'   && prevStatus === 'down';

  if (wentDown || wentRecovered) {
    const user = await getUserForMonitor(monitor.user_id);
    sendAlert({ monitor: { ...monitor, status: newStatus, response_time: responseTime }, user, type: wentDown ? 'down' : 'recovered' })
      .catch(err => console.error('  Alert dispatch error:', err.message));
  }
}

module.exports = { getMonitors, createMonitor, deleteMonitor, manualPing, pingMonitor };
