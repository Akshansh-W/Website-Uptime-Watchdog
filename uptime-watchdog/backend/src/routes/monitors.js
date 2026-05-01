const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { getMonitors, createMonitor, deleteMonitor, manualPing } = require('../controllers/monitorController');
const { addClient, removeClient } = require('../sse');

router.use(auth);

router.get('/',           getMonitors);
router.post('/',          createMonitor);
router.delete('/:id',     deleteMonitor);
router.post('/:id/ping',  manualPing);

// SSE — persistent live update stream per user
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type',        'text/event-stream');
  res.setHeader('Cache-Control',       'no-cache');
  res.setHeader('Connection',          'keep-alive');
  res.setHeader('X-Accel-Buffering',   'no');
  res.flushHeaders();

  res.write(`event: connected\ndata: {"userId":${req.user.id}}\n\n`);

  addClient(req.user.id, res);

  // Heartbeat every 25s to keep alive through proxies
  const hb = setInterval(() => res.write(': heartbeat\n\n'), 25000);

  req.on('close', () => {
    clearInterval(hb);
    removeClient(req.user.id, res);
  });
});

module.exports = router;
