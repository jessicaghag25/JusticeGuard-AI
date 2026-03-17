import { useEffect, useState } from 'react';

const formats = [
  { label: 'Export PDF', value: 'pdf' },
  { label: 'Export CSV', value: 'csv' },
  { label: 'Export Excel', value: 'excel' }
];

export default function AuditReportsPanel() {
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState('cross_border');
  const [status, setStatus] = useState('');
  const [sharePassword, setSharePassword] = useState('');
  const [shareResult, setShareResult] = useState(null);

  const userId = sessionStorage.getItem('auth_user_email') || '';

  useEffect(() => {
    async function loadTemplates() {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch('/api/reports/templates', {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include'
      });

      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setTemplates(payload.templates || []);
      }
    }

    loadTemplates();
  }, []);

  async function exportReport(format) {
    if (!userId) {
      setStatus('Login first to export reports.');
      return;
    }

    const token = sessionStorage.getItem('auth_token');
    const response = await fetch('/api/reports/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify({ userId, template, format })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setStatus(payload.message || 'Failed to export report.');
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `96ply-${template}.${format === 'excel' ? 'xls' : format}`;
    anchor.click();
    URL.revokeObjectURL(url);

    setStatus(`Report exported as ${format.toUpperCase()}.`);
  }

  async function createShare() {
    if (!userId) {
      setStatus('Login first to create shared links.');
      return;
    }

    const token = sessionStorage.getItem('auth_token');
    const response = await fetch('/api/reports/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify({ userId, template, format: 'pdf', password: sharePassword })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.message || 'Failed to create report share.');
      return;
    }

    setShareResult(payload);
    setStatus('Share link generated.');
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">Audit Reports</h3>
      <p className="text-sm text-slate-600">
        Export compliance reports from pre-built templates (US I-9, Canadian permits, cross-border).
      </p>

      <label className="mt-4 block text-sm font-medium text-slate-700">Template</label>
      <select
        value={template}
        onChange={(event) => setTemplate(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      >
        {templates.length === 0 ? <option value="cross_border">cross_border</option> : null}
        {templates.map((item) => (
          <option key={item.key} value={item.key}>
            {item.title}
          </option>
        ))}
      </select>

      <div className="mt-4 flex flex-wrap gap-2">
        {formats.map((item) => (
          <button
            key={item.value}
            onClick={() => exportReport(item.value)}
            className="rounded-md bg-brandBlue px-4 py-2 text-sm font-semibold text-white"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-md border border-slate-200 p-3">
        <p className="text-sm font-semibold text-slate-800">Password-Protected Sharing</p>
        <div className="mt-2 flex gap-2">
          <input
            type="password"
            value={sharePassword}
            onChange={(event) => setSharePassword(event.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Optional share password"
          />
          <button onClick={createShare} className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white">
            Create Share Link
          </button>
        </div>
        {shareResult ? (
          <p className="mt-2 text-xs text-slate-600">
            Link: {shareResult.shareUrl} ({shareResult.passwordProtected ? 'password-protected' : 'no password'})
          </p>
        ) : null}
      </div>

      {status ? <p className="mt-3 text-sm text-slate-700">{status}</p> : null}
    </section>
  );
}
