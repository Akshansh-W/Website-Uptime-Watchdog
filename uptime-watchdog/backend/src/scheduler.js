const { pool } = require('./db');

// Map of monitorId → timer handle
const activeTimers = new Map();

function toMs(minutes) { return minutes * 60 * 1000; }

function scheduleMonitor(monitor) {
  // Clear any existing timer for this monitor
  if (activeTimers.has(monitor.id)) clearInterval(activeTimers.get(monitor.id));

  const ms = toMs(monitor.check_interval || 30);
  console.log(`[SCHEDULER] ⏱  "${monitor.label}" every ${monitor.check_interval || 30} min`);

  const timer = setInterval(async () => {
    try {
      // Re-fetch from DB so we have the latest status for state-change detection
      const [rows] = await pool.query('SELECT * FROM monitors WHERE id = ?', [monitor.id]);
      if (!rows.length) { unscheduleMonitor(monitor.id); return; }

      // Lazy require to avoid circular dependency at startup
      const { pingMonitor } = require('./controllers/monitorController');
      await pingMonitor(rows[0]);
    } catch (err) {
      console.error(`[SCHEDULER] Ping error for monitor ${monitor.id}:`, err.message);
    }
  }, ms);

  activeTimers.set(monitor.id, timer);
}

function unscheduleMonitor(monitorId) {
  if (!activeTimers.has(monitorId)) return;
  clearInterval(activeTimers.get(monitorId));
  activeTimers.delete(monitorId);
  console.log(`[SCHEDULER] 🛑 Stopped timer for monitor ${monitorId}`);
}

async function initScheduler() {
  const [monitors] = await pool.query('SELECT * FROM monitors');
  console.log(`[SCHEDULER] 🚀 Scheduling ${monitors.length} monitor(s)...`);

  const { pingMonitor } = require('./controllers/monitorController');
  for (const m of monitors) {
    scheduleMonitor(m);
    // Ping immediately on boot so dashboards show fresh data
    pingMonitor(m).catch(err => console.error(`[SCHEDULER] Boot ping failed for ${m.url}:`, err.message));
  }
  console.log('[SCHEDULER] ✅ All monitors running\n');
}

function getActiveCount() { return activeTimers.size; }

module.exports = { scheduleMonitor, unscheduleMonitor, initScheduler, getActiveCount };
