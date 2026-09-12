import { useState } from 'react';
import { useAuth } from './AuthContext';
import { NotApprovedError } from './NotApprovedError';

export default function SignInForm() {
  const { requestOtp, confirmOtp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const id = await requestOtp(email);
      setOtpId(id);
    } catch {
      // PocketBase intentionally returns success even for unknown emails
      // (anti-enumeration), so this only fires on network/server errors.
      setError('Could not send a sign-in code. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpId) return;
    setError(null);
    setBusy(true);
    try {
      await confirmOtp(otpId, code);
    } catch {
      setError('That code was incorrect or expired.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err instanceof NotApprovedError) {
        setError("That address isn't on the list yet - contact Nich for help.");
      } else {
        setError('Could not sign in with Google. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (otpId) {
    return (
      <form onSubmit={handleConfirmOtp} className="flex flex-col gap-2 max-w-xs">
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Enter the code emailed to {email}
        </label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border rounded px-2 py-1 bg-white dark:bg-slate-800"
          required
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="bg-blue-600 text-white rounded px-3 py-1 text-sm disabled:opacity-50"
        >
          Sign in
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-xs">
      <form onSubmit={handleRequestOtp} className="flex flex-col gap-2">
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Sign in with your email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded px-2 py-1 bg-white dark:bg-slate-800"
          required
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-blue-600 text-white rounded px-3 py-1 text-sm disabled:opacity-50"
        >
          Send sign-in code
        </button>
      </form>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        or
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={busy}
        className="border rounded px-3 py-1 text-sm disabled:opacity-50"
      >
        Sign in with Google
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
