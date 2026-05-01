const axios  = require('axios');
const { pool } = require('./db');

function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function runAssertion(tc, { statusCode, body, responseTime }) {
  try {
    switch (tc.assert_type) {
      case 'status_code': {
        const pass = statusCode === parseInt(tc.expected_value);
        return { pass, message: pass ? `Status ${statusCode} ✓` : `Expected ${tc.expected_value}, got ${statusCode}` };
      }
      case 'body_contains': {
        const str  = typeof body === 'string' ? body : JSON.stringify(body);
        const pass = str.includes(tc.expected_value);
        return { pass, message: pass ? `Body contains "${tc.expected_value}" ✓` : `Body missing "${tc.expected_value}"` };
      }
      case 'body_json_field': {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        const actual = resolvePath(parsed, tc.json_path);
        const pass   = String(actual) === String(tc.expected_value);
        return { pass, message: pass ? `${tc.json_path} === "${tc.expected_value}" ✓` : `${tc.json_path} is "${actual}", expected "${tc.expected_value}"` };
      }
      case 'response_time_lt': {
        const pass = responseTime < parseInt(tc.expected_value);
        return { pass, message: pass ? `${responseTime}ms < ${tc.expected_value}ms ✓` : `${responseTime}ms exceeded ${tc.expected_value}ms limit` };
      }
      default:
        return { pass: false, message: `Unknown type: ${tc.assert_type}` };
    }
  } catch (err) {
    return { pass: false, message: `Error: ${err.message}` };
  }
}

async function runApiChecks(monitorId) {
  const [checks] = await pool.query('SELECT * FROM api_checks WHERE monitor_id = ?', [monitorId]);
  if (!checks.length) return [];

  const summary = [];
  for (const check of checks) {
    const start = Date.now();
    try {
      const headers = check.headers ? (typeof check.headers === 'string' ? JSON.parse(check.headers) : check.headers) : {};
      const body    = check.body    ? (typeof check.body    === 'string' ? JSON.parse(check.body)    : check.body)    : undefined;

      const response = await axios({
        method:         check.method.toLowerCase(),
        url:            check.url,
        headers:        { 'Content-Type': 'application/json', ...headers },
        data:           body,
        timeout:        10000,
        validateStatus: () => true,
      });

      const responseTime = Date.now() - start;
      const statusCode   = response.status;
      const responseBody = typeof response.data === 'object' ? JSON.stringify(response.data) : String(response.data);

      const [testCases] = await pool.query('SELECT * FROM api_test_cases WHERE api_check_id = ?', [check.id]);
      const testResults = testCases.map(tc => ({
        id: tc.id, description: tc.description, assert_type: tc.assert_type, expected: tc.expected_value,
        ...runAssertion(tc, { statusCode, body: response.data, responseTime }),
      }));

      const overallStatus = testResults.length > 0 ? (testResults.every(r => r.pass) ? 'pass' : 'fail') : 'pass';

      await pool.query(
        `INSERT INTO api_check_results (api_check_id, monitor_id, status, status_code, response_time, response_body, test_results)
         VALUES (?,?,?,?,?,?,?)`,
        [check.id, monitorId, overallStatus, statusCode, responseTime, responseBody.substring(0, 2000), JSON.stringify(testResults)]
      );

      summary.push({ id: check.id, label: check.label, url: check.url, method: check.method, status: overallStatus, statusCode, responseTime, testResults });
      console.log(`  [API] ${check.method} ${check.url} → ${overallStatus.toUpperCase()} (${statusCode}, ${responseTime}ms)`);

    } catch (err) {
      await pool.query(
        `INSERT INTO api_check_results (api_check_id, monitor_id, status, error_msg) VALUES (?,?,?,?)`,
        [check.id, monitorId, 'error', err.message]
      );
      summary.push({ id: check.id, label: check.label, url: check.url, method: check.method, status: 'error', errorMsg: err.message, testResults: [] });
      console.log(`  [API] ${check.method} ${check.url} → ERROR: ${err.message}`);
    }
  }
  return summary;
}

async function getLatestApiResults(monitorId) {
  const [checks] = await pool.query('SELECT * FROM api_checks WHERE monitor_id = ?', [monitorId]);
  const results  = [];
  for (const check of checks) {
    const [rows] = await pool.query(
      'SELECT * FROM api_check_results WHERE api_check_id = ? ORDER BY checked_at DESC LIMIT 1',
      [check.id]
    );
    const [testCases] = await pool.query('SELECT * FROM api_test_cases WHERE api_check_id = ?', [check.id]);
    results.push({
      ...check,
      headers:    check.headers ? (typeof check.headers === 'string' ? JSON.parse(check.headers) : check.headers) : null,
      body:       check.body    ? (typeof check.body    === 'string' ? JSON.parse(check.body)    : check.body)    : null,
      testCases,
      lastResult: rows[0] ? { ...rows[0], test_results: rows[0].test_results ? JSON.parse(rows[0].test_results) : [] } : null,
    });
  }
  return results;
}

module.exports = { runApiChecks, getLatestApiResults };
