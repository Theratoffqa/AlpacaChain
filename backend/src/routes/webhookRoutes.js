const express = require('express');
const Contract = require('../models/Contract');

const router = express.Router();

/**
 * Webhook routes receive raw body for signature verification.
 * express.json() is NOT applied to these routes (handled in server.js).
 */

// Parse raw body for webhook signature verification
router.use(express.raw({ type: 'application/json' }));

// ──────────────────────────────────────────────
// POST /api/webhooks/clover
// Receive Clover payment confirmation webhooks
// 
// Clover sends webhooks for various events:
// - Payment created/updated/deleted
// - Order updated
// - Refunds
// ──────────────────────────────────────────────
router.post('/clover', async (req, res) => {
  try {
    // Parse the raw body
    const payload = JSON.parse(req.body.toString());
    
    console.log('[WEBHOOK] Clover event received:', JSON.stringify(payload));

    // Clover webhook payload structure:
    // { merchants: { MERCHANT_ID: [{ type: "UPDATE", objectId: "ORDER_ID", ts: timestamp }] } }
    const merchantId = process.env.CLOVER_MERCHANT_ID;
    const events = payload.merchants?.[merchantId] || [];

    for (const event of events) {
      if (event.type === 'UPDATE' || event.type === 'CREATE') {
        // Find contract by payment/order ID
        const contract = await Contract.findOne({ paymentId: event.objectId });
        
        if (contract) {
          // Clover confirmed the payment
          contract.paymentStatus = 'completed';
          contract.status = 'paid';
          await contract.save();
          console.log(`[WEBHOOK] Contract ${contract._id} marked as paid via Clover`);
        }
      }
    }

    // Always respond 200 to acknowledge receipt
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[WEBHOOK] Clover webhook error:', error.message);
    // Still respond 200 to prevent retries on parse errors
    res.status(200).json({ received: true, error: error.message });
  }
});

// ──────────────────────────────────────────────
// POST /api/webhooks/fiserv
// Receive Fiserv payment confirmation webhooks
// 
// Fiserv sends transaction status updates:
// - APPROVED, DECLINED, ERROR, etc.
// ──────────────────────────────────────────────
router.post('/fiserv', async (req, res) => {
  try {
    const payload = JSON.parse(req.body.toString());

    console.log('[WEBHOOK] Fiserv event received:', JSON.stringify(payload));

    const transactionId = payload.ipgTransactionId || payload.merchantTransactionId;
    const status = payload.transactionStatus;

    if (transactionId) {
      const contract = await Contract.findOne({ paymentId: transactionId });

      if (contract) {
        switch (status) {
          case 'APPROVED':
          case 'CAPTURED':
            contract.paymentStatus = 'completed';
            contract.status = 'paid';
            break;
          case 'DECLINED':
          case 'FAILED':
            contract.paymentStatus = 'failed';
            break;
          case 'VOIDED':
            contract.paymentStatus = 'refunded';
            break;
          default:
            contract.paymentStatus = 'processing';
        }

        await contract.save();
        console.log(`[WEBHOOK] Contract ${contract._id} updated: ${contract.paymentStatus}`);
      }
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[WEBHOOK] Fiserv webhook error:', error.message);
    res.status(200).json({ received: true, error: error.message });
  }
});

module.exports = router;
