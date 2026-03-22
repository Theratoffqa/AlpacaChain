const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

/**
 * POST /api/auth/token
 * 
 * Generate a JWT token for API access.
 * In production, this would validate credentials against a user store.
 * For MVP, accepts userId + a shared API key.
 */
router.post('/token', (req, res) => {
  const { userId, apiKey } = req.body;

  if (!userId || !apiKey) {
    return res.status(400).json({ error: 'userId and apiKey are required' });
  }

  // MVP: Simple API key validation
  // Production: Replace with proper credential verification
  if (apiKey !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const token = jwt.sign(
    { userId, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    type: 'Bearer',
    expiresIn: '24h',
    userId
  });
});

module.exports = router;
