const express = require('express');
const extractionController = require('../controllers/extraction.controller');
const { validateExtractRequest } = require('../validators/extraction.validator');

const router = express.Router();

router.post('/', validateExtractRequest, extractionController.extract);

module.exports = router;
