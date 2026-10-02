const express = require('express');
const ledgerController = require('../controllers/ledger.controller');
const { validatePrepareTransaction } = require('../validators/ledger.validator');

const router = express.Router();

router.get('/', ledgerController.getAllConfirmedLedger);
router.post('/prepare', validatePrepareTransaction, ledgerController.prepareTransaction);
router.post('/:transactionId/confirm', ledgerController.confirmTransaction);
router.post('/:transactionId/cancel', ledgerController.cancelTransaction);
router.get('/:customerId', ledgerController.getCustomerLedger);

module.exports = router;
