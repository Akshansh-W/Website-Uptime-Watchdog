const { pool }   = require('../db');
const { runApiChecks, getLatestApiResults } = require('../apiRunner');
const { broadcastToUser } = require('../sse');

// GET /api/monitors/:monitorId/apis
async function getApiChecks(req, res) {
  try {
    const [m] = await pool.query('SELECT id FROM monitors WHERE id=? AND user_id=?', [req.params.monitorId, req.user.id]);
    if (!m.length) return res.status(404).json({ error: 'Monitor not found.' });
    res.json(await getLatestApiResults(req.params.monitorId));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch API checks.' });
  }
}

// POST /api/monitors/:monitorId/apis
async function createApiCheck(req, res) {
  const { label, url, method = 'GET', headers, body, testCases = [] } = req.body;
  if (!label || !url) return res.status(400).json({ error: 'label and url are required.' });
  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL.' }); }

  try {
    const [m] = await pool.query('SELECT id FROM monitors WHERE id=? AND user_id=?', [req.params.monitorId, req.user.id]);
    if (!m.length) return res.status(404).json({ error: 'Monitor not found.' });

    const [result] = await pool.query(
      'INSERT INTO api_checks (monitor_id, label, url, method, headers, body) VALUES (?,?,?,?,?,?)',
      [req.params.monitorId, label, url, method.toUpperCase(),
       headers ? JSON.stringify(headers) : null,
       body    ? JSON.stringify(body)    : null]
    );
    const apiCheckId = result.insertId;

    for (const tc of testCases) {
      if (!tc.description || !tc.assert_type || tc.expected_value === undefined) continue;
      await pool.query(
        'INSERT INTO api_test_cases (api_check_id, description, assert_type, expected_value, json_path) VALUES (?,?,?,?,?)',
        [apiCheckId, tc.description, tc.assert_type, tc.expected_value, tc.json_path || null]
      );
    }

    // Run immediately and broadcast
    const apiResults = await runApiChecks(req.params.monitorId);
    broadcastToUser(req.user.id, 'api_update', { monitorId: parseInt(req.params.monitorId), apiResults });

    const fresh = await getLatestApiResults(req.params.monitorId);
    res.status(201).json(fresh.find(r => r.id === apiCheckId) || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create API check.' });
  }
}

// DELETE /api/monitors/:monitorId/apis/:apiId
async function deleteApiCheck(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT ac.id FROM api_checks ac JOIN monitors m ON m.id=ac.monitor_id WHERE ac.id=? AND m.user_id=?',
      [req.params.apiId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found.' });
    await pool.query('DELETE FROM api_checks WHERE id=?', [req.params.apiId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete.' });
  }
}

// POST /api/monitors/:monitorId/apis/:apiId/run
async function runOne(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT ac.* FROM api_checks ac JOIN monitors m ON m.id=ac.monitor_id WHERE ac.id=? AND m.user_id=?',
      [req.params.apiId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found.' });
    const results = await runApiChecks(req.params.monitorId);
    res.json(results.find(r => r.id === parseInt(req.params.apiId)) || {});
  } catch (err) {
    res.status(500).json({ error: 'Run failed.' });
  }
}

module.exports = { getApiChecks, createApiCheck, deleteApiCheck, runOne };
