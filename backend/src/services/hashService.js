const crypto = require('crypto');
const fs = require('fs');

/**
 * HashService - Handles SHA-256 hash generation and verification.
 * 
 * Design Decision: We use streaming hash computation (createReadStream + pipe)
 * instead of reading the entire file into memory. This ensures the system
 * can handle large PDF contracts without memory issues.
 */
class HashService {

  /**
   * Generate SHA-256 hash from a file path (streaming).
   * Preferred for files on disk.
   * 
   * @param {string} filePath - Absolute path to the file
   * @returns {Promise<string>} - Hex-encoded SHA-256 hash
   */
  static async hashFile(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(new Error(`Hash generation failed: ${err.message}`)));
    });
  }

  /**
   * Generate SHA-256 hash from a Buffer.
   * Used when file content is already in memory (e.g., from multer).
   * 
   * @param {Buffer} buffer - File content as Buffer
   * @returns {string} - Hex-encoded SHA-256 hash
   */
  static hashBuffer(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Generate SHA-256 hash from a string.
   * Useful for hashing text contracts or metadata.
   * 
   * @param {string} text - Text content to hash
   * @returns {string} - Hex-encoded SHA-256 hash
   */
  static hashString(text) {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  }

  /**
   * Verify file integrity by comparing stored hash with computed hash.
   * 
   * @param {string} filePath - Path to the file to verify
   * @param {string} expectedHash - Previously stored SHA-256 hash
   * @returns {Promise<{isValid: boolean, computedHash: string, expectedHash: string}>}
   */
  static async verifyIntegrity(filePath, expectedHash) {
    const computedHash = await HashService.hashFile(filePath);
    return {
      isValid: computedHash === expectedHash,
      computedHash,
      expectedHash,
      verifiedAt: new Date().toISOString()
    };
  }

  /**
   * Generate HMAC-SHA256 signature for webhook verification.
   * 
   * @param {string} payload - Raw payload string
   * @param {string} secret - Signing secret
   * @returns {string} - Hex-encoded HMAC signature
   */
  static generateHmac(payload, secret) {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify HMAC signature (constant-time comparison to prevent timing attacks).
   * 
   * @param {string} payload - Raw payload string
   * @param {string} signature - Received signature
   * @param {string} secret - Signing secret
   * @returns {boolean}
   */
  static verifyHmac(payload, signature, secret) {
    const expected = HashService.generateHmac(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  }
}

module.exports = HashService;
