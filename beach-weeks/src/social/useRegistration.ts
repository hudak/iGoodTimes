import { useCallback, useEffect, useState } from 'react';
import { ClientResponseError, type RecordModel } from 'pocketbase';
import { isAbortError, pb } from '../services/pocketbaseClient';
import { useAuth } from '../auth/AuthContext';

// Whether the signed-in person has a registration for `weekN` — the sole
// access gate for that week's room assignments and notes (see
// specs/beach-week-registration/spec.md - "Registration is the access gate").
export function useRegistration(weekN: number) {
  const { user } = useAuth();
  const [registration, setRegistration] = useState<RecordModel | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setRegistration(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const record = await pb
        .collection('registrations')
        .getFirstListItem(`beach_week_n = ${weekN} && registered_by = "${user.id}"`);
      setRegistration(record);
      setLoading(false);
    } catch (err) {
      if (err instanceof ClientResponseError && err.status === 404) {
        setRegistration(null);
        setLoading(false);
      } else if (!isAbortError(err)) {
        setLoading(false);
        throw err;
      }
      // Aborted: a newer call is already in flight and will settle `loading` itself.
    }
  }, [user, weekN]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { registration, hasRegistration: !!registration, loading, refetch };
}
