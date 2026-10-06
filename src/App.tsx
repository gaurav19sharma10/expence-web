import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { useSettings } from '../contexts/SettingsContext';
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
import { AddExpenseScreen } from './screens/AddExpenseScreen';
import { TopUpScreen } from './screens/TopUpScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { MembersScreen } from './screens/MembersScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

function App() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { householdId, loading: householdLoading } = useHousehold();
  const { themeMode } = useSettings();
  const [profileSetup, setProfileSetup] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'history' | 'add' | 'insights' | 'family' | 'settings' | 'profile' | 'addExpense' | 'topup' | 'categories' | 'members' | 'settings'>('home');

  useEffect(() => {
    const savedTheme = localStorage.getItem('themeMode') as 'light' | 'dark' | 'system' || 'system';
    document.documentElement.classList.toggle('dark', 
      themeMode === 'dark' || (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  }, []);

  if (loading) return <div className="loading-screen">Loading...</div>;

  if (!user) {
    return <LoginScreen />;
  }

  if (profileSetup) {
    return <ProfileSetupScreen onComplete={() => setProfileSetup(false)} />;
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  if (!profile?.profileCompleted) {
    return <ProfileSetupScreen onComplete={() => setProfileSetup(false)} />;
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
        {currentScreen === 'add' && <AddExpenseScreen />}
        {currentScreen === 'insights' && <InsightsScreen />}
        {currentScreen === 'family' && <FamilyScreen />}
        {currentScreen === 'settings' && <SettingsScreen />}
        {currentScreen === 'profile' && <ProfileScreen />}
        {currentScreen === 'addExpense' && <AddExpenseScreen />}
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