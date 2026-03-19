import { useState } from 'react';

function highlightClass(compliance) {
  if (compliance?.isExpired || compliance?.state === 'non_compliant') return 'border-red-300 bg-red-50';
  if (compliance?.isExpiringSoon || compliance?.state === 'needs_review') return 'border-amber-300 bg-amber-50';
  return 'border-emerald-300 bg-emerald-50';
}

export default function ComplianceTimeline() {
  const [timeline, setTimeline] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState(() => sessionStorage.getItem('auth_user_email') || '');

  async function loadTimeline() {
    if (!userId) {
      setStatus('Enter a user ID/email to load timeline data.');
      return;
    }

    const token = sessionStorage.getItem('auth_token');
    const response = await fetch(`/api/timeline/${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include'
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.message || 'Failed to load timeline.');
      return;
    }

    setTimeline(payload.actions || []);
    setStatus(`Loaded ${payload.totalActions} actions for ${payload.userId}.`);
  }

  function toggleExpand(actionId) {
    setExpanded((prev) => ({ ...prev, [actionId]: !prev[actionId] }));
  }

  async function restoreVersion(documentId, versionNumber) {
    const token = sessionStorage.getItem('auth_token');
    const response = await fetch(`/api/documents/${documentId}/restore/${versionNumber}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include'
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.message || 'Restore failed.');
      return;
    }

    setStatus(payload.message);
    await loadTimeline();
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-label="Compliance timeline panel">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-slate-900">Compliance Timeline</h3>
          <p className="text-sm text-slate-600">Plain-language tip: expand a card to view versions and restore older files.</p>
        </div>
        <input
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          placeholder="userId or email"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-label="Timeline user id"
        />
        <button onClick={loadTimeline} className="rounded-md bg-brandBlue px-4 py-2 text-sm font-semibold text-white" title="Load timeline actions">
          Load Timeline
        </button>
      </div>

      {status ? <p className="mt-3 text-sm text-slate-700" role="status">{status}</p> : null}

      <div className="mt-4 space-y-3">
        {timeline.map((entry) => {
          const isOpen = Boolean(expanded[entry.actionId]);
          const compliance = entry.document?.compliance;

          return (
            <article key={entry.actionId} className={`rounded-lg border p-3 ${highlightClass(compliance)}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800">{entry.action.toUpperCase()} • {entry.document?.name}</p>
                  <p className="text-xs text-slate-600">{new Date(entry.timestamp).toLocaleString()}</p>
                </div>
                <button onClick={() => toggleExpand(entry.actionId)} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white" title="Expand or collapse details">
                  {isOpen ? 'Collapse' : 'Expand'}
                </button>
              </div>

              <p className="mt-2 text-sm text-slate-700">{entry.details}</p>

              {isOpen ? (
                <div className="mt-3 space-y-1 text-sm text-slate-700">
                  <p>Verification: {entry.document?.verification?.status || 'needs_review'}</p>
                  <p>SHA-256: {entry.document?.verification?.hash || 'N/A'}</p>
                  <p>Verified At: {entry.document?.verification?.verifiedAt || 'Pending'}</p>
                  <p>Expiration: {entry.document?.metadata?.expirationDate || 'Not set'}</p>
                  <p>Versions: {(entry.document?.versions || []).length}</p>
                  <ul className="list-disc pl-5 text-xs text-slate-600">
                    {(entry.document?.versions || []).map((version) => (
                      <li key={`${entry.actionId}-${version.version}`}>
                        v{version.version} • {new Date(version.uploadedAt).toLocaleString()} • {version.hash}
                        <button
                          onClick={() => restoreVersion(entry.document.id, version.version)}
                          className="ml-2 rounded bg-brandRed px-2 py-0.5 text-[10px] font-semibold text-white"
                          title="Restore this version"
                        >
                          Restore
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
