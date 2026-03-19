# API Contract Placeholder

This folder is reserved for shared API contracts and schemas between frontend and backend.

## Planned Endpoints
- `POST /api/signup` - create users with hashed passwords
- `POST /api/login` - authenticate and issue JWT token
- `POST /api/logout` - clear auth session cookie/token
- `POST /api/upload` - upload file + metadata and generate SHA-256 hash
- `POST /api/verify` - verify and timestamp uploaded file by `fileId`
- `POST /api/documents/:docId/restore/:versionId` - restore a previous version
- `GET /api/documents` - retrieve metadata, verification state, and versions
- `GET /api/timeline/:userId` - return all user actions sorted by date for timeline UI
- `POST /api/ai-guidance` - generate step-by-step compliance guidance
- `GET /api/ai-guidance/history/:userId` - fetch audit-ready AI interaction history
- `GET /api/notifications/:userId` - retrieve active alerts for expiring/missing compliance documents
- `POST /api/notifications/:userId/:notificationId` - apply `snooze`, `dismiss`, or `act` action to an alert
- `GET /api/reports/templates` - list report templates (US I-9, Canadian permits, cross-border)
- `POST /api/reports/export` - export audit report as PDF/CSV/Excel
- `POST /api/reports/share` - create optional password-protected report share links

## Security & Recovery Notes
- Immutable audit entries are chained with hashes (`previousHash` + `hash`) to make tampering evident.
- Offline capture is queued client-side and synced automatically when online.

## Accessibility & Language Notes
- UI language selector supports English, French, Spanish, Punjabi, Hindi, and Tigrinya.
- High-contrast mode, keyboard-focus outlines, ARIA labels, and plain-language action guidance are included.

> TODO: Add OpenAPI schema or JSON contract files here.
