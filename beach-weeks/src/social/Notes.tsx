import { useCallback, useEffect, useState } from 'react';
import { ClientResponseError, type RecordModel } from 'pocketbase';
import { isAbortError, pb } from '../services/pocketbaseClient';
import { useAuth } from '../auth/AuthContext';
import type { BeachWeek } from '../data/types';

function datesInWeek(week: BeachWeek): string[] {
  const dates: string[] = [];
  const start = new Date(week.startDate + 'T00:00:00Z');
  const end = new Date(week.endDate + 'T00:00:00Z');
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export default function Notes({ week, hasRegistration }: { week: BeachWeek; hasRegistration: boolean }) {
  const { user } = useAuth();
  const dates = datesInWeek(week);
  const [date, setDate] = useState(dates[0]);
  const [note, setNote] = useState<RecordModel | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const refetch = useCallback(async () => {
    if (!hasRegistration) return;
    try {
      const record = await pb
        .collection('notes')
        .getFirstListItem(`beach_week_n = ${week.n} && date = "${date}"`);
      setNote(record);
      setContent(record.content ?? '');
    } catch (err) {
      if (err instanceof ClientResponseError && err.status === 404) {
        setNote(null);
        setContent('');
      } else if (!isAbortError(err)) {
        throw err;
      }
    }
  }, [week.n, date, hasRegistration]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Refresh-on-focus instead of live sync (specs/beach-week-notes/spec.md -
  // "Latest content is shown on refocus").
  useEffect(() => {
    window.addEventListener('focus', refetch);
    return () => window.removeEventListener('focus', refetch);
  }, [refetch]);

  if (!hasRegistration) {
    return (
      <p className="text-sm text-slate-500">Sign up for this week first to see and write notes.</p>
    );
  }

  async function handleBlur() {
    if (!user || content === (note?.content ?? '')) return;
    setSaving(true);
    try {
      if (note) {
        const updated = await pb.collection('notes').update(note.id, {
          content,
          updated_by: user.id,
        });
        setNote(updated);
      } else {
        const created = await pb.collection('notes').create({
          beach_week_n: week.n,
          date,
          content,
          created_by: user.id,
          updated_by: user.id,
        });
        setNote(created);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 max-w-md">
      <select
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border rounded px-2 py-1 bg-white dark:bg-slate-800 self-start"
      >
        {dates.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        rows={6}
        className="border rounded px-2 py-1 bg-white dark:bg-slate-800"
        placeholder="Notes for this day…"
      />
      {saving && <p className="text-xs text-slate-400">Saving…</p>}
    </div>
  );
}
