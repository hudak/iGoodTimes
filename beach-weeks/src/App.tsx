import { useState } from 'react';
import CountdownBanner from './components/CountdownBanner';
import SearchBar from './components/SearchBar';
import Timeline from './components/Timeline';
import type { BeachWeek } from './data/types';
import { useAuth } from './auth/AuthContext';
import SignInForm from './auth/SignInForm';
import SocialPanel from './social/SocialPanel';

export default function App() {
  const [filteredWeeks, setFilteredWeeks] = useState<BeachWeek[] | null>(null);
  // The public calendar above never checks auth state — only the section
  // below does (specs/identity/spec.md - "Public calendar requires no authentication").
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <CountdownBanner />
      <div className="max-w-lg mx-auto px-4 pb-16">
        <header className="py-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">🏖️ GoodTimes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gast family beach weeks</p>
        </header>
        <SearchBar onFilter={setFilteredWeeks} />
        {filteredWeeks && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
            Showing {filteredWeeks.length} week{filteredWeeks.length !== 1 ? 's' : ''} matching that date
          </p>
        )}
        <Timeline filteredWeeks={filteredWeeks} />

        {isAuthenticated ? <SocialPanel /> : (
          <section className="mt-8 border-t pt-6">
            <SignInForm />
          </section>
        )}
      </div>
    </div>
  );
}
