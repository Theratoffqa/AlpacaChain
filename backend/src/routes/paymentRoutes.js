const express = require('express');
const Contract = require('../models/Contract');
const PaymentService = require('../services/paymentService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ──────────────────────────────────────────────
// POST /api/payments/clover/create-order
// Create a Clover order for a contract
// ──────────────────────────────────────────────
router.post('/clover/create-order', authenticate, async (req, res, next) => {
  try {
    const { contractId, amountCents, description } = req.body;

    if (!contractId || !amountCents) {
      return res.status(400).json({
        error: 'contractId and amountCents are required'
      });
    }

    // Verify contract exists
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Create order on Clover
    const order = await PaymentService.createCloverOrder({
      contractId,
      amountCents,
      description
    });

    // Update contract with payment info
    contract.paymentStatus = 'processing';
    contract.paymentAmountCents = amountCents;
    contract.paymentProvider = 'clover';
    contract.paymentId = order.orderId;
    await contract.save();

    res.json({
      message: 'Clover order created',
      order
    });

  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────
// POST /api/payments/clover/verify
// Verify a Clover payment was completed
// ──────────────────────────────────────────────
router.post('/clover/verify', authenticate, async (req, res, next) => {
  try {
    const { orderId, contractId } = req.body;

    if (!orderId || !contractId) {
      return res.status(400).json({
        error: 'orderId and contractId are required'
      });
    }

    const verification = await PaymentService.verifyCloverPayment(orderId);

    // Update contract status
    const contract = await Contract.findById(contractId);
    if (contract) {
      contract.paymentStatus = verification.verified ? 'completed' : 'failed';
      if (verification.verified) {
        contract.status = 'paid';
      }
      await contract.save();
    }

    res.json({
      message: verification.verified ? 'Payment verified' : 'Payment not verified',
      verification,
      contractStatus: contract?.status
    });

  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────
// POST /api/payments/fiserv/create-session
// Create a Fiserv online payment session
// ──────────────────────────────────────────────
router.post('/fiserv/create-session', authenticate, async (req, res, next) => {
  try {
    const { contractId, amountCents, currency, customerEmail, returnUrl } = req.body;

    if (!contractId || !amountCents || !customerEmail) {
      return res.status(400).json({
        error: 'contractId, amountCents, and customerEmail are required'
      });
    }

    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const session = await PaymentService.createFiservPaymentSession({
      contractId,
      amountCents,
      currency,
      customerEmail,
      returnUrl: returnUrl || `${req.protocol}://${req.get('host')}/api/payments/fiserv/callback`
    });

    contract.paymentStatus = 'processing';
    contract.paymentAmountCents = amountCents;
    contract.paymentProvider = 'fiserv';
    contract.paymentId = session.transactionId;
    await contract.save();

    res.json({
      message: 'Fiserv payment session created',
      session
    });

  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────
// GET /api/payments/status/:contractId
// Get payment status for a contract
// ──────────────────────────────────────────────
router.get('/status/:contractId', authenticate, async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.contractId);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json({
      contractId: contract._id,
      paymentStatus: contract.paymentStatus,
      paymentProvider: contract.paymentProvider,
      paymentId: contract.paymentId,
      amountCents: contract.paymentAmountCents,
      contractStatus: contract.status
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
