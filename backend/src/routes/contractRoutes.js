const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Contract = require('../models/Contract');
const HashService = require('../services/hashService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ──────────────────────────────────────────────
// Multer Configuration for File Uploads
// ──────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E6)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'text/plain', 'text/html'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Accepted: PDF, TXT, HTML`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024 // Default 10MB
  }
});

// ──────────────────────────────────────────────
// POST /api/contracts/upload
// Upload a contract and generate SHA-256 hash
// ──────────────────────────────────────────────
router.post('/upload', authenticate, upload.single('contract'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Use "contract" as the field name.' });
    }

    // Generate SHA-256 hash of the uploaded file
    const sha256Hash = await HashService.hashFile(req.file.path);
    const now = new Date();

    // Create contract record
    const contract = new Contract({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      sha256Hash,
      hashGeneratedAt: now,
      status: 'uploaded',
      uploadedBy: req.user.userId,
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
    });

    await contract.save();

    res.status(201).json({
      message: 'Contract uploaded successfully',
      contract: {
        id: contract._id,
        originalName: contract.originalName,
        mimeType: contract.mimeType,
        fileSize: contract.fileSize,
        sha256Hash: contract.sha256Hash,
        hashGeneratedAt: contract.hashGeneratedAt,
        status: contract.status,
        createdAt: contract.createdAt
      }
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// ──────────────────────────────────────────────
// POST /api/contracts/upload-text
// Upload a text contract directly (not as file)
// ──────────────────────────────────────────────
router.post('/upload-text', authenticate, async (req, res, next) => {
  try {
    const { content, title } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Contract content is required' });
    }

    // Save text content as a file
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E6)}.txt`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, content, 'utf8');

    // Generate hash
    const sha256Hash = HashService.hashString(content);
    const now = new Date();

    const contract = new Contract({
      originalName: title || 'text-contract.txt',
      mimeType: 'text/plain',
      fileSize: Buffer.byteLength(content, 'utf8'),
      filePath,
      sha256Hash,
      hashGeneratedAt: now,
      status: 'uploaded',
      uploadedBy: req.user.userId,
      metadata: req.body.metadata || {}
    });

    await contract.save();

    res.status(201).json({
      message: 'Text contract uploaded successfully',
      contract: {
        id: contract._id,
        originalName: contract.originalName,
        sha256Hash: contract.sha256Hash,
        hashGeneratedAt: contract.hashGeneratedAt,
        status: contract.status
      }
    });

  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────
// GET /api/contracts/:id
// Get contract details
// ──────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json({
      contract: {
        id: contract._id,
        originalName: contract.originalName,
        mimeType: contract.mimeType,
        fileSize: contract.fileSize,
        sha256Hash: contract.sha256Hash,
        hashGeneratedAt: contract.hashGeneratedAt,
        status: contract.status,
        paymentStatus: contract.paymentStatus,
        paymentProvider: contract.paymentProvider,
        verificationHistory: contract.verificationHistory,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt
      }
    });

  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────
// POST /api/contracts/:id/verify
// Verify contract integrity (recompute hash and compare)
// ──────────────────────────────────────────────
router.post('/:id/verify', authenticate, async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Verify file still exists
    if (!fs.existsSync(contract.filePath)) {
      return res.status(410).json({
        error: 'Contract file not found on disk',
        message: 'The original file may have been deleted or moved'
      });
    }

    // Recompute hash and compare
    const verification = await HashService.verifyIntegrity(
      contract.filePath,
      contract.sha256Hash
    );

    // Record verification in history
    contract.verificationHistory.push({
      verifiedAt: new Date(),
      result: verification.isValid ? 'match' : 'mismatch',
      verifiedBy: req.user.userId
    });

    // Update contract status
    if (!verification.isValid) {
      contract.status = 'tampered';
    } else if (contract.status === 'uploaded') {
      contract.status = 'verified';
    }

    await contract.save();

    res.json({
      contractId: contract._id,
      integrity: {
        isValid: verification.isValid,
        storedHash: verification.expectedHash,
        computedHash: verification.computedHash,
        verifiedAt: verification.verifiedAt,
        status: contract.status
      }
    });

  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────
// GET /api/contracts
// List contracts for the authenticated user
// ──────────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = { uploadedBy: req.user.userId };

    if (status) {
      query.status = status;
    }

    const contracts = await Contract
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-filePath -verificationHistory'); // Don't expose file paths in list

    const total = await Contract.countDocuments(query);

    res.json({
      contracts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
