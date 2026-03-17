import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

const dataDir = path.resolve(process.cwd(), 'backend', 'data');
const dbPath = path.join(dataDir, 'documents.db.json');

async function ensureDatabase() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(dbPath, 'utf-8');
  } catch {
    await writeFile(
      dbPath,
      JSON.stringify({ documents: [], aiInteractions: [], notifications: [], reportShares: [], immutableAuditLogs: [] }, null, 2),
      'utf-8'
    );
  }
}

async function readDatabase() {
  await ensureDatabase();
  const raw = await readFile(dbPath, 'utf-8');
  const parsed = JSON.parse(raw);

  parsed.documents = parsed.documents || [];
  parsed.aiInteractions = parsed.aiInteractions || [];
  parsed.notifications = parsed.notifications || [];
  parsed.reportShares = parsed.reportShares || [];
  parsed.immutableAuditLogs = parsed.immutableAuditLogs || [];

  return parsed;
}

async function writeDatabase(data) {
  await writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

function hashForEvent(previousHash, payload) {
  return createHash('sha256').update(`${previousHash}|${JSON.stringify(payload)}`).digest('hex');
}

function appendImmutableAudit(db, { docId, actor, action, details, timestamp }) {
  const previous = db.immutableAuditLogs[db.immutableAuditLogs.length - 1];
  const previousHash = previous?.hash || 'GENESIS';
  const payload = { docId, actor, action, details, timestamp };
  const hash = hashForEvent(previousHash, payload);

  const entry = {
    id: randomUUID(),
    ...payload,
    previousHash,
    hash
  };

  db.immutableAuditLogs.push(entry);
  return entry;
}

function appendDocumentAudit(db, doc, { actor, action, details, timestamp = new Date().toISOString() }) {
  const immutableEntry = appendImmutableAudit(db, {
    docId: doc.id,
    actor,
    action,
    details,
    timestamp
  });

  doc.auditTrail.push({
    id: immutableEntry.id,
    action,
    actor,
    timestamp,
    details,
    previousHash: immutableEntry.previousHash,
    hash: immutableEntry.hash
  });
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function expirationInfo(expirationDate) {
  if (!expirationDate) return { diffDays: null, isExpiringSoon: false, isExpired: false };
  const now = new Date();
  const expiry = new Date(expirationDate);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { diffDays, isExpiringSoon: diffDays >= 0 && diffDays <= 30, isExpired: diffDays < 0 };
}

function buildComplianceState(document) {
  const info = expirationInfo(document.metadata?.expirationDate || null);
  return {
    state: info.isExpired ? 'non_compliant' : document.verification.status === 'verified' ? 'compliant' : 'needs_review',
    isExpiringSoon: info.isExpiringSoon,
    isExpired: info.isExpired
  };
}

function upsertNotification(db, incoming) {
  const existing = db.notifications.find(
    (item) => item.userId === incoming.userId && item.documentId === incoming.documentId && item.type === incoming.type && item.status !== 'dismissed'
  );

  if (existing) {
    existing.message = incoming.message;
    existing.priority = incoming.priority;
    existing.channels = incoming.channels;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  const notification = {
    id: randomUUID(),
    ...incoming,
    status: 'active',
    snoozedUntil: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.notifications.push(notification);
  return notification;
}

function createAlertsForDocument(db, doc, userId) {
  const info = expirationInfo(doc.metadata?.expirationDate || null);
  const channels = ['push', 'email', 'sms'];

  if (doc.verification?.status !== 'verified') {
    upsertNotification(db, {
      userId,
      documentId: doc.id,
      type: 'missing_verification',
      priority: 'high',
      channels,
      message: `${doc.storage?.originalName || doc.id} requires verification.`
    });
  }

  if (info.isExpiringSoon || info.isExpired) {
    upsertNotification(db, {
      userId,
      documentId: doc.id,
      type: info.isExpired ? 'expired_document' : 'expiring_document',
      priority: info.isExpired ? 'high' : 'medium',
      channels,
      message: info.isExpired
        ? `${doc.storage?.originalName || doc.id} is expired and non-compliant.`
        : `${doc.storage?.originalName || doc.id} expires in ${info.diffDays} day(s).`
    });
  }
}

function isActiveNotification(item) {
  if (item.status === 'dismissed' || item.status === 'acted') return false;
  if (item.status !== 'snoozed') return true;
  if (!item.snoozedUntil) return false;
  return new Date(item.snoozedUntil).getTime() <= Date.now();
}

export async function createDocumentRecord({ metadata, storage, hash, actor }) {
  const db = await readDatabase();
  const uploadedAt = new Date().toISOString();
  const expirationDate = toIsoOrNull(metadata.expirationDate);

  const record = {
    id: randomUUID(),
    ownerId: actor,
    uploadedAt,
    metadata: { ...metadata, expirationDate },
    storage,
    versions: [{ version: 1, hash, uploadedAt, storage }],
    verification: { status: 'needs_review', hash, verifiedAt: null, thirdParty: null },
    auditTrail: []
  };

  appendDocumentAudit(db, record, {
    actor,
    action: 'upload',
    details: 'Document uploaded and SHA-256 hash generated.',
    timestamp: uploadedAt
  });

  db.documents.push(record);
  createAlertsForDocument(db, record, actor);
  await writeDatabase(db);

  return record;
}

export async function listDocuments() {
  const db = await readDatabase();
  return db.documents;
}

export async function markVerified(id, { actor, thirdParty }) {
  const db = await readDatabase();
  const record = db.documents.find((doc) => doc.id === id);
  if (!record) return null;

  const verifiedAt = new Date().toISOString();
  record.verification.status = 'verified';
  record.verification.verifiedAt = verifiedAt;
  record.verification.thirdParty = thirdParty || null;

  appendDocumentAudit(db, record, {
    actor,
    action: 'verify',
    timestamp: verifiedAt,
    details: thirdParty
      ? `Document verified with third-party provider ${thirdParty.provider}.`
      : 'Document verified with internal timestamp workflow.'
  });

  db.notifications.forEach((item) => {
    if (item.documentId === id && item.type === 'missing_verification' && item.status !== 'dismissed') {
      item.status = 'acted';
      item.updatedAt = new Date().toISOString();
    }
  });

  await writeDatabase(db);
  return record;
}

export async function restoreDocumentVersion({ docId, versionId, actor }) {
  const db = await readDatabase();
  const record = db.documents.find((doc) => doc.id === docId);
  if (!record) return null;

  const version = (record.versions || []).find((item) => String(item.version) === String(versionId));
  if (!version) return undefined;

  const restoredAt = new Date().toISOString();
  const newVersionNumber = (record.versions?.length || 0) + 1;
  const restoredVersion = {
    version: newVersionNumber,
    hash: version.hash,
    uploadedAt: restoredAt,
    storage: version.storage,
    restoredFrom: version.version
  };

  record.versions.push(restoredVersion);
  record.storage = version.storage;
  record.verification.hash = version.hash;
  record.verification.status = 'needs_review';
  record.verification.verifiedAt = null;

  appendDocumentAudit(db, record, {
    actor,
    action: 'restore_version',
    timestamp: restoredAt,
    details: `Document restored from version ${version.version} into version ${newVersionNumber}.`
  });

  createAlertsForDocument(db, record, record.ownerId);
  await writeDatabase(db);
  return { record, restoredVersion };
}

export async function storeAiInteraction({ actor, prompt, response, context }) {
  const db = await readDatabase();
  const timestamp = new Date().toISOString();

  const interaction = { id: randomUUID(), actor, prompt, response, context, timestamp };
  db.aiInteractions.push(interaction);

  db.documents.forEach((doc) => {
    if (doc.ownerId === actor || (doc.auditTrail || []).some((entry) => entry.actor === actor)) {
      appendDocumentAudit(db, doc, {
        actor,
        action: 'ai_guidance',
        timestamp,
        details: 'AI guidance generated for compliance workflow.'
      });
    }
  });

  await writeDatabase(db);
  return interaction;
}

export async function listAiInteractionsForUser(actor) {
  const db = await readDatabase();
  return db.aiInteractions.filter((entry) => entry.actor === actor).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function getActiveNotificationsForUser(userId) {
  const db = await readDatabase();
  db.documents.filter((doc) => doc.ownerId === userId).forEach((doc) => createAlertsForDocument(db, doc, userId));

  const active = db.notifications
    .filter((item) => item.userId === userId)
    .filter((item) => isActiveNotification(item))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  await writeDatabase(db);
  return active;
}

export async function updateNotificationStatus({ userId, notificationId, action }) {
  const db = await readDatabase();
  const item = db.notifications.find((entry) => entry.id === notificationId && entry.userId === userId);
  if (!item) return null;

  const now = new Date();
  if (action === 'snooze') {
    item.status = 'snoozed';
    item.snoozedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  } else if (action === 'dismiss') {
    item.status = 'dismissed';
  } else if (action === 'act') {
    item.status = 'acted';
  }

  item.updatedAt = now.toISOString();
  await writeDatabase(db);
  return item;
}

export async function createReportShare({ userId, template, format, password }) {
  const db = await readDatabase();

  const share = {
    id: randomUUID(),
    userId,
    template,
    format,
    passwordProtected: Boolean(password),
    passwordHash: password ? createHash('sha256').update(password).digest('hex') : null,
    createdAt: new Date().toISOString()
  };

  db.reportShares.push(share);
  await writeDatabase(db);

  return { ...share, passwordHash: undefined };
}

export async function timelineForUser(userId) {
  const db = await readDatabase();
  const actions = db.documents
    .filter((doc) => doc.ownerId === userId || (doc.auditTrail || []).some((action) => action.actor === userId))
    .flatMap((doc) => {
      const compliance = buildComplianceState(doc);
      return (doc.auditTrail || []).map((action) => ({
        actionId: action.id,
        action: action.action,
        actor: action.actor,
        timestamp: action.timestamp,
        details: action.details,
        document: {
          id: doc.id,
          name: doc.storage?.originalName || doc.id,
          metadata: doc.metadata,
          verification: doc.verification,
          versions: doc.versions || [],
          compliance
        }
      }));
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return actions;
}
