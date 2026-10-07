import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { HouseholdProvider } from './contexts/HouseholdContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

/**
 * Errors that happen outside React -- a rejected promise, a Firebase listener
 * failing to attach -- would otherwise leave no trace on the page at all.
 */
window.addEventListener('error', (e) => {
  console.error('Uncaught error:', e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AuthProvider>
      <HouseholdProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </HouseholdProvider>
    </AuthProvider>
  </ErrorBoundary>,
);