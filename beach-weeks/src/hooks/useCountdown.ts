import { useMemo } from 'react';
import { getNextWeek } from '../services/beachWeeksService';

export function useCountdown() {
  return useMemo(() => {
    const next = getNextWeek();
    if (!next) return { days: null, week: null };
    const today = new Date().toISOString().slice(0, 10);
    const isActive = next.startDate <= today && today <= next.endDate;
    if (isActive) return { days: 0, week: next };
    const ms = new Date(next.startDate).getTime() - new Date(today).getTime();
    return { days: Math.ceil(ms / 86400000), week: next };
  }, []);
}
