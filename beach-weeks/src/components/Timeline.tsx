import { useEffect, useRef } from 'react';
import { useInfiniteYears } from '../hooks/useInfiniteYears';
import { getNextWeek } from '../services/beachWeeksService';
import BeachWeekCard from './BeachWeekCard';
import type { BeachWeek } from '../data/types';

const today = new Date().toISOString().slice(0, 10);
const nextWeek = getNextWeek();

interface Props {
  filteredWeeks: BeachWeek[] | null;
}

export default function Timeline({ filteredWeeks }: Props) {
  const { years, byYear, loadAfter, ensureYear } = useInfiniteYears();
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const filteredSet = filteredWeeks ? new Set(filteredWeeks.map(w => w.n)) : null;

  useEffect(() => {
    if (filteredWeeks?.length) {
      const lastYear = parseInt(filteredWeeks[filteredWeeks.length - 1].startDate.slice(0, 4));
      ensureYear(lastYear);
    }
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [filteredWeeks, ensureYear]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        if (e.target === bottomRef.current) loadAfter();
      });
    }, { rootMargin: '200px' });
    if (bottomRef.current) obs.observe(bottomRef.current);
    return () => obs.disconnect();
  }, [loadAfter]);

  return (
    <div className="flex flex-col gap-6 py-4">
      <div ref={topRef} />
      {/* TODO: archive/history — add a toggle here to loadBefore() and show past years */}
      {years.map(year => {
        const weeks = byYear[year];
        if (!weeks?.length) return null;
        const visible = weeks
          .filter(w => w.endDate >= today)
          .filter(w => filteredSet ? filteredSet.has(w.n) : true);
        if (!visible.length) return null;
        return (
          <section key={year}>
            <h2
              id={`year-${year}`}
              className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-1"
            >
              {year}
            </h2>
            <div className="flex flex-col gap-2">
              {visible.map(week => (
                <BeachWeekCard
                  key={week.n}
                  week={week}
                  isCurrent={week.startDate <= today && today <= week.endDate}
                  isNext={week.n === nextWeek?.n}
                />
              ))}
            </div>
          </section>
        );
      })}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
