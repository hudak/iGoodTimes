import { useState, useCallback } from 'react';
import { groupByYear } from '../services/beachWeeksService';

const ALL_YEARS = Object.keys(groupByYear()).map(Number).sort((a, b) => a - b);
const CHUNK = 5;

function currentYear() {
  return new Date().getFullYear();
}

function initialYears(): number[] {
  const idx = ALL_YEARS.indexOf(currentYear());
  const start = idx === -1 ? ALL_YEARS.length - 1 : idx;
  return ALL_YEARS.slice(start, start + CHUNK);
}

export function useInfiniteYears() {
  const [years, setYears] = useState<number[]>(initialYears);
  const byYear = groupByYear();

  const loadBefore = useCallback(() => {
    setYears(prev => {
      const first = prev[0];
      const idx = ALL_YEARS.indexOf(first);
      if (idx <= 0) return prev;
      const added = ALL_YEARS.slice(Math.max(0, idx - CHUNK), idx);
      return [...added, ...prev];
    });
  }, []);

  const loadAfter = useCallback(() => {
    setYears(prev => {
      const last = prev[prev.length - 1];
      const idx = ALL_YEARS.indexOf(last);
      if (idx >= ALL_YEARS.length - 1) return prev;
      const added = ALL_YEARS.slice(idx + 1, idx + 1 + CHUNK);
      return [...prev, ...added];
    });
  }, []);

  // Expand loaded years to include at least through `targetYear`
  const ensureYear = useCallback((targetYear: number) => {
    setYears(prev => {
      const last = prev[prev.length - 1];
      if (last >= targetYear) return prev;
      const idx = ALL_YEARS.indexOf(last);
      const targetIdx = ALL_YEARS.indexOf(targetYear);
      if (targetIdx === -1) return prev;
      return [...prev, ...ALL_YEARS.slice(idx + 1, targetIdx + 1)];
    });
  }, []);

  return { years, byYear, loadBefore, loadAfter, ensureYear };
}
