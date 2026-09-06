import { useEffect, useState } from 'react';
import type { RecordModel } from 'pocketbase';
import { pb } from '../services/pocketbaseClient';
import { useAuth } from '../auth/AuthContext';

export default function SignUpForm({
  weekN,
  registration,
  loading,
  refetch,
}: {
  weekN: number;
  registration: RecordModel | null;
  loading: boolean;
  refetch: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [attendees, setAttendees] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAttendees(registration?.attendees ?? '');
  }, [registration]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      if (registration) {
        // Edit in place: specs/beach-week-registration/spec.md - "Registration is editable in place".
        await pb.collection('registrations').update(registration.id, { attendees });
      } else {
        await pb.collection('registrations').create({
          beach_week_n: weekN,
          registered_by: user.id,
          attendees,
        });
      }
      await refetch();
    } catch {
      setError('Could not save your sign-up. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-md">
      <label className="text-sm text-slate-600 dark:text-slate-300">
        Who's coming for this week? (yourself, plus anyone else — kids and guests are fine as free text)
      </label>
      <textarea
        value={attendees}
        onChange={(e) => setAttendees(e.target.value)}
        rows={3}
        className="border rounded px-2 py-1 bg-white dark:bg-slate-800"
        placeholder="e.g. Mike & Sarah + kids Emma and Jack"
        required
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="self-start bg-blue-600 text-white rounded px-3 py-1 text-sm disabled:opacity-50"
      >
        {registration ? 'Update sign-up' : 'Sign up'}
      </button>
    </form>
  );
}
