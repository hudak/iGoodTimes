import { useState } from 'react';
import { getBeachWeeks } from '../services/beachWeeksService';
import { useAuth } from '../auth/AuthContext';
import { pb } from '../services/pocketbaseClient';
import SignUpForm from './SignUpForm';
import RoomAssignments from './RoomAssignments';
import Notes from './Notes';

type Tab = 'rooms' | 'notes';

export default function SocialPanel({
  weekN,
  registrations,
  toggleRegistration,
  onClose,
}: {
  weekN: number;
  registrations: Map<number, string> | null;
  toggleRegistration: (weekN: number) => Promise<void>;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('rooms');
  const [nameDraft, setNameDraft] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);

  const week = getBeachWeeks().find((w) => w.n === weekN);
  const hasRegistration = registrations?.has(weekN) ?? false;

  if (!week) return null;

  async function saveName() {
    if (!user) return;
    setSavingName(true);
    try {
      const updated = await pb.collection('users').update(user.id, { name: nameDraft });
      // .update() doesn't refresh pb.authStore on its own, so the header and
      // this field would keep showing the stale name until a full reload.
      pb.authStore.save(pb.authStore.token, updated);
    } finally {
      setSavingName(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {week.startDate} – {week.endDate}
        </h2>
        <button onClick={onClose} className="text-xs text-slate-500 underline">
          Close
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-500">
        Your name
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={saveName}
          disabled={savingName}
          placeholder={user?.email}
          className="border rounded px-2 py-0.5 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
        />
      </label>

      <SignUpForm weekN={weekN} hasRegistration={hasRegistration} onToggle={() => toggleRegistration(weekN)} />

      <nav className="flex gap-3 text-sm border-b">
        {(['rooms', 'notes'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 ${tab === t ? 'border-b-2 border-blue-600 font-medium' : 'text-slate-500'}`}
          >
            {t === 'rooms' ? 'Rooms' : 'Day Plans'}
          </button>
        ))}
      </nav>

      {tab === 'rooms' && <RoomAssignments weekN={weekN} hasRegistration={hasRegistration} />}
      {tab === 'notes' && <Notes week={week} hasRegistration={hasRegistration} />}
    </section>
  );
}
