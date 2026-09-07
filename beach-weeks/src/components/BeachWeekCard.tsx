import type { BeachWeek } from '../data/types';

const FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function fmt(iso: string) {
  return FMT.format(new Date(iso + 'T00:00:00Z'));
}

interface Props {
  week: BeachWeek;
  isCurrent: boolean;
  isNext: boolean;
  // Omitted entirely when signed out, so the public calendar never checks
  // auth state (specs/identity/spec.md - "Public calendar requires no authentication").
  registered?: boolean;
  onToggleRegister?: () => void;
  onManage?: () => void;
}

export default function BeachWeekCard({ week, isCurrent, isNext, registered, onToggleRegister, onManage }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const isPast = week.endDate < today;

  return (
    <div
      id={`week-${week.n}`}
      className={[
        'rounded-xl border px-4 py-3 transition-all',
        week.isDouble
          ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500'
          : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700',
        isCurrent ? 'ring-2 ring-blue-500' : '',
        isNext && !isCurrent ? 'ring-2 ring-emerald-400' : '',
        isPast ? 'opacity-50' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {fmt(week.startDate)} – {fmt(week.endDate)}
        </span>
        <div className="flex gap-1 shrink-0">
          {week.isDouble && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-100">
              Double ⭐
            </span>
          )}
          {isCurrent && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
              Now 🏖️
            </span>
          )}
          {isNext && !isCurrent && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
              Next
            </span>
          )}
        </div>
      </div>
      {onToggleRegister && (
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={registered ?? false} onChange={onToggleRegister} />
            I'm going
          </label>
          {registered && onManage && (
            <button onClick={onManage} className="text-xs text-blue-600 dark:text-blue-400 underline">
              Manage →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
