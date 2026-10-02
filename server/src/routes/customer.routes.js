const express = require('express');
const customerController = require('../controllers/customer.controller');
const { validateCreateCustomer } = require('../validators/customer.validator');

const router = express.Router();

router.get('/', customerController.getAllCustomers);
router.get('/resolve', customerController.resolveCustomer);
router.get('/:id', customerController.getCustomerById);
router.post('/', validateCreateCustomer, customerController.createCustomer);

module.exports = router;
