import UploadManager from '../components/UploadManager';
import ComplianceTimeline from '../components/ComplianceTimeline';
import AIGuidancePanel from '../components/AIGuidancePanel';
import NotificationsPanel from '../components/NotificationsPanel';
import AuditReportsPanel from '../components/AuditReportsPanel';

const quickActions = [
  '/api/signup',
  '/api/login',
  '/api/logout',
  '/api/upload',
  '/api/verify',
  '/api/documents',
  '/api/timeline/:userId',
  '/api/ai-guidance',
  '/api/ai-guidance/history/:userId',
  '/api/notifications/:userId',
  '/api/reports/templates',
  '/api/reports/export',
  '/api/reports/share',
  '/api/documents/:docId/restore/:versionId'
];

export default function DashboardPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-10">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Scaffold Dashboard</h3>
        <p className="mt-2 text-sm text-slate-600">
          Placeholder page for future dashboard, uploads, timeline, notifications, AI guidance chat, and audit reports.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-brandBlue">
          {quickActions.map((route) => (
            <li key={route}>Backend route ready: {route}</li>
          ))}
        </ul>
      </div>

      <NotificationsPanel />
      <AuditReportsPanel />

      <div className="mt-6">
        <UploadManager />
      </div>

      <ComplianceTimeline />
      <AIGuidancePanel />
    </section>
  );
}
