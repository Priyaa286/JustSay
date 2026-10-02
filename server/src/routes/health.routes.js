const express = require('express');
const { sendSuccess } = require('../utils/response');

const router = express.Router();

router.get('/', (req, res) => {
  return sendSuccess(res, 'JustSay backend is running');
});

module.exports = router;
