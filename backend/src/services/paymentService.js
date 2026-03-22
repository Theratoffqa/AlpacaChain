const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * PaymentService - Handles Clover POS and Fiserv online payments.
 * 
 * Architecture Decision:
 * - Clover payments are initiated FROM the Android device using Clover SDK intents.
 *   The backend only creates/tracks orders and receives payment confirmations.
 * - Fiserv payments are initiated FROM the backend (server-to-server) for online checkout.
 * 
 * This service is the backend-side coordinator for both flows.
 */
class PaymentService {

  // ──────────────────────────────────────────────
  //  CLOVER POS PAYMENT FLOW
  // ──────────────────────────────────────────────

  /**
   * Create a Clover order for a contract payment.
   * This order is then used by the Android app to initiate payment via Clover SDK.
   * 
   * Flow: Backend creates order → Returns orderId → Android uses orderId with Clover Intent
   * 
   * @param {Object} params
   * @param {string} params.contractId - Contract being paid for
   * @param {number} params.amountCents - Amount in cents
   * @param {string} params.description - Order description
   * @returns {Promise<Object>} - Clover order object
   */
  static async createCloverOrder({ contractId, amountCents, description }) {
    const merchantId = process.env.CLOVER_MERCHANT_ID;
    const apiKey = process.env.CLOVER_API_KEY;
    const baseUrl = process.env.CLOVER_BASE_URL;

    try {
      // 1. Create the order on Clover
      const orderResponse = await axios.post(
        `${baseUrl}/v3/merchants/${merchantId}/orders`,
        {
          state: 'open',
          total: amountCents,
          title: `Contract Payment - ${contractId}`,
          note: description || `Payment for contract ${contractId}`
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const orderId = orderResponse.data.id;

      // 2. Add a line item to the order
      await axios.post(
        `${baseUrl}/v3/merchants/${merchantId}/orders/${orderId}/line_items`,
        {
          name: `Contract: ${contractId}`,
          price: amountCents,
          printed: false
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        orderId,
        merchantId,
        amountCents,
        contractId,
        status: 'created',
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Clover order creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify a Clover payment was completed.
   * Called after the Android app reports payment success.
   * 
   * @param {string} orderId - Clover order ID
   * @returns {Promise<Object>} - Payment verification result
   */
  static async verifyCloverPayment(orderId) {
    const merchantId = process.env.CLOVER_MERCHANT_ID;
    const apiKey = process.env.CLOVER_API_KEY;
    const baseUrl = process.env.CLOVER_BASE_URL;

    try {
      const response = await axios.get(
        `${baseUrl}/v3/merchants/${merchantId}/orders/${orderId}/payments`,
        {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        }
      );

      const payments = response.data.elements || [];
      
      if (payments.length === 0) {
        return { verified: false, reason: 'No payments found for order' };
      }

      const payment = payments[0]; // Primary payment
      return {
        verified: payment.result === 'SUCCESS',
        paymentId: payment.id,
        amount: payment.amount,
        result: payment.result,
        cardTransaction: payment.cardTransaction ? {
          last4: payment.cardTransaction.last4,
          cardType: payment.cardTransaction.cardType,
          authCode: payment.cardTransaction.authCode
        } : null,
        createdAt: payment.createdTime
      };

    } catch (error) {
      throw new Error(`Clover payment verification failed: ${error.message}`);
    }
  }

  // ──────────────────────────────────────────────
  //  FISERV ONLINE PAYMENT FLOW
  // ──────────────────────────────────────────────

  /**
   * Create a Fiserv payment session for online checkout.
   * Returns a checkout URL or token that the client can use to complete payment.
   * 
   * Flow: Backend creates session → Returns checkoutUrl → Client redirects/opens → 
   *       Fiserv processes → Webhook callback to backend
   * 
   * @param {Object} params
   * @param {string} params.contractId - Contract being paid for
   * @param {number} params.amountCents - Amount in cents
   * @param {string} params.currency - Currency code (default: USD)
   * @param {string} params.customerEmail - Customer email
   * @param {string} params.returnUrl - URL to redirect after payment
   * @returns {Promise<Object>} - Fiserv session with checkout details
   */
  static async createFiservPaymentSession({ 
    contractId, 
    amountCents, 
    currency = 'USD', 
    customerEmail,
    returnUrl 
  }) {
    const apiKey = process.env.FISERV_API_KEY;
    const apiSecret = process.env.FISERV_API_SECRET;
    const baseUrl = process.env.FISERV_BASE_URL;

    const transactionId = uuidv4();
    const timestamp = Date.now();

    // Fiserv requires HMAC-SHA256 signature for API authentication
    const crypto = require('crypto');
    const rawSignature = `${apiKey}${transactionId}${timestamp}`;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(rawSignature)
      .digest('base64');

    const payload = {
      transactionAmount: {
        total: (amountCents / 100).toFixed(2),
        currency
      },
      requestType: 'PaymentCardSaleTransaction',
      storeId: process.env.FISERV_MERCHANT_ID,
      transactionOrigin: 'ECOM',
      merchantTransactionId: transactionId,
      order: {
        orderId: contractId,
        billing: {
          email: customerEmail
        }
      },
      redirectUrls: {
        successUrl: `${returnUrl}?status=success&contractId=${contractId}`,
        failureUrl: `${returnUrl}?status=failure&contractId=${contractId}`,
        cancelUrl: `${returnUrl}?status=cancelled&contractId=${contractId}`
      }
    };

    try {
      const response = await axios.post(
        `${baseUrl}/ch/v1/payment-url`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': apiKey,
            'Client-Request-Id': transactionId,
            'Timestamp': timestamp.toString(),
            'Message-Signature': signature
          }
        }
      );

      return {
        transactionId,
        checkoutUrl: response.data.paymentUrl,
        contractId,
        amountCents,
        currency,
        status: 'session_created',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min expiry
      };

    } catch (error) {
      throw new Error(`Fiserv session creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify a Fiserv transaction status.
   * 
   * @param {string} transactionId - Fiserv transaction ID
   * @returns {Promise<Object>} - Transaction status
   */
  static async verifyFiservTransaction(transactionId) {
    const apiKey = process.env.FISERV_API_KEY;
    const apiSecret = process.env.FISERV_API_SECRET;
    const baseUrl = process.env.FISERV_BASE_URL;

    const timestamp = Date.now();
    const crypto = require('crypto');
    const rawSignature = `${apiKey}${transactionId}${timestamp}`;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(rawSignature)
      .digest('base64');

    try {
      const response = await axios.get(
        `${baseUrl}/ch/v1/transactions/${transactionId}`,
        {
          headers: {
            'Api-Key': apiKey,
            'Client-Request-Id': transactionId,
            'Timestamp': timestamp.toString(),
            'Message-Signature': signature
          }
        }
      );

      return {
        transactionId,
        status: response.data.transactionStatus,
        amount: response.data.transactionAmount,
        approvalCode: response.data.approvalCode
      };

    } catch (error) {
      throw new Error(`Fiserv transaction verification failed: ${error.message}`);
    }
  }
}

module.exports = PaymentService;
