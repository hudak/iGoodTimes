import { useCallback, useEffect, useState } from 'react';
import type { RecordModel } from 'pocketbase';
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
  const [byDate, setByDate] = useState<Map<string, RecordModel>>(new Map());
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const refetch = useCallback(async () => {
    if (!hasRegistration) return;
    try {
      const records = await pb.collection('notes').getFullList({ filter: `beach_week_n = ${week.n}` });
      setByDate(new Map(records.map((r) => [r.date.slice(0, 10), r])));
    } catch (err) {
      if (!isAbortError(err)) throw err;
    }
  }, [week.n, hasRegistration]);

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
    return <p className="text-sm text-slate-500">Check in for this week first to see and write plans.</p>;
  }

  function startEditing(date: string) {
    setEditingDate(date);
    setDraft(byDate.get(date)?.content ?? '');
  }

  async function handleSave(date: string) {
    if (!user) return;
    setSaving(true);
    try {
      const existing = byDate.get(date);
      if (existing) {
        await pb.collection('notes').update(existing.id, { content: draft, updated_by: user.id });
      } else {
        await pb.collection('notes').create({
          beach_week_n: week.n,
          date,
          content: draft,
          created_by: user.id,
          updated_by: user.id,
        });
      }
      await refetch();
      setEditingDate(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {dates.map((date) => {
        const record = byDate.get(date);
        const isEditing = editingDate === date;
        return (
          <div key={date} className="border rounded-lg p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">{date}</span>
              {!isEditing && (
                <button onClick={() => startEditing(date)} className="text-xs text-blue-600 underline">
                  {record?.content ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="flex flex-col gap-2 mt-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  autoFocus
                  className="border rounded px-2 py-1 bg-white dark:bg-slate-800 text-sm"
                  placeholder="What's the plan for this day?"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(date)}
                    disabled={saving}
                    className="text-xs bg-blue-600 text-white rounded px-2 py-1 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingDate(null)} className="text-xs text-slate-500">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                {record?.content || <span className="text-slate-400">empty</span>}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
