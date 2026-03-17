import { useState } from 'react';

export default function AIGuidancePanel() {
  const [prompt, setPrompt] = useState('What should I do for missing documents and expiring certifications?');
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  async function sendPrompt() {
    if (!prompt.trim()) return;

    const token = sessionStorage.getItem('auth_token');
    setLoading(true);

    const response = await fetch('/api/ai-guidance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify({ prompt })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessages((prev) => [...prev, { role: 'assistant', text: payload.message || 'AI guidance failed.' }]);
      setLoading(false);
      return;
    }

    // Chat-style transcript for operator and AI exchange.
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: prompt },
      { role: 'assistant', text: payload.message, meta: `${payload.provider} • ${payload.timestamp}` }
    ]);
    setLoading(false);
  }

  async function loadHistory() {
    const userId = sessionStorage.getItem('auth_user_email');
    const token = sessionStorage.getItem('auth_token');

    if (!userId) {
      return;
    }

    const response = await fetch(`/api/ai-guidance/history/${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include'
    });

    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setHistory(payload.interactions || []);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">AI Guidance Chat</h3>
      <p className="mt-1 text-sm text-slate-600">
        Ask for step-by-step compliance instructions for missing documents, expirations, or cross-border controls.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Ask AI for compliance guidance..."
        />
        <button
          onClick={sendPrompt}
          disabled={loading}
          className="rounded-md bg-brandBlue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Thinking...' : 'Send'}
        </button>
        <button onClick={loadHistory} className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white">
          Load Audit History
        </button>
      </div>

      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto rounded-md bg-slate-50 p-3">
        {messages.map((message, idx) => (
          <div
            key={`${message.role}-${idx}`}
            className={`rounded-md px-3 py-2 text-sm ${
              message.role === 'user' ? 'ml-8 bg-blue-100 text-slate-900' : 'mr-8 bg-white text-slate-800'
            }`}
          >
            <p>{message.text}</p>
            {message.meta ? <p className="mt-1 text-xs text-slate-500">{message.meta}</p> : null}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-md border border-slate-200 p-3">
        <p className="text-sm font-semibold text-slate-800">AI Interaction Audit Trail</p>
        <ul className="mt-2 space-y-2 text-xs text-slate-600">
          {history.map((entry) => (
            <li key={entry.id}>
              <span className="font-medium">{new Date(entry.timestamp).toLocaleString()}:</span> {entry.prompt}
            </li>
          ))}
          {history.length === 0 ? <li>No AI interactions loaded.</li> : null}
        </ul>
      </div>
    </section>
  );
}
