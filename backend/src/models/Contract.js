const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  // Original filename
  originalName: {
    type: String,
    required: true
  },
  // MIME type (application/pdf, text/plain, etc.)
  mimeType: {
    type: String,
    required: true,
    enum: ['application/pdf', 'text/plain', 'text/html']
  },
  // File size in bytes
  fileSize: {
    type: Number,
    required: true
  },
  // Path to stored file on disk
  filePath: {
    type: String,
    required: true
  },
  // SHA-256 hash of the file content
  sha256Hash: {
    type: String,
    required: true,
    index: true
  },
  // Timestamp when hash was generated
  hashGeneratedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Contract status
  status: {
    type: String,
    enum: ['uploaded', 'verified', 'paid', 'tampered', 'expired'],
    default: 'uploaded'
  },
  // Payment reference (linked after payment)
  paymentId: {
    type: String,
    default: null
  },
  // Payment status
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  // Payment amount (in cents to avoid floating point issues)
  paymentAmountCents: {
    type: Number,
    default: 0
  },
  // Payment provider used
  paymentProvider: {
    type: String,
    enum: ['clover', 'fiserv', 'none'],
    default: 'none'
  },
  // User who uploaded the contract
  uploadedBy: {
    type: String,
    required: true
  },
  // Metadata - extensible key-value pairs
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  // Integrity verification history
  verificationHistory: [{
    verifiedAt: { type: Date, default: Date.now },
    result: { type: String, enum: ['match', 'mismatch'] },
    verifiedBy: String
  }]
}, {
  timestamps: true // adds createdAt and updatedAt
});

// Index for fast lookups
contractSchema.index({ uploadedBy: 1, createdAt: -1 });
contractSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Contract', contractSchema);
