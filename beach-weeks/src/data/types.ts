export interface BeachWeek {
  n: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isDouble: boolean;
}

export type BeachWeeksByYear = Record<number, BeachWeek[]>;
