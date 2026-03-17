import { Router } from 'express';
import multer from 'multer';
import { createHash } from 'node:crypto';
import { saveUploadedFile } from '../storage/fileStorage.js';
import { createDocumentRecord } from '../data/documentStore.js';

const router = Router();

// Memory storage lets us route file bytes to S3 or local storage through one code path.
const upload = multer({ storage: multer.memoryStorage() });

function normalizeMetadata(body) {
  return {
    employeeName: body.employeeName?.trim() || '',
    department: body.department?.trim() || '',
    jurisdiction: body.jurisdiction?.trim() || '',
    documentType: body.documentType?.trim() || '',
    expirationDate: body.expirationDate?.trim() || ''
  };
}

function validateMetadata(metadata) {
  const required = ['employeeName', 'department', 'jurisdiction', 'documentType'];
  const missing = required.filter((key) => !metadata[key]);

  if (missing.length > 0) {
    return `Missing required metadata: ${missing.join(', ')}`;
  }

  if (metadata.expirationDate && Number.isNaN(new Date(metadata.expirationDate).getTime())) {
    return 'expirationDate must be a valid date.';
  }

  return null;
}

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'A file is required.' });
  }

  const metadata = normalizeMetadata(req.body);
  const metadataError = validateMetadata(metadata);

  if (metadataError) {
    return res.status(400).json({ message: metadataError });
  }

  try {
    const storage = await saveUploadedFile(req.file);

    // SHA-256 hash provides tamper-evident fingerprint for document verification.
    const hash = createHash('sha256').update(req.file.buffer).digest('hex');

    const record = await createDocumentRecord({
      metadata,
      storage,
      hash,
      actor: req.auth?.email || 'system'
    });

    return res.status(201).json({
      fileId: record.id,
      metadata: record.metadata,
      verification: record.verification,
      versions: record.versions,
      uploadedAt: record.uploadedAt,
      storage: record.storage
    });
  } catch (error) {
    return res.status(500).json({ message: `Failed to upload file: ${error.message}` });
  }
});

export default router;
