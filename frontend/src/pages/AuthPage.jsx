import { useMemo, useState } from 'react';
import AuthForm from '../components/AuthForm';

const TOKEN_STORAGE_KEY = 'auth_token';
const USER_EMAIL_STORAGE_KEY = 'auth_user_email';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [protectedMessage, setProtectedMessage] = useState('');
  const [authState, setAuthState] = useState(() => {
    // Session storage avoids long-lived token persistence across browser restarts.
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const email = sessionStorage.getItem(USER_EMAIL_STORAGE_KEY);
    return token ? { token, user: email ? { email } : null } : null;
  });

  const authLabel = useMemo(() => (authState ? 'Authenticated' : 'Not authenticated'), [authState]);

  async function handleAuthSubmit(credentials) {
    setLoading(true);

    try {
      const response = await fetch(`/api/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return payload.message || 'Authentication failed.';
      }

      const payload = await response.json();

      // Store JWT in sessionStorage for bearer-token API requests in this session.
      // Server also stores the same token in an httpOnly cookie for safer transport.
      sessionStorage.setItem(TOKEN_STORAGE_KEY, payload.token);
      if (payload.user?.email) {
        sessionStorage.setItem(USER_EMAIL_STORAGE_KEY, payload.user.email);
      }
      setAuthState({ token: payload.token, user: payload.user });
      setProtectedMessage('');
      return null;
    } catch (_error) {
      return 'Unable to reach the server. Please try again.';
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } finally {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_EMAIL_STORAGE_KEY);
      setAuthState(null);
      setProtectedMessage('');
      setLoading(false);
    }
  }

  async function checkProtectedRoute() {
    if (!authState?.token) {
      setProtectedMessage('Please login first.');
      return;
    }

    const response = await fetch('/api/documents', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authState.token}`
      },
      credentials: 'include'
    });

    const payload = await response.json().catch(() => ({}));
    setProtectedMessage(payload.message || 'Protected route check complete.');
  }

  return (
    <section className="mx-auto max-w-6xl px-6 pb-10">
      <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3 text-sm">
        <span>Status: {authLabel}</span>
        {authState ? (
          <button
            onClick={handleLogout}
            disabled={loading}
            className="rounded-md bg-slate-800 px-3 py-1.5 font-medium text-white disabled:opacity-60"
          >
            Logout
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setMode('login')}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            mode === 'login' ? 'bg-brandBlue text-white' : 'bg-white text-slate-700'
          }`}
        >
          Login
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            mode === 'signup' ? 'bg-brandBlue text-white' : 'bg-white text-slate-700'
          }`}
        >
          Sign Up
        </button>
      </div>

      <AuthForm mode={mode} onSubmit={handleAuthSubmit} loading={loading} />

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-700">Validate token-based access:</p>
        <button
          onClick={checkProtectedRoute}
          className="mt-2 rounded-md bg-brandRed px-3 py-2 text-sm font-semibold text-white"
        >
          Test /api/documents
        </button>
        {protectedMessage ? <p className="mt-2 text-sm text-slate-600">{protectedMessage}</p> : null}
      </div>
    </section>
  );
}
