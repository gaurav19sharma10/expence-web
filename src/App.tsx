import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useHousehold } from './contexts/HouseholdContext';
import { useSettings } from './contexts/SettingsContext';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { AddExpenseScreen } from './screens/AddExpenseScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { FamilyScreen } from './screens/FamilyScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ProfileSetupScreen } from './screens/ProfileSetupScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TopUpScreen } from './screens/TopUpScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { MembersScreen } from './screens/MembersScreen';

type Screen =
  | 'home'
  | 'history'
  | 'add'
  | 'insights'
  | 'family'
  | 'settings'
  | 'profile'
  | 'topup'
  | 'categories'
  | 'members';

function App() {
  const { user, profile, loading: authLoading, profileLoading } = useAuth();
  const { householdId } = useHousehold();
  const { themeMode } = useSettings();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  if (authLoading) return <div className="loading-screen">Loading...</div>;

  if (!user) {
    return <LoginScreen />;
  }

  // Signing in is not the same as having a profile: the document still has to
  // be read before the screen can tell a finished profile from a new account.
  if (profileLoading) return <div className="loading-screen">Loading...</div>;

  if (!profile?.profileCompleted) {
    return <ProfileSetupScreen onComplete={() => setCurrentScreen('home')} />;
  }

  // A finished profile with no family behind it is the state every new account
  // is in, and the only screen that can resolve it is onboarding.
  if (!householdId) {
    return <OnboardingScreen onComplete={() => setCurrentScreen('home')} />;
  }

  return (
    <div className={`app ${themeMode === 'dark' ? 'dark' : ''}`}>
      <div className="app-header">
        <h1>Expence</h1>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setCurrentScreen('settings')}>
            ⚙️
          </button>
        </div>
      </div>

      <main className="main-content">
        {currentScreen === 'home' && <HomeScreen />}
        {currentScreen === 'history' && <HistoryScreen />}
        {currentScreen === 'add' && <AddExpenseScreen onDone={() => setCurrentScreen('home')} />}
        {currentScreen === 'insights' && <InsightsScreen />}
        {currentScreen === 'family' && <FamilyScreen />}
        {currentScreen === 'settings' && <SettingsScreen />}
        {currentScreen === 'profile' && <ProfileScreen />}
        {currentScreen === 'topup' && <TopUpScreen />}
        {currentScreen === 'categories' && <CategoriesScreen />}
        {currentScreen === 'members' && <MembersScreen />}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-item ${currentScreen === 'home' ? 'active' : ''}`} onClick={() => setCurrentScreen('home')}>
          <span>🏠</span>
          <span>Home</span>
        </button>
        <button className={`nav-item ${currentScreen === 'history' ? 'active' : ''}`} onClick={() => setCurrentScreen('history')}>
          <span>📋</span>
          <span>History</span>
        </button>
        <button className={`nav-item add-btn ${currentScreen === 'add' ? 'active' : ''}`} onClick={() => setCurrentScreen('add')}>
          <span>＋</span>
        </button>
        <button className={`nav-item ${currentScreen === 'insights' ? 'active' : ''}`} onClick={() => setCurrentScreen('insights')}>
          <span>📊</span>
          <span>Insights</span>
        </button>
        <button className={`nav-item ${currentScreen === 'family' ? 'active' : ''}`} onClick={() => setCurrentScreen('family')}>
          <span>👥</span>
          <span>Family</span>
        </button>
      </nav>
    </div>
  );
}

export default App;