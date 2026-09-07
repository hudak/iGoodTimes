import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWeekRegistrations } from './registrations';

export default function SignUpForm({
  weekN,
  hasRegistration,
  onToggle,
}: {
  weekN: number;
  hasRegistration: boolean;
  onToggle: () => Promise<void>;
}) {
  const { user } = useAuth();
  const { people, refetch } = useWeekRegistrations(weekN);
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    setBusy(true);
    try {
      await onToggle();
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  const others = people.filter((p) => p.id !== user?.id);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={hasRegistration} disabled={busy} onChange={handleToggle} />
        I'm going
      </label>
      {others.length > 0 && (
        <p className="text-xs text-slate-500">
          Also going: {others.map((p) => p.name || p.email).join(', ')}
        </p>
      )}
    </div>
  );
}
