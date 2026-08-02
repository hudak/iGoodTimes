import { useState } from 'react';
import { findWeeksByMonthDay } from '../services/beachWeeksService';
import type { BeachWeek } from '../data/types';

interface Props {
  onFilter: (weeks: BeachWeek[] | null) => void;
}

export default function SearchBar({ onFilter }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!value) return;
    // value is YYYY-MM-DD from the date input; extract MM-DD
    const monthDay = value.slice(5); // "MM-DD"
    const results = findWeeksByMonthDay(monthDay);
    if (!results.length) {
      setError('No upcoming beach weeks include that date');
      return;
    }
    onFilter(results);
  }

  function handleClear() {
    setValue('');
    setError('');
    onFilter(null);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center mb-2">
      <span className="text-sm text-slate-500 dark:text-slate-400 shrink-0">Find weeks with</span>
      <input
        type="date"
        value={value}
        onChange={e => { setValue(e.target.value); setError(''); }}
        className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:[color-scheme:dark]"
      />
      <button
        type="submit"
        disabled={!value}
        className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
      >
        Find
      </button>
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1.5 text-sm rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          Clear
        </button>
      )}
      {error && <span className="text-xs text-red-500 w-full">{error}</span>}
    </form>
  );
}
