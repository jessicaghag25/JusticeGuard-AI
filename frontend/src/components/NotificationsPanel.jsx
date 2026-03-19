import { useState } from 'react';

function priorityColor(priority) {
  if (priority === 'high') return 'text-red-700 bg-red-100';
  if (priority === 'medium') return 'text-amber-700 bg-amber-100';
  return 'text-slate-700 bg-slate-100';
}

export default function NotificationsPanel() {
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState('');

  const userId = sessionStorage.getItem('auth_user_email') || '';

  async function loadAlerts() {
    if (!userId) {
      setStatus('Login first to load notifications.');
      return;
    }

    const token = sessionStorage.getItem('auth_token');
    const response = await fetch(`/api/notifications/${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include'
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.message || 'Failed to load alerts.');
      return;
    }

    setAlerts(payload.alerts || []);
    setStatus(`Loaded ${payload.totalAlerts} active alerts.`);
  }

  async function updateAlert(notificationId, action) {
    const token = sessionStorage.getItem('auth_token');
    const response = await fetch(`/api/notifications/${encodeURIComponent(userId)}/${notificationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify({ action })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.message || 'Failed to update alert.');
      return;
    }

    // Refresh view so dismiss/snooze/act changes reflect current active alerts.
    await loadAlerts();
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Pending Alerts</h3>
          <p className="text-sm text-slate-600">Push, email, and SMS placeholders for expiring or missing documents.</p>
        </div>
        <button onClick={loadAlerts} className="rounded-md bg-brandBlue px-4 py-2 text-sm font-semibold text-white">
          Refresh Alerts
        </button>
      </div>

      {status ? <p className="mt-3 text-sm text-slate-700">{status}</p> : null}

      <div className="mt-4 space-y-3">
        {alerts.map((alert) => (
          <article key={alert.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">{alert.message}</p>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${priorityColor(alert.priority)}`}>
                {alert.priority}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Channels: {(alert.channels || []).join(', ')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => updateAlert(alert.id, 'snooze')}
                className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Snooze
              </button>
              <button
                onClick={() => updateAlert(alert.id, 'dismiss')}
                className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Dismiss
              </button>
              <button
                onClick={() => updateAlert(alert.id, 'act')}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Take Action
              </button>
            </div>
          </article>
        ))}

        {alerts.length === 0 ? <p className="text-sm text-slate-500">No active alerts.</p> : null}
      </div>
    </section>
  );
}
