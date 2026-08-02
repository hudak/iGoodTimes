import { useCountdown } from '../hooks/useCountdown';

const FMT = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export default function CountdownBanner() {
  const { days, week } = useCountdown();
  if (!week) return null;

  const start = FMT.format(new Date(week.startDate + 'T00:00:00Z'));
  const end = FMT.format(new Date(week.endDate + 'T00:00:00Z'));

  return (
    <div className="w-full bg-blue-600 dark:bg-blue-700 text-white text-center py-3 px-4">
      {days === 0 ? (
        <span className="font-semibold text-lg">🏖️ It's Beach Week! {start} – {end}</span>
      ) : (
        <span className="font-semibold text-lg">
          <span className="text-blue-200">Next beach week in </span>
          <span className="text-white">{days} days</span>
          <span className="text-blue-200"> — {start}</span>
        </span>
      )}
    </div>
  );
}
