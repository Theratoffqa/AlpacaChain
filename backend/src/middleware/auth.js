const jwt = require('jsonwebtoken');

/**
 * Authentication middleware using simple JWT tokens.
 * 
 * For MVP purposes we use a single shared secret.
 * Production should use OAuth2 or Clover's own auth flow.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Provide a valid Bearer token in the Authorization header'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware to verify webhook signatures.
 * Uses raw body for HMAC computation.
 */
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-webhook-signature'];
  const HashService = require('../services/hashService');

  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  try {
    const rawBody = req.rawBody || '';
    const isValid = HashService.verifyHmac(rawBody, signature, process.env.WEBHOOK_SECRET);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Webhook verification failed' });
  }
}

module.exports = { authenticate, verifyWebhookSignature };
