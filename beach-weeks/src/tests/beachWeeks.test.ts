import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import beachWeeks from '../data/beachWeeks';
import {
  getBeachWeeks,
  getBeachWeeksByYear,
  findWeekByDate,
  getNextWeek,
  groupByYear,
} from '../services/beachWeeksService';

// ── CSV fixture ───────────────────────────────────────────────────────────────

function loadCsvDates(): string[] {
  const raw = readFileSync(resolve(__dirname, 'fixtures/gast_dates_validation.csv'), 'utf-8');
  return raw
    .trim()
    .split('\n')
    .slice(1) // skip header
    .map(line => {
      const [start] = line.trim().split(',');
      const [m, d, y] = start.split('/');
      return `20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    });
}

// ── Data integrity ────────────────────────────────────────────────────────────

describe('generated data integrity', () => {
  it('has 275 entries', () => {
    expect(beachWeeks).toHaveLength(275);
  });

  it('all entries have valid ISO start/end dates', () => {
    for (const w of beachWeeks) {
      expect(w.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(w.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(w.startDate).getTime()).not.toBeNaN();
      expect(new Date(w.endDate).getTime()).not.toBeNaN();
    }
  });

  it('endDate is always after startDate', () => {
    for (const w of beachWeeks) {
      expect(w.endDate > w.startDate).toBe(true);
    }
  });

  it('normal weeks span exactly 7 days', () => {
    for (const w of beachWeeks.filter(w => !w.isDouble)) {
      const days = (new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 86400000;
      expect(days).toBe(7);
    }
  });

  it('double weeks span exactly 14 days', () => {
    for (const w of beachWeeks.filter(w => w.isDouble)) {
      const days = (new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 86400000;
      expect(days).toBe(14);
    }
  });

  it('entries are sorted by startDate', () => {
    for (let i = 1; i < beachWeeks.length; i++) {
      expect(beachWeeks[i].startDate >= beachWeeks[i - 1].startDate).toBe(true);
    }
  });

  it('no overlapping date ranges', () => {
    for (let i = 1; i < beachWeeks.length; i++) {
      expect(beachWeeks[i].startDate >= beachWeeks[i - 1].endDate).toBe(true);
    }
  });

  it('covers years 2006 through 2075', () => {
    const years = Object.keys(groupByYear()).map(Number);
    expect(Math.min(...years)).toBe(2006);
    expect(Math.max(...years)).toBe(2075);
  });
});

// ── CSV fixture validation ────────────────────────────────────────────────────

describe('CSV fixture validation', () => {
  const csvDates = loadCsvDates();
  const generatedStarts = new Set(beachWeeks.map(w => w.startDate));

  it('loads dates from CSV fixture', () => {
    expect(csvDates.length).toBeGreaterThan(0);
  });

  it('every CSV start date exists in generated data (accounting for merged doubles)', () => {
    // When two consecutive weeks merge into a double, only the first startDate is kept.
    // Build a set that also includes endDate-7days for each double so we can match the second half.
    const doubleSecondStarts = new Set(
      beachWeeks
        .filter(w => w.isDouble)
        .map(w => {
          const ms = new Date(w.startDate).getTime() + 7 * 86400000;
          return new Date(ms).toISOString().slice(0, 10);
        })
    );
    for (const date of csvDates) {
      const found = generatedStarts.has(date) || doubleSecondStarts.has(date);
      expect(found, `Missing CSV date: ${date}`).toBe(true);
    }
  });

  it('2026 weeks match CSV exactly', () => {
    const csv2026 = csvDates.filter(d => d.startsWith('2026'));
    const gen2026 = beachWeeks.filter(w => w.startDate.startsWith('2026')).map(w => w.startDate);
    expect(gen2026).toEqual(expect.arrayContaining(csv2026));
    expect(gen2026).toHaveLength(csv2026.length);
  });
});

// ── Double weeks ──────────────────────────────────────────────────────────────

describe('double weeks', () => {
  it('detects the 2036 double week from CSV (2036-11-14)', () => {
    const dbl = beachWeeks.find(w => w.startDate === '2036-11-14');
    expect(dbl).toBeDefined();
    expect(dbl!.isDouble).toBe(true);
    expect(dbl!.endDate).toBe('2036-11-28');
  });

  it('has exactly 6 double weeks across the full dataset', () => {
    expect(beachWeeks.filter(w => w.isDouble)).toHaveLength(6);
  });

  it('no regular week is 14 days', () => {
    for (const w of beachWeeks.filter(w => !w.isDouble)) {
      const days = (new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 86400000;
      expect(days).not.toBe(14);
    }
  });
});

// ── Service layer ─────────────────────────────────────────────────────────────

describe('beachWeeksService', () => {
  it('getBeachWeeks returns all entries', () => {
    expect(getBeachWeeks()).toHaveLength(275);
  });

  it('getBeachWeeksByYear returns correct weeks', () => {
    const weeks = getBeachWeeksByYear(2026);
    expect(weeks).toHaveLength(4);
    expect(weeks.every(w => w.startDate.startsWith('2026'))).toBe(true);
  });

  it('findWeekByDate finds a week by a date within it', () => {
    const week = findWeekByDate(new Date('2026-03-22'));
    expect(week).toBeDefined();
    expect(week!.startDate).toBe('2026-03-20');
  });

  it('findWeekByDate returns undefined for a date outside all weeks', () => {
    expect(findWeekByDate(new Date('2026-04-01'))).toBeUndefined();
  });

  it('findWeekByDate finds a week on its start date', () => {
    const week = findWeekByDate(new Date('2026-06-19'));
    expect(week!.startDate).toBe('2026-06-19');
  });

  it('findWeekByDate finds a week on its end date', () => {
    const week = findWeekByDate(new Date('2026-03-27'));
    expect(week!.startDate).toBe('2026-03-20');
  });

  it('getNextWeek returns a future or current week', () => {
    const next = getNextWeek();
    expect(next).toBeDefined();
    const today = new Date().toISOString().slice(0, 10);
    expect(next!.endDate >= today).toBe(true);
  });

  it('groupByYear keys match years present in data', () => {
    const byYear = groupByYear();
    expect(byYear[2026]).toHaveLength(4);
    expect(byYear[2036]).toHaveLength(4); // 3 normal + 1 merged double
  });
});
