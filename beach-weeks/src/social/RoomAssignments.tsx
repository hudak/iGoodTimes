import { useCallback, useEffect, useState } from 'react';
import type { RecordModel } from 'pocketbase';
import { isAbortError, pb } from '../services/pocketbaseClient';
import { useAuth } from '../auth/AuthContext';
import { ROOM_NAMES } from './rooms';

type Occupant = { kind: 'me' } | { kind: 'other'; userId: string } | { kind: 'label'; label: string };

export default function RoomAssignments({
  weekN,
  hasRegistration,
}: {
  weekN: number;
  hasRegistration: boolean;
}) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<RecordModel[]>([]);
  const [people, setPeople] = useState<RecordModel[]>([]);
  const [roomName, setRoomName] = useState<string>(ROOM_NAMES[0]);
  const [occupant, setOccupant] = useState<Occupant>({ kind: 'me' });
  const [label, setLabel] = useState('');
  const [otherUserId, setOtherUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!hasRegistration) return;
    try {
      const [assignmentsResult, peopleResult] = await Promise.all([
        pb.collection('room_assignments').getFullList({ filter: `beach_week_n = ${weekN}` }),
        pb.collection('users').getFullList(),
      ]);
      setAssignments(assignmentsResult);
      setPeople(peopleResult);
    } catch (err) {
      if (!isAbortError(err)) throw err;
    }
  }, [weekN, hasRegistration]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (!hasRegistration) {
    return (
      <p className="text-sm text-slate-500">
        Sign up for this week first to see and assign rooms.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const base = { beach_week_n: weekN, room_name: roomName, added_by: user.id };
      if (occupant.kind === 'me') {
        await pb.collection('room_assignments').create({ ...base, person: user.id });
      } else if (occupant.kind === 'other') {
        await pb.collection('room_assignments').create({ ...base, person: otherUserId });
      } else {
        await pb.collection('room_assignments').create({ ...base, label: occupant.label });
      }
      await refetch();
      setLabel('');
    } catch {
      setError('Could not save that room assignment. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const byRoom = new Map<string, RecordModel[]>();
  for (const room of ROOM_NAMES) byRoom.set(room, []);
  for (const a of assignments) byRoom.get(a.room_name)?.push(a);

  function occupantLabel(a: RecordModel): string {
    if (a.label) return a.label;
    const person = people.find((p) => p.id === a.person);
    return person?.name || person?.email || 'Someone';
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {ROOM_NAMES.map((room) => (
          <div key={room} className="text-sm">
            <span className="font-medium">{room}:</span>{' '}
            {byRoom.get(room)?.length ? (
              byRoom.get(room)!.map(occupantLabel).join(', ')
            ) : (
              <span className="text-slate-400">empty</span>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-md border-t pt-3">
        <label className="text-sm text-slate-600 dark:text-slate-300">Assign a room</label>
        <select
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          className="border rounded px-2 py-1 bg-white dark:bg-slate-800"
        >
          {ROOM_NAMES.map((room) => (
            <option key={room} value={room}>
              {room}
            </option>
          ))}
        </select>

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={occupant.kind === 'me'}
              onChange={() => setOccupant({ kind: 'me' })}
            />
            Myself
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={occupant.kind === 'other'}
              onChange={() => setOccupant({ kind: 'other', userId: otherUserId })}
            />
            Another account holder
            {occupant.kind === 'other' && (
              <select
                value={otherUserId}
                onChange={(e) => {
                  setOtherUserId(e.target.value);
                  setOccupant({ kind: 'other', userId: e.target.value });
                }}
                className="border rounded px-1 py-0.5 bg-white dark:bg-slate-800"
              >
                <option value="">Choose…</option>
                {people
                  .filter((p) => p.id !== user?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.email}
                    </option>
                  ))}
              </select>
            )}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={occupant.kind === 'label'}
              onChange={() => setOccupant({ kind: 'label', label })}
            />
            Someone without an account
            {occupant.kind === 'label' && (
              <input
                type="text"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setOccupant({ kind: 'label', label: e.target.value });
                }}
                placeholder="e.g. Lauren's kids"
                className="border rounded px-1 py-0.5 bg-white dark:bg-slate-800"
              />
            )}
          </label>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving || (occupant.kind === 'other' && !otherUserId) || (occupant.kind === 'label' && !label)}
          className="self-start bg-blue-600 text-white rounded px-3 py-1 text-sm disabled:opacity-50"
        >
          Add to room
        </button>
      </form>
    </div>
  );
}
