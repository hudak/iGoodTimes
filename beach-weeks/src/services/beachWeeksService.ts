import type { BeachWeek, BeachWeeksByYear } from '../data/types';
import beachWeeks from '../data/beachWeeks';

export function getBeachWeeks(): BeachWeek[] {
  return beachWeeks;
}

export function getBeachWeeksByYear(year: number): BeachWeek[] {
  return beachWeeks.filter(w => w.startDate.startsWith(String(year)));
}

export function findWeekByDate(date: Date): BeachWeek | undefined {
  const iso = date.toISOString().slice(0, 10);
  return beachWeeks.find(w => w.startDate <= iso && iso <= w.endDate);
}

export function getNextWeek(): BeachWeek | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return beachWeeks.find(w => w.endDate >= today);
}

// Returns all future weeks whose date range includes the given month+day (MM-DD)
export function findWeeksByMonthDay(monthDay: string): BeachWeek[] {
  const today = new Date().toISOString().slice(0, 10);
  return beachWeeks.filter(w => {
    if (w.endDate < today) return false;
    const start = new Date(w.startDate + 'T00:00:00Z');
    const end = new Date(w.endDate + 'T00:00:00Z');
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      if (d.toISOString().slice(5, 10) === monthDay) return true;
    }
    return false;
  });
}

export function groupByYear(): BeachWeeksByYear {
  return beachWeeks.reduce<BeachWeeksByYear>((acc, w) => {
    const year = parseInt(w.startDate.slice(0, 4));
    (acc[year] ??= []).push(w);
    return acc;
  }, {});
}
