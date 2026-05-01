const express = require('express');
const router  = express.Router({ mergeParams: true });
const auth    = require('../middleware/auth');
const { getApiChecks, createApiCheck, deleteApiCheck, runOne } = require('../controllers/apiCheckController');

router.use(auth);

router.get('/',              getApiChecks);
router.post('/',             createApiCheck);
router.delete('/:apiId',     deleteApiCheck);
router.post('/:apiId/run',   runOne);

module.exports = router;
