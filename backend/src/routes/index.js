import { Router } from 'express';
import authRouter from './auth.js';
import uploadRouter from './upload.js';
import { authenticateRequest } from '../auth/authenticate.js';
import {
  listDocuments,
  markVerified,
  timelineForUser,
  storeAiInteraction,
  listAiInteractionsForUser,
  getActiveNotificationsForUser,
  updateNotificationStatus,
  createReportShare,
  restoreDocumentVersion
} from '../data/documentStore.js';
import { verifyWithThirdParty } from '../services/verificationProvider.js';
import { generateAiGuidance } from '../services/aiGuidance.js';
import { generateReportPayload, listReportTemplates } from '../services/reportGenerator.js';

const router = Router();

// Authentication endpoints for token-based access control.
router.use('/', authRouter);

// Protect business APIs so only authenticated users can access compliance workflows.
router.use(authenticateRequest);

// Upload route handles drag/drop + metadata payloads from the frontend.
router.use('/', uploadRouter);

router.post('/verify', async (req, res) => {
  const { fileId, useThirdParty = false } = req.body;
  if (!fileId) {
    return res.status(400).json({ message: 'fileId is required for verification.' });
  }

  const documents = await listDocuments();
  const existing = documents.find((doc) => doc.id === fileId);
  if (!existing) {
    return res.status(404).json({ message: 'Document not found.' });
  }

  let thirdPartyResult = null;
  if (useThirdParty) {
    // Optional third-party verification API integration placeholder.
    thirdPartyResult = await verifyWithThirdParty({
      fileId: existing.id,
      hash: existing.verification.hash
    });
  }

  const record = await markVerified(fileId, {
    actor: req.auth?.email || 'system',
    thirdParty: thirdPartyResult
  });

  return res.status(202).json({
    message: 'Document verified and timestamped.',
    fileId: record.id,
    verification: record.verification,
    auditTrail: record.auditTrail
  });
});

router.get('/documents', async (_req, res) => {
  res.json({
    documents: await listDocuments(),
    message: 'Documents fetched successfully.'
  });
});

router.get('/timeline/:userId', async (req, res) => {
  const { userId } = req.params;

  // Timeline returns all user-related actions in reverse-chronological order.
  const actions = await timelineForUser(userId);
  return res.json({
    userId,
    totalActions: actions.length,
    actions
  });
});

router.post('/ai-guidance', async (req, res) => {
  const actor = req.auth?.email || 'system';
  const prompt = req.body?.prompt || '';
  const documents = await listDocuments();

  const userDocuments = documents.filter((doc) => doc.ownerId === actor);
  const guidance = await generateAiGuidance({ prompt, documents: userDocuments });

  const interaction = await storeAiInteraction({
    actor,
    prompt,
    response: guidance.guidance,
    context: {
      provider: guidance.provider,
      documentCount: userDocuments.length
    }
  });

  return res.json({
    provider: guidance.provider,
    message: guidance.guidance,
    interactionId: interaction.id,
    timestamp: interaction.timestamp
  });
});

router.get('/ai-guidance/history/:userId', async (req, res) => {
  const history = await listAiInteractionsForUser(req.params.userId);
  return res.json({
    userId: req.params.userId,
    total: history.length,
    interactions: history
  });
});

router.get('/notifications/:userId', async (req, res) => {
  const notifications = await getActiveNotificationsForUser(req.params.userId);

  return res.json({
    userId: req.params.userId,
    totalAlerts: notifications.length,
    alerts: notifications
  });
});

router.post('/notifications/:userId/:notificationId', async (req, res) => {
  const action = req.body?.action;
  if (!['snooze', 'dismiss', 'act'].includes(action)) {
    return res.status(400).json({ message: 'action must be one of: snooze, dismiss, act.' });
  }

  const updated = await updateNotificationStatus({
    userId: req.params.userId,
    notificationId: req.params.notificationId,
    action
  });

  if (!updated) {
    return res.status(404).json({ message: 'Notification not found.' });
  }

  return res.json({ message: 'Notification updated.', notification: updated });
});


router.post('/documents/:docId/restore/:versionId', async (req, res) => {
  const result = await restoreDocumentVersion({
    docId: req.params.docId,
    versionId: req.params.versionId,
    actor: req.auth?.email || 'system'
  });

  if (result === null) {
    return res.status(404).json({ message: 'Document not found.' });
  }

  if (result === undefined) {
    return res.status(404).json({ message: 'Version not found.' });
  }

  return res.json({
    message: 'Document restored from previous version.',
    documentId: result.record.id,
    restoredVersion: result.restoredVersion,
    totalVersions: result.record.versions.length
  });
});

router.get('/reports/templates', (_req, res) => {
  return res.json({ templates: listReportTemplates() });
});

router.post('/reports/export', async (req, res) => {
  const userId = req.body?.userId || req.auth?.email;
  const templateKey = req.body?.template || 'cross_border';
  const format = req.body?.format || 'pdf';

  if (!['pdf', 'csv', 'excel'].includes(format)) {
    return res.status(400).json({ message: 'format must be one of: pdf, csv, excel.' });
  }

  const documents = await listDocuments();
  const payload = generateReportPayload({ documents, userId, templateKey, format });

  const filename = `96ply-${templateKey}-${Date.now()}.${payload.extension}`;
  res.setHeader('Content-Type', payload.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  return res.send(payload.content);
});

router.post('/reports/share', async (req, res) => {
  const userId = req.body?.userId || req.auth?.email;
  const template = req.body?.template || 'cross_border';
  const format = req.body?.format || 'pdf';
  const password = req.body?.password || '';

  const share = await createReportShare({
    userId,
    template,
    format,
    password
  });

  // Placeholder share URL for password-protected report exchange workflow.
  return res.status(201).json({
    shareId: share.id,
    passwordProtected: share.passwordProtected,
    shareUrl: `/shared-report/${share.id}`,
    createdAt: share.createdAt
  });
});

export default router;
