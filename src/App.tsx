import React, { useState } from 'react';
import { RvsLogo } from './components/vector/RvsLogo';
import { AppHeader, BottomNav } from './components/layout/AppHeader';
import { InsightsSidebar } from './components/layout/InsightsSidebar';
import { AllowanceBar } from './components/layout/AllowanceBar';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileSetupScreen } from './screens/ProfileSetupScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HomeScreen } from './screens/HomeScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { MembersScreen } from './screens/MembersScreen';
import { WalletsScreen } from './screens/WalletsScreen';
import { LimitsScreen } from './screens/LimitsScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { Spinner } from './components/ui/Field';
import { useAuth } from './contexts/AuthContext';
import { useHousehold } from './contexts/HouseholdContext';
import { useSettings } from './contexts/SettingsContext';
import type { Screen } from './screens/navigation';

function Splash({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
      <RvsLogo size={64} className="animate-pulse" />
      <p className="text-xs font-bold uppercase tracking-widest text-faint">{label}</p>
    </div>
  );
}

function Shell() {
  const { themeMode } = useSettings();
  const { offline } = useHousehold();
  const [screen, setScreen] = useState<Screen>('home');
  const [query, setQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);

  // The sidebar only belongs beside the ledger; the other screens are full width.
  const withSidebar = screen === 'home' || screen === 'history' || screen === 'insights';

  return (
    <div
      className={`flex min-h-screen flex-col bg-canvas text-body selection:bg-brand/20 ${
        themeMode === 'dark' ? 'dark' : ''
      }`}
    >
      <AllowanceBar />

      {offline && (
        <div className="border-b border-line bg-amber-500/15 px-4 py-2 text-center text-[11px] font-semibold text-amber-700 dark:text-amber-300">
          Offline — anything you add is saved on this device and syncs when you are back.
        </div>
      )}

      <AppHeader
        screen={screen}
        onNavigate={setScreen}
        query={query}
        onQueryChange={setQuery}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-28 md:px-8 md:pb-8">
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          <div className="min-w-0 w-full flex-1">
            {showCategories ? (
              <CategoriesScreen />
            ) : (
              <>
                {screen === 'home' && <HomeScreen query={query} />}
                {screen === 'history' && <HistoryScreen query={query} />}
                {screen === 'insights' && <InsightsScreen />}
                {screen === 'members' && <MembersScreen />}
                {screen === 'wallets' && <WalletsScreen />}
                {screen === 'limits' && <LimitsScreen />}
                {screen === 'profile' && <ProfileScreen />}
                {screen === 'settings' && (
                  <>
                    <SettingsScreen
                      onNavigate={(next) => {
                        setScreen(next);
                        setShowCategories(false);
                      }}
                    />
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setShowCategories((v) => !v)}
                        className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-xs font-bold text-brand shadow-sm transition-colors hover:bg-surface-sunken"
                      >
                        {showCategories ? 'Hide categories' : 'Manage categories'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {(withSidebar || screen === 'wallets' || screen === 'limits') && !showCategories && (
            <InsightsSidebar onNavigate={(next) => setScreen(next)} />
          )}
        </div>
      </main>

      <BottomNav screen={screen} onNavigate={setScreen} onAdd={() => setScreen('home')} />
    </div>
  );
}

/**
 * The gate.
 *
 * Four states, in order: authenticating, signed out, profile incomplete, no
 * household. The last two are separate screens rather than one, because a new
 * account has to do both in turn and collapsing them means one of them never
 * appears.
 *
 * `profileLoading` is checked before the profile itself. Without it a returning
 * user briefly renders the "complete your profile" form while the document is
 * still in flight, and starts editing a profile that was complete all along.
 */
function App() {
  const { user, profile, loading, profileLoading } = useAuth();

  if (loading) return <Splash label="Connecting…" />;
  if (!user) return <LoginScreen />;
  if (profileLoading) return <Splash label="Loading your profile…" />;
  if (!profile?.profileCompleted) return <ProfileSetupScreen />;

  return <OnboardingGate />;
}

/**
 * Onboarding is a *household* question, not a profile one, so it is resolved
 * inside the shell: a signed-in user with no family is sent to onboarding, and
 * anyone else goes straight through to the ledger.
 */
function OnboardingGate() {
  const { profile } = useAuth();
  const hasHousehold = (profile?.householdIds?.length || 0) > 0;
  if (!hasHousehold) return <OnboardingScreen />;
  return <Shell />;
}

export default App;