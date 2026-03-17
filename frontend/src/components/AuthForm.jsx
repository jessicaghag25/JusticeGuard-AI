import { useState } from 'react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthForm({ mode, onSubmit, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const isSignup = mode === 'signup';

  function validate() {
    // Client-side validation provides immediate UX feedback before API calls.
    if (!EMAIL_PATTERN.test(email)) {
      return 'Please enter a valid email address.';
    }

    if (password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }

    if (isSignup && password !== confirmPassword) {
      return 'Passwords do not match.';
    }

    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    const apiError = await onSubmit({ email, password });

    if (apiError) {
      setError(apiError);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-brandBlue">
        {isSignup ? 'Create account' : 'Login'}
      </h2>

      <label className="mt-4 block text-sm font-medium text-slate-700">Email</label>
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder="you@company.com"
        required
      />

      <label className="mt-4 block text-sm font-medium text-slate-700">Password</label>
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder="At least 8 characters"
        required
      />

      {isSignup ? (
        <>
          <label className="mt-4 block text-sm font-medium text-slate-700">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Re-enter your password"
            required
          />
        </>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-md bg-brandBlue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? 'Please wait...' : isSignup ? 'Sign up' : 'Login'}
      </button>
    </form>
  );
}
