import { useCallback, useEffect, useState } from 'react';
import type { RecordModel } from 'pocketbase';
import { isAbortError, pb } from '../services/pocketbaseClient';
import { ROOM_NAMES } from './rooms';

export default function RoomAssignments({
  weekN,
  hasRegistration,
}: {
  weekN: number;
  hasRegistration: boolean;
}) {
  const [byRoom, setByRoom] = useState<Map<string, RecordModel>>(new Map());
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const refetch = useCallback(async () => {
    if (!hasRegistration) return;
    try {
      const records = await pb.collection('room_assignments').getFullList({ filter: `beach_week_n = ${weekN}` });
      setByRoom(new Map(records.map((r) => [r.room_name, r])));
    } catch (err) {
      if (!isAbortError(err)) throw err;
    }
  }, [weekN, hasRegistration]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (!hasRegistration) {
    return (
      <p className="text-sm text-slate-500">Check in for this week first to see and edit rooms.</p>
    );
  }

  function startEditing(room: string) {
    setEditingRoom(room);
    setDraft(byRoom.get(room)?.content ?? '');
  }

  async function handleSave(room: string) {
    setSaving(true);
    try {
      const existing = byRoom.get(room);
      if (existing) {
        await pb.collection('room_assignments').update(existing.id, { content: draft });
      } else {
        await pb.collection('room_assignments').create({ beach_week_n: weekN, room_name: room, content: draft });
      }
      await refetch();
      setEditingRoom(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {ROOM_NAMES.map((room) => {
        const record = byRoom.get(room);
        const isEditing = editingRoom === room;
        return (
          <div key={room} className="border rounded-lg p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">{room}</span>
              {!isEditing && (
                <button onClick={() => startEditing(room)} className="text-xs text-blue-600 underline">
                  {record?.content ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="flex flex-col gap-2 mt-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  autoFocus
                  className="border rounded px-2 py-1 bg-white dark:bg-slate-800 text-sm"
                  placeholder="Who's staying here?"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(room)}
                    disabled={saving}
                    className="text-xs bg-blue-600 text-white rounded px-2 py-1 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingRoom(null)} className="text-xs text-slate-500">
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
