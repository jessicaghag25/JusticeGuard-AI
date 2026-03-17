# 96ply Full-Stack Scaffold (Replit Ready)

This repository contains a starter full-stack setup for **96ply**, a SaaS compliance management platform.

## Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express + JWT auth
- **Storage:** Local file storage (Replit-friendly) with optional AWS S3 support
- **Data:** JSON-file database scaffold for uploaded document, AI guidance, notification, and report-sharing records
- **AI Guidance:** OpenAI GPT API (optional) with local rule-engine fallback
- **Shared API contracts:** `/api`

## Security & Recovery
- Immutable-style audit logs with hash chaining (`previousHash` + `hash`) for tamper evidence.
- Version restore API: `POST /api/documents/:docId/restore/:versionId`.
- Offline document capture queue in browser local storage with automatic sync when connectivity returns.

## Accessibility & Languages
- Language selector supports: English, French, Spanish, Punjabi, Hindi, Tigrinya.
- High-contrast mode toggle.
- Keyboard-visible focus styles and skip-to-content link.
- ARIA labels/tooltips/plain-language helper text across key actions.

## Audit Report Generation
- Pre-built templates: US I-9, Canadian work permits, cross-border compliance.
- Export options: PDF, CSV, Excel.
- Password-protected sharing available via hashed share passwords.

## Included API Routes
- `POST /api/signup`
- `POST /api/login`
- `POST /api/logout`
- `POST /api/upload`
- `POST /api/verify`
- `POST /api/documents/:docId/restore/:versionId`
- `GET /api/documents`
- `GET /api/timeline/:userId`
- `POST /api/ai-guidance`
- `GET /api/ai-guidance/history/:userId`
- `GET /api/notifications/:userId`
- `POST /api/notifications/:userId/:notificationId`
- `GET /api/reports/templates`
- `POST /api/reports/export`
- `POST /api/reports/share`

## Local Development
```bash
npm install
npm run dev
```

## Notes
- API handlers include inline comments and are scaffold-level implementations.
- Replace scaffold persistence with a production-grade database before launch.
