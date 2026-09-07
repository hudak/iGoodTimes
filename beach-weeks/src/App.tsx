import { useState } from 'react';
import CountdownBanner from './components/CountdownBanner';
import SearchBar from './components/SearchBar';
import Timeline from './components/Timeline';
import type { BeachWeek } from './data/types';
import { useAuth } from './auth/AuthContext';
import SignInForm from './auth/SignInForm';
import SocialPanel from './social/SocialPanel';
import { useMyRegistrations } from './social/registrations';

export default function App() {
  const [filteredWeeks, setFilteredWeeks] = useState<BeachWeek[] | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [selectedWeekN, setSelectedWeekN] = useState<number | null>(null);
  // The public calendar below never checks auth state — only this panel does
  // (specs/identity/spec.md - "Public calendar requires no authentication").
  const { isAuthenticated, user, signOut } = useAuth();
  const { registrations, toggle } = useMyRegistrations();

  async function handleToggleRegister(weekN: number) {
    const wasRegistered = registrations?.has(weekN) ?? false;
    await toggle(weekN);
    if (!wasRegistered) {
      setSelectedWeekN(weekN);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (selectedWeekN === weekN) {
      setSelectedWeekN(null);
    }
  }

  function handleManageWeek(weekN: number) {
    setSelectedWeekN(weekN);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <CountdownBanner />
      <div className="max-w-lg mx-auto px-4 pb-16">
        <header className="py-6 flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">🏖️ GoodTimes</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gast family beach weeks</p>
          </div>
          {isAuthenticated ? (
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 shrink-0">
              {user?.name || user?.email}
              <button onClick={signOut} className="underline">
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSignIn((v) => !v)}
              className="mt-1 text-sm text-blue-600 dark:text-blue-400 underline shrink-0"
            >
              Sign in
            </button>
          )}
        </header>

        {!isAuthenticated && showSignIn && (
          <section className="mb-6 border-b pb-6">
            <SignInForm />
          </section>
        )}

        {isAuthenticated && selectedWeekN !== null && (
          <section className="mb-6 border-b pb-6">
            <SocialPanel
              weekN={selectedWeekN}
              registrations={registrations}
              toggleRegistration={handleToggleRegister}
              onClose={() => setSelectedWeekN(null)}
            />
          </section>
        )}

        <SearchBar onFilter={setFilteredWeeks} />
        {filteredWeeks && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
            Showing {filteredWeeks.length} week{filteredWeeks.length !== 1 ? 's' : ''} matching that date
          </p>
        )}
        <Timeline
          filteredWeeks={filteredWeeks}
          myRegistrations={isAuthenticated ? registrations : undefined}
          onToggleRegister={isAuthenticated ? handleToggleRegister : undefined}
          onManageWeek={isAuthenticated ? handleManageWeek : undefined}
        />
      </div>
    </div>
  );
}
