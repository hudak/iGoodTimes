import { useCallback, useEffect, useState } from 'react';
import type { RecordModel } from 'pocketbase';
import { isAbortError, pb } from '../services/pocketbaseClient';
import { useAuth } from '../auth/AuthContext';

// All of the signed-in person's own registrations, as a weekN -> registration
// id map. Fetched once and reused everywhere a check/uncheck state is needed
// (the Timeline's per-card checkbox, the panel's gate check) instead of one
// query per week (specs/beach-week-registration/spec.md - "Registration is
// the access gate").
export function useMyRegistrations() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Map<number, string> | null>(null);

  const refetch = useCallback(async () => {
    if (!user) {
      setRegistrations(null);
      return;
    }
    try {
      const records = await pb.collection('registrations').getFullList({
        filter: `registered_by = "${user.id}"`,
      });
      setRegistrations(new Map(records.map((r) => [r.beach_week_n, r.id])));
    } catch (err) {
      if (!isAbortError(err)) throw err;
    }
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const toggle = useCallback(
    async (weekN: number) => {
      if (!user) return;
      const existingId = registrations?.get(weekN);
      if (existingId) {
        await pb.collection('registrations').delete(existingId);
      } else {
        await pb.collection('registrations').create({ beach_week_n: weekN, registered_by: user.id });
      }
      await refetch();
    },
    [user, registrations, refetch],
  );

  return { registrations, toggle };
}

// Everyone registered for one specific week, with their display name - used
// for the "who else is checked in" list (specs/beach-week-registration/spec.md
// doesn't require this, but it's the natural replacement for the free-text
// attendee list this change removed).
export function useWeekRegistrations(weekN: number) {
  const [people, setPeople] = useState<RecordModel[]>([]);

  const refetch = useCallback(async () => {
    try {
      const records = await pb.collection('registrations').getFullList({
        filter: `beach_week_n = ${weekN}`,
        expand: 'registered_by',
      });
      setPeople(records.map((r) => r.expand?.registered_by).filter(Boolean) as RecordModel[]);
    } catch (err) {
      if (!isAbortError(err)) throw err;
    }
  }, [weekN]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { people, refetch };
}
