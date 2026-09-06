import { useMemo, useState } from 'react';
import { getBeachWeeks, getNextWeek } from '../services/beachWeeksService';
import { useAuth } from '../auth/AuthContext';
import { useRegistration } from './useRegistration';
import SignUpForm from './SignUpForm';
import RoomAssignments from './RoomAssignments';
import Notes from './Notes';

type Tab = 'signup' | 'rooms' | 'notes';

export default function SocialPanel() {
  const { user, signOut } = useAuth();
  const weeks = useMemo(() => getBeachWeeks(), []);
  const [weekN, setWeekN] = useState(() => getNextWeek()?.n ?? weeks[0]?.n);
  const [tab, setTab] = useState<Tab>('signup');

  const week = weeks.find((w) => w.n === weekN);
  // Fetched once here, not per-tab, so PocketBase's request auto-cancellation
  // (same collection+method in flight from two places aborts one of them)
  // never races two components against `registrations` at the same time.
  const { registration, hasRegistration, loading, refetch } = useRegistration(weekN);

  if (!week) return null;

  return (
    <section className="mt-8 border-t pt-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Beach Week Plans</h2>
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {user?.email}
          <button onClick={signOut} className="underline">
            Sign out
          </button>
        </div>
      </div>

      <label className="text-sm text-slate-600 dark:text-slate-300">
        Week
        <select
          value={weekN}
          onChange={(e) => setWeekN(Number(e.target.value))}
          className="ml-2 border rounded px-2 py-1 bg-white dark:bg-slate-800"
        >
          {weeks.map((w) => (
            <option key={w.n} value={w.n}>
              {w.startDate} – {w.endDate}
            </option>
          ))}
        </select>
      </label>

      <nav className="flex gap-3 text-sm border-b">
        {(['signup', 'rooms', 'notes'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 ${tab === t ? 'border-b-2 border-blue-600 font-medium' : 'text-slate-500'}`}
          >
            {t === 'signup' ? 'Sign Up' : t === 'rooms' ? 'Rooms' : 'Notes'}
          </button>
        ))}
      </nav>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          {tab === 'signup' && (
            <SignUpForm weekN={weekN} registration={registration} loading={loading} refetch={refetch} />
          )}
          {tab === 'rooms' && <RoomAssignments weekN={weekN} hasRegistration={hasRegistration} />}
          {tab === 'notes' && <Notes week={week} hasRegistration={hasRegistration} />}
        </>
      )}
    </section>
  );
}
