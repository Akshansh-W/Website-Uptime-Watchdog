require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const { initDB }         = require('./src/db');
const { initScheduler, getActiveCount } = require('./src/scheduler');
const { getClientCount } = require('./src/sse');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/auth',                     require('./src/routes/auth'));
app.use('/api/monitors',                 require('./src/routes/monitors'));
app.use('/api/monitors/:monitorId/apis', require('./src/routes/apiChecks'));

app.get('/health', (_req, res) => res.json({
  status: 'ok', time: new Date(),
  activeMonitors: getActiveCount(),
  sseClients: getClientCount(),
}));

async function start() {
  try {
    await initDB();
    await initScheduler();
    app.listen(PORT, () => {
      console.log(`\n🐕  Watchdog backend  →  http://localhost:${PORT}`);
      console.log('    POST  /api/auth/signup');
      console.log('    POST  /api/auth/login');
      console.log('    PUT   /api/auth/profile      — update phone + sms_alerts');
      console.log('    GET   /api/monitors');
      console.log('    POST  /api/monitors');
      console.log('    GET   /api/monitors/stream   — live SSE feed');
      console.log('    POST  /api/monitors/:id/ping — manual ping');
      console.log('    GET   /api/monitors/:id/apis');
      console.log('    POST  /api/monitors/:id/apis\n');
    });
  } catch (err) {
    console.error('\n❌  Startup failed:', err.message);
    console.error('→   Check .env — DB_HOST, DB_USER, DB_PASSWORD, DB_NAME\n');
    process.exit(1);
  }
}

start();
